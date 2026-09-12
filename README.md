# BodyMate

BodyMate is an offline interactive anatomy explorer for a bounded neck-and-shoulder model. It makes real mapped anatomy easier to inspect through mesh picking and deterministic Chinese/English queries, including structure sets, movement coverage, and movement comparisons.

The shipped demo is real today: 14 independently named Human Atlas / BodyParts3D muscle meshes, locally bundled Three.js presentation, and a MoonBit domain engine. It is not complete human anatomy, a biomechanics database, AI, or a medical product.

## Why MoonBit is central

MoonBit is the single authority for the canonical structure registry, query resolver, StructureSet semantics, bounded movement/evidence catalog, comparison set algebra, action validation, state transitions, event log, and versioned snapshots. JavaScript parses those contracts and renders them. Three.js decides how a validated result looks; it does not decide what the product means.

```text
mesh pick or query -> MoonBit resolver -> MoonBit action engine -> validated snapshot -> JS adapter -> Three.js / Coach C / UI
```

## Run and verify

Requirements: Node.js with npm, MoonBit `0.1.20260904`, and a modern Chromium browser with WebGL.

```text
npm ci
npm run build
npm run check
npm run moonbit:stats
```

Then open `index.html` directly with `file://`. The runtime makes no CDN, API, model, anatomy, backend, account, or database request; outbound links appear only when a reviewer deliberately opens a bundled evidence citation.

The current canonical MoonBit metrics are 9 production files, 1288 effective production LOC, 10 test files, 294 effective test LOC, 30 MoonBit tests, and 29 exported functions. `npm run moonbit:stats` is the authority for regenerated values.

## Three reviewer demos

1. `右侧斜角肌` — a MoonBit StructureSet resolves to three real highlighted meshes.
2. `耸肩涉及哪些肌肉` — a MoonBit movement mapping resolves evidence-backed, current-model coverage.
3. `低头和向右转头有哪些共同结构` — MoonBit comparison algebra shows overlap, only-left, and only-right structures.

Use [the reviewer quickstart](docs/REVIEWER_QUICKSTART.md) for the exact route. [Architecture](docs/MOONBIT_ARCHITECTURE.md), [review guide](docs/MOONBIT_REVIEW_GUIDE.md), [test matrix](docs/TEST_MATRIX.md), [movement evidence](docs/MOVEMENT_EVIDENCE.md), and [asset provenance](docs/HUMAN_ATLAS_NECK_ASSET.md) document the evidence.

## Boundaries and limitations

BodyMate is an educational, offline-first prototype. The anatomy is intentionally limited to 14 neck/shoulder structures and the movement catalog is intentionally small. Movement mappings identify only evidence-backed structures covered by the current model; they are not complete activation models, EMG measurements, diagnosis, treatment, rehabilitation, or training advice. There is no remote AI or backend.
