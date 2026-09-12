import { Document, NodeIO } from '@gltf-transform/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attributionUrl, fetchVerifiedHumanAtlasSource, humanAtlasCommit, humanAtlasRepository, rawBaseUrl, sha256, sourceFiles } from './human-atlas-source.mjs';
import { neckRegistry } from '../src/anatomy/neck-registry.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultOutputDir = join(root, 'assets/anatomy/human-atlas');
export const entries = neckRegistry;

export function verifySourceIdentity(atlas) {
  for (const entry of entries) {
    const sourcePart = atlas.parts.find((part) => part.id === entry.sourceMeshId);
    if (!sourcePart) throw Error(`Pinned Human Atlas does not contain ${entry.sourceMeshId}.`);
    if (`body-${sourcePart.chunk}.bin` !== entry.sourceChunk || sourcePart.conceptId !== entry.sourceConceptId) throw Error(`Pinned Human Atlas source identity drift for ${entry.sourceMeshId}.`);
  }
}

function sliceFloat32(bytes, offset, count) { return new Float32Array(bytes.buffer, bytes.byteOffset + offset, count).slice(); }
function sliceNormals(bytes, offset, count) { const source = new Int16Array(bytes.buffer, bytes.byteOffset + offset, count); return Float32Array.from(source, (value) => value / 32767); }
function sliceIndices(bytes, offset, count) { return new Uint32Array(bytes.buffer, bytes.byteOffset + offset, count).slice(); }
function boundsFor(positions) { const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]; for (let index = 0; index < positions.length; index += 3) for (let axis = 0; axis < 3; axis += 1) { min[axis] = Math.min(min[axis], positions[index + axis]); max[axis] = Math.max(max[axis], positions[index + axis]); } return { min, max }; }

export async function buildHumanAtlasNeck({ source, outputDir = defaultOutputDir } = {}) {
  const files = source ?? await fetchVerifiedHumanAtlasSource();
  const atlas = JSON.parse(Buffer.from(files['atlas.json']).toString('utf8'));
  verifySourceIdentity(atlas);
  const document = new Document(), buffer = document.createBuffer('human-atlas-neck-buffer'), scene = document.createScene('bodymate-human-atlas-neck');
  const material = document.createMaterial('human-atlas-neck-material').setBaseColorFactor([.84, .88, .92, 1]).setMetallicFactor(.01).setRoughnessFactor(.58);
  const manifestEntries = [];
  for (const entry of entries) {
    const sourcePart = atlas.parts.find((part) => part.id === entry.sourceMeshId);
    const chunk = files[entry.sourceChunk];
    if (!chunk) throw Error(`No verified Human Atlas chunk loaded for ${entry.sourceMeshId}.`);
    const positions = sliceFloat32(chunk, sourcePart.positions, sourcePart.vertexCount * 3);
    const normals = sliceNormals(chunk, sourcePart.normals, sourcePart.vertexCount * 3);
    const indices = sliceIndices(chunk, sourcePart.indices, sourcePart.indexCount);
    if (indices.some((index) => index >= sourcePart.vertexCount)) throw Error(`Invalid indices in ${entry.sourceMeshId}.`);
    const extras = { structureId: entry.structureId, sourceMeshId: entry.sourceMeshId, sourceConceptId: entry.sourceConceptId, provider: entry.sourceProvider };
    const mesh = document.createMesh(entry.structureId).setExtras(extras).addPrimitive(document.createPrimitive().setAttribute('POSITION', document.createAccessor(`${entry.sourceMeshId}-position`).setType('VEC3').setArray(positions).setBuffer(buffer)).setAttribute('NORMAL', document.createAccessor(`${entry.sourceMeshId}-normal`).setType('VEC3').setArray(normals).setBuffer(buffer)).setIndices(document.createAccessor(`${entry.sourceMeshId}-index`).setType('SCALAR').setArray(indices).setBuffer(buffer)).setMaterial(material));
    scene.addChild(document.createNode(entry.structureId).setMesh(mesh).setExtras(extras));
    manifestEntries.push({ ...entry, vertexCount: sourcePart.vertexCount, triangleCount: sourcePart.indexCount / 3, bounds: boundsFor(positions) });
  }
  const outputFile = join(outputDir, 'neck-muscles.glb');
  const glb = await new NodeIO().writeBinary(document); await mkdir(outputDir, { recursive: true }); await writeFile(outputFile, glb);
  const manifest = { schemaVersion: 1, provider: neckRegistry[0].sourceProvider, sourceRepository: humanAtlasRepository, sourceCommit: humanAtlasCommit, rawBaseUrl, attributionUrl, license: 'CC BY 4.0', requiredAttribution: 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International', sourceFiles, outputFile: 'assets/anatomy/human-atlas/neck-muscles.glb', outputSha256: sha256(glb), conversion: 'deterministic extraction from pinned Human Atlas browser chunks; no geometry centering, simplification, compression, or coordinate transform by BodyMate', entries: manifestEntries };
  await writeFile(join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(outputDir, 'ATTRIBUTION.md'), `# Human Atlas neck-muscle asset attribution\n\nBodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.\n\n- Human Atlas source: ${humanAtlasRepository} at commit ${humanAtlasCommit}\n- Human Atlas attribution: ${attributionUrl}\n- BodyParts3D license: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html\n- License: https://creativecommons.org/licenses/by/4.0/\n- BodyMate change: deterministic extraction of fourteen named neck and shoulder meshes from the pinned Human Atlas browser chunks into one GLB. No BodyMate geometry centering, simplification, compression, or coordinate transform was applied.\n`);
  return { glb, manifest };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildHumanAtlasNeck().then(({ manifest }) => console.log(`Built Human Atlas neck GLB (${manifest.outputSha256})`)).catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
