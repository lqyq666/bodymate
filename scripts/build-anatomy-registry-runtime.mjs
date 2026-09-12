import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neckRegistry } from '../src/anatomy/neck-registry.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(root, 'assets/runtime/anatomy-registry.js');
const serialized = JSON.stringify(neckRegistry);

await writeFile(output, `/* GENERATED from MoonBit-derived src/anatomy/neck-registry.mjs. Run npm run build; do not edit. */\n(() => { const entries = Object.freeze(${serialized}.map((entry) => Object.freeze(entry))); globalThis.BodyMateAnatomyRegistry = entries; globalThis.BodyMateAnatomyRegistryFilter = ({ side = 'all', uiGroup = 'all', query = '' } = {}) => { const normalizedQuery = query.trim().toLocaleLowerCase(); return entries.filter((entry) => (side === 'all' || entry.side === side) && (uiGroup === 'all' || entry.uiGroup === uiGroup) && (!normalizedQuery || \`${'${entry.displayNameZh} ${entry.canonicalName}'}\`.toLocaleLowerCase().includes(normalizedQuery))); }; })();\n`);
console.log(`Built offline anatomy registry (${neckRegistry.length} structures)`);
