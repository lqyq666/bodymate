export const FROZEN_HUMAN_ATLAS_NECK_SHA = 'FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065';

export const selectedMaterial = Object.freeze({ color: '#83B9F4', emissive: '#163D6D', emissiveIntensity: 0.09, opacity: 1, roughness: 0.68, metalness: 0.01 });
export const highlightedMaterial = Object.freeze({ color: '#B9D7F3', emissive: '#0E3158', emissiveIntensity: 0.035, opacity: 1, roughness: 0.72, metalness: 0.01 });
export const primaryHighlightedMaterial = Object.freeze({ color: '#9BC8F1', emissive: '#123B67', emissiveIntensity: 0.055, opacity: 1, roughness: 0.70, metalness: 0.01 });
export const comparisonLeftMaterial = Object.freeze({ color: '#B9DDF3', emissive: '#16405F', emissiveIntensity: 0.04, opacity: 1, roughness: 0.72, metalness: 0.01 });
export const comparisonRightMaterial = Object.freeze({ color: '#B8C5E5', emissive: '#27345F', emissiveIntensity: 0.04, opacity: 1, roughness: 0.72, metalness: 0.01 });
export const contextMaterial = Object.freeze({ color: '#E7EDF1', emissive: '#000000', emissiveIntensity: 0, opacity: 1, roughness: 0.76, metalness: 0.01 });

export function selectedPulsePlan(baseMaterial, timestamp, enabled) {
  if (!enabled) return Object.freeze({ colorMix: 0, emissiveIntensity: baseMaterial.emissiveIntensity });
  const wave = .5 + .5 * Math.sin(timestamp / 400);
  return Object.freeze({ colorMix: .20 + .50 * wave, emissiveIntensity: baseMaterial.emissiveIntensity + .18 + .34 * wave });
}

export function materialPlanForSnapshot(snapshot, structureId) {
  const selected = snapshot?.selected === structureId && !snapshot?.overview;
  const comparison = snapshot?.comparison?.members?.find((item) => item.structureId === structureId);
  const highlight = !selected && !snapshot?.overview && snapshot?.highlightMode === 'structure_set' ? snapshot.highlighted?.find((item) => item.structureId === structureId) : null;
  const highlighted = Boolean(highlight);
  return Object.freeze({ ...(selected ? selectedMaterial : comparison?.bucket === 'overlap' ? primaryHighlightedMaterial : comparison?.bucket === 'only_left' ? comparisonLeftMaterial : comparison?.bucket === 'only_right' ? comparisonRightMaterial : highlight?.role === 'primary' ? primaryHighlightedMaterial : highlighted ? highlightedMaterial : contextMaterial), selected, highlighted, highlightRole: highlight?.role || '', comparisonBucket: comparison?.bucket || '', visible: !snapshot?.isolated || selected });
}

export function boundsCenter(bounds) {
  return { x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2, z: (bounds.min.z + bounds.max.z) / 2 };
}

export function boundsRadius(bounds) {
  return Math.max(Math.hypot(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z) / 2, 0.001);
}

export function combinedBounds(boundsList) {
  if (!boundsList.length) return null;
  return boundsList.reduce((combined, bounds) => ({
    min: { x: Math.min(combined.min.x, bounds.min.x), y: Math.min(combined.min.y, bounds.min.y), z: Math.min(combined.min.z, bounds.min.z) },
    max: { x: Math.max(combined.max.x, bounds.max.x), y: Math.max(combined.max.y, bounds.max.y), z: Math.max(combined.max.z, bounds.max.z) },
  }));
}

export function selectedFocusPlan(bounds, direction = [1, 0.48, 1], { context = false } = {}) {
  return Object.freeze({ target: boundsCenter(bounds), distance: boundsRadius(bounds) * (context ? 4.15 : 3.1), direction: [...direction] });
}
