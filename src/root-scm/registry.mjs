import { neckEntryFor, neckRegistry, presentationIdForStructureId } from '../anatomy/neck-registry.mjs';

export const canonicalScmId = neckRegistry.find((entry) => entry.isDefault)?.structureId;
export const rootScmRegistry = neckRegistry;
export const entryForPresentationId = neckEntryFor;
export const legacyPresentationIdForCoreId = presentationIdForStructureId;
