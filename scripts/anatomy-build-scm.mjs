import { Document, NodeIO } from '@gltf-transform/core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveSha256, assetDir, assetRelativeDir, copySourceNotices, fetchScmSource, outputRelativeFile, root, sha256, sourceArchive, sourceFile, sourceSha256, sourceUrl } from './anatomy-source.mjs';

export const structureId = 'bodymate.neck.sternocleidomastoid.right';
export const converter = 'bodymate-vtk-polydata-to-glb';
export const converterVersion = '1.0.0';
export const axisTransform = [-0.001, 0, 0, 0, 0, 0, 0.001, 0, 0, 0.001, 0, 0, 0, 0, 0, 1];

function lineEnd(bytes, start) { const end = bytes.indexOf(10, start); if (end < 0) throw Error('Malformed VTK: expected line terminator.'); return end; }
function ascii(bytes, start, end) { return bytes.subarray(start, end).toString('ascii').replace(/\r$/, ''); }
export function parseLegacyVtkPolydata(bytes) {
  const pointsAt = bytes.indexOf(Buffer.from('POINTS ')); if (pointsAt < 0) throw Error('Malformed VTK: POINTS section missing.');
  const pointsEnd = lineEnd(bytes, pointsAt), pointMatch = ascii(bytes, pointsAt, pointsEnd).match(/^POINTS\s+(\d+)\s+float$/); if (!pointMatch) throw Error('Malformed VTK: unsupported POINTS declaration.');
  const vertexCount = Number(pointMatch[1]), positionStart = pointsEnd + 1, positionBytes = vertexCount * 3 * 4, stripsAt = bytes.indexOf(Buffer.from('TRIANGLE_STRIPS '), positionStart + positionBytes);
  if (stripsAt < 0) throw Error('Malformed VTK: TRIANGLE_STRIPS section missing.');
  const positions = new Float32Array(vertexCount * 3); for (let index = 0; index < positions.length; index += 1) positions[index] = bytes.readFloatBE(positionStart + index * 4);
  const stripsEnd = lineEnd(bytes, stripsAt), stripMatch = ascii(bytes, stripsAt, stripsEnd).match(/^TRIANGLE_STRIPS\s+(\d+)\s+(\d+)$/); if (!stripMatch) throw Error('Malformed VTK: unsupported TRIANGLE_STRIPS declaration.');
  const stripCount = Number(stripMatch[1]), intCount = Number(stripMatch[2]), cellsStart = stripsEnd + 1;
  const stripInts = new Uint32Array(intCount); for (let index = 0; index < intCount; index += 1) stripInts[index] = bytes.readUInt32BE(cellsStart + index * 4);
  const triangles = []; let offset = 0;
  for (let strip = 0; strip < stripCount; strip += 1) {
    const length = stripInts[offset++]; if (length < 3 || offset + length > stripInts.length) throw Error('Malformed VTK triangle strip.');
    for (let index = 0; index < length - 2; index += 1) { const a = stripInts[offset + index], b = stripInts[offset + index + 1], c = stripInts[offset + index + 2]; triangles.push(index % 2 ? b : a, index % 2 ? a : b, c); }
    offset += length;
  }
  if (offset !== stripInts.length || triangles.some((index) => index >= vertexCount)) throw Error('Malformed VTK triangle indices.');
  return { positions, indices: new Uint32Array(triangles), vertexCount, stripCount, triangleCount: triangles.length / 3 };
}
export function boundsFor(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 3) for (let axis = 0; axis < 3; axis += 1) { const value = positions[index + axis]; if (!Number.isFinite(value)) throw Error('VTK contains non-finite vertex positions.'); min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); }
  if (min.some((value, axis) => !(max[axis] > value))) throw Error('VTK has zero geometry range.'); return { min, max };
}
export function normalsFor(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 3, b = indices[index + 1] * 3, c = indices[index + 2] * 3;
    const abx = positions[b] - positions[a], aby = positions[b + 1] - positions[a + 1], abz = positions[b + 2] - positions[a + 2], acx = positions[c] - positions[a], acy = positions[c + 1] - positions[a + 1], acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    for (const vertex of [a, b, c]) { normals[vertex] += nx; normals[vertex + 1] += ny; normals[vertex + 2] += nz; }
  }
  for (let index = 0; index < normals.length; index += 3) { const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]); if (!Number.isFinite(length) || length === 0) throw Error('Cannot generate a finite normal for SCM geometry.'); normals[index] /= length; normals[index + 1] /= length; normals[index + 2] /= length; }
  return normals;
}
function outputBounds(sourceBounds) { const [minX, minY, minZ] = sourceBounds.min, [maxX, maxY, maxZ] = sourceBounds.max; return { min: [-maxX * .001, minZ * .001, minY * .001], max: [-minX * .001, maxZ * .001, maxY * .001] }; }
function extras() { return { structureId, sourceStructureId: 'Model_62_right_sternocleidomastoideus_muscle', sourceFile, sourceSha256, sourceArchiveSha256: archiveSha256, license: '3D Slicer License Part B', provider: 'Open Anatomy Project / Surgical Planning Laboratory' }; }
function notice() { return `# BodyMate public anatomy asset notice\n\nAll or portions of this licensed product (such portions are the “Software”) have been obtained under license from The Brigham and Women’s Hospital, Inc. and are subject to the following terms and conditions:\n\n## Source and modification\n\n- Source: Open Anatomy / SPL Head and Neck Atlas\n- Credit: Marianna Jakab; Ron Kikinis; Open Anatomy / Surgical Planning Laboratory\n- Source archive: ${sourceArchive}\n- Archive SHA-256: ${archiveSha256}\n- Source file: ${sourceFile}\n- Source VTK SHA-256: ${sourceSha256}\n- BodyMate modified the source only by deterministic triangle-strip expansion, area-weighted normal generation, and a documented root-node LPS/mm to glTF/m transform. The resulting GLB is a modified/derived representation.\n\nThe full applicable 3D Slicer License Part B is in LICENSE.md. UPSTREAM_ARCHIVE_LICENSE.md preserves the source archive's original license pointer.\n`; }
export async function buildScmAsset({ source, outputDir = assetDir } = {}) {
  if (!source) source = await fetchScmSource();
  const vtk = await readFile(source.vtk), parsed = parseLegacyVtkPolydata(vtk), sourceBounds = boundsFor(parsed.positions), normals = normalsFor(parsed.positions, parsed.indices);
  const document = new Document(), buffer = document.createBuffer('scm-right-buffer'), material = document.createMaterial('scm-right-material').setBaseColorFactor([0.86, 0.9, 0.94, 1]).setMetallicFactor(0.02).setRoughnessFactor(0.62);
  const position = document.createAccessor('scm-right-source-lps-mm-position').setType('VEC3').setArray(parsed.positions).setBuffer(buffer);
  const normal = document.createAccessor('scm-right-normal').setType('VEC3').setArray(normals).setBuffer(buffer);
  const index = document.createAccessor('scm-right-index').setType('SCALAR').setArray(parsed.indices).setBuffer(buffer);
  const mesh = document.createMesh(structureId).addPrimitive(document.createPrimitive().setAttribute('POSITION', position).setAttribute('NORMAL', normal).setIndices(index).setMaterial(material)).setExtras(extras());
  const node = document.createNode(structureId).setMesh(mesh).setMatrix(axisTransform).setExtras(extras()); document.createScene('bodymate-public-anatomy').addChild(node);
  await mkdir(outputDir, { recursive: true }); await copySourceNotices(source, outputDir);
  const outputFile = join(outputDir, 'scm-right.glb'), glb = await new NodeIO().writeBinary(document); await writeFile(outputFile, glb);
  const manifest = {
    schemaVersion: 1, structureId, canonicalName: 'right sternocleidomastoid muscle', displayNameZh: '右侧胸锁乳突肌', provider: 'Open Anatomy Project / Surgical Planning Laboratory, Brigham and Women\'s Hospital', atlas: 'SPL Head and Neck Atlas (September 2015)', sourceUrl, sourceArchive, sourceArchiveSha256: archiveSha256, sourceFile, sourceStructureId: 'Model_62_right_sternocleidomastoideus_muscle', sourceSha256, outputFile: outputDir === assetDir ? outputRelativeFile : 'scm-right.glb', outputSha256: sha256(glb), license: '3D Slicer License Part B', licensePath: outputDir === assetDir ? `${assetRelativeDir}/LICENSE.md` : 'LICENSE.md', noticePath: outputDir === assetDir ? `${assetRelativeDir}/NOTICE.md` : 'NOTICE.md', upstreamArchiveLicensePath: outputDir === assetDir ? `${assetRelativeDir}/UPSTREAM_ARCHIVE_LICENSE.md` : 'UPSTREAM_ARCHIVE_LICENSE.md', coordinateSystem: 'Source LPS (left-posterior-superior); output glTF right-handed with +X anatomical right, +Y superior, +Z posterior.', sourceUnit: 'millimeter (atlas NRRD space directions)', outputUnit: 'meter', scale: 0.001, axisTransform, converter, converterVersion, converterToolchain: { gltfTransformCore: '4.5.0', node: process.versions.node }, conversionConfig: { triangleStripExpansion: 'deterministic alternating-winding triangle list', normalGeneration: 'deterministic area-weighted vertex normals', geometryCentering: 'none', geometryRotation: 'none', geometrySimplification: 'none', compression: 'none' }, vertexCount: parsed.vertexCount, triangleCount: parsed.triangleCount, boundingBox: { sourceLpsMillimeters: sourceBounds, outputGltfMeters: outputBounds(sourceBounds) }, meshNames: [structureId], nodeNames: [structureId]
  };
  await writeFile(join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`); await writeFile(join(outputDir, 'NOTICE.md'), notice());
  return { outputFile, manifest, glb };
}
async function main() { const dirAt = process.argv.indexOf('--output-dir'), outputDir = dirAt >= 0 ? resolve(process.argv[dirAt + 1]) : assetDir; const result = await buildScmAsset({ outputDir }); console.log(`Built ${result.outputFile} (${result.manifest.outputSha256})`); }
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
