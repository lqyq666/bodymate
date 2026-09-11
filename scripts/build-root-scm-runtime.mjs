import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const glbPath = resolve(root, 'assets/anatomy/open-anatomy/scm-right.glb');
const output = resolve(root, 'assets/runtime/root-scm-runtime.js');
const glb = await readFile(glbPath);
const hash = createHash('sha256').update(glb).digest('hex').toUpperCase();
if (hash !== '0C4E76694D9206AE1DC160C44B3019B9C4819EB4C8F6FBDDBB2993828C8FCFA7') throw Error(`Canonical GLB hash mismatch: ${hash}`);

await build({
  entryPoints: [resolve(root, 'src/root-scm/runtime-entry.mjs')],
  outfile: output,
  bundle: true,
  format: 'iife',
  globalName: 'BodyMateRootScmRuntime',
  platform: 'browser',
  target: ['es2020'],
  legalComments: 'none',
  banner: { js: `/* GENERATED DERIVED RUNTIME REPRESENTATION. Canonical source: assets/anatomy/open-anatomy/scm-right.glb. SHA-256: ${hash}. Do not edit; run npm run root-scm:build-runtime. */` },
  plugins: [{ name: 'canonical-scm-inline', setup(buildContext) { buildContext.onResolve({ filter: /^virtual:bodymate-scm$/ }, () => ({ path: 'virtual:bodymate-scm', namespace: 'canonical-scm' })); buildContext.onLoad({ filter: /.*/, namespace: 'canonical-scm' }, () => ({ contents: `export const canonicalGlbBase64 = ${JSON.stringify(glb.toString('base64'))};`, loader: 'js' })); } }],
});
console.log(`Built root SCM runtime from canonical GLB (${hash})`);
