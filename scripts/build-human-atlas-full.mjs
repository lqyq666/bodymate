import { Document, NodeIO } from '@gltf-transform/core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attributionUrl, fetchVerifiedHumanAtlasSource, fullMuscleSourceFiles, humanAtlasCommit, humanAtlasRepository, rawBaseUrl, sha256 } from './human-atlas-source.mjs';
import { bodymateMuscleId, fullMuscleExclusionReason, fullMuscleExclusionTerms, includesFullBodyMuscle } from '../src/anatomy/full-muscle-policy.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultOutputDir = join(root, 'assets/anatomy/human-atlas');
const generatedRegistry = join(root, 'src/anatomy/full-muscle-registry.mjs');

function sliceFloat32(bytes, offset, count) { return new Float32Array(bytes.buffer, bytes.byteOffset + offset, count).slice(); }
function sliceNormals(bytes, offset, count) { const source = new Int16Array(bytes.buffer, bytes.byteOffset + offset, count); return Float32Array.from(source, (value) => value / 32767); }
function sliceIndices(bytes, offset, count) { return new Uint32Array(bytes.buffer, bytes.byteOffset + offset, count).slice(); }
function boundsFor(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 3) for (let axis = 0; axis < 3; axis += 1) {
    min[axis] = Math.min(min[axis], positions[index + axis]);
    max[axis] = Math.max(max[axis], positions[index + axis]);
  }
  return { min, max };
}
function sideFor(name) { return /^left\b/i.test(name) ? 'left' : /^right\b/i.test(name) ? 'right' : 'midline'; }
function localizedName(name) { return name.replace(/^Left\b/i, '左侧').replace(/^Right\b/i, '右侧'); }
function registryEntry(part) {
  return Object.freeze({
    presentationId: `atlas_${part.id.toLocaleLowerCase()}`,
    structureId: bodymateMuscleId(part),
    displayNameZh: localizedName(part.name),
    canonicalName: part.name,
    side: sideFor(part.name),
    sourceProvider: 'Human Atlas / BodyParts3D 4.0',
    sourceMeshId: part.id,
    sourceConceptId: part.conceptId,
    sourceChunk: `body-${part.chunk}.bin`,
  });
}

export function selectFullBodyMuscles(atlas) {
  const excluded = atlas.parts.filter((part) => part.system === 'muscular' && fullMuscleExclusionReason(part.name));
  return Object.freeze({ entries: atlas.parts.filter(includesFullBodyMuscle).map(registryEntry), excluded: excluded.map((part) => Object.freeze({ id: part.id, name: part.name, conceptId: part.conceptId, reason: fullMuscleExclusionReason(part.name) })) });
}

