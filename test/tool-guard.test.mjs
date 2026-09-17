import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadMoonBitCore } from '../scripts/load-moonbit-core.mjs';
import { allowlistFromTools, createToolGuardServer, guardToolCalls } from '../scripts/serve-tool-guard.mjs';

await loadMoonBitCore({ probe: 'bodymate_agent_explain_command_v1' });

const tools = [{
  type: 'function',
  function: {
    name: 'set_light',
    parameters: {
      type: 'object',
      properties: {
        brightness: { type: 'number', minimum: 0, maximum: 100 },
        mode: { type: 'string', enum: ['warm', 'cool', 'auto'] },
      },
    },
  },
}, {
  type: 'function',
  function: {
    name: 'push_up',
    parameters: {
      type: 'object',
      properties: { handWidth: { type: 'number', minimum: 0.8, maximum: 1.8 } },
    },
  },
}];

test('allowlist conversion turns OpenAI tool schemas into guard wire', () => {
  const commands = allowlistFromTools(tools);
  assert.equal(commands.length, 2);
  assert.deepEqual(commands[0], { id: 'set_light', fields: [{ key: 'brightness', min: 0, max: 100 }, { key: 'mode', options: ['warm', 'cool', 'auto'] }] });
  assert.deepEqual(commands[1], { id: 'push_up', fields: [{ key: 'handWidth', min: 0.8, max: 1.8 }] });
});

test('guard clamps out-of-range numbers and rejects unknown enum options', () => {
  const response = {
    choices: [{ message: { tool_calls: [{ function: { name: 'set_light', arguments: JSON.stringify({ brightness: 200, mode: 'disco' }) } }] } }],
  };
  const { response: guarded, verdicts } = guardToolCalls(response, tools, 'clamp');
  const call = guarded.choices[0].message.tool_calls[0];
  const args = JSON.parse(call.function.arguments);
  assert.equal(args.brightness, 100);
  assert.equal(args.mode, undefined);
  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0].verdict, 'kept');
  assert.ok(verdicts[0].reasons.some((r) => r.startsWith('clamped:brightness')));
  assert.ok(verdicts[0].reasons.some((r) => r.startsWith('unknown_option:mode')));
});

test('guard rejects hallucinated tool names entirely', () => {
  const response = {
    choices: [{ message: { tool_calls: [{ function: { name: 'delete_database', arguments: '{}' } }] } }],
  };
  const { response: guarded, verdicts } = guardToolCalls(response, tools, 'clamp');
  const call = guarded.choices[0].message.tool_calls[0];
  assert.equal(call.function.name, 'guard_rejected');
  assert.equal(verdicts[0].verdict, 'rejected');
  assert.ok(verdicts[0].reasons.some((r) => r.startsWith('unknown_id:')));
});

test('guard passes valid tool calls through untouched', () => {
  const response = {
    choices: [{ message: { tool_calls: [{ function: { name: 'push_up', arguments: JSON.stringify({ handWidth: 1.5 }) } }] } }],
  };
  const { response: guarded, verdicts } = guardToolCalls(response, tools, 'clamp');
  assert.deepEqual(guarded, response);
  assert.equal(verdicts[0].verdict, 'kept');
  assert.equal(verdicts[0].reasons.length, 0);
});

test('guard leaves non-tool-call responses untouched', () => {
  const response = { choices: [{ message: { content: 'hello' } }] };
  const { response: guarded, verdicts } = guardToolCalls(response, tools, 'clamp');
  assert.deepEqual(guarded, response);
  assert.equal(verdicts.length, 0);
});

test('gateway serves /v1/chat/completions and stamps verdicts into headers', async () => {
  const fakeUpstream = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { tool_calls: [{ function: { name: 'set_light', arguments: JSON.stringify({ brightness: 300, mode: 'warm' }) } }] } }],
    }),
  });
  const { server } = createToolGuardServer({
    upstreamConfig: { endpoint: 'https://fake.test/v1/chat/completions', apiKey: 'x', model: 'm' },
    fetchImpl: fakeUpstream,
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'm', messages: [], tools }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.choices[0].message.tool_calls[0].function.arguments, JSON.stringify({ brightness: 100, mode: 'warm' }));
    const verdicts = JSON.parse(response.headers.get('x-guard-verdicts'));
    assert.equal(verdicts.length, 1);
    assert.ok(verdicts[0].reasons.some((r) => r.startsWith('clamped:brightness:300->100')));
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

