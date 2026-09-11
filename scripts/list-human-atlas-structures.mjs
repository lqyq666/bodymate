import { fileURLToPath } from 'node:url';
import { fetchVerifiedHumanAtlasSource } from './human-atlas-source.mjs';

export function matchingHumanAtlasStructures(atlas, query = '') {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return atlas.parts
    .filter((part) => terms.every((term) => part.name.toLowerCase().includes(term)))
    .map(({ id, name, conceptId, system, chunk, vertexCount, indexCount }) => ({ id, name, conceptId, system, chunk: `body-${chunk}.bin`, vertexCount, triangles: indexCount / 3 }));
}

export async function listHumanAtlasStructures(query = '') {
  const files = await fetchVerifiedHumanAtlasSource();
  const atlas = JSON.parse(Buffer.from(files['atlas.json']).toString('utf8'));
  return matchingHumanAtlasStructures(atlas, query);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  listHumanAtlasStructures(process.argv.slice(2).join(' ')).then((entries) => console.log(JSON.stringify(entries, null, 2))).catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}
