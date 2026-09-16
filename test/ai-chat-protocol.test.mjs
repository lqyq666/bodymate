import assert from 'node:assert/strict';
import test from 'node:test';
import { aiConfig, completeAiChat, configuredEnvironment, createBodyMateAiServer, healthPayload, parseEncryptedProviderFile, parseLocalEnv, parseUpstreamErrorDetail, readEncryptedProviderEnvironment } from '../scripts/serve-bodymate-ai.mjs';
import { buildChatMessages, normalizeAssistantResponse, normalizeChatRequest } from '../src/ai/bodymate-chat-protocol.mjs';
import { loadMoonBitCore } from '../scripts/load-moonbit-core.mjs';

await loadMoonBitCore({ probe: 'bodymate_agent_guard_command_v1' });

const catalog = [{
  id: 'push_up', title: '俯卧撑',
  parameters: [{ key: 'handWidth', label: '手距', unit: '倍肩宽', min: .8, max: 1.8, step: .05 }],
  presets: [{ title: '标准', parameters: { handWidth: 1.5 } }],
}];

test('AI chat request carries only bounded local motion capabilities and recent dialogue', () => {
  const request = normalizeChatRequest({
    message: '演示宽距俯卧撑', catalog, context: { motionId: 'push_up', parameters: { handWidth: 1.5, invented: 9 } },
    history: Array.from({ length: 8 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `turn ${index}` })),
  });
  assert.equal(request.history.length, 6);
  assert.deepEqual(request.context, { motionId: 'push_up', parameters: { handWidth: 1.5 } });
  const messages = buildChatMessages(request);
  assert.match(messages[0].content, /push_up/);
  assert.doesNotMatch(messages[0].content, /invented/);
  assert.match(messages.at(-1).content, /演示宽距俯卧撑/);
});

test('AI directives are restricted to the provided catalog and finite known parameters', () => {
  assert.deepEqual(normalizeAssistantResponse(JSON.stringify({
    reply: '正在演示。', action: { kind: 'motion', id: 'push_up', parameters: { handWidth: 1.8, invented: 7, nope: Infinity } },
  }), normalizeChatRequest({ message: 'x', catalog }).catalog), {
    reply: '正在演示。', action: { kind: 'motion', id: 'push_up', parameters: { handWidth: 1.8 } },
  });
  assert.deepEqual(normalizeAssistantResponse(JSON.stringify({
    reply: '不能执行未知动作。', action: { kind: 'motion', id: 'run_marathon', parameters: {} },
  }), normalizeChatRequest({ message: 'x', catalog }).catalog).action, { kind: 'none' });
  assert.deepEqual(normalizeAssistantResponse('not json', catalog).action, { kind: 'none' });
});

test('MoonBit guard clamps out-of-range model parameters and reports why', () => {
  const logs = [];
  const response = normalizeAssistantResponse(
    JSON.stringify({ reply: '演示。', action: { kind: 'motion', id: 'push_up', parameters: { handWidth: 2.5, invented: 3 } } }),
    normalizeChatRequest({ message: 'x', catalog }).catalog,
    { log: (line) => logs.push(line) },
  );
  assert.deepEqual(response.action, { kind: 'motion', id: 'push_up', parameters: { handWidth: 1.8 } });
  assert.equal(logs.length, 1);
  assert.match(logs[0], /clamped:handWidth:2\.5->1\.8/);
  assert.match(logs[0], /unknown_field:invented/);
});

test('current-user encrypted provider config is decrypted only at the local server boundary', async () => {
  const envelope = JSON.stringify({ format: 'bodymate-ai-dpapi-v1', ciphertext: 'cHJvdGVjdGVkLXRlc3Q=' });
  const environment = await readEncryptedProviderEnvironment({
    platform: 'win32', filePath: 'provider.dpapi.json',
    readFileImpl: async (path, encoding) => { assert.equal(path, 'provider.dpapi.json'); assert.equal(encoding, 'utf8'); return envelope; },
    unprotect: async (ciphertext) => { assert.equal(ciphertext, 'cHJvdGVjdGVkLXRlc3Q='); return JSON.stringify({ BODYMATE_AI_API_KEY: 'local-test-key', BODYMATE_AI_BASE_URL: 'https://example.test/v1', BODYMATE_AI_MODEL: 'test-model', ignored: 'value' }); },
  });
  assert.deepEqual(environment, { BODYMATE_AI_API_KEY: 'local-test-key', BODYMATE_AI_BASE_URL: 'https://example.test/v1', BODYMATE_AI_MODEL: 'test-model' });
  assert.equal(aiConfig(environment).endpoint, 'https://example.test/v1/chat/completions');
  assert.equal(parseEncryptedProviderFile('{"format":"wrong","ciphertext":"cHJvdGVjdGVk"}'), null);
});

