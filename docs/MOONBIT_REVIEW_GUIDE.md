# MoonBit domain engine review guide

## Review question

Does the product have one authoritative, deterministic domain engine for the 14 real neck structures, rather than independent JavaScript resolver tables and state transitions?

## Files to inspect

- `moonbit/core/registry.mbt` — canonical stable IDs and source identity.
- `moonbit/core/state.mbt` and `actions.mbt` — transitions and action validation.
- `moonbit/core/resolver.mbt` — deterministic query classification, side/family handling, safety rejection, candidate ranking.
- `moonbit/core/events.mbt` and `wire.mbt` — bounded events and versioned bridge.
- `scripts/build-moonbit-registry.mjs` — generated JavaScript/JSON projection.
- `src/coach-c/structure-finder.mjs` — thin parser/executor adapter only; it has no resolver table or direct domain mutation.

## Example to replay

1. Query `右侧斜角肌`.
2. MoonBit returns `AMBIGUOUS`, `FIND_STRUCTURE`, and the three right scalene stable IDs.
3. Nothing is selected until the user chooses a candidate.
4. Candidate selection invokes `SELECT_STRUCTURE` in MoonBit.
5. The accepted snapshot causes the browser renderer to highlight/focus that exact real mesh.
6. `ISOLATE_SELECTED` and `RESTORE_CONTEXT` alter MoonBit state first; renderer visibility follows the snapshot.

## Required commands

```text
npm run moonbit:stats
npm run build
npm run check
```

The baseline report in `docs/MOONBIT_ENGINE_BASELINE.md` is generated before this expansion. `npm run moonbit:stats` reports the current file, LOC, export, and test counts without a hand-maintained number.

Normal CI is anatomy-network-free. Verified source chunks may only be downloaded by an explicit `BODYMATE_ALLOW_NETWORK=1` source-refresh command; regular checks instead validate the committed manifest, registry projection, GLB nodes, and frozen GLB hash.

## Deliberate limits

This change does not add a remote API, AI inference, diagnosis, accounts, training history, C coach animation, a new renderer migration, extra anatomy assets, or a new visual design. Three.js remains a renderer/picking/camera implementation detail. The root `index.html` remains directly runnable offline.
