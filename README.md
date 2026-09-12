# BodyMate

BodyMate is an offline interactive anatomy explorer. It keeps a whole-body navigator, a focused local anatomy view, and a contextual learning panel synchronized around one current structure.

The current production package contains 14 independently named, mapped Human Atlas / BodyParts3D neck and shoulder muscle meshes. Each mesh keeps a BodyMate stable ID and pinned source identity. Attribution and asset provenance live in `docs/HUMAN_ATLAS_NECK_ASSET.md` and the asset manifest.

## Run it

Open `index.html` in a modern Chromium browser with WebGL enabled, or serve this folder using any static server. The shipped experience works offline: no runtime CDN, remote API, account, database, or required network request is used.

## Domain model

MoonBit is the authoritative interaction engine for the canonical registry, selected structure, region, layer, isolate/restore/overview state, revision, approved actions, deterministic Coach C query resolution, and bounded event history. The browser receives validated snapshots and renders them; Three.js remains responsible only for real-model loading, picking, materials, and camera behavior.

```text
mesh click or local query -> stable BodyMate ID -> MoonBit action -> validated snapshot -> renderer
```

The five permitted domain actions are `FIND_STRUCTURE`, `SELECT_STRUCTURE`, `ISOLATE_SELECTED`, `RESTORE_CONTEXT`, and `SHOW_REGION`. The local query feature is deterministic and intentionally does not provide medical diagnosis or treatment advice. Remote AI is paused.

## Develop and verify

- Verified MoonBit: `moon 0.1.20260904`.
- `npm run build` compiles MoonBit and regenerates every committed browser/runtime registry artifact.
- `npm run moonbit:stats` reports the current MoonBit engine size and test count. The pre-expansion baseline is in `docs/MOONBIT_ENGINE_BASELINE.md`.
- `npm run check` runs MoonBit tests, Node/browser-contract tests, GLB/provenance guards, and generated-artifact consistency checks.

For a focused architecture and review path, see `docs/MOONBIT_ARCHITECTURE.md` and `docs/MOONBIT_REVIEW_GUIDE.md`.

## Scope boundaries

BodyMate is an educational exploration prototype, not a medical device. It does not include diagnosis, rehabilitation guidance, accounts, training records, a remote AI system, or a backend. The real anatomy asset is limited to the documented 14-structure neck package; this work does not add whole-body anatomy or alter the target UI direction.
