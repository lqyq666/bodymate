import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../docs/anatomy-asset-candidates.json', import.meta.url), 'utf8'));
const required = ['provider', 'upstreamProject', 'datasetLicense', 'perFileLicense', 'provenance'];

test('asset decision records traceable non-empty license and provenance fields', () => {
  for (const candidate of [...manifest.approvedPublicAssets, ...manifest.rejectedCandidates]) {
    for (const field of required) assert.ok(candidate[field]?.trim(), `${candidate.provider} is missing ${field}`);
  }
});

test('approved public mesh mapping has unique stable and source identifiers', () => {
  const stableIds = manifest.approvedPublicAssets.map((asset) => asset.stableStructureId);
  const sourceIds = [...manifest.approvedPublicAssets, ...manifest.supportingMeshesInApprovedSource].map((asset) => asset.sourceStructureId);
  assert.equal(new Set(stableIds).size, stableIds.length);
  assert.equal(new Set(sourceIds).size, sourceIds.length);
  assert.equal(manifest.approvedPublicAssets[0].stableStructureId, 'bodymate.neck.sternocleidomastoid.right');
});

test('only approved candidates can enter the public asset manifest', () => {
  const rejectedSourceIds = new Set(manifest.rejectedCandidates.flatMap((candidate) => candidate.sourceStructureIds));
  for (const asset of manifest.approvedPublicAssets) {
    assert.equal(manifest.decision, 'APPROVED_PUBLIC_ASSET');
    assert.ok(asset.exactFile.endsWith('.vtk'));
    assert.ok(asset.attributionExactText.length > 0);
    assert.equal(rejectedSourceIds.has(asset.sourceStructureId), false);
  }
});
