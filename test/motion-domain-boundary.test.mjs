import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import '../assets/runtime/moonbit-core.js';
import { motionDefinitions, motionForQuery, motionParameterComparison, motionPhaseGuides, parameterDefinitions, motionPresets, normalizeMotionParameters, motionSession } from '../src/full-muscle/motion-domain.mjs';

test('JavaScript consumes the MoonBit complete-body contract', () => {
  assert.deepEqual(motionDefinitions.map(({ id, title, duration }) => ({ id, title, duration })), [
    { id: 'push_up', title: '俯卧撑', duration: 4 },
    { id: 'squat', title: '深蹲', duration: 4.4 },
    { id: 'curl', title: '弯举', duration: 3.6 },
  ]);
  assert.equal(motionForQuery('演示 push-up').id, 'push_up');
  assert.equal(parameterDefinitions.squat.length, 3);
  assert.equal(motionPresets.push_up[0].parameters.handWidth, .85);
  assert.equal(motionPresets.push_up[1].isBaseline, true);
  assert.deepEqual(motionParameterComparison('squat', { stanceWidth: 1.8, toeAngle: 30, squatDepth: 100 }), {
    title: '宽站距', baselineTitle: '标准', isBaseline: false,
    deltas: [
      { key: 'stanceWidth', label: '站距', unit: '倍髋宽', delta: .6 },
      { key: 'toeAngle', label: '脚尖外展', unit: '°', delta: 10 },
    ],
  });
  assert.deepEqual(motionParameterComparison('push_up'), { title: '标准', baselineTitle: '标准', isBaseline: true, deltas: [] });
  assert.deepEqual(motionPhaseGuides('curl').map(({ id, phase, title }) => ({ id, phase, title })), [
    { id: 'curl_ready', phase: 0, title: '准备姿势' },
    { id: 'curl_flex', phase: .25, title: '屈肘' },
    { id: 'curl_top', phase: .5, title: '最高点' },
    { id: 'curl_extend', phase: .75, title: '伸肘' },
  ]);
  assert.strictEqual(motionPhaseGuides('curl'), motionPhaseGuides('curl'));
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
