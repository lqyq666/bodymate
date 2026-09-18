import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { environmentAssetPaths } from '../src/full-muscle/lab-environment.mjs';

const root = new URL('../', import.meta.url);
const processedPaths = {
  platform: 'assets/environment/processed/bm-env-observation-platform-web-v001.glb',
};

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function parseGlb(bytes) {
  assert.equal(bytes.toString('utf8', 0, 4), 'glTF');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    chunks.push({ type, bytes: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  const json = JSON.parse(chunks.find((chunk) => chunk.type === 'JSON').bytes.toString('utf8'));
  return { json, bin: chunks.find((chunk) => chunk.type === 'BIN\0')?.bytes };
}

function jpegSize(bytes) {
  for (let offset = 2; offset + 9 < bytes.length;) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  throw Error('JPEG dimensions not found');
}

function imageSize(bytes, mimeType) {
  if (mimeType === 'image/png') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (mimeType === 'image/jpeg') return jpegSize(bytes);
  throw Error(`Unsupported embedded texture type: ${mimeType}`);
}

test('processed environment assets are runtime-identical, parseable and within the web budget', async () => {
  let totalBytes = 0, totalTriangles = 0;
  for (const key of Object.keys(environmentAssetPaths)) {
    const [runtime, processed] = await Promise.all([
      readFile(new URL(environmentAssetPaths[key], root)),
      readFile(new URL(processedPaths[key], root)),
    ]);
    assert.deepEqual(runtime, processed, `${key} runtime must match its versioned processed asset`);
    totalBytes += runtime.length;
    const { json, bin } = parseGlb(runtime);
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4, `${key} must use triangle primitives`);
      const count = primitive.indices == null ? json.accessors[primitive.attributes.POSITION].count : json.accessors[primitive.indices].count;
      totalTriangles += count / 3;
    }
    for (const image of json.images ?? []) {
      assert.ok(image.bufferView != null, `${key} textures must remain embedded`);
      const view = json.bufferViews[image.bufferView];
      const texture = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
      const [width, height] = imageSize(texture, image.mimeType);
      assert.ok(width <= 2048 && height <= 2048, `${key} texture exceeds 2K: ${width}x${height}`);
    }
  }
  assert.ok(totalBytes <= 15_000_000, `environment runtime exceeds 15 MB: ${totalBytes}`);
  assert.ok(totalTriangles <= 400_000, `environment geometry exceeds 400k triangles: ${totalTriangles}`);
  // Environment subtraction (2026-09): only the observation platform remains;
  // measured at 154,475 triangles on its own.
  assert.ok(totalTriangles >= 140_000, `environment geometry unexpectedly sparse: ${totalTriangles}`);
});

test('frozen anatomy assets retain their accepted hashes', async () => {
  const expected = {
    'assets/anatomy/human-atlas/neck-muscles.glb': 'FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065',
    'assets/anatomy/human-atlas/rigged-body.glb': 'CD2E2108F7551B87928989C445C78E8BB35D867C89D90CD766623CB4CF7E1522',
    'assets/anatomy/human-atlas/full-muscles.glb': '03F01F82188C4849BA1A2B270CACD5737629E7AB4CB4B06BFF1BB3E57AF59BAE',
  };
  for (const [path, hash] of Object.entries(expected)) assert.equal(sha256(await readFile(new URL(path, root))), hash);
});
