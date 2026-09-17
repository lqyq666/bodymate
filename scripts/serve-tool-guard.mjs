import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { loadMoonBitCore } from './load-moonbit-core.mjs';
import { allowlistWire, fieldsWire, explainCommand } from '../src/ai/agent-guard.mjs';
import { aiConfig, readEncryptedProviderEnvironment, parseLocalEnv } from './serve-bodymate-ai.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

// Converts an OpenAI `tools` array into a guard allowlist:
// number properties with minimum/maximum become bounded fields,
// string properties with enum become one_of fields, everything else is
// passed through unguarded (the guard only constrains what has a constraint).
export function allowlistFromTools(tools) {
  const commands = [];
  for (const tool of Array.isArray(tools) ? tools : []) {
    const fn = tool?.function || tool;
    const id = String(fn?.name ?? '').trim();
    if (!id || !/^[a-z][a-z0-9_]*$/.test(id)) continue;
    const fields = [];
    const properties = fn?.parameters?.properties || {};
    for (const [key, spec] of Object.entries(properties)) {
      if (spec?.type === 'number' || spec?.type === 'integer') {
        const min = Number.isFinite(spec?.minimum) ? spec.minimum : undefined;
        const max = Number.isFinite(spec?.maximum) ? spec.maximum : undefined;
        fields.push({ key, min, max });
      } else if (spec?.type === 'string' && Array.isArray(spec?.enum) && spec.enum.length > 0) {
        fields.push({ key, options: spec.enum.map(String) });
      }
    }
    commands.push({ id, fields });
  }
  return commands;
}

// Guards one assembled tool call; returns the sanitized call plus verdict.
function guardOneCall(name, args, commands, policy) {
  const { action, reasons } = explainCommand(name, args, commands, policy);
  const verdict = { id: name, verdict: action ? 'kept' : 'rejected', reasons };
  if (action) {
    return { call: { type: 'function', function: { name: action.id, arguments: JSON.stringify(action.parameters) } }, verdict, reasons };
  }
  const originalName = name;
  return {
    call: { type: 'function', function: { name: 'guard_rejected', arguments: JSON.stringify({ rejected_tool: originalName, reasons }) } },
    verdict, reasons,
  };
}

export function guardToolCalls(response, tools, policy) {
  const commands = allowlistFromTools(tools);
  if (!commands.length) return { response, verdicts: [] };
  const message = response?.choices?.[0]?.message;
  const calls = message?.tool_calls;
  if (!Array.isArray(calls) || calls.length === 0) return { response, verdicts: [] };

  const verdicts = [];
  let modified = false;
  for (const call of calls) {
    const fn = call?.function;
    if (!fn) continue;
    let arguments_ = {};
    try { arguments_ = JSON.parse(fn.arguments || '{}'); } catch { arguments_ = {}; }
    const { call: guarded, verdict, reasons } = guardOneCall(fn.name, arguments_, commands, policy);
    verdicts.push(verdict);
    if (reasons.length > 0) {
      modified = true;
      fn.name = guarded.function.name;
      fn.arguments = guarded.function.arguments;
    }
  }
  if (modified && Array.isArray(response.choices)) {
    response.choices[0].message.tool_calls = calls;
  }
  return { response, verdicts };
}

