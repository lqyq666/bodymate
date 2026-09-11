import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
await build({
  entryPoints: [resolve(root, 'src/coach-c/query-runtime-entry.mjs')],
  outfile: resolve(root, 'assets/runtime/coach-query-runtime.js'),
  bundle: true,
  format: 'iife',
  globalName: 'BodyMateCoachQuery',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  banner: { js: '/* GENERATED local Coach C structure resolver. Run npm run build; do not edit. */' },
});
console.log('Built local Coach C structure resolver');
