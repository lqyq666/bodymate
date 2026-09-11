# BodyMate

BodyMate is an offline, interactive anatomy-exploration whitebox. It keeps the full-body navigator, the focused local view, and the current action separate so users can inspect a structure without losing context.

## Open the demo offline

This is a dependency-free static page. Open `index.html` directly in a modern Chromium browser with WebGL enabled, or serve the folder with any static HTTP server. The shipped page has no external runtime scripts, API calls, accounts, or required network connection.

## Develop and verify

The interaction state core is written in MoonBit and compiled to a local JavaScript IIFE embedded between the `MOONBIT_CORE_START` and `MOONBIT_CORE_END` markers in `index.html`.

- Verified toolchain: `moon 0.1.20260904` (Windows tested). Set `MOON` to an explicit executable path when needed; otherwise the scripts use the platform MoonBit install and then PATH.
- `npm run build` compiles `moonbit/core` and replaces exactly one generated IIFE block in `index.html`.
- `npm run verify` runs MoonBit checks/tests plus Node contract and embedded-IIFE tests.
- `npm run check` additionally proves the committed generated block matches a fresh MoonBit compilation. It does not silently refresh it; run `npm run build` and commit the result when source changes.

The `label` field is intentionally retained in the core registration model for future read-only structure queries. MoonBit currently reports it as unused; this does not affect compilation or runtime behavior.

## Current scope

- Full-body navigation is independent from the focused detail camera.
- Selecting a region, mesh, label, or nearby item synchronizes one current structure.
- Isolation, nearby-structure visibility, labels, pulse, the coach bubble, session-only history, and example weekly progress are local demonstrations.
- Geometry, fibers, fascia, and body contours are procedural placeholders, not verified anatomical assets or medical advice.

The project intentionally does not include accounts, real training records, medical/rehabilitation recommendations, a real AI connection, or production anatomical assets.

## Verification target

Desktop: 1440 × 900. Mobile: 390 × 844. Respect keyboard focus and `prefers-reduced-motion`.