// --- Streaming tests ---

function makeSSEStream(chunks) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return stream;
}

function sse(obj) { return `data: ${JSON.stringify(obj)}\n\n`; }
const DONE = 'data: [DONE]\n\n';

test('streaming: content passes through, tool_calls are buffered and guarded', async () => {
  const upstreamChunks = [
    sse({ id: '1', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }),
    sse({ id: '1', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: 'Setting lights ' }, finish_reason: null }] }),
    sse({ id: '1', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: 'now.' }, finish_reason: null }] }),
    sse({ id: '1', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'set_light', arguments: '{"bright' } }] }, finish_reason: null }] }),
    sse({ id: '1', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: 'ness":200,"mode":"disco"}' } }] }, finish_reason: null }] }),
    sse({ id: '1', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { tool_calls: [{ index: 1, id: 'call_2', type: 'function', function: { name: 'delete_database', arguments: '{}' } }] }, finish_reason: null }] }),
    sse({ id: '1', object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }),
    DONE,
  ];
  const fakeUpstream = async () => ({
    ok: true, status: 200,
    json: async () => ({}),
    body: makeSSEStream(upstreamChunks),
  });
  const { server } = createToolGuardServer({
    upstreamConfig: { endpoint: 'https://fake.test/v1', apiKey: 'x', model: 'm' },
    fetchImpl: fakeUpstream,
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'm', messages: [], tools, stream: true }),
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    const text = await response.text();
    const events = text.split('\n\n').filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]').map((line) => JSON.parse(line.slice(6)));

    // Content chunks pass through
    const contentChunks = events.filter((e) => e.choices?.[0]?.delta?.content);
    assert.equal(contentChunks.length, 2, `expected 2 content chunks, got ${contentChunks.length}`);
    assert.equal(contentChunks[0].choices[0].delta.content, 'Setting lights ');

    // Guarded tool_calls: set_light clamped + delete_database rejected
    const toolCallChunks = events.filter((e) => e.choices?.[0]?.delta?.tool_calls);
    assert.equal(toolCallChunks.length, 2, `expected 2 tool_call chunks, got ${toolCallChunks.length}`);
    const lightCall = toolCallChunks.find((e) => e.choices[0].delta.tool_calls[0].function.name === 'set_light');
    assert.ok(lightCall, 'set_light should be present');
    const lightArgs = JSON.parse(lightCall.choices[0].delta.tool_calls[0].function.arguments);
    assert.equal(lightArgs.brightness, 100, 'brightness should be clamped to 100');
    assert.equal(lightArgs.mode, undefined, 'mode disco should be dropped');
    const rejectedCall = toolCallChunks.find((e) => e.choices[0].delta.tool_calls[0].function.name === 'guard_rejected');
    assert.ok(rejectedCall, 'delete_database should be guard_rejected');

    // Finish event
    const finishEvents = events.filter((e) => e.choices?.[0]?.finish_reason === 'tool_calls');
    assert.equal(finishEvents.length, 1);

    // [DONE] marker
    assert.ok(text.includes('[DONE]'));
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('streaming: text-only response passes through without buffering', async () => {
  const upstreamChunks = [
    sse({ id: '1', choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }),
    sse({ id: '1', choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }] }),
    sse({ id: '1', choices: [{ index: 0, delta: { content: ' world' }, finish_reason: null }] }),
    sse({ id: '1', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }),
    DONE,
  ];
  const fakeUpstream = async () => ({
    ok: true, status: 200,
    json: async () => ({}),
    body: makeSSEStream(upstreamChunks),
  });
  const { server } = createToolGuardServer({
    upstreamConfig: { endpoint: 'https://fake.test/v1', apiKey: 'x', model: 'm' },
    fetchImpl: fakeUpstream,
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'm', messages: [], tools, stream: true }),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await response.text();
    const events = text.split('\n\n').filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]').map((line) => JSON.parse(line.slice(6)));
    const contentChunks = events.filter((e) => e.choices?.[0]?.delta?.content);
    assert.equal(contentChunks.length, 2);
    const finishEvents = events.filter((e) => e.choices?.[0]?.finish_reason === 'stop');
    assert.equal(finishEvents.length, 1);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
