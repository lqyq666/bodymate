# MoonBit review guide

## The product question

BodyMate lets a reviewer inspect a bounded set of real neck/shoulder meshes and ask deterministic structure, movement, or comparison questions. The important architecture question is whether the browser merely presents an answer, or whether it owns separate anatomy rules. The answer is the former: MoonBit owns the domain result; Three.js renders it.

## Ten-minute route

1. Read [the quickstart](REVIEWER_QUICKSTART.md) and run `npm ci`, `npm run build`, `npm run check`, and `npm run moonbit:stats`.
2. Open `index.html` with `file://`; it runs offline.
3. Replay `右侧斜角肌` to inspect MoonBit StructureSet resolution and three real meshes.
4. Replay `耸肩涉及哪些肌肉`, then inspect the local evidence dialog and bounded coverage note.
5. Replay `低头和向右转头有哪些共同结构`; confirm overlap, only-left, only-right, and comparison legend.
6. Replay `我脖子疼怎么办`; confirm no diagnosis and no anatomy-state mutation.

## Files worth reading

- `moonbit/core/registry.mbt` — the canonical 14-entry registry and derived sets.
- `moonbit/core/resolver.mbt` — classification order, including health rejection before action construction.
- `moonbit/core/movements.mbt` and `comparison.mbt` — evidence-backed current-model mappings and pure set algebra.
- `moonbit/core/actions.mbt`, `state.mbt`, `events.mbt`, and `wire.mbt` — accepted actions, transition semantics, bounded events, and V2–V5 snapshots.
- `src/coach-c/structure-finder.mjs` and `src/root-scm/domain-adapter.mjs` — strict wire parsing and forwarding only.
- `scripts/check-generated.mjs` and `docs/REPRODUCIBILITY.md` — generated ownership and stale-output failure mode.

## Facts to verify

- The Human Atlas / BodyParts3D asset and provenance are documented in `docs/HUMAN_ATLAS_NECK_ASSET.md`, `assets/anatomy/human-atlas/ATTRIBUTION.md`, and its manifest. The frozen GLB has 14 mapped mesh nodes.
- Movement sources and exclusions are in `docs/MOVEMENT_EVIDENCE.md`; wording is current-model coverage, not biological completeness.
- `npm run check` covers MoonBit tests, cross-language contracts, artifact freshness, asset integrity, offline boundary, safety, and hygiene. See [the test matrix](TEST_MATRIX.md).
- No runtime source uses CDN, model, API, anatomy, or backend fetch. Evidence URLs are user-opened citations, not auto-fetched runtime data.

## Limitations

This is an educational offline-first prototype with 14 neck/shoulder structures and a deliberately small movement catalog. It makes no medical, diagnostic, treatment, EMG, or training claim, and has no remote AI or backend.
