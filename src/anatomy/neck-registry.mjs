const humanAtlasProvider = 'Human Atlas / BodyParts3D 4.0';

export const neckRegistry = Object.freeze([
  Object.freeze({ presentationId: 'scm_r', structureId: 'bodymate.neck.sternocleidomastoid.right', displayNameZh: '右侧胸锁乳突肌', canonicalName: 'right sternocleidomastoid', region: 'neck', layer: 'muscle', sourceProvider: humanAtlasProvider, sourceMeshId: 'FJ1595', sourceConceptId: 'FMA13408', sourceChunk: 'body-5.bin', isDefault: true }),
  Object.freeze({ presentationId: 'trapezius_r', structureId: 'bodymate.neck.trapezius.upper.right', displayNameZh: '右侧斜方肌上部', canonicalName: 'descending part of right trapezius', region: 'neck', layer: 'muscle', sourceProvider: humanAtlasProvider, sourceMeshId: 'FJ1521', sourceConceptId: 'FMA33586', sourceChunk: 'body-4.bin', isDefault: false }),
  Object.freeze({ presentationId: 'levator_r', structureId: 'bodymate.neck.levator-scapulae.right', displayNameZh: '右侧肩胛提肌', canonicalName: 'right levator scapulae', region: 'neck', layer: 'muscle', sourceProvider: humanAtlasProvider, sourceMeshId: 'FJ1532', sourceConceptId: 'FMA32540', sourceChunk: 'body-4.bin', isDefault: false }),
]);

export function neckEntryFor(id) {
  return neckRegistry.find((entry) => entry.presentationId === id || entry.structureId === id) ?? null;
}

export function presentationIdForStructureId(id) {
  return neckRegistry.find((entry) => entry.structureId === id)?.presentationId ?? null;
}
