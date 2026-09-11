import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildHumanAtlasNeck } from './build-human-atlas-neck.mjs';

const root = new URL('../', import.meta.url);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const temporary = await mkdtemp(join(tmpdir(), 'bodymate-human-atlas-neck-rebuild-'));
try {
  const committed = await readFile(new URL('assets/anatomy/human-atlas/neck-muscles.glb', root));
  const { glb } = await buildHumanAtlasNeck({ outputDir: temporary });
  assert.equal(hash(glb), hash(committed), 'deterministic Human Atlas rebuild must reproduce the committed GLB');
  console.log(`Deterministic Human Atlas neck rebuild PASS (${hash(glb)})`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
