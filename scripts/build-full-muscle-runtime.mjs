import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import './build-head-surface.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const glbPath = resolve(root, 'assets/anatomy/human-atlas/rigged-body.glb');
const output = resolve(root, 'assets/runtime/full-muscle-runtime.js');
const glb = await readFile(glbPath);
const hash = createHash('sha256').update(glb).digest('hex').toUpperCase();
// Classic scripts can be opened from file://; fetch/XHR cannot read a sibling GLB there.
const offline = `/* Generated lossless offline transport; rigged-body.glb SHA-256 ${hash}. */\nglobalThis.BodyMateRiggedBodyOffline=${JSON.stringify(gzipSync(glb,{level:9}).toString('base64'))};\n`;
const offlinePath = resolve(root, 'assets/runtime/rigged-body-offline.js');
const existingOffline = await readFile(offlinePath, 'utf8').catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
// Material-only rebuilds should not rewrite the unchanged, large anatomy transport.
if (existingOffline !== offline) await writeFile(offlinePath, offline);

await build({
  entryPoints: [resolve(root, 'src/full-muscle/runtime-entry.mjs')],
  outfile: output,
  bundle: true,
  format: 'iife',
  globalName: 'BodyMateFullMuscleRuntime',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  banner: { js: `/* GENERATED DERIVED RUNTIME REPRESENTATION. Canonical source: assets/anatomy/human-atlas/rigged-body.glb. SHA-256: ${hash}. Do not edit; run npm run full-muscle:build-runtime. */` },
});
console.log(`Built full-muscle runtime from Human Atlas GLB (${hash})`);
