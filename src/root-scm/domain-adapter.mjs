import { entryForPresentationId } from './registry.mjs';
import { selectedFocusPlan } from './presentation-plan.mjs';

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
  return selectedFocusPlan(bounds, direction);
}

export function parseDomainSnapshotV3(reply) {
  const fields = String(reply).split('|');
  if (fields.length !== 13 || fields[0] !== 'ok' || fields[1] !== 'snapshot-v3' || fields[2] !== '3') return null;
  const [, , , region, selected, layer, isolated, overview, revisionRaw, highlightMode, highlightSetId, highlightSetLabel, highlightedWire] = fields;
  const revision = Number(revisionRaw);
  if (!region || !selected || !['muscle', 'fascia'].includes(layer) || !['true', 'false'].includes(isolated) || !['true', 'false'].includes(overview) || !Number.isSafeInteger(revision) || revision < 0 || !['none', 'structure_set'].includes(highlightMode)) return null;
  const highlighted = highlightedWire ? highlightedWire.split('~').map((item) => {
    const [structureId, role, weightRaw] = item.split('^'), weight = Number(weightRaw);
    return structureId && ['focus', 'primary', 'secondary', 'context'].includes(role) && Number.isSafeInteger(weight) ? Object.freeze({ structureId, role, weight }) : null;
  }) : [];
  if (highlighted.includes(null) || highlighted.some((item) => !entryForPresentationId(item.structureId)) || new Set(highlighted.map((item) => item.structureId)).size !== highlighted.length) return null;
  if (highlightMode === 'none' && (highlightSetId || highlightSetLabel || highlighted.length)) return null;
  if (highlightMode === 'structure_set' && (!highlightSetId || !highlightSetLabel || !highlighted.length || highlighted[0].structureId !== selected || highlighted[0].role !== 'focus')) return null;
  return Object.freeze({ region, selected, layer, isolated: isolated === 'true', overview: overview === 'true', revision, highlightMode, highlightSetId, highlightSetLabel, highlighted: Object.freeze(highlighted) });
}

export function parseDomainSnapshotV4(reply) {
  const fields = String(reply).split('|');
  if (fields.length !== 18 || fields[0] !== 'ok' || fields[1] !== 'snapshot-v4' || fields[2] !== '4') return null;
  const [, , , region, selected, layer, isolated, overview, revisionRaw, highlightMode, highlightSetId, highlightSetLabel, highlightedWire, activeMovementId, movementLabel, movementCanonicalName, mappingWire, coverageNote] = fields;
  const revision = Number(revisionRaw);
  if (!region || !selected || !['muscle', 'fascia'].includes(layer) || !['true', 'false'].includes(isolated) || !['true', 'false'].includes(overview) || !Number.isSafeInteger(revision) || revision < 0 || !['none', 'structure_set'].includes(highlightMode)) return null;
  const highlighted = highlightedWire ? highlightedWire.split('~').map((item) => { const [structureId, role, weightRaw] = item.split('^'), weight = Number(weightRaw); return structureId && ['focus', 'primary', 'secondary', 'context'].includes(role) && Number.isSafeInteger(weight) ? Object.freeze({ structureId, role, weight }) : null; }) : [];
  const movementMappings = mappingWire ? mappingWire.split('~').map((item) => { const [structureId, role, evidenceWire] = item.split('^'), evidenceIds = evidenceWire ? evidenceWire.split(',') : []; return entryForPresentationId(structureId) && ['main_contributor', 'contributor'].includes(role) && evidenceIds.length && evidenceIds.every(Boolean) ? Object.freeze({ structureId, role, evidenceIds: Object.freeze(evidenceIds) }) : null; }) : [];
  if (highlighted.includes(null) || movementMappings.includes(null) || new Set(highlighted.map((item) => item.structureId)).size !== highlighted.length || new Set(movementMappings.map((item) => item.structureId)).size !== movementMappings.length) return null;
  const hasMovement = Boolean(activeMovementId || movementLabel || movementCanonicalName || mappingWire || coverageNote);
  if (highlightMode === 'none' && (highlightSetId || highlightSetLabel || highlighted.length)) return null;
  if (highlightMode === 'structure_set' && (!highlightSetId || !highlightSetLabel || !highlighted.length || highlighted[0].structureId !== selected || highlighted[0].role !== 'focus')) return null;
  if (!hasMovement) return Object.freeze({ region, selected, layer, isolated: isolated === 'true', overview: overview === 'true', revision, highlightMode, highlightSetId, highlightSetLabel, highlighted: Object.freeze(highlighted), activeMovementId: '', movementLabel: '', movementCanonicalName: '', movementMappings: Object.freeze([]), coverageNote: '' });
  if (!activeMovementId || !movementLabel || !movementCanonicalName || !coverageNote || !movementMappings.length || highlightMode !== 'structure_set' || !movementMappings.some((item) => item.structureId === selected)) return null;
  return Object.freeze({ region, selected, layer, isolated: isolated === 'true', overview: overview === 'true', revision, highlightMode, highlightSetId, highlightSetLabel, highlighted: Object.freeze(highlighted), activeMovementId, movementLabel, movementCanonicalName, movementMappings: Object.freeze(movementMappings), coverageNote });
}

export function parseDomainSnapshotV5(reply) {
  const fields = String(reply).split('|');
  if (fields.length !== 23 || fields[0] !== 'ok' || fields[1] !== 'snapshot-v5' || fields[2] !== '5') return null;
  const v4 = parseDomainSnapshotV4(['ok', 'snapshot-v4', '4', ...fields.slice(3, 18)].join('|'));
  if (!v4) return null;
  const [, , , , , , , , , , , , , , , , , , leftMovementId, leftMovementLabel, rightMovementId, rightMovementLabel, membersWire] = fields;
  const members = membersWire ? membersWire.split('~').map((item) => { const [structureId, bucket, leftRole, rightRole, leftEvidenceWire, rightEvidenceWire] = item.split('^'); const evidence = (wire) => wire ? wire.split(',') : []; return entryForPresentationId(structureId) && ['overlap', 'only_left', 'only_right'].includes(bucket) && ['', 'main_contributor', 'contributor'].includes(leftRole) && ['', 'main_contributor', 'contributor'].includes(rightRole) ? Object.freeze({ structureId, bucket, leftRole, rightRole, leftEvidenceIds: Object.freeze(evidence(leftEvidenceWire)), rightEvidenceIds: Object.freeze(evidence(rightEvidenceWire)) }) : null; }) : [];
  const active = Boolean(leftMovementId || leftMovementLabel || rightMovementId || rightMovementLabel || membersWire);
  if (members.includes(null) || new Set(members.map((item) => item.structureId)).size !== members.length) return null;
  if (!active) return Object.freeze({ ...v4, comparison: null });
  if (!leftMovementId || !leftMovementLabel || !rightMovementId || !rightMovementLabel || !members.length || !members.some((item) => item.structureId === v4.selected)) return null;
  return Object.freeze({ ...v4, comparison: Object.freeze({ leftMovementId, leftMovementLabel, rightMovementId, rightMovementLabel, members: Object.freeze(members) }) });
}