test('local AI proxy keeps credentials server-side and accepts a structured compatible response', async () => {
  const config = aiConfig(parseLocalEnv('BODYMATE_AI_API_KEY=test-key\nBODYMATE_AI_BASE_URL=https://example.test/v1\nBODYMATE_AI_MODEL=test-model'));
  assert.equal(config.endpoint, 'https://example.test/v1/chat/completions');
  const answer = await completeAiChat({ message: '演示俯卧撑', catalog }, {
    config,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.test/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      const upstream = JSON.parse(options.body);
      assert.equal(upstream.model, 'test-model');
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"reply":"已开始演示。","action":{"kind":"motion","id":"push_up","parameters":{"handWidth":1.5}}}' } }] }) };
    },
  });
  assert.deepEqual(answer, { reply: '已开始演示。', action: { kind: 'motion', id: 'push_up', parameters: { handWidth: 1.5 } } });
});

test('local AI proxy preserves an upstream rate-limit state for the page', async () => {
  const config = aiConfig(parseLocalEnv('BODYMATE_AI_API_KEY=test-key\nBODYMATE_AI_BASE_URL=https://example.test/v1\nBODYMATE_AI_MODEL=test-model'));
  await assert.rejects(
    () => completeAiChat({ message: '演示俯卧撑', catalog }, { config, fetchImpl: async () => ({ ok: false, status: 429 }) }),
    (error) => error.status === 429 && error.message === 'AI 服务当前限流或额度不足，请稍后再试。',
  );
});

test('upstream error details are parsed from provider shapes without trusting noise', () => {
  assert.deepEqual(parseUpstreamErrorDetail('{"error":{"code":"1113","message":"您的账户已欠费，请充值后重试"}}'), { code: '1113', message: '您的账户已欠费，请充值后重试' });
  assert.deepEqual(parseUpstreamErrorDetail('{"code":1302,"message":"您当前使用该API的并发数过高"}'), { code: '1302', message: '您当前使用该API的并发数过高' });
  assert.equal(parseUpstreamErrorDetail('<html>upstream error page</html>'), null);
  assert.equal(parseUpstreamErrorDetail(''), null);
});

test('local AI proxy separates upstream balance failure from ordinary rate limiting', async () => {
  const config = aiConfig(parseLocalEnv('BODYMATE_AI_API_KEY=test-key\nBODYMATE_AI_BASE_URL=https://example.test/v1\nBODYMATE_AI_MODEL=test-model'));
  const logs = [];
  const captureLog = (line) => logs.push(line);
  await assert.rejects(
    () => completeAiChat({ message: '演示俯卧撑', catalog }, {
      config, log: captureLog,
      fetchImpl: async () => ({ ok: false, status: 429, text: async () => '{"error":{"code":"1113","message":"您的账户已欠费，请充值后重试"}}' }),
    }),
    (error) => error.status === 429 && error.message.includes('1113') && error.message.includes('余额'),
  );
  await assert.rejects(
    () => completeAiChat({ message: '演示俯卧撑', catalog }, {
      config, log: captureLog,
      fetchImpl: async () => ({ ok: false, status: 429, text: async () => '{"error":{"code":"1302","message":"您当前使用该API的并发数过高"}}' }),
    }),
    (error) => error.status === 429 && error.message === 'AI 服务当前限流或额度不足，请稍后再试。',
  );
  await assert.rejects(
    () => completeAiChat({ message: '演示俯卧撑', catalog }, {
      config, log: captureLog,
      fetchImpl: async () => ({ ok: false, status: 429, text: async () => 'upstream exploded' }),
    }),
    (error) => error.status === 429 && error.message === 'AI 服务当前限流或额度不足，请稍后再试。',
  );
  assert.equal(logs.length, 2);
  assert.ok(logs[0].includes('status=429') && logs[0].includes('code=1113'));
  assert.ok(logs[1].includes('code=1302'));
  assert.ok(logs.every((line) => !line.includes('test-key')));
});

test('local AI proxy names a busy model and keeps non-429 failures on the generic copy', async () => {
  const config = aiConfig(parseLocalEnv('BODYMATE_AI_API_KEY=test-key\nBODYMATE_AI_BASE_URL=https://example.test/v1\nBODYMATE_AI_MODEL=test-model'));
  const logs = [];
  const captureLog = (line) => logs.push(line);
  await assert.rejects(
    () => completeAiChat({ message: '演示俯卧撑', catalog }, {
      config, log: captureLog,
      fetchImpl: async () => ({ ok: false, status: 429, text: async () => '{"error":{"code":"1305","message":"该模型当前访问量过大，请您稍后再试"}}' }),
    }),
    (error) => error.status === 429 && error.message.includes('1305') && error.message.includes('访问量过大'),
  );
  await assert.rejects(
    () => completeAiChat({ message: '演示俯卧撑', catalog }, {
      config, log: captureLog,
      fetchImpl: async () => ({ ok: false, status: 500, text: async () => '{"error":{"code":"1200","message":"API 调用失败"}}' }),
    }),
    (error) => error.status === 502 && error.message === 'AI 服务没有返回可用答复，请检查本机模型配置后重试。',
  );
  await assert.rejects(
    () => completeAiChat({ message: '演示俯卧撑', catalog }, {
      config, log: captureLog,
      fetchImpl: async () => ({ ok: false, status: 401, text: async () => 'Unauthorized' }),
    }),
    (error) => error.status === 502 && error.message === 'AI 服务没有返回可用答复，请检查本机模型配置后重试。',
  );
  assert.deepEqual(logs.map((line) => /code=(\S+)/.exec(line)?.[1]), ['1305', '1200']);
});

