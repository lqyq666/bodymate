import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const glbPath = resolve(root, 'assets/anatomy/human-atlas/neck-muscles.glb');
const output = resolve(root, 'assets/runtime/root-scm-runtime.js');
const glb = await readFile(glbPath);
const hash = createHash('sha256').update(glb).digest('hex').toUpperCase();
if (hash !== '83A0247F199ECA4D3B32B16506C61075E23EEB6A1C20501B8EFFD46AFE9D95A7') throw Error(`Human Atlas neck GLB hash mismatch: ${hash}`);

await build({
  entryPoints: [resolve(root, 'src/root-scm/runtime-entry.mjs')],
  outfile: output,
  bundle: true,
  format: 'iife',
  globalName: 'BodyMateRootScmRuntime',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  banner: { js: `/* GENERATED DERIVED RUNTIME REPRESENTATION. Canonical source: assets/anatomy/human-atlas/neck-muscles.glb. SHA-256: ${hash}. Do not edit; run npm run root-scm:build-runtime. */` },
  plugins: [{ name: 'human-atlas-neck-inline', setup(buildContext) { buildContext.onResolve({ filter: /^virtual:bodymate-human-atlas-neck$/ }, () => ({ path: 'virtual:bodymate-human-atlas-neck', namespace: 'human-atlas-neck' })); buildContext.onLoad({ filter: /.*/, namespace: 'human-atlas-neck' }, () => ({ contents: `export const humanAtlasNeckGlbBase64 = ${JSON.stringify(glb.toString('base64'))};`, loader: 'js' })); } }],
});
console.log(`Built root real-neck runtime from Human Atlas GLB (${hash})`);
