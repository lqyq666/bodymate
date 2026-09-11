export const canonicalScmId = 'bodymate.neck.sternocleidomastoid.right';

export const rootScmRegistry = Object.freeze([
  { presentationId: 'scm_r', structureId: canonicalScmId, displayNameZh: '右侧胸锁乳突肌', region: 'neck', layer: 'muscle', source: 'Human Atlas / BodyParts3D 4.0', sourceStructureId: 'FJ1595 / FMA13408', isDefault: true },
  { presentationId: 'trapezius_r', structureId: 'bodymate.neck.trapezius.upper.right', displayNameZh: '右侧斜方肌上部', region: 'neck', layer: 'muscle', source: 'Human Atlas / BodyParts3D 4.0', sourceStructureId: 'FJ1521 / FMA33586', isDefault: false },
  { presentationId: 'levator_r', structureId: 'bodymate.neck.levator-scapulae.right', displayNameZh: '右侧肩胛提肌', region: 'neck', layer: 'muscle', source: 'Human Atlas / BodyParts3D 4.0', sourceStructureId: 'FJ1532 / FMA32540', isDefault: false },
]);

export function entryForPresentationId(id) {
  return rootScmRegistry.find((entry) => entry.presentationId === id || entry.structureId === id) ?? null;
}

export function legacyPresentationIdForCoreId(id) {
  return rootScmRegistry.find((entry) => entry.structureId === id)?.presentationId ?? null;
}
