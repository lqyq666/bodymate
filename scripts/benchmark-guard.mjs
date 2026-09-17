// Reproducible benchmark for the MoonBit guard via the JS wire.
// Usage: node scripts/benchmark-guard.mjs
import { fileURLToPath } from 'node:url';
import { loadMoonBitCore } from './load-moonbit-core.mjs';
import { allowlistWire, explainCommand } from '../src/ai/agent-guard.mjs';

await loadMoonBitCore({ probe: 'bodymate_agent_explain_command_v1' });

// Realistic allowlist: 20 tools, each with 5 fields (3 numeric + 2 enum).
const commands = [];
for (let i = 0; i < 20; i++) {
  commands.push({
    id: 'tool_' + i,
    fields: [
      { key: 'value', min: 0, max: 100 },
      { key: 'count', min: 1, max: 50 },
      { key: 'mode', options: ['fast', 'slow', 'auto'] },
      { key: 'level', min: 0, max: 10 },
      { key: 'type', options: ['a', 'b', 'c'] },
    ],
  });
}
const wire = allowlistWire(commands);

// Realistic proposal: 5 tool calls, each with 5 valid + 2 hallucinated fields.
const proposals = [];
for (let i = 0; i < 5; i++) {
  proposals.push({
    id: 'tool_' + i,
    parameters: { value: 200, count: 75, mode: 'turbo', level: 5, type: 'a', invented_field: 42, another_fake: 'x' },
  });
}

// Warmup.
for (let i = 0; i < 200; i++) {
  for (const p of proposals) explainCommand(p.id, p.parameters, commands, 'clamp');
}

function bench(label, iterations, fn) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const ms = (performance.now() - start) / iterations;
  return { label, microseconds: Math.round(ms * 1000), ops_per_sec: Math.round(1000 / ms) };
}

const results = [
  bench('single call (1 tool, 5 fields, 3 violations)', 10_000,
    () => explainCommand(proposals[0].id, proposals[0].parameters, commands, 'clamp')),
  bench('batch of 5 calls (25 fields, 15 violations)', 2_000,
    () => { for (const p of proposals) explainCommand(p.id, p.parameters, commands, 'clamp'); }),
  bench('valid pass-through (no violations)', 10_000,
    () => explainCommand('tool_0', { value: 50, count: 10, mode: 'fast', level: 5, type: 'a' }, commands, 'clamp')),
  bench('hallucinated tool name (immediate reject)', 10_000,
    () => explainCommand('nonexistent_tool', { value: 1 }, commands, 'clamp')),
];

console.log(`MoonBit guard benchmark — Node ${process.version} (js target)`);
console.log(`allowlist: ${wire.length} bytes for 20 tools × 5 fields\n`);
for (const r of results) {
  console.log(`  ${r.label.padEnd(50)} ${String(r.microseconds).padStart(4)} µs  ${r.ops_per_sec.toLocaleString()} ops/sec`);
}
