import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import '../assets/runtime/moonbit-core.js';
import { motionDefinitions, motionForQuery, parameterDefinitions, motionPresets, normalizeMotionParameters, motionSession } from '../src/full-muscle/motion-domain.mjs';

test('JavaScript consumes the MoonBit complete-body contract', () => {
  assert.deepEqual(motionDefinitions.map(({ id, title, duration }) => ({ id, title, duration })), [
    { id: 'push_up', title: '俯卧撑', duration: 4 },
    { id: 'squat', title: '深蹲', duration: 4.4 },
    { id: 'curl', title: '弯举', duration: 3.6 },
  ]);
  assert.equal(motionForQuery('演示 push-up').id, 'push_up');
  assert.equal(parameterDefinitions.squat.length, 3);
  assert.equal(motionPresets.push_up[0].parameters.handWidth, .85);
  assert.deepEqual(normalizeMotionParameters('push_up', { handWidth: 9 }).parameters, { handWidth: 1.8, elbowAngle: 45 });
  motionSession.reset();
  assert.equal(motionSession.play('curl', {}, false, false).motion, 'curl');
  assert.equal(motionSession.tick(1.8).phase, .5);
  assert.equal(motionSession.setPaused(true).paused, true);
});

test('authored complete-body facts and playback authority are absent from JavaScript', async () => {
  const [parameters, rig, runtime] = await Promise.all([
    readFile(new URL('../src/full-muscle/motion-parameters.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/full-muscle/rig-definition.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/full-muscle/runtime-entry.mjs', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(parameters, /handWidth.*min|窄距.*handWidth|pubmed\.ncbi/);
  assert.doesNotMatch(rig, /export const motionDefinitions\s*=\s*Object\.freeze\(\[|title:\s*'俯卧撑'|aliases:\s*\['俯卧撑'|standingHeight|root\.z -=|wrist = id ===/);
  assert.doesNotMatch(runtime, /let paused\s*=|let speed\s*=|mixer\?\.update\(delta\)/);
  assert.match(runtime, /motionSession\.tick\(delta\)/);
});
