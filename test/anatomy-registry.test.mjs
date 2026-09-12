import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { NodeIO } from '@gltf-transform/core';
import { filterNeckRegistry, neckRegistry } from '../src/anatomy/neck-registry.mjs';
import { verifySourceIdentity } from '../scripts/build-human-atlas-neck.mjs';
import { fetchVerifiedHumanAtlasSource } from '../scripts/human-atlas-source.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('assets/anatomy/human-atlas/manifest.json', root), 'utf8'));
const glb = await readFile(new URL('assets/anatomy/human-atlas/neck-muscles.glb', root));
const generatedRuntime = await readFile(new URL('assets/runtime/anatomy-registry.js', root), 'utf8');
const moonbitProjection = JSON.parse(await readFile(new URL('generated/anatomy-registry.json', root), 'utf8'));
const registryModuleSource = await readFile(new URL('src/anatomy/neck-registry.mjs', root), 'utf8');
const html = await readFile(new URL('index.html', root), 'utf8');
const rootAdapter = await readFile(new URL('assets/runtime/root-scm-root-adapter.js', root), 'utf8');

test('canonical neck registry has fourteen unique Human Atlas neck and shoulder structures with complete source identity', () => {
  assert.equal(neckRegistry.length, 14);
  assert.equal(new Set(neckRegistry.map((entry) => entry.structureId)).size, neckRegistry.length);
  assert.equal(new Set(neckRegistry.map((entry) => entry.presentationId)).size, neckRegistry.length);
  for (const entry of neckRegistry) {
    assert.match(entry.structureId, /^bodymate\./);
    assert.match(entry.side, /^(left|right)$/);
    assert.match(entry.uiGroup, /^(neck|shoulder)$/);
    assert.ok(entry.sourceMeshId);
    assert.ok(entry.sourceConceptId);
    assert.ok(entry.sourceChunk);
    assert.equal(entry.sourceProvider, 'Human Atlas / BodyParts3D 4.0');
  }
});

test('the JavaScript registry is a generated projection of the MoonBit canonical registry', () => {
  assert.deepEqual(moonbitProjection, neckRegistry);
  assert.match(registryModuleSource, /GENERATED from MoonBit bodymate_domain_registry_v1/);
  assert.match(registryModuleSource, /const entries = Object\.freeze\(/);
});

test('canonical scalene entries retain all pinned source identities without an anatomy download', () => {
  const candidates = neckRegistry.filter((entry) => entry.canonicalName.includes('scalenus'));
  assert.deepEqual(candidates.map((entry) => entry.sourceMeshId).sort(), ['FJ1570', 'FJ1571', 'FJ1572', 'FJ1592', 'FJ1593', 'FJ1594']);
  for (const candidate of candidates) {
    assert.match(candidate.canonicalName, /scalenus/i);
    assert.match(candidate.sourceChunk, /^body-[45]\.bin$/);
    assert.match(candidate.sourceConceptId, /^FMA\d+$/);
  }
});

test('registry filter supports Chinese and English local search plus a side selector', () => {
  assert.deepEqual(filterNeckRegistry({ side: 'left', query: 'scalenus' }).map((entry) => entry.sourceMeshId), ['FJ1570', 'FJ1571', 'FJ1572']);
  assert.deepEqual(filterNeckRegistry({ side: 'right', query: '头夹肌' }).map((entry) => entry.sourceMeshId), ['FJ1545']);
  assert.equal(filterNeckRegistry({ uiGroup: 'shoulder' }).length, 4);
});

test('Human Atlas manifest and GLB are a complete projection of the canonical neck registry', async () => {
  const expected = neckRegistry.map(({ structureId, displayNameZh, sourceMeshId, sourceConceptId, sourceChunk }) => ({ structureId, displayNameZh, sourceMeshId, sourceConceptId, sourceChunk }));
  const actual = manifest.entries.map(({ structureId, displayNameZh, sourceMeshId, sourceConceptId, sourceChunk }) => ({ structureId, displayNameZh, sourceMeshId, sourceConceptId, sourceChunk }));
  assert.deepEqual(actual, expected);
  const document = await new NodeIO().readBinary(glb);
  assert.deepEqual(document.getRoot().listNodes().map((node) => node.getName()).sort(), neckRegistry.map((entry) => entry.structureId).sort());
});

test('Human Atlas builder rejects source identity drift before producing a registry projection', async () => {
  const atlas = { parts: neckRegistry.map((entry) => ({ id: entry.sourceMeshId, chunk: entry.sourceChunk.slice(5, -4), conceptId: entry.sourceConceptId })) };
  atlas.parts.find((part) => part.id === 'FJ1595').conceptId = 'FMA0';
  assert.throws(() => verifySourceIdentity(atlas), /source identity drift for FJ1595/);
});

test('normal CI refuses to fetch uncached anatomy sources', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'bodymate-human-atlas-no-network-'));
  try {
    await assert.rejects(fetchVerifiedHumanAtlasSource({ cacheDir }), /BODYMATE_ALLOW_NETWORK=1/);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test('generated browser registry is an offline projection of the canonical neck registry', () => {
  const context = vm.createContext({});
  context.globalThis = context;
  new vm.Script(generatedRuntime).runInContext(context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.BodyMateAnatomyRegistry)), neckRegistry);
  assert.deepEqual(JSON.parse(JSON.stringify(context.BodyMateAnatomyRegistryFilter({ side: 'left', query: 'scalenus' }).map((entry) => entry.sourceMeshId))), ['FJ1570', 'FJ1571', 'FJ1572']);
  assert.doesNotMatch(generatedRuntime, /\bfetch\s*\(/);
  assert.match(html, /<script src="assets\/runtime\/anatomy-registry\.js"><\/script><script src="assets\/runtime\/coach-query-runtime\.js"><\/script><script>\/\* Interaction controller/);
  assert.doesNotMatch(html, /ROOT_REAL_NECK_IDS/);
  assert.match(rootAdapter, /BodyMateAnatomyRegistry/);
  assert.doesNotMatch(rootAdapter, /new Map\(\[/);
});
