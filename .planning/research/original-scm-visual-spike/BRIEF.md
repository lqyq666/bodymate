# Brief: Original SCM visual spike

**Date:** 2026-09-11
**Status:** Locked
**Implemented:** 2026-09-11
**Branch:** feat/original-neck-visual-spike
**Research question:** Can BodyMate show one compelling, independently-authored neck structure without importing a third-party anatomical mesh, while retaining the existing MoonBit authority boundary?

## Recommendation

Build a separate runtime-generated right sternocleidomastoid (SCM) visual study. It should prove the interaction and material direction, but must be labeled as an original visual approximation rather than a medically validated anatomy asset.

## Key findings

1. The existing Stage 2A spike already establishes the required renderer contract: an Anatomy Registry maps renderer objects to a stable BodyMate ID, then MoonBit returns the validated snapshot that determines renderer state.
2. The approved Open Anatomy SCM is reserved for the separately reviewed Stage 2C branch. This spike must not copy, transform, compare against, or include that geometry.
3. A high-resolution-looking result can be authored procedurally with a tapered muscle surface, fine fiber curves, neutral surrounding reference forms, physically based lighting, and bounds-derived camera focus. This is visual fidelity, not anatomical validation.

## Approach

- Create an isolated `prototype/original-scm/` page using the repository's local Three.js dependency only.
- Generate all visible geometry at runtime from authored control points and primitive reference forms; add no binary asset.
- Register `bodymate.neck.sternocleidomastoid.right` with MoonBit, and map clicks only through a local Anatomy Registry.
- Render a cool gray-white resting state and a restrained light-blue selected state. Isolate hides the authored context; restore reveals it again.
- Use the selected group's `Box3`/bounding sphere to calculate the camera target and distance.

## What not to use

- Human Atlas, BodyParts3D, Open Anatomy, or any other third-party mesh, source IDs, topology, vertex positions, labels, or derived output. Their use would make this no longer an independently-authored visual spike.
- Root `index.html` migration, a product UI rewrite, C coach, AI, or additional muscles.
- Claims of clinical, imaging-derived, or medically validated precision.

## Constraints

- MoonBit remains the domain-state authority for region, selected structure, layer, isolate, overview, and revision.
- Three.js handles rendering and picking only, within this isolated page.
- The root `index.html` and its generated-output consistency gate must remain unchanged.
- The page must run without runtime network requests after `npm install` and `npm run build`.

## Implementation checklist

- [x] Write an explicit independent-asset and precision boundary.
- [x] Add a procedural right SCM surface and fiber bundle with contextual neck/shoulder forms.
- [x] Add Registry → MoonBit selection and unknown-object safety tests.
- [x] Add isolate / restore and bounds-focus tests.
- [x] Add a direct local-server command and verify the browser experience.

## Open questions

- Before this can be described as anatomically accurate, establish a separately licensed ground-truth source and a review process with qualified anatomy expertise. More triangles alone are not that evidence.
