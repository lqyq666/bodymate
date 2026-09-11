import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { NodeIO } from '@gltf-transform/core';
import { neckRegistry } from '../src/anatomy/neck-registry.mjs';
import { FROZEN_HUMAN_ATLAS_NECK_SHA, combinedBounds, materialPlanForSnapshot, selectedFocusPlan } from '../src/root-scm/presentation-plan.mjs';
import { labelCapForViewport, labelAnchorFromBounds, layoutLabelPlans, rankedLabelEntries } from '../src/root-scm/label-layout.mjs';

const root = new URL('../', import.meta.url);
const glb = await readFile(new URL('assets/anatomy/human-atlas/neck-muscles.glb', root));
const manifest = JSON.parse(await readFile(new URL('assets/anatomy/human-atlas/manifest.json', root), 'utf8'));
const runtimeSource = await readFile(new URL('src/root-scm/runtime-entry.mjs', root), 'utf8');
const generatedGate = await readFile(new URL('scripts/check-generated.mjs', root), 'utf8');
const ci = await readFile(new URL('.github/workflows/ci.yml', root), 'utf8');
const adapter = await readFile(new URL('assets/runtime/root-scm-root-adapter.js', root), 'utf8');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const boundsFor = (entry) => ({ min: Object.fromEntries(['x', 'y', 'z'].map((axis, index) => [axis, entry.bounds.min[index]])), max: Object.fromEntries(['x', 'y', 'z'].map((axis, index) => [axis, entry.bounds.max[index]])) });

test('Human Atlas neck asset remains frozen at fourteen mapped mesh nodes', async () => {
  assert.equal(hash(glb), FROZEN_HUMAN_ATLAS_NECK_SHA);
  assert.equal(neckRegistry.length, 14);
  const document = await new NodeIO().readBinary(glb);
  const nodes = document.getRoot().listNodes();
  assert.equal(nodes.length, 14);
  assert.deepEqual(nodes.map((node) => node.getName()).sort(), neckRegistry.map((entry) => entry.structureId).sort());
});

test('material plans keep real anatomy context opaque while only the selected mesh is blue', () => {
  const selected = neckRegistry[0].structureId;
  const active = materialPlanForSnapshot({ selected, isolated: false, overview: false }, selected);
  const context = materialPlanForSnapshot({ selected, isolated: false, overview: false }, neckRegistry[1].structureId);
  assert.deepEqual(active.color, '#83B9F4');
  assert.deepEqual(context.color, '#E7EDF1');
  assert.equal(active.visible, true);
  assert.equal(context.visible, true);
  assert.equal(active.opacity, 1);
  assert.equal(context.opacity, 1);
  assert.equal(materialPlanForSnapshot({ selected, isolated: true, overview: false }, neckRegistry[1].structureId).visible, false);
});

test('focus retains the supplied viewing direction and restore framing comes from real combined bounds', () => {
  const one = boundsFor(manifest.entries[0]);
  const direction = [-.3, .8, .5];
  const selected = selectedFocusPlan(one, direction);
  assert.deepEqual(selected.direction, direction);
  assert.deepEqual(selected.target, labelAnchorFromBounds(one));
  const group = combinedBounds(manifest.entries.map(boundsFor));
  assert.ok(group.min.x < one.min.x && group.max.x > one.max.x);
  assert.ok(selectedFocusPlan(group, direction, { context: true }).distance > selected.distance);
});

test('real-bound labels are deterministic, selected-first, lane-spaced, and responsive to viewport caps', () => {
  const selected = neckRegistry[0];
  const entries = neckRegistry.map((entry, index) => ({ entry, anchor: labelAnchorFromBounds(boundsFor(manifest.entries[index])) }));
  const ranked = rankedLabelEntries(entries, selected.structureId, 5);
  assert.equal(ranked[0].entry.structureId, selected.structureId);
  assert.equal(ranked.length, 5);
  assert.equal(labelCapForViewport(1440), 5);
  assert.equal(labelCapForViewport(390), 3);
  const plans = layoutLabelPlans(ranked, { width: 800, height: 500, project: (anchor) => ({ x: anchor.x * 1000 + 400, y: 400 - anchor.y * 180, z: 0 }) });
  assert.equal(plans.length, 5);
  assert.ok(plans.every((plan) => plan.anchor && plan.leader && plan.visible));
  const perLane = new Map();
  for (const plan of plans) perLane.set(plan.lane, [...(perLane.get(plan.lane) || []), plan.y]);
  for (const ys of perLane.values()) for (let index = 1; index < ys.length; index += 1) assert.ok(Math.abs(ys[index] - ys[index - 1]) >= 26);
});

test('runtime presentation remains snapshot-driven, bounds-based, and offline-classic-script compatible', () => {
  assert.match(runtimeSource, /materialPlanForSnapshot\(snapshot, id\)/);
  assert.match(runtimeSource, /meshBounds\.set\(id, plainBounds\(new THREE\.Box3\(\)\.setFromObject\(node\)\)\)/);
  assert.match(runtimeSource, /focusContext/);
  assert.match(runtimeSource, /currentDirection\(\)/);
  assert.match(runtimeSource, /labelAnchorFromBounds\(meshBounds\.get/);
  assert.doesNotMatch(runtimeSource, /\bfetch\s*\(/);
  assert.doesNotMatch(runtimeSource, /loadAsync\s*\(/);
  assert.match(runtimeSource, /onPick\(hit\.object\.userData\.structureId\)/);
});

test('generated artifact gate validates all committed browser artifacts and CI rejects stale output', () => {
  for (const artifact of ['index.html', 'assets/runtime/anatomy-registry.js', 'assets/runtime/root-scm-runtime.js']) {
    assert.match(generatedGate, new RegExp(artifact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(ci, new RegExp(artifact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(generatedGate, /Generated artifacts are stale/);
});

test('right card is registry-driven and the adapter leaves focus intent with the renderer', () => {
  assert.match(adapter, /entry\.canonicalName\.toUpperCase\(\)/);
  assert.match(adapter, /groupName\(entry\.uiGroup\)/);
  assert.match(adapter, /sideName\(entry\.side\)/);
  assert.match(adapter, /用于结构位置与形态认知/);
  assert.match(adapter, /viewer\.applySnapshot\(snapshot\)/);
  assert.doesNotMatch(adapter, /viewer\.focusSelected\(\)/);
});
