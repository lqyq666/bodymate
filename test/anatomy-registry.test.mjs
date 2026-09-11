import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { NodeIO } from '@gltf-transform/core';
import { neckRegistry } from '../src/anatomy/neck-registry.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('assets/anatomy/human-atlas/manifest.json', root), 'utf8'));
const glb = await readFile(new URL('assets/anatomy/human-atlas/neck-muscles.glb', root));
const generatedRuntime = await readFile(new URL('assets/runtime/anatomy-registry.js', root), 'utf8');
const html = await readFile(new URL('index.html', root), 'utf8');
const rootAdapter = await readFile(new URL('assets/runtime/root-scm-root-adapter.js', root), 'utf8');

test('canonical neck registry has exactly three unique Human Atlas structures with complete source identity', () => {
  assert.equal(neckRegistry.length, 3);
  assert.equal(new Set(neckRegistry.map((entry) => entry.structureId)).size, neckRegistry.length);
  assert.equal(new Set(neckRegistry.map((entry) => entry.presentationId)).size, neckRegistry.length);
  for (const entry of neckRegistry) {
    assert.match(entry.structureId, /^bodymate\./);
    assert.ok(entry.sourceMeshId);
    assert.ok(entry.sourceConceptId);
    assert.ok(entry.sourceChunk);
    assert.equal(entry.sourceProvider, 'Human Atlas / BodyParts3D 4.0');
  }
});

test('Human Atlas manifest and GLB are a complete projection of the canonical neck registry', async () => {
  const expected = neckRegistry.map(({ structureId, displayNameZh, sourceMeshId, sourceConceptId, sourceChunk }) => ({ structureId, displayNameZh, sourceMeshId, sourceConceptId, sourceChunk }));
  const actual = manifest.entries.map(({ structureId, displayNameZh, sourceMeshId, sourceConceptId, sourceChunk }) => ({ structureId, displayNameZh, sourceMeshId, sourceConceptId, sourceChunk }));
  assert.deepEqual(actual, expected);
  const document = await new NodeIO().readBinary(glb);
  assert.deepEqual(document.getRoot().listNodes().map((node) => node.getName()).sort(), neckRegistry.map((entry) => entry.structureId).sort());
});

test('generated browser registry is an offline projection of the canonical neck registry', () => {
  const context = vm.createContext({});
  context.globalThis = context;
  new vm.Script(generatedRuntime).runInContext(context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.BodyMateAnatomyRegistry)), neckRegistry);
  assert.doesNotMatch(generatedRuntime, /\bfetch\s*\(/);
  assert.match(html, /<script src="assets\/runtime\/anatomy-registry\.js"><\/script><script>\/\* Interaction controller/);
  assert.doesNotMatch(html, /ROOT_REAL_NECK_IDS/);
  assert.match(rootAdapter, /BodyMateAnatomyRegistry/);
  assert.doesNotMatch(rootAdapter, /new Map\(\[/);
});
