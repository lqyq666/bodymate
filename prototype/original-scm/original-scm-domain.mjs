export function parseCoreSnapshot(reply) {
  const fields = String(reply).split('|');
  if (fields[0] !== 'ok' || fields.length !== 7) return null;
  const revision = Number(fields[6]);
  if (!fields[1] || !fields[2] || !['muscle', 'fascia'].includes(fields[3]) || !['true', 'false'].includes(fields[4]) || !['true', 'false'].includes(fields[5]) || !Number.isSafeInteger(revision) || revision < 0) return null;
  return Object.freeze({ region: fields[1], selected: fields[2], layer: fields[3], isolated: fields[4] === 'true', overview: fields[5] === 'true', revision });
}

export function rendererVisibilityForSnapshot(snapshot, structureId) {
  const structureVisible = !snapshot.isolated || snapshot.selected === structureId;
  return Object.freeze({ structureVisible, contextVisible: !snapshot.isolated });
}

export function focusPlanFromBounds(bounds) {
  const target = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
  const diagonal = Math.hypot(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z);
  return Object.freeze({ target, distance: Math.max(diagonal * 1.72, 1.25) });
}
