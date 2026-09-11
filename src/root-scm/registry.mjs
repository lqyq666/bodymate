export const canonicalScmId = 'bodymate.neck.sternocleidomastoid.right';

const scmEntry = Object.freeze({
  presentationId: 'scm_r',
  structureId: canonicalScmId,
  displayNameZh: '右侧胸锁乳突肌',
  region: 'neck',
  layer: 'muscle',
  source: 'Open Anatomy / SPL Head and Neck Atlas',
  sourceStructureId: 'Model_62_right_sternocleidomastoideus_muscle',
  isDefault: true,
});

export const rootScmRegistry = Object.freeze([scmEntry]);

export function entryForPresentationId(id) {
  return rootScmRegistry.find((entry) => entry.presentationId === id || entry.structureId === id) ?? null;
}

export function legacyPresentationIdForCoreId(id) {
  return rootScmRegistry.find((entry) => entry.structureId === id)?.presentationId ?? null;
}