export async function buildHumanAtlasFull({ source, outputDir = defaultOutputDir, registryOutput = generatedRegistry } = {}) {
  const files = source ?? await fetchVerifiedHumanAtlasSource({ requiredFiles: fullMuscleSourceFiles });
  const atlas = JSON.parse(Buffer.from(files['atlas.json']).toString('utf8'));
  const selection = selectFullBodyMuscles(atlas);
  if (!selection.entries.length) throw Error('Human Atlas full muscle selection is empty.');

  const document = new Document(), buffer = document.createBuffer('human-atlas-full-muscle-buffer'), scene = document.createScene('bodymate-human-atlas-full-muscles');
  const material = document.createMaterial('human-atlas-full-muscle-material').setBaseColorFactor([.78, .84, .90, 1]).setMetallicFactor(.01).setRoughnessFactor(.6);
  const manifestEntries = [];
  for (const entry of selection.entries) {
    const sourcePart = atlas.parts.find((part) => part.id === entry.sourceMeshId);
    const chunk = files[entry.sourceChunk];
    if (!sourcePart || !chunk) throw Error(`Full muscle source is missing ${entry.sourceMeshId}.`);
    const positions = sliceFloat32(chunk, sourcePart.positions, sourcePart.vertexCount * 3);
    const normals = sliceNormals(chunk, sourcePart.normals, sourcePart.vertexCount * 3);
    const indices = sliceIndices(chunk, sourcePart.indices, sourcePart.indexCount);
    if (indices.some((index) => index >= sourcePart.vertexCount)) throw Error(`Invalid indices in ${entry.sourceMeshId}.`);
    const extras = { structureId: entry.structureId, sourceMeshId: entry.sourceMeshId, sourceConceptId: entry.sourceConceptId, provider: entry.sourceProvider };
    const mesh = document.createMesh(entry.structureId).setExtras(extras).addPrimitive(document.createPrimitive()
      .setAttribute('POSITION', document.createAccessor(`${entry.sourceMeshId}-position`).setType('VEC3').setArray(positions).setBuffer(buffer))
      .setAttribute('NORMAL', document.createAccessor(`${entry.sourceMeshId}-normal`).setType('VEC3').setArray(normals).setBuffer(buffer))
      .setIndices(document.createAccessor(`${entry.sourceMeshId}-index`).setType('SCALAR').setArray(indices).setBuffer(buffer))
      .setMaterial(material));
    scene.addChild(document.createNode(entry.structureId).setMesh(mesh).setExtras(extras));
    manifestEntries.push({ ...entry, vertexCount: sourcePart.vertexCount, triangleCount: sourcePart.indexCount / 3, bounds: boundsFor(positions) });
  }

  const outputFile = join(outputDir, 'full-muscles.glb');
  const glb = await new NodeIO().writeBinary(document);
  const manifest = {
    schemaVersion: 1,
    scope: 'Human Atlas muscular structures excluding configured genital-region terms',
    provider: 'Human Atlas / BodyParts3D 4.0',
    sourceRepository: humanAtlasRepository,
    sourceCommit: humanAtlasCommit,
    rawBaseUrl,
    attributionUrl,
    license: 'CC BY 4.0',
    requiredAttribution: 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',
    sourceFiles: fullMuscleSourceFiles,
    exclusionTerms: fullMuscleExclusionTerms,
    excludedEntries: selection.excluded,
    outputFile: 'assets/anatomy/human-atlas/full-muscles.glb',
    outputSha256: sha256(glb),
    conversion: 'deterministic extraction of all included Human Atlas muscular meshes; no geometry centering, simplification, compression, or coordinate transform by BodyMate',
    entries: manifestEntries,
  };
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(outputFile, glb),
    writeFile(join(outputDir, 'full-muscles.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(registryOutput, `/* GENERATED by scripts/build-human-atlas-full.mjs. */\nconst entries = Object.freeze(${JSON.stringify(selection.entries)}.map((entry) => Object.freeze(entry)));\nexport const fullMuscleRegistry = entries;\nexport const fullMuscleEntryFor = (id) => entries.find((entry) => entry.structureId === id) ?? null;\n`),
    writeFile(join(outputDir, 'FULL_BODY_ATTRIBUTION.md'), `# Human Atlas full-muscle asset attribution\n\nBodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.\n\n- Human Atlas source: ${humanAtlasRepository} at commit ${humanAtlasCommit}\n- Human Atlas attribution: ${attributionUrl}\n- License: https://creativecommons.org/licenses/by/4.0/\n- BodyMate change: deterministic extraction of ${selection.entries.length} included muscular meshes. The configured genital-region exclusion policy removed ${selection.excluded.length} mesh(es). No BodyMate geometry centering, simplification, compression, or coordinate transform was applied.\n`),
  ]);
  return { glb, manifest };
}

export async function verifyCommittedHumanAtlasFull() {
  const [glb, manifestText, registrySource, attribution] = await Promise.all([
    readFile(join(defaultOutputDir, 'full-muscles.glb')),
    readFile(join(defaultOutputDir, 'full-muscles.manifest.json'), 'utf8'),
    readFile(generatedRegistry, 'utf8'),
    readFile(join(defaultOutputDir, 'FULL_BODY_ATTRIBUTION.md'), 'utf8'),
  ]);
  const manifest = JSON.parse(manifestText);
  if (manifest.sourceCommit !== humanAtlasCommit || manifest.outputSha256 !== sha256(glb)) throw Error('Committed Human Atlas full-muscle provenance mismatch.');
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) throw Error('Committed Human Atlas full-muscle manifest is empty.');
  for (const entry of manifest.entries) if (!registrySource.includes(JSON.stringify(entry.structureId))) throw Error(`Committed full-muscle registry is missing ${entry.structureId}.`);
  if (!attribution.includes('CC Attribution 4.0 International')) throw Error('Committed Human Atlas full-muscle attribution is incomplete.');
  return { glb, manifest };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv.includes('--from-committed') ? verifyCommittedHumanAtlasFull() : buildHumanAtlasFull();
  command.then(({ manifest }) => console.log(`${process.argv.includes('--from-committed') ? 'Verified committed' : 'Built'} Human Atlas full-muscle GLB (${manifest.entries.length} meshes; ${manifest.outputSha256})`)).catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}