// Parses an SSE stream, forwards content chunks immediately, buffers tool_call
// fragments, and at stream end guards the assembled calls and emits them.
// The client sees: streamed text → [stream pauses] → guarded tool_calls → finish.
export async function guardStreamingResponse(upstreamBody, tools, policy, clientResponse, setCors) {
  const commands = allowlistFromTools(tools);
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';
  const toolCallAccumulator = new Map();
  const verdicts = [];
  let hasToolCalls = false;

  setCors();
  clientResponse.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  const writeSSE = (obj) => clientResponse.write(`data: ${JSON.stringify(obj)}\n\n`);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });

    const events = sseBuffer.split('\n\n');
    sseBuffer = events.pop() || '';

    for (const event of events) {
      const dataLine = event.trim();
      if (!dataLine.startsWith('data: ')) continue;
      const data = dataLine.slice(6);
      if (data === '[DONE]') continue;

      let chunk;
      try { chunk = JSON.parse(data); } catch { continue; }
      const delta = chunk.choices?.[0]?.delta;
      const finish = chunk.choices?.[0]?.finish_reason;

      if (delta?.tool_calls) {
        hasToolCalls = true;
        for (const tc of delta.tool_calls) {
          const existing = toolCallAccumulator.get(tc.index) || { id: '', name: '', args: '' };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.name += tc.function.name;
          if (tc.function?.arguments) existing.args += tc.function.arguments;
          toolCallAccumulator.set(tc.index, existing);
        }
        // Don't forward tool_call fragments — we'll send guarded versions after the stream.
      } else if (delta?.content !== undefined && delta?.content !== null && delta.content !== '') {
        // Forward content chunks immediately so the user sees text streaming.
        writeSSE(chunk);
      } else if (finish && finish !== 'tool_calls') {
        // Forward finish events for non-tool-call endings.
        writeSSE(chunk);
      }
    }
  }

  if (hasToolCalls && toolCallAccumulator.size > 0) {
    let index = 0;
    for (const [, tc] of [...toolCallAccumulator.entries()].sort((a, b) => a[0] - b[0])) {
      let args = {};
      try { args = JSON.parse(tc.args || '{}'); } catch {}
      const { call, verdict } = guardOneCall(tc.name, args, commands, policy);
      verdicts.push(verdict);

      // Emit the guarded tool call as a complete SSE chunk.
      writeSSE({
        id: `guard-${index}`,
        object: 'chat.completion.chunk',
        choices: [{
          index: 0,
          delta: { tool_calls: [{ index, id: tc.id || `call_${index}`, type: 'function', function: { name: call.function.name, arguments: call.function.arguments } }] },
          finish_reason: null,
        }],
      });
      index++;
    }

    // Emit the finish event.
    writeSSE({
      id: 'guard-finish',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }],
    });
  }

  // Verdicts are embedded in the guarded tool_calls; headers can't be set after writeHead.
  clientResponse.write('data: [DONE]\n\n');
  clientResponse.end();
}

export function createToolGuardServer({
  port = Number(process.env.TOOL_GUARD_PORT || 4175),
  host = '127.0.0.1',
  upstreamConfig,
  fetchImpl = globalThis.fetch,
  policy = 'clamp',
} = {}) {
  const config = upstreamConfig;
  const server = createServer(async (request, response) => {
    const setCors = () => response.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const url = new URL(request.url || '/', `http://${host}:${port}`);
      if (url.pathname === '/health' && request.method === 'GET') {
        setCors();
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ upstream: config ? config.endpoint : null, model: config?.model ?? null, policy, streaming: true }));
        return;
      }
      if (url.pathname !== '/v1/chat/completions' || request.method !== 'POST') {
        response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'Only POST /v1/chat/completions is available.' }));
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > 256 * 1024) throw Object.assign(new Error('Request too large'), { status: 413 }); chunks.push(chunk); }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

      if (!config) {
        response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'Upstream not configured. Set BODYMATE_AI_* environment variables.' }));
        return;
      }

      const upstreamResponse = await fetchImpl(config.endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!upstreamResponse.ok) {
        const payload = await upstreamResponse.json();
        setCors();
        response.writeHead(upstreamResponse.status, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(payload));
        return;
      }

      // Streaming: content passes through, tool_calls are buffered and guarded.
      if (body.stream && upstreamResponse.body) {
        await guardStreamingResponse(upstreamResponse.body, body.tools, policy, response, setCors);
        return;
      }

      // Non-streaming: current behavior.
      const payload = await upstreamResponse.json();
      const { response: guarded, verdicts } = guardToolCalls(payload, body.tools, policy);
      setCors();
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'x-guard-verdicts': JSON.stringify(verdicts),
      });
      response.end(JSON.stringify(guarded));
    } catch (error) {
      const status = error?.status || 500;
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: error?.message || 'Tool guard gateway error.' }));
    }
  });
  return { server, port, host };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await loadMoonBitCore({ probe: 'bodymate_agent_explain_command_v1' });
  async function loadConfig(root) {
      const encrypted = await readEncryptedProviderEnvironment({});
      let local = {};
      try { local = parseLocalEnv(await import("node:fs/promises").then(m => m.readFile(root + "/.env.local", "utf8"))); } catch {}
      const config = aiConfig({ ...encrypted, ...local, ...process.env });
      // GUARD_UPSTREAM_URL overrides the DPAPI base URL (e.g. Coding Plan endpoint).
      if (config && process.env.GUARD_UPSTREAM_URL) {
        const base = process.env.GUARD_UPSTREAM_URL.replace(/\/+$/, '');
        return { ...config, endpoint: base + '/chat/completions' };
      }
      return config;
    }
    const config = await loadConfig(root);
  const { server, port, host } = createToolGuardServer({ upstreamConfig: config });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  console.log(`Tool guard gateway: http://${host}:${port}/v1/chat/completions`);
  console.log(`Upstream: ${config ? config.endpoint : 'NOT CONFIGURED'} (model ${config?.model ?? '—'})`);
  console.log('Streaming supported: content passes through, tool_calls are guarded.');
  console.log('Point any OpenAI SDK base_url here; tool_calls are guarded automatically.');
}
