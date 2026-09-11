const distance = (one, two) => Math.hypot(one.x - two.x, one.y - two.y, one.z - two.z);

export function labelAnchorFromBounds(bounds) {
  return Object.freeze({ x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2, z: (bounds.min.z + bounds.max.z) / 2 });
}

export function labelCapForViewport(width) { return width <= 480 ? 3 : 5; }

export function rankedLabelEntries(entries, selectedId, cap) {
  const selected = entries.find(({ entry }) => entry.structureId === selectedId) || entries[0];
  if (!selected) return [];
  return [...entries].sort((one, two) => {
    if (one === selected) return -1;
    if (two === selected) return 1;
    const score = (candidate) => [candidate.entry.side === selected.entry.side ? 0 : 1, candidate.entry.uiGroup === selected.entry.uiGroup ? 0 : 1, distance(candidate.anchor, selected.anchor), candidate.entry.structureId];
    const oneScore = score(one), twoScore = score(two);
    for (let index = 0; index < oneScore.length; index += 1) if (oneScore[index] !== twoScore[index]) return oneScore[index] < twoScore[index] ? -1 : 1;
    return 0;
  }).slice(0, cap);
}

export function layoutLabelPlans(entries, { width, height, project, minGap = 26 }) {
  const laneY = { left: 18, right: 18 };
  return entries.map(({ entry, anchor }, index) => {
    const projected = project(anchor);
    const visible = projected.z >= -1 && projected.z <= 1;
    const lane = entry.side === 'left' ? 'left' : 'right';
    const desiredY = Math.max(20, Math.min(height - 20, projected.y));
    const y = Math.max(desiredY, laneY[lane]);
    laneY[lane] = y + minGap;
    return Object.freeze({ entry, anchor, selected: index === 0, lane, x: lane === 'left' ? Math.max(70, width * 0.24) : Math.min(width - 70, width * 0.76), y: Math.min(height - 20, y), leader: { x: projected.x, y: projected.y }, visible });
  });
}
