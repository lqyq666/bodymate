import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('keeps the three-view exploration contract in the offline page', () => {
  for (const id of [
    'nav-canvas',
    'detail-canvas',
    'orb-canvas',
    'isolate',
    'chat-input',
    'history-open',
    'progress-open',
  ]) {
    assert.match(source, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }

  assert.match(source, /const navCamera=.*detailCamera=/s);
  assert.match(source, /selectionRevision/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /window\.__bodymate=/);
});

test('does not add external runtime dependencies or medical claims', () => {
  assert.doesNotMatch(source, /<script[^>]+src=["']https?:\/\//i);
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.match(source, /非真实解剖资产/);
  assert.match(source, /不提供医学或拉伸建议/);
});

test('delegates selection revision and explicit muscle entry to the embedded core', () => {
  const controller = source.slice(source.indexOf('/* Interaction controller.'));
  assert.doesNotMatch(controller, /selectionRevision\+\+/);
  assert.doesNotMatch(controller, /state\.(region|selected|layer|isolated|whole)\s*=(?!=)/);
  assert.match(controller, /bodymate_core_select_region_layer/);
  assert.match(controller, /Number\.isSafeInteger\(revision\)/);
});
