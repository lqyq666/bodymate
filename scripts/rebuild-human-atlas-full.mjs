import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildHumanAtlasFull } from './build-human-atlas-full.mjs';

const root = new URL('../', import.meta.url);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const temporary = await mkdtemp(join(tmpdir(), 'bodymate-human-atlas-full-rebuild-'));
try {
  const committed = await readFile(new URL('assets/anatomy/human-atlas/full-muscles.glb', root));
  const { glb } = await buildHumanAtlasFull({ outputDir: temporary, registryOutput: join(temporary, 'full-muscle-registry.mjs') });
  assert.equal(hash(glb), hash(committed), 'deterministic Human Atlas rebuild must reproduce the committed full-muscle GLB');
  console.log(`Deterministic Human Atlas full-muscle rebuild PASS (${hash(glb)})`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
