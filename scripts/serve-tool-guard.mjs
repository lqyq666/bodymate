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
    const { action, reasons } = explainCommand(fn.name, arguments_, commands, policy);
    verdicts.push({ id: fn.name, verdict: action ? 'kept' : 'rejected', reasons });
    if (reasons.length > 0) {
      modified = true;
      if (action) {
        fn.arguments = JSON.stringify(action.parameters);
      } else {
        // Unknown tool: strip the call to a no-op with a reason payload.
        const originalName = fn.name;
        fn.name = 'guard_rejected';
        fn.arguments = JSON.stringify({ rejected_tool: originalName, reasons });
      }
    }
  }
  if (modified && Array.isArray(response.choices)) {
    response.choices[0].message.tool_calls = calls;
  }
  return { response, verdicts };
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
        response.end(JSON.stringify({ upstream: config ? config.endpoint : null, model: config?.model ?? null, policy }));
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
      const payload = await upstreamResponse.json();
      if (!upstreamResponse.ok) {
        setCors();
        response.writeHead(upstreamResponse.status, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(payload));
        return;
      }

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
      return aiConfig({ ...encrypted, ...local, ...process.env });
    }
    const config = await loadConfig(root);
  const { server, port, host } = createToolGuardServer({ upstreamConfig: config });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  console.log(`Tool guard gateway: http://${host}:${port}/v1/chat/completions`);
  console.log(`Upstream: ${config ? config.endpoint : 'NOT CONFIGURED'} (model ${config?.model ?? '—'})`);
  console.log('Point any OpenAI SDK base_url here; tool_calls are guarded automatically.');
}
