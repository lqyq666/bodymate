# Reviewer quickstart

## Requirements

- Node.js and npm
- MoonBit `0.1.20260904`
- A modern Chromium browser with WebGL

## Reproduce

```text
git clone https://github.com/lqyq666/bodymate.git
cd bodymate
npm ci
npm run build
npm run check
npm run moonbit:stats
```

Open `index.html` directly using `file://`. The shipped runtime is local-first: it has no runtime CDN, API, model, anatomy, or backend fetch.

## Three official demos

1. Enter `右侧斜角肌`. MoonBit resolves `bodymate.neck.set.scalene.right`; three real scalene meshes highlight, with right anterior scalene as focus.
2. Enter `耸肩涉及哪些肌肉`. MoonBit resolves `shoulder_girdle_elevation`, shows the existing StructureSet, and exposes locally bundled evidence.
3. Enter `低头和向右转头有哪些共同结构`. MoonBit resolves the ordered movement pair, performs set algebra, and shows overlap / only-left / only-right presentation tiers.

Try a health query such as `我脖子疼怎么办` as a safety check: it must return an educational boundary message without changing the selected anatomy.

## Where to review MoonBit

- `moonbit/core/registry.mbt` — canonical 14-structure registry and StructureSet derivation
- `moonbit/core/resolver.mbt` — deterministic structure, movement, comparison, and health classification
- `moonbit/core/movements.mbt` and `comparison.mbt` — bounded evidence mapping and pure set algebra
- `moonbit/core/actions.mbt`, `state.mbt`, `events.mbt`, `wire.mbt` — validation, transitions, events, and versioned boundary

Read [architecture](MOONBIT_ARCHITECTURE.md), [review guide](MOONBIT_REVIEW_GUIDE.md), [test matrix](TEST_MATRIX.md), [movement evidence](MOVEMENT_EVIDENCE.md), and [asset provenance](HUMAN_ATLAS_NECK_ASSET.md) alongside the code.