test('local AI config follows the encrypted file without a restart and never serves a stale copy', async () => {
  const environment = { LOCALAPPDATA: 'C:\\fake\\local' };
  const missing = () => { const error = new Error('missing'); error.code = 'ENOENT'; throw error; };
  let fileState = { mtimeMs: 1, size: 100 };
  let loads = 0;
  const loader = configuredEnvironment('/repo', environment, {
    statImpl: async () => fileState || missing(),
    encryptedEnvironmentLoader: async ({ filePath }) => {
      assert.match(filePath, /ai-provider\.dpapi\.json$/);
      loads += 1;
      return { BODYMATE_AI_API_KEY: `key-${loads}`, BODYMATE_AI_BASE_URL: 'https://example.test/v1', BODYMATE_AI_MODEL: `model-${loads}` };
    },
    readFileImpl: async () => missing(),
  });
  assert.equal(aiConfig(await loader()).model, 'model-1');
  assert.equal(aiConfig(await loader()).model, 'model-1');
  assert.equal(loads, 1);
  fileState = { mtimeMs: 2, size: 120 };
  assert.equal(aiConfig(await loader()).model, 'model-2');
  assert.equal(loads, 2);
  fileState = null;
  assert.equal(aiConfig(await loader()), null);
  assert.equal(loads, 2);
  fileState = { mtimeMs: 3, size: 120 };
  assert.equal(aiConfig(await loader()).model, 'model-3');
});

test('.env.local overrides the endpoint and model while the key stays in the encrypted file', async () => {
  const loader = configuredEnvironment('/repo', { LOCALAPPDATA: 'C:\\fake\\local' }, {
    statImpl: async () => ({ mtimeMs: 1, size: 1 }),
    encryptedEnvironmentLoader: async () => ({ BODYMATE_AI_API_KEY: 'encrypted-key', BODYMATE_AI_BASE_URL: 'https://old.test/v1', BODYMATE_AI_MODEL: 'old-model' }),
    readFileImpl: async () => 'BODYMATE_AI_BASE_URL=https://new.test/v1\nBODYMATE_AI_MODEL=new-model\n',
  });
  const config = aiConfig(await loader());
  assert.equal(config.apiKey, 'encrypted-key');
  assert.equal(config.model, 'new-model');
  assert.equal(config.endpoint, 'https://new.test/v1/chat/completions');
});

test('health reports the active model and endpoint without exposing the key', async () => {
  assert.deepEqual(healthPayload(null), { configured: false, model: null, endpoint: null });
  const server = createBodyMateAiServer({
    processEnvironment: {},
    environmentLoader: async () => ({ BODYMATE_AI_API_KEY: 'server-only-key', BODYMATE_AI_BASE_URL: 'https://example.test/v1', BODYMATE_AI_MODEL: 'test-model' }),
    fetchImpl: async () => { throw new Error('not expected'); },
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/health`);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), { configured: true, model: 'test-model', endpoint: 'https://example.test/v1/chat/completions' });
    assert.doesNotMatch(text, /server-only-key/);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('local API exposes a safe upstream rate-limit message', async () => {
  const server = createBodyMateAiServer({
    processEnvironment: {},
    environmentLoader: async () => ({ BODYMATE_AI_API_KEY: 'server-only-key', BODYMATE_AI_BASE_URL: 'https://example.test/v1', BODYMATE_AI_MODEL: 'test-model' }),
    fetchImpl: async () => ({ ok: false, status: 429 }),
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '演示俯卧撑', catalog }) });
    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { message: 'AI 服务当前限流或额度不足，请稍后再试。' });
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('local API exposes only the sanitized reply and action', async () => {
  const server = createBodyMateAiServer({
    processEnvironment: {},
    environmentLoader: async () => ({ BODYMATE_AI_API_KEY: 'server-only-key', BODYMATE_AI_BASE_URL: 'https://example.test/v1', BODYMATE_AI_MODEL: 'test-model' }),
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"reply":"正在播放。","action":{"kind":"motion","id":"push_up","parameters":{"handWidth":1.5}}}' } }] }) }),
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '演示俯卧撑', catalog }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, { reply: '正在播放。', action: { kind: 'motion', id: 'push_up', parameters: { handWidth: 1.5 } } });
    assert.doesNotMatch(JSON.stringify(body), /server-only-key/);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
