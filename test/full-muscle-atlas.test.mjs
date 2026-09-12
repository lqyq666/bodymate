import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { NodeIO } from '@gltf-transform/core';
import { fullMuscleExclusionReason } from '../src/anatomy/full-muscle-policy.mjs';
import { fullMuscleRegistry } from '../src/anatomy/full-muscle-registry.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('assets/anatomy/human-atlas/full-muscles.manifest.json', root), 'utf8'));
const glb = await readFile(new URL('assets/anatomy/human-atlas/full-muscles.glb', root));
const runtimeSource = await readFile(new URL('src/full-muscle/runtime-entry.mjs', root), 'utf8');
const adapterSource = await readFile(new URL('assets/runtime/full-muscle-root-adapter.js', root), 'utf8');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();

test('ships every included Human Atlas muscular mesh while excluding configured genital-region entries', async () => {
  assert.equal(manifest.entries.length, 401);
  assert.equal(fullMuscleRegistry.length, manifest.entries.length);
  assert.equal(manifest.excludedEntries.length, 1);
  assert.equal(manifest.excludedEntries[0].id, 'FJ1450');
  assert.ok(manifest.excludedEntries[0].reason.includes('perineal'));
  assert.equal(hash(glb), manifest.outputSha256);
  assert.ok(manifest.entries.every((entry) => !fullMuscleExclusionReason(entry.canonicalName)));
  assert.deepEqual(fullMuscleRegistry.map((entry) => entry.structureId), manifest.entries.map((entry) => entry.structureId));
  const document = await new NodeIO().readBinary(glb);
  assert.deepEqual(document.getRoot().listNodes().map((node) => node.getName()).sort(), manifest.entries.map((entry) => entry.structureId).sort());
  assert.equal(document.getRoot().listSkins().length, 0);
  assert.equal(document.getRoot().listAnimations().length, 0);
});

test('full-body integration uses the rigged asset and retains grouped selection', () => {
  assert.match(runtimeSource, /rigged-body\.glb/);
  assert.match(runtimeSource, /selectGroup/);
  assert.match(runtimeSource, /findAll/);
  assert.match(runtimeSource, /playPushUp/);
  assert.match(runtimeSource, /THREE\.AnimationMixer/);
  assert.match(adapterSource, /viewer\.playMotion/);
  assert.match(adapterSource, /viewer\.setView/);
  assert.match(adapterSource, /viewer\.seek/);
});

test('clean-clone build verifies committed full-body assets without the upstream source cache', () => {
  const output = execFileSync(process.execPath, ['scripts/build-human-atlas-full.mjs', '--from-committed'], { cwd: fileURLToPath(root), encoding: 'utf8' });
  assert.match(output, /Verified committed Human Atlas full-muscle GLB \(401 meshes;/);
});
