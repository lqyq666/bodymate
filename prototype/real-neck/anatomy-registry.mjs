export const anatomyRegistry = Object.freeze([
  { structureId: 'bodymate.neck.sternocleidomastoid.right', canonicalName: 'right sternocleidomastoid', displayNameZh: '右侧胸锁乳突肌', region: 'neck', layer: 'muscle', source: 'BodyParts3D Release 4.0', sourceStructureId: 'FMA13408 / BP4909', meshNames: ['FJ1595'] },
  { structureId: 'bodymate.neck.trapezius.upper.right', canonicalName: 'descending part of right trapezius', displayNameZh: '右侧斜方肌上部（降部）', region: 'neck', layer: 'muscle', source: 'BodyParts3D Release 4.0', sourceStructureId: 'FMA33586 / BP5636', meshNames: ['FJ1521'] },
]);

export function entryForMeshName(meshName) { return anatomyRegistry.find((entry) => entry.meshNames.includes(meshName)) ?? null; }
export function registryMeshNames() { return new Set(anatomyRegistry.flatMap((entry) => entry.meshNames)); }
