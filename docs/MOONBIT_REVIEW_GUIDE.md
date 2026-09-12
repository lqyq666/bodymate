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

## Movement evidence replay

1. Query `耸肩涉及哪些肌肉`.
2. MoonBit resolver v3 returns `MOVEMENT_LOOKUP` and the `shoulder_girdle_elevation` mapping with bundled evidence IDs.
3. `SHOW_MOVEMENT_MAPPING` derives one existing `StructureSet`; it does not create a renderer-owned movement highlight list.
4. Snapshot v4 identifies the active movement, the four current-model structures, qualitative participation roles, and the coverage note.
5. The renderer applies focus/main/contributor presentation tiers to real meshes; Coach C and the right card consume the parsed result.
6. Click `查看依据` to inspect locally bundled title, URL, and evidence note. The page does not fetch those URLs automatically.

Replay `向右转头涉及哪些结构` for the left SCM/right splenius-capitis coverage, then select any mapped mesh and confirm movement mode clears. Replay `我转头时脖子疼` and confirm the health safety response returns without a state mutation.

## Movement comparison replay

1. Query `低头和向右转头有哪些共同结构`.
2. MoonBit resolver returns `MOVEMENT_COMPARISON` and `SHOW_MOVEMENT_COMPARISON` for `cervical_flexion,cervical_rotation_right`.
3. MoonBit set algebra yields left SCM as overlap, right SCM as only-left, and right splenius capitis as only-right; snapshot v5 retains each side’s role and evidence ID.
4. The renderer colors those three buckets and the right card shows the compact legend. Coach C points to the MoonBit-selected overlap focus.
5. Replay `向左转头和向右转头有什么区别`: overlap is empty, so the UI must say only that no common mapped structure exists in the current model coverage.
6. Select an exact mesh and verify both movement and comparison state clear. Replay `低头和转头都疼` and verify health rejection has no state mutation.

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
