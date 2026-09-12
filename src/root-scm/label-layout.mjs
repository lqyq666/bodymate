const distance = (one, two) => Math.hypot(one.x - two.x, one.y - two.y, one.z - two.z);

export function labelAnchorFromBounds(bounds) {
  return Object.freeze({ x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2, z: (bounds.min.z + bounds.max.z) / 2 });
}

export function labelCapForViewport(width) { return width <= 480 ? 3 : 5; }

export function rankedLabelEntries(entries, selectedId, cap, highlightedIds = []) {
  const selected = entries.find(({ entry }) => entry.structureId === selectedId) || entries[0];
  if (!selected) return [];
  return [...entries].sort((one, two) => {
    if (one === selected) return -1;
    if (two === selected) return 1;
    const score = (candidate) => [highlightedIds.includes(candidate.entry.structureId) ? 0 : 1, candidate.entry.side === selected.entry.side ? 0 : 1, candidate.entry.uiGroup === selected.entry.uiGroup ? 0 : 1, distance(candidate.anchor, selected.anchor), candidate.entry.structureId];
    const oneScore = score(one), twoScore = score(two);
    for (let index = 0; index < oneScore.length; index += 1) if (oneScore[index] !== twoScore[index]) return oneScore[index] < twoScore[index] ? -1 : 1;
    return 0;
  }).slice(0, cap);
}

export function layoutLabelPlans(entries, { width, height, project, minGap = 44 }) {
  const counts = { left: 0, right: 0 };
  const plans = entries.map(({ entry, anchor }, index) => {
    const projected = project(anchor);
    const visible = projected.z >= -1 && projected.z <= 1;
    let lane = projected.x < width * .5 ? 'left' : 'right';
    if (counts[lane] >= Math.ceil(entries.length / 2)) lane = lane === 'left' ? 'right' : 'left';
    counts[lane] += 1;
    const desiredY = Math.max(40, Math.min(height - 40, projected.y - (lane === 'right' ? height * .22 : 0)));
    return { entry, anchor, selected: index === 0, lane, x: lane === 'left' ? Math.max(70, width * .13) : Math.min(width - 70, width * .87), y: desiredY, leader: { x: projected.x, y: projected.y }, visible };
  });
  for (const lane of ['left', 'right']) {
    const members = plans.filter((plan) => plan.lane === lane).sort((a, b) => a.y - b.y);
    for (let index = 0; index < members.length; index += 1) members[index].y = Math.max(members[index].y, index ? members[index - 1].y + minGap : 40);
    const overflow = (members.at(-1)?.y || 0) - (height - 40);
    if (overflow > 0) for (const member of members) member.y -= overflow;
  }
  return plans.map(Object.freeze);
}
