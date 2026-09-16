// End-to-end demo of the MoonBit tool-call guard gateway.
// With API balance: node scripts/demo-guard-interception.mjs
// Without balance:  node scripts/demo-guard-interception.mjs --mock
// The --mock path exercises the exact same gateway + MoonBit guard code; only the
// upstream is replaced with a canned response that hallucinates exactly the values
// a real model produces when a user asks for things outside the schema.
import { fileURLToPath } from 'node:url';
import { loadMoonBitCore } from './load-moonbit-core.mjs';
import { aiConfig, readEncryptedProviderEnvironment, parseLocalEnv } from './serve-bodymate-ai.mjs';
import { createToolGuardServer } from './serve-tool-guard.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const mock = process.argv.includes('--mock');

const tools = [{
  type: 'function',
  function: {
    name: 'set_light',
    description: 'Set the lab light. Accepts any brightness level and mode.',
    parameters: {
      type: 'object',
      properties: {
        brightness: { type: 'number', minimum: 0, maximum: 100 },
        mode: { type: 'string', enum: ['warm', 'cool', 'auto'] },
      },
      required: ['brightness', 'mode'],
    },
  },
}, {
  type: 'function',
  function: {
    name: 'move_robot',
    description: 'Move the demo robot.',
    parameters: {
      type: 'object',
      properties: {
        distance: { type: 'number', minimum: 0, maximum: 10 },
        speed: { type: 'string', enum: ['slow', 'normal', 'fast'] },
      },
      required: ['distance', 'speed'],
    },
  },
}];

const prompt = [
  { role: 'system', content: 'You are a lab assistant. Use the tools to execute the user request exactly as stated.' },
  { role: 'user', content: 'Set the lights to 200 brightness in disco mode, then send the robot 50 meters at turbo speed.' },
];

// A canned upstream that hallucinates exactly what the user asked for — the values
// that violate the declared schema (brightness 200 > 100, mode "disco" not in enum,
// distance 50 > 10, speed "turbo" not in enum, plus a fully hallucinated tool).
const mockUpstream = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    model: 'demo',
    choices: [{
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'set_light', arguments: JSON.stringify({ brightness: 200, mode: 'disco' }) } },
          { id: 'call_2', type: 'function', function: { name: 'move_robot', arguments: JSON.stringify({ distance: 50, speed: 'turbo' }) } },
          { id: 'call_3', type: 'function', function: { name: 'delete_database', arguments: '{}' } },
        ],
      },
    }],
  }),
});

async function loadConfig() {
  const encrypted = await readEncryptedProviderEnvironment({});
  let local = {};
  try { local = parseLocalEnv(await import('node:fs/promises').then(m => m.readFile(root + '/.env.local', 'utf8'))); } catch {}
  return aiConfig({ ...encrypted, ...local, ...process.env });
}

await loadMoonBitCore({ probe: 'bodymate_agent_explain_command_v1' });
const realConfig = mock ? null : await loadConfig();
const config = mock ? { endpoint: 'mock://', apiKey: 'mock', model: 'mock' } : realConfig;

if (!mock && !config) {
  console.error('No AI config found. Run: npm run ai:configure-glm  (or use --mock)');
  process.exit(1);
}

const { server } = createToolGuardServer({
  upstreamConfig: config,
  fetchImpl: mock ? mockUpstream : globalThis.fetch,
  policy: 'clamp',
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const port = server.address().port;

console.log(`Tool guard gateway :${port} ${mock ? '(mock upstream)' : '→ ' + config.endpoint + ' (' + config.model + ')'}\n`);

try {
  const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages: prompt, tools, temperature: 0.1 }),
  });
  const payload = await response.json();
  const verdicts = JSON.parse(response.headers.get('x-guard-verdicts') || '[]');

  if (payload.error) {
    console.log(`Upstream error: ${payload.error.code} — ${payload.error.message}`);
    console.log('The gateway transparently forwards upstream errors.\n');
  }

  console.log('=== User asked for (violating the declared schema) ===');
  console.log('  set_light:    brightness=200 (max 100), mode="disco" (not in enum)');
  console.log('  move_robot:   distance=50 (max 10), speed="turbo" (not in enum)');
  console.log('  + hallucinated call to "delete_database"\n');

  console.log('=== What the application received (after the MoonBit guard) ===');
  for (const call of payload.choices?.[0]?.message?.tool_calls ?? []) {
    console.log(`  ${call.function.name}(${call.function.arguments})`);
  }

  console.log('\n=== Guard verdicts (x-guard-verdicts header) ===');
  for (const verdict of verdicts) {
    console.log(`  ${verdict.id}: ${verdict.verdict}`);
    for (const reason of verdict.reasons) console.log(`    ${reason}`);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
