# Brief: evidence-backed movement mapping

**Date:** 2026-09-12
**Status:** Implemented and verified
**Research question:** How can BodyMate map a small, frozen 14-mesh neck/shoulder model to movements without making unsupported activation, training, or medical claims?

## Recommendation

Ship four narrowly scoped mappings: shoulder-girdle elevation, right/left cervical rotation, and cervical flexion. Keep the catalog, evidence references, resolver, focus selection, and state transitions in MoonBit; JavaScript parses versioned MoonBit wires only.

## Key findings

1. NCBI Bookshelf's *Anatomy, Thorax, Scapula* identifies upper trapezius and levator scapulae as the muscles that raise the scapula.
2. OpenStax *Anatomy and Physiology 2e*, section 11.3, identifies unilateral SCM as rotating the head to the opposite side, bilateral SCM as flexing the head, and unilateral splenius capitis as rotating to the same side.
3. The model does not contain every muscle involved in these motions. Product copy must say “当前模型覆盖范围内的参与结构”, never “all muscles”, activation percentages, EMG, or treatment advice.

## Approach

- Add a MoonBit movement catalog with typed movements, mappings, participation roles, and bundled evidence references.
- Derive an existing `StructureSet` from a valid mapping; do not add a movement-specific highlight type.
- Add a resolver v3 and snapshot v4 while preserving earlier resolver/snapshot exports.
- Make `SHOW_MOVEMENT_MAPPING` the sole mutation path for movement mode.
- Render role tiers and evidence details only from parsed MoonBit output.

## Rejected alternatives

- **Manual JavaScript movement arrays:** rejected because this would duplicate domain truth and bypass MoonBit validation.
- **Lateral-flexion catalog:** deferred because this initial evidence pass does not justify a sufficiently specific, directionally reliable subset with the frozen mesh scope.
- **Activation/EMG rankings:** rejected because no corresponding quantitative dataset is bundled.

## Constraints

- Frozen GLB, canonical registry, licensing/provenance, offline `file://` support, and 14-mesh count must remain unchanged.
- Each mapped structure must cite at least one bundled evidence ID.
- Health signals win over movement resolution and must not mutate state.
- `weight` is an internal presentation-order tier, not a biological measure.

## Implementation checklist

- [x] Add validated MoonBit movement/evidence catalog and resolver.
- [x] Add action, state transitions, events, snapshot v4, and versioned wires.
- [x] Update thin JS adapters and offline movement/evidence presentation.
- [x] Add MoonBit, Node, stale-artifact, headless-browser, and regression coverage.
- [x] Document production evidence and reviewer replay.
