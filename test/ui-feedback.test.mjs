import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/runtime/moonbit-core.js';

const sample = (...args) => {
  const [status, version, payload] = globalThis.bodymate_ui_feedback_v1(...args).split('|');
  assert.equal(status, 'ok');
  assert.equal(version, 'ui-feedback-v1');
  return Object.fromEntries(payload.split(',').map(field => {
    const [key, value] = field.split('=');
    return [key, Number(value)];
  }));
};

test('compiled MoonBit feedback bounds errant DOM samples without leaving invalid CSS values', () => {
  for (const x of [-Infinity, -4, -1, 0, 1, 4, Infinity, NaN]) {
    for (const y of [-Infinity, -4, -1, 0, 1, 4, Infinity, NaN]) {
      const state = sample(x, y, true, false, true);
      assert.ok(Object.values(state).every(Number.isFinite));
      assert.ok(Math.abs(state.x) <= 1.5 && Math.abs(state.rx) <= 2 && Math.abs(state.ry) <= 2);
      assert.equal(state.y, -2);
    }
  }
});

test('leaving a button and accessibility changes always clear spatial feedback', () => {
  sample(1, 1, true, false, true);
  assert.deepEqual(sample(1, 1, false, false, true), { x: 0, y: 0, rx: 0, ry: 0, duration: 200 });
  assert.deepEqual(sample(1, 1, true, true, true), { x: 0, y: 0, rx: 0, ry: 0, duration: 0 });
  assert.deepEqual(sample(1, 1, true, false, false), { x: 0, y: 0, rx: 0, ry: 0, duration: 0 });
});
