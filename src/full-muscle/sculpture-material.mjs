export const sculptureWhite = '#F5F3EF';

// Presentation only: callers own their cloned material; geometry and skin stay intact.
export function applySculptureFinish(material, kind = 'muscle') {
  material.name = 'BodyMate / white anatomical sculpture';
  material.color.set(kind === 'bone' ? '#F2F0EA' : sculptureWhite);
  material.roughness = kind === 'bone' ? .62 : .56;
  material.metalness = 0;
  material.emissive.set('#000000');
  material.emissiveIntensity = 0;
  return material;
}
