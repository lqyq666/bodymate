# Brief: Human Atlas full local navigation

**Date:** 2026-09-11
**Status:** Locked
**Implemented:** 2026-09-11
**Branch:** feat/original-neck-visual-spike
**Research question:** How can all 2,234 Human Atlas components improve orientation while preserving a focused, performant right-SCM inspection workflow?

## Recommendation

Download the full, pinned Human Atlas component set only to the existing ignored local-assets directory. Render it as an efficient, system-batched whole-body navigation view alongside the existing real neck-shoulder detail view. Keep only the registered SCM selectable; unknown components must not mutate MoonBit state.

## Findings

1. The pinned Human Atlas package provides 15 binary chunks and a 2,234-part manifest, totaling about 33 MB compressed or 60 MB uncompressed.
2. Its own implementation batches per system for rendering and retains separate component geometry for picking. For this proof, system batching plus a separate SCM mesh is sufficient: it keeps draw calls low and preserves the selected target.
3. The viewer must hide the integumentary shell by default, otherwise it blocks the internal structures the user came to inspect.
4. The reproductive system is excluded from the rendered full-body navigator so genital structures are never displayed in this experience.

## Constraints

- Downloaded components and generated full manifest remain ignored and absent from Git.
- The full viewer remains local-only under the earlier BodyParts3D license-risk decision.
- MoonBit remains authority; only a registered BodyMate stable ID can alter selection.
- The root renderer and Stage 2C are untouched.

## Alternatives rejected

- Render 2,234 independent Three.js draw calls: unnecessarily slow and not representative of a production path.
- Register all FMA components as BodyMate domain structures now: their product labels, regions, layers and review status have not been defined.

## Implementation checklist

- [x] Add deterministic full-atlas download mode without changing the local-only boundary.
- [x] Add per-chunk retry and successful-part reuse for transient source-network resets.
- [x] Add a system-batched full-body navigator and real local SCM detail view.
- [x] Keep FJ1595 mapping, isolate/restore and bounds focus MoonBit-driven.
- [x] Exclude reproductive components from the rendered full-body navigator.
- [x] Add regression tests and local browser verification.
