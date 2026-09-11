import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const root = fileURLToPath(new URL('..', import.meta.url));
for (const [name, concept] of [['FJ1595', 'FMA13408'], ['FJ1521', 'FMA33586']]) {
  const source = await readFile(join(root, 'prototype', 'real-neck', 'local-assets', `${name}.obj`), 'utf8');
  assert.match(source, new RegExp(`File ID : ${name}`));
  assert.match(source, new RegExp(`Concept ID : ${concept}`));
  assert.match(source, /^v /m, `${name} has vertices`);
  assert.match(source, /^f /m, `${name} has faces`);
  let meshes = 0;
  new OBJLoader().parse(source).traverse((node) => { if (node.isMesh) meshes += 1; });
  assert.equal(meshes, 1, `${name} parses to one independently selectable mesh`);
}
console.log('Local BodyParts3D neck assets match the registry provenance.');
