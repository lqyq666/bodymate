import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { NodeIO } from '@gltf-transform/core';
import { canonicalScmId, entryForPresentationId, legacyPresentationIdForCoreId, rootScmRegistry } from '../src/root-scm/registry.mjs';
import { focusPlanFromBounds, parseCoreSnapshot, parseDomainSnapshotV3, parseDomainSnapshotV4, parseDomainSnapshotV5, registerRootEntries, selectPresentationStructure } from '../src/root-scm/domain-adapter.mjs';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const manifest = JSON.parse(await readFile(new URL('assets/anatomy/open-anatomy/manifest.json', root), 'utf8'));
const glb = await readFile(new URL('assets/anatomy/open-anatomy/scm-right.glb', root));
const humanAtlasManifest = JSON.parse(await readFile(new URL('assets/anatomy/human-atlas/manifest.json', root), 'utf8'));
const humanAtlasGlb = await readFile(new URL('assets/anatomy/human-atlas/neck-muscles.glb', root));
const runtime = await readFile(new URL('assets/runtime/root-scm-runtime.js', root), 'utf8');
const bundle = await readFile(new URL('assets/runtime/moonbit-core.js', root), 'utf8');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();

function core() { const context = vm.createContext({}); context.globalThis = context; new vm.Script(bundle).runInContext(context); return context; }
function snapshot(runtime) { return runtime.bodymate_core_snapshot(); }
function node() { return { hidden: false, style: {}, textContent: '', children: [], setAttribute() {}, append(child) { this.children.push(child); } }; }

test('all SCM presentation entrances resolve to one canonical domain ID', () => {
  assert.equal(canonicalScmId, 'bodymate.neck.sternocleidomastoid.right');
  for (const id of ['scm_r', canonicalScmId]) assert.equal(entryForPresentationId(id)?.structureId, canonicalScmId);
  assert.equal(legacyPresentationIdForCoreId(canonicalScmId), 'scm_r');
  assert.equal(entryForPresentationId('unknown-legacy-node'), null);
});

test('root domain adapter registers the canonical SCM once without registering the scm_r presentation ID', () => {
  const runtime = core();
  runtime.bodymate_core_clear();
  registerRootEntries(runtime, [
    { presentationId: 'scm_r', structureId: canonicalScmId, displayNameZh: '右侧胸锁乳突肌', region: 'neck', layer: 'muscle', isDefault: true },
    { presentationId: 'pec_r', structureId: 'pec_r', displayNameZh: '右侧胸大肌', region: 'chest', layer: 'muscle', isDefault: true },
  ]);
  assert.equal(runtime.bodymate_core_select_structure('scm_r'), 'error|unknown_structure');
  const selected = selectPresentationStructure(runtime, 'scm_r');
  assert.equal(selected?.selected, canonicalScmId);
  const before = snapshot(runtime);
  assert.equal(selectPresentationStructure(runtime, 'unknown-legacy-node'), null);
  assert.equal(snapshot(runtime), before);
});

test('root domain adapter only accepts a complete MoonBit v3 multi-highlight snapshot', () => {
  const runtime = core();
  runtime.bodymate_domain_reset();
  runtime.bodymate_domain_execute_action_v1('HIGHLIGHT_STRUCTURE_SET', 'bodymate.neck.set.scalene.right', '');
  const snapshot = parseDomainSnapshotV3(runtime.bodymate_domain_snapshot_v3());
  assert.equal(snapshot?.highlightMode, 'structure_set');
  assert.equal(snapshot?.highlighted.length, 3);
  assert.equal(snapshot?.highlighted[0].role, 'focus');
  assert.equal(parseDomainSnapshotV3('ok|snapshot-v3|3|neck|bodymate.neck.scalene.anterior.right|muscle|false|false|1|structure_set|set|label|bodymate.unknown^focus^100'), null);
});

test('root domain adapter only accepts an evidence-complete MoonBit v4 movement snapshot', () => {
  const runtime = core();
  runtime.bodymate_domain_reset();
  runtime.bodymate_domain_execute_action_v1('SHOW_MOVEMENT_MAPPING', 'shoulder_girdle_elevation', '');
  const movement = parseDomainSnapshotV4(runtime.bodymate_domain_snapshot_v4());
  assert.equal(movement?.activeMovementId, 'shoulder_girdle_elevation');
  assert.equal(movement?.movementMappings.length, 4);
  assert.equal(movement?.movementMappings.filter((item) => item.role === 'main_contributor').length, 2);
  assert.equal(movement?.movementMappings.every((item) => item.evidenceIds.length > 0), true);
  assert.equal(parseDomainSnapshotV4('ok|snapshot-v4|4|neck|bodymate.neck.trapezius.upper.right|muscle|false|false|1|structure_set|set|label|bodymate.neck.trapezius.upper.right^focus^100|movement|label|name|bodymate.neck.unknown^contributor^evidence|note'), null);
});

