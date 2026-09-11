import { reassembledPartIds } from './human-atlas-source.mjs';

export const humanAtlasLocalRegistry = Object.freeze([
  Object.freeze({
    structureId: 'bodymate.neck.sternocleidomastoid.right',
    canonicalName: 'right sternocleidomastoid',
    displayNameZh: '右侧胸锁乳突肌',
    region: 'neck',
    layer: 'muscle',
    source: 'Human Atlas local-only verification · BodyParts3D-derived',
    sourceStructureId: 'FMA13408',
    meshNames: ['FJ1595'],
  }),
]);

export const humanAtlasContextPartIds = Object.freeze(reassembledPartIds.filter((id) => id !== 'FJ1595'));
export function entryForHumanAtlasPart(partId) { return humanAtlasLocalRegistry.find((entry) => entry.meshNames.includes(partId)) ?? null; }
