import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { neckRegistry } from '../src/anatomy/neck-registry.mjs';
import { coachBubblePlan, coachPlacementPlan, coachPresentationPlan, coachScaleForViewport, coachTransitionPlan } from '../src/coach-c/placement.mjs';

const root = new URL('../', import.meta.url);
const glb = await readFile(new URL('assets/anatomy/human-atlas/neck-muscles.glb', root));
const runtime = await readFile(new URL('src/root-scm/runtime-entry.mjs', root), 'utf8');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const bounds = { min: { x: -.06, y: 1.38, z: -.06 }, max: { x: .06, y: 1.58, z: .06 } };
const desktop = { width: 900, height: 600 };
const basis = { cameraDirection: [0, .2, 1], cameraRight: [1, 0, 0] };

test('Coach C placement and point target derive from selected real mesh bounds', () => {
  const plan = coachPlacementPlan({ bounds, viewport: desktop, projectedCenter: { x: 250, y: 300 }, ...basis });
  assert.deepEqual(plan.target, { x: 0, y: 1.48, z: 0 });
  assert.deepEqual(plan.pointTarget, plan.target);
  assert.equal(plan.side, 'right');
  assert.ok(plan.position.x > plan.target.x, 'left-screen structure should place C on its screen-right side');
});

test('Coach C uses deterministic side choice and camera basis rather than anatomy-specific coordinates', () => {
  const left = coachPlacementPlan({ bounds, viewport: desktop, projectedCenter: { x: 810, y: 300 }, ...basis });
  const right = coachPlacementPlan({ bounds, viewport: desktop, projectedCenter: { x: 90, y: 300 }, ...basis });
  const rotated = coachPlacementPlan({ bounds, viewport: desktop, projectedCenter: { x: 90, y: 300 }, cameraDirection: [-1, .2, 0], cameraRight: [0, 0, 1] });
  assert.equal(left.side, 'left');
  assert.equal(right.side, 'right');
  assert.notDeepEqual(right.position, rotated.position);
});

test('Coach C changes target when the selected structure bounds change', () => {
  const first = coachPlacementPlan({ bounds, viewport: desktop, projectedCenter: { x: 250, y: 300 }, ...basis });
  const second = coachPlacementPlan({ bounds: { min: { x: .03, y: 1.2, z: -.02 }, max: { x: .16, y: 1.45, z: .08 } }, viewport: desktop, projectedCenter: { x: 650, y: 320 }, ...basis });
  assert.notDeepEqual(first.target, second.target);
  assert.deepEqual(second.pointTarget, second.target);
});

test('Coach C scales down on mobile and transitions immediately only for reduced motion', () => {
  const desktopScale = coachScaleForViewport({ viewport: desktop, radius: .12 });
  const mobileScale = coachScaleForViewport({ viewport: { width: 390, height: 844 }, radius: .12 });
  assert.ok(mobileScale < desktopScale);
  assert.equal(coachTransitionPlan({ from: [0, 0, 0], to: [1, 2, 3], reducedMotion: true }).immediate, true);
  assert.equal(coachTransitionPlan({ from: [0, 0, 0], to: [1, 2, 3], reducedMotion: false }).immediate, false);
});

test('Coach C bubble stays in viewport and yields to the selected label', () => {
  const bubble = coachBubblePlan({ coachScreen: { x: 890, y: 20 }, viewport: desktop, selectedLabelScreen: { x: 850, y: 40 } });
  assert.ok(bubble.x >= 12 && bubble.x <= desktop.width - bubble.width - 12);
  assert.ok(bubble.y >= 12 && bubble.y <= desktop.height - bubble.height - 12);
  assert.ok(Math.abs(bubble.y - 40) > 28, 'bubble must avoid selected label band');
});

test('Coach presentation consumes snapshots without changing MoonBit facts and survives isolate/restore', () => {
  const snapshot = Object.freeze({ selected: neckRegistry[0].structureId, isolated: true, region: 'neck', layer: 'muscle', overview: false, revision: 7 });
  const isolated = coachPresentationPlan(snapshot, bounds);
  const restored = coachPresentationPlan({ ...snapshot, isolated: false }, bounds);
  assert.equal(isolated.visible, true);
  assert.equal(restored.visible, true);
  assert.deepEqual(isolated.target, restored.target);
  assert.equal(snapshot.isolated, true);
});

test('Coach C keeps offline and frozen anatomy contracts intact', () => {
  assert.equal(hash(glb), 'FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065');
  assert.equal(neckRegistry.length, 14);
  assert.match(runtime, /coach-c/);
  assert.match(runtime, /coachPlacementPlan/);
  assert.doesNotMatch(runtime, /\bfetch\s*\(/);
  assert.doesNotMatch(runtime, /loadAsync\s*\(/);
});