test('root domain adapter only accepts a provenance-preserving MoonBit v5 comparison snapshot', () => {
  const runtime = core(); runtime.bodymate_domain_reset();
  runtime.bodymate_domain_execute_action_v1('SHOW_MOVEMENT_COMPARISON', 'cervical_flexion,cervical_rotation_right', '');
  const comparison = parseDomainSnapshotV5(runtime.bodymate_domain_snapshot_v5());
  assert.equal(comparison?.comparison?.members.filter((item) => item.bucket === 'overlap').length, 1);
  assert.equal(comparison?.comparison?.members.filter((item) => item.bucket === 'only_left').length, 1);
  assert.equal(comparison?.comparison?.members.filter((item) => item.bucket === 'only_right').length, 1);
  assert.equal(comparison?.comparison?.members.find((item) => item.bucket === 'overlap')?.leftEvidenceIds[0], 'ev.neck.rotation-flexion');
});

test('each Human Atlas muscle selects its canonical ID through MoonBit with one active selection', () => {
  const runtime = core();
  runtime.bodymate_core_clear();
  registerRootEntries(runtime, rootScmRegistry);
  const ids = humanAtlasManifest.entries.map((entry) => entry.structureId);
  for (const id of ids) assert.equal(selectPresentationStructure(runtime, id)?.selected, id);
  assert.equal(selectPresentationStructure(runtime, ids[0])?.selected, ids[0]);
  assert.equal(selectPresentationStructure(runtime, ids[1])?.selected, ids[1]);
  assert.equal(parseCoreSnapshot(snapshot(runtime)).selected, ids[1], 'switching SCM → trapezius must clear SCM selection');
});

test('Human Atlas pick bridge forwards the picked canonical mesh ID to MoonBit', async () => {
  const adapter = await readFile(new URL('assets/runtime/root-scm-root-adapter.js', root), 'utf8');
  const selectors = ['#detail-view', '#detail-canvas', '.current-summary', '#label-lines', '#anatomy-labels', '#coach-bubble', '.detail-instruction', '.fiber-note', '.data-tag', '#selection-meta', '#selection-name'];
  const nodes = new Map(selectors.map((selector) => [selector, node()]));
  const selected = [];
  let onPick;
  const context = vm.createContext({
    document: { querySelector: (selector) => nodes.get(selector) ?? null, createElement: () => node() },
    location: { search: '' }, URLSearchParams,
    console: { error() {} },
    __bodymate: { state: { selected: canonicalScmId, whole: false }, select: (id) => selected.push(id) },
    BodyMateRootScmRuntime: { mount: (options) => { onPick = options.onPick; return { show() {}, applySnapshot() {}, focusSelected() {} }; } },
  });
  context.globalThis = context;
  new vm.Script(adapter).runInContext(context);
  for (const entry of humanAtlasManifest.entries) onPick(entry.structureId);
  assert.deepEqual(selected, humanAtlasManifest.entries.map((entry) => entry.structureId));
});

