import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const bundle = await readFile(resolve(root, '_build/js/debug/build/core/core.js'), 'utf8');
const context = vm.createContext({});
context.globalThis = context;
new vm.Script(bundle, { filename: 'moonbit-domain-registry.js' }).runInContext(context);
const wire = String(context.bodymate_domain_registry_v1?.() ?? '');
const [status, schema, payload] = wire.split('|', 3);
if (status !== 'ok' || schema !== 'registry-v1' || !payload) throw Error('MoonBit registry export is invalid.');
const fields = ['presentationId', 'structureId', 'displayNameZh', 'canonicalName', 'region', 'layer', 'side', 'uiGroup', 'sourceProvider', 'sourceMeshId', 'sourceConceptId', 'sourceChunk', 'isDefault'];
const registry = payload.split('~').map((record) => {
  const values = record.split('^');
  if (values.length !== fields.length || values.some((value) => !value)) throw Error('MoonBit registry record is invalid.');
  const entry = Object.fromEntries(fields.map((field, index) => [field, values[index]]));
  entry.isDefault = entry.isDefault === 'true';
  if (!['muscle', 'fascia'].includes(entry.layer) || !['left', 'right'].includes(entry.side) || !['neck', 'shoulder'].includes(entry.uiGroup)) throw Error(`MoonBit registry domain enum is invalid for ${entry.structureId}.`);
  return Object.freeze(entry);
});
if (registry.length !== 14 || new Set(registry.map((entry) => entry.structureId)).size !== 14 || registry.filter((entry) => entry.isDefault).length !== 1) throw Error('MoonBit registry must contain the frozen 14 unique entries and one default.');
const jsonPath = resolve(root, 'generated/anatomy-registry.json');
const modulePath = resolve(root, 'src/anatomy/neck-registry.mjs');
await mkdir(dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(registry, null, 2)}\n`);
await writeFile(modulePath, `/* GENERATED from MoonBit bodymate_domain_registry_v1. Run npm run build; do not edit. */\nconst entries = Object.freeze(${JSON.stringify(registry)}.map((entry) => Object.freeze(entry)));\nexport const neckRegistry = entries;\nexport function neckEntryFor(id) { return entries.find((entry) => entry.presentationId === id || entry.structureId === id) ?? null; }\nexport function presentationIdForStructureId(id) { return entries.find((entry) => entry.structureId === id)?.presentationId ?? null; }\nexport function filterNeckRegistry({ side = 'all', uiGroup = 'all', query = '' } = {}) { const normalizedQuery = query.trim().toLocaleLowerCase(); return entries.filter((entry) => (side === 'all' || entry.side === side) && (uiGroup === 'all' || entry.uiGroup === uiGroup) && (!normalizedQuery || \`${'${entry.displayNameZh} ${entry.canonicalName}'}\`.toLocaleLowerCase().includes(normalizedQuery))); }\n`);
console.log(`Built MoonBit registry projection (${registry.length} structures)`);
