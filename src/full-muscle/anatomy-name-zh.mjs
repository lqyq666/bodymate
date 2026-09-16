// Thin adapter over the MoonBit anatomy domain (lqyq666/bodymate/anatomy) exposed by
// assets/runtime/moonbit-core.js. MoonBit owns the bilingual term tables, laterality
// rules and search ranking; this file only encodes and decodes the wire strings.
const core = globalThis;

function call(name, ...args) {
  if (typeof core[name] !== 'function') throw Error(`MoonBit anatomy domain is unavailable: ${name}`);
  return core[name](...args);
}

function payload(wire, version) {
  const parts = String(wire).split('|');
  if (parts[0] !== 'ok' || parts[1] !== version) throw Error(`Invalid MoonBit ${version} response: ${wire}`);
  return parts.slice(2).join('|');
}

const kindOf = (kind) => String(kind || 'bone');

export function hasChineseMuscleName(canonicalName) {
  return payload(call('bodymate_anatomy_has_name_v1', String(canonicalName ?? ''), 'muscle'), 'anatomy-has-name-v1') === 'true';
}

export function muscleNameZh(canonicalName) {
  return payload(call('bodymate_anatomy_name_v1', String(canonicalName ?? ''), 'muscle'), 'anatomy-name-v1');
}

export function hasChineseStructureName(canonicalName, kind = 'bone') {
  return payload(call('bodymate_anatomy_has_name_v1', String(canonicalName ?? ''), kindOf(kind)), 'anatomy-has-name-v1') === 'true';
}

export function structureNameZh(canonicalName, kind = 'bone') {
  return payload(call('bodymate_anatomy_name_v1', String(canonicalName ?? ''), kindOf(kind)), 'anatomy-name-v1');
}

const WIRE_UNSAFE = /[|^~]/;

function entryWire(entry) {
  const id = String(entry.structureId), kind = kindOf(entry.kind), canonical = String(entry.canonicalName ?? '');
  if (WIRE_UNSAFE.test(id + kind + canonical)) throw Error(`Structure entry is not wire-safe: ${id}`);
  return `${id}^${kind}^${canonical}`;
}

// Matches Chinese display names or Latin canonical names; MoonBit ranks muscles first.
export function searchStructures(entries, query) {
  const list = Array.isArray(entries) ? entries.filter((entry) => entry && entry.structureId) : [];
  if (!list.length) return [];
  const ids = payload(call('bodymate_anatomy_search_v1', list.map(entryWire).join('~'), String(query ?? '')), 'anatomy-search-v1');
  if (!ids) return [];
  const byId = new Map(list.map((entry) => [String(entry.structureId), entry]));
  return ids.split('~').map((id) => byId.get(id)).filter(Boolean);
}