test('Stage 5B routes real-viewer controls and blocks unsupported navigator regions', async () => {
  const adapter = await readFile(new URL('assets/runtime/root-scm-root-adapter.js', root), 'utf8');
  const runtimeSource = await readFile(new URL('src/root-scm/runtime-entry.mjs', root), 'utf8');
  const selectors = ['#detail-view', '#detail-canvas', '.current-summary', '#label-lines', '#anatomy-labels', '#coach-bubble', '.detail-instruction', '.fiber-note', '.data-tag', '#selection-meta', '#selection-name'];
  const nodes = new Map(selectors.map((selector) => [selector, node()]));
  const calls = [];
  const context = vm.createContext({
    document: { querySelector: (selector) => nodes.get(selector) ?? null, createElement: () => node() },
    location: { search: '' }, URLSearchParams,
    console: { error() {} },
    BodyMateAnatomyRegistry: [{ structureId: canonicalScmId, displayNameZh: '右侧胸锁乳突肌', canonicalName: 'right sternocleidomastoid', uiGroup: 'neck', side: 'right', sourceProvider: 'Human Atlas / BodyParts3D 4.0' }],
    __bodymate: { state: { selected: canonicalScmId, whole: false } },
    BodyMateRootScmRuntime: { mount: () => ({ show() {}, applySnapshot() {}, resetCamera() { calls.push('reset'); }, setPulseEnabled(value) { calls.push(['pulse', value]); }, setLabelsVisible(value) { calls.push(['labels', value]); } }) },
  });
  context.globalThis = context;
  new vm.Script(adapter).runInContext(context);
  context.__rootScmResetView();
  context.__rootScmSetPulseEnabled(true);
  context.__rootScmSetLabelsVisible(false);
  assert.deepEqual(calls, ['reset', ['pulse', true], ['labels', false]]);

  assert.match(html, /const SUPPORTED_NAVIGATION_REGIONS=new Set\(ROOT_ANATOMY_REGISTRY\.map\(entry=>entry\.region\)\)/);
  assert.match(html, /function gotoRegion\(reg,id=null,layer=null\)\{if\(!REGIONS\[reg\]\)return false;if\(!SUPPORTED_NAVIGATION_REGIONS\.has\(reg\)\)\{toast\(/);
  assert.match(html, /for\(const key of SUPPORTED_NAVIGATION_REGIONS\)/);
  assert.match(html, /globalThis\.__rootScmSetLabelsVisible\?\.\(state\.labels/);
  assert.match(html, /globalThis\.__rootScmSetPulseEnabled\?\.\(state\.pulse/);
  assert.match(html, /globalThis\.__rootScmResetView\?\.\(\)/);
  assert.match(runtimeSource, /const resetCamera = \(\) => focusContext\(defaultCameraDirection\)/);
  assert.match(runtimeSource, /const updatePulse = \(timestamp\) =>/);
  assert.match(runtimeSource, /pulseEnabled && plan\.selected/);
  assert.match(runtimeSource, /if \(!labelsVisible\) \{ selectedLabelScreen = null;/);
  assert.match(runtimeSource, /setPulseEnabled\(enabled\) \{ pulseEnabled = Boolean\(enabled\)/);
  assert.match(runtimeSource, /setLabelsVisible\(visible\) \{ labelsVisible = Boolean\(visible\); updateLabels\(\); \}/);
  assert.match(html, /卧推动作演示已就绪 · 本地预制动画/);
});

test('root legacy rendering comparisons resolve through the canonical ID adapter', () => {
  const controller = html;
  assert.match(controller, /coreIdFor\(m\.id\)===state\.selected/);
  assert.match(controller, /coreIdFor\(f\.id\)===state\.selected/);
  assert.doesNotMatch(controller, /\b[mdf]\.id===state\.selected/);
});

test('bounds focus uses real SCM bounds rather than a hard-coded camera target', () => {
  const bounds = manifest.boundingBox.outputGltfMeters;
  const plan = focusPlanFromBounds({ min: { x: bounds.min[0], y: bounds.min[1], z: bounds.min[2] }, max: { x: bounds.max[0], y: bounds.max[1], z: bounds.max[2] } });
  assert.ok(plan.distance > 0 && Number.isFinite(plan.distance));
  assert.notDeepEqual(plan.target, { x: 0, y: 0, z: 0 });
  assert.equal(plan.direction.length, 3);
});

test('root retains legacy views and restores the legacy presentation on real-viewer failure', async () => {
  const adapter = await readFile(new URL('assets/runtime/root-scm-root-adapter.js', root), 'utf8');
  for (const id of ['nav-canvas', 'detail-canvas', 'orb-canvas']) assert.match(html, new RegExp(`id=["']${id}["']`));
  assert.match(html, /assets\/runtime\/root-scm-runtime\.js/);
  assert.match(html, /root-scm-root-adapter\.js/);
  assert.match(adapter, /root-scm-canvas/);
  assert.match(adapter, /真实 SCM 资源未能初始化/);
  assert.match(adapter, /root-scm-fail/);
  assert.match(adapter, /legacy\.hidden = false/);
  assert.match(adapter, /canvas\.hidden = true/);
  assert.match(adapter, /tag\.textContent = legacyTag/);
  assert.match(adapter, /overlays\.forEach\(\(node\) => \{ node\.style\.visibility = ''; \}\)/);
  assert.match(adapter, /Human Atlas \/ BodyParts3D 4\.0/);
  assert.match(adapter, /assets\/anatomy\/human-atlas\/ATTRIBUTION\.md/);
  assert.match(adapter, /bodymate_domain_evidence_v1/);
  assert.doesNotMatch(adapter, /\bfetch\s*\(/);
});

test('forced real-viewer failure keeps isolate and restore snapshots on the legacy canvas with the placeholder tag', async () => {
  const adapter = await readFile(new URL('assets/runtime/root-scm-root-adapter.js', root), 'utf8');
  const selectors = ['#detail-view', '#detail-canvas', '.current-summary', '#label-lines', '#anatomy-labels', '#coach-bubble', '.detail-instruction', '.fiber-note', '.data-tag', '#selection-meta', '#selection-name'];
  const nodes = new Map(selectors.map((selector) => [selector, node()]));
  const context = vm.createContext({
    document: { querySelector: (selector) => nodes.get(selector) ?? null, createElement: () => node() },
    location: { search: '?root-scm-fail=1' }, URLSearchParams,
    console: { error() {} },
    __bodymate: { state: { selected: canonicalScmId, whole: false } },
  });
  context.globalThis = context;
  new vm.Script(adapter).runInContext(context);
  const canvas = nodes.get('#detail-view').children[0];
  const tag = nodes.get('.data-tag');
  for (const isolated of [true, false]) context.__rootScmApply({ selected: canonicalScmId, whole: false, isolated });
  assert.equal(canvas.hidden, true);
  assert.equal(nodes.get('#detail-canvas').hidden, false);
  assert.equal(tag.textContent, '交互占位 · 非解剖教材');
  assert.equal(nodes.get('#label-lines').style.visibility, '');
});

test('generated classic runtime is derived from the pinned Human Atlas neck GLB and has no external anatomy request', async () => {
  const source = await readFile(new URL('src/root-scm/runtime-entry.mjs', root), 'utf8');
  assert.equal(hash(humanAtlasGlb), humanAtlasManifest.outputSha256);
  assert.match(runtime, /GENERATED DERIVED RUNTIME REPRESENTATION/);
  assert.match(runtime, new RegExp(humanAtlasManifest.outputSha256));
  assert.match(runtime, /BodyMateRootScmRuntime/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /loadAsync\s*\(/);
});

test('Human Atlas neck package pins fourteen independently named real meshes with CC BY attribution', () => {
  assert.equal(humanAtlasManifest.sourceCommit, '1c38bf35c254a891200d3cedecfd57abebe83d8d');
  assert.equal(humanAtlasManifest.license, 'CC BY 4.0');
  assert.deepEqual(humanAtlasManifest.entries.map((entry) => entry.sourceMeshId), rootScmRegistry.map((entry) => entry.sourceMeshId));
  assert.deepEqual(humanAtlasManifest.entries.map((entry) => entry.structureId), rootScmRegistry.map((entry) => entry.structureId));
  assert.equal(humanAtlasManifest.entries.length, 14);
  assert.match(html, /BodyMateAnatomyRegistryFilter/);
  assert.match(html, /data-neck-group="shoulder"/);
});

test('committed Human Atlas neck GLB preserves all fourteen mapped meshes and their documented topology', async () => {
  const document = await new NodeIO().readBinary(humanAtlasGlb);
  const nodes = document.getRoot().listNodes();
  for (const entry of humanAtlasManifest.entries) {
    const node = nodes.find((candidate) => candidate.getName() === entry.structureId);
    assert.ok(node?.getMesh(), `${entry.structureId} should have a real GLB mesh`);
    const primitive = node.getMesh().listPrimitives()[0];
    assert.equal(primitive.getAttribute('POSITION').getCount(), entry.vertexCount);
    assert.equal(primitive.getIndices().getCount() / 3, entry.triangleCount);
  }
});

test('canonical public source retains provenance gates for root integration', async () => {
  const [license, notice] = await Promise.all(['LICENSE.md', 'NOTICE.md'].map((file) => readFile(new URL(`assets/anatomy/open-anatomy/${file}`, root), 'utf8')));
  assert.match(license, /3D Slicer Contribution and Software License Agreement/);
  assert.match(notice, /Marianna Jakab; Ron Kikinis/);
  assert.equal(manifest.structureId, canonicalScmId);
});
