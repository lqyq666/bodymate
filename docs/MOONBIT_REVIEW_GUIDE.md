# MoonBit domain engine review guide

## Review question

Does the product have one authoritative, deterministic domain engine for the 14 real neck structures and their multi-highlight sets, rather than independent JavaScript resolver tables and state transitions?

## Files to inspect

- `moonbit/core/registry.mbt` — canonical stable IDs and source identity.
- `moonbit/core/state.mbt` and `actions.mbt` — transitions and action validation.
- `moonbit/core/resolver.mbt` — deterministic query classification, side/family handling, safety rejection, candidate ranking.
- `moonbit/core/events.mbt` and `wire.mbt` — bounded events and versioned bridge.
- `scripts/build-moonbit-registry.mjs` — generated JavaScript/JSON projection.
- `src/coach-c/structure-finder.mjs` — thin parser/executor adapter only; it has no resolver table or direct domain mutation.

## Example to replay

1. Query `右侧斜角肌`.
2. MoonBit returns `EXACT`, `HIGHLIGHT_STRUCTURE_SET`, the set ID `bodymate.neck.set.scalene.right`, and the three right scalene stable IDs.
3. Nothing mutates until that action is executed through MoonBit.
4. MoonBit selects anterior scalene as deterministic focus and retains all three highlighted members.
5. The accepted V3 snapshot causes the browser renderer to strongly highlight/focus that mesh and softly highlight the other two real meshes.
6. `ISOLATE_SELECTED` renders the focus mesh only; `RESTORE_CONTEXT` restores the group; selecting one exact muscle clears the set.

Also replay `右边脖子` (still ambiguous) and `右侧胸锁乳突肌` (still an exact single-structure selection).

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
