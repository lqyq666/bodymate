# BodyMate

BodyMate is an offline interactive anatomy and movement laboratory. Its default view presents a complete Human Atlas body with real muscle and skeletal meshes, three parameterized exercise demonstrations, qualitative muscle participation, and independent overview navigation. A focused neck laboratory adds deterministic Chinese/English structure, movement, and comparison queries.

The shipped product is real today: 415 muscle meshes, 282 skeletal and related structures, one shared 21-joint rig, push-up/squat/curl motion, and a MoonBit domain engine. It is an educational prototype, not a biomechanics solver, EMG measurement, training prescription, diagnosis, or medical product.

## Why MoonBit is central

MoonBit is the authority for the canonical neck registry, deterministic query resolution, StructureSet semantics, bounded movement/evidence relationships, comparison set algebra, action validation, state transitions, event log, and versioned snapshots. It also owns the complete-body motion registry and aliases, parameter ranges/presets/normalization, qualitative participation profiles, playback session, and renderer-independent pose intents. JavaScript parses the versioned wire contract; Three.js applies accepted output to the GLB rig, camera, materials, labels, and controls.

```text
input or mesh pick -> MoonBit domain action -> validated snapshot -> JS adapter -> Three.js / Coach C / UI
```

The browser loads the generated MoonBit IIFE from `assets/runtime/moonbit-core.js`; generated code is kept out of `index.html` and is rejected when stale by `npm run check`.

## Views

- `/?view=full-body` — default complete-body anatomy, muscle/bone/x-ray modes, motion playback, parameter controls, qualitative participation, and structure search.
- `/?view=neck-lab` — the MoonBit-authoritative 14-structure neck and shoulder laboratory.
- `/?view=motion-lab` — the retained earlier full-body motion presentation.

## Run and verify

Requirements: Node.js with npm, MoonBit `0.1.20260904`, and a modern Chromium browser with WebGL.

```text
npm ci
npm run build
npm run check
npm run moonbit:stats
```

Serve the repository for the complete-body experience:

```text
python -m http.server 4174 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4174/?view=full-body`. The page makes no required runtime CDN, API, model, anatomy, backend, account, or database request. The retained neck laboratory also supports direct `file://` delivery; the large compressed full-body transport is byte-verified separately because automated browser tooling blocks interactive `file://` control.

Run `npm run moonbit:stats` for current generated metrics rather than relying on a hand-maintained number.

## Reviewer path

1. In the complete-body view, play push-up, change hand width and elbow angle, pause, seek, and restore standing.
2. Play squat, change stance width, toe angle, and depth, then compare muscle, bone, and x-ray modes.
3. Open `/?view=neck-lab` and enter `右侧斜角肌` — one MoonBit StructureSet highlights three real meshes.
4. Enter `耸肩涉及哪些肌肉` — MoonBit resolves evidence-backed current-model coverage.
5. Enter `低头和向右转头有哪些共同结构` — MoonBit comparison algebra returns overlap, only-left, and only-right structures.

Use [the reviewer quickstart](docs/REVIEWER_QUICKSTART.md) for the exact route. [Architecture](docs/MOONBIT_ARCHITECTURE.md), [review guide](docs/MOONBIT_REVIEW_GUIDE.md), [test matrix](docs/TEST_MATRIX.md), [movement evidence](docs/MOVEMENT_EVIDENCE.md), and [asset provenance](assets/anatomy/human-atlas/RIGGED_BODY_ATTRIBUTION.md) document the evidence.

## Boundaries and limitations

The complete body is a presentation and motion layer over attributed Human Atlas geometry. Its three actions use a fixed educational rig; fingers and toes are not independently driven, soft tissue is not simulated, and red intensity is not force or activation measurement. The MoonBit neck knowledge model remains deliberately bounded to 14 structures and a small evidence-backed movement catalog. There is no remote AI or backend.
