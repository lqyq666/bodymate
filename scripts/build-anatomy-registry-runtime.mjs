import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neckRegistry } from '../src/anatomy/neck-registry.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(root, 'assets/runtime/anatomy-registry.js');
const serialized = JSON.stringify(neckRegistry);

await writeFile(output, `/* GENERATED from src/anatomy/neck-registry.mjs. Run npm run build; do not edit. */\n(() => { globalThis.BodyMateAnatomyRegistry = Object.freeze(${serialized}.map((entry) => Object.freeze(entry))); })();\n`);
console.log(`Built offline anatomy registry (${neckRegistry.length} structures)`);
