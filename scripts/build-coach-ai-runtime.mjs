import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
await build({ entryPoints: [resolve(root, 'src/coach-c/ai-runtime-entry.mjs')], outfile: resolve(root, 'assets/runtime/coach-ai-runtime.js'), bundle: true, format: 'iife', globalName: 'BodyMateCoachAi', platform: 'browser', target: ['es2020'], minify: true, legalComments: 'none', banner: { js: '/* GENERATED optional Coach C bridge client. No provider credentials; run npm run build. */' } });
console.log('Built optional Coach C bridge client');
