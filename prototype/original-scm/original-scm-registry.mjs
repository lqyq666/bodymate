export const originalScmMeshNames = Object.freeze([
  'procedural-scm-surface',
  ...Array.from({ length: 15 }, (_, index) => `procedural-scm-fiber-${String(index + 1).padStart(2, '0')}`),
]);

export const originalScmRegistry = Object.freeze([
  Object.freeze({
    structureId: 'bodymate.neck.sternocleidomastoid.right',
    canonicalName: 'right sternocleidomastoid',
    displayNameZh: '右侧胸锁乳突肌',
    region: 'neck',
    layer: 'muscle',
    source: 'BodyMate original procedural visual study',
    sourceStructureId: 'procedural-scm-v1',
    meshNames: originalScmMeshNames,
  }),
]);

export function entryForOriginalMeshName(meshName) {
  return originalScmRegistry.find((entry) => entry.meshNames.includes(meshName)) ?? null;
}
