import { entryForPresentationId } from './registry.mjs';

export function parseCoreSnapshot(reply) {
  const fields = String(reply).split('|');
  const revision = Number(fields[6]);
  if (fields[0] !== 'ok' || fields.length !== 7 || !fields[1] || !fields[2] || !['muscle', 'fascia'].includes(fields[3]) || !['true', 'false'].includes(fields[4]) || !['true', 'false'].includes(fields[5]) || !Number.isSafeInteger(revision) || revision < 0) return null;
  return Object.freeze({ region: fields[1], selected: fields[2], layer: fields[3], isolated: fields[4] === 'true', overview: fields[5] === 'true', revision });
}

export function rootEntryForPresentation(entry) {
  const canonical = entryForPresentationId(entry.presentationId || entry.id);
  return canonical ? { ...entry, ...canonical } : { ...entry, presentationId: entry.presentationId || entry.id, structureId: entry.structureId || entry.id };
}

export function registerRootEntries(core, entries) {
  const registered = new Set();
  for (const raw of entries) {
    const entry = rootEntryForPresentation(raw);
    if (registered.has(entry.structureId)) continue;
    const reply = core.bodymate_core_register(entry.structureId, entry.displayNameZh || entry.label, entry.region, entry.layer || entry.type, Boolean(entry.isDefault));
    if (reply !== 'ok|registered') throw Error(`MoonBit registration failed: ${reply}`);
    registered.add(entry.structureId);
  }
}

export function selectPresentationStructure(core, id) {
  const entry = entryForPresentationId(id);
  if (!entry) return null;
  return parseCoreSnapshot(core.bodymate_core_select_structure(entry.structureId));
}

export function focusPlanFromBounds(bounds, direction = [1, .48, 1]) {
  const dx = bounds.max.x - bounds.min.x, dy = bounds.max.y - bounds.min.y, dz = bounds.max.z - bounds.min.z;
  const radius = Math.max(Math.hypot(dx, dy, dz) / 2, .001);
  return { target: { x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2, z: (bounds.min.z + bounds.max.z) / 2 }, distance: radius * 3.1, direction };
}
