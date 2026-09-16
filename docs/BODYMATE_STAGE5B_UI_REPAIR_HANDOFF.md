# BodyMate Stage 5B UI Repair Handoff

Updated: 2026-09-12 (Asia/Shanghai)

## Purpose

Continue the repair of a discovered UI/runtime integration gap. This is not a request to restart the old Stage 4B AI work or to expand the anatomy model beyond its approved scope.

The user reported that selecting body areas other than neck/shoulder appears blank, and that controls such as **Pulse** and **Reset view** have no apparent effect. The report is valid and reproducible from the current checked-in page.

## Authoritative baseline

| Item | Value |
| --- | --- |
| Repository | `lqyq666/bodymate` |
| Remote `main` after fetch | `0cbf0fde833ea9b1f7ad6cc62e327a74aff7aa4e` |
| Local branch at handoff | `chore/mark-generated-artifacts` |
| Local HEAD | `3f6dc7154bfa8a75dea28c1eae7e5716785c4eba` |
| Relationship | Local HEAD is an ancestor of `origin/main` |
| Opened page | repository-root `index.html` through `file://` |

After fetching, `index.html`, `assets/runtime/root-scm-runtime.js`, and `assets/runtime/root-scm-root-adapter.js` have no diff between the local opened checkout and `origin/main`. This is **not** a stale-browser or stale-artifact issue.

## Confirmed diagnosis

### 1. The UI advertises unsupported body regions

`index.html` retains a legacy whole-body whitebox navigator with these selectable regions:

```text
neck, shoulder, chest, arm, abdomen, back, thigh, calf
```

The actual anatomy runtime only has the canonical 14-entry neck/shoulder registry. Its real asset is the Human Atlas neck GLB, not a whole-body asset.

`assets/runtime/root-scm-root-adapter.js` considers the real viewer active only when the selected ID is in `BodyMateAnatomyRegistry`. Any non-registry selection falls back to the old `#detail-canvas` whitebox path. That path is not a supported anatomy experience and can look blank in the reported flow.

The documentation already describes the intended product boundary:

- `README.md`: real shipped model is 14 neck/shoulder meshes, not complete anatomy.
- `docs/MOONBIT_ARCHITECTURE.md`: MoonBit owns the canonical 14-entry registry; the model is deliberately limited to neck/shoulder.
- `docs/ONE_PAGE_PROJECT.md`: same 14-structure bounded scope.

### 2. The controls are wired, but only to the legacy renderer

The legacy page script binds the controls:

- `#toggle-pulse` toggles `state.pulse`.
- `#reset-angle` calls `resetAngle()`.
- `#toggle-labels` toggles legacy label overlays.

Those actions operate on the legacy `detailCamera` / whitebox detail renderer. The real Human Atlas viewer in `src/root-scm/runtime-entry.mjs` owns a separate Three.js camera and `OrbitControls` instance.

Its current public mount API exposes `show`, `hide`, `applySnapshot`, `focusSelected`, `focusContext`, `setQueryFeedback`, and `dispose`. It exposes no reset-camera, pulse, or label-visibility operation. The root adapter does not bridge any of those controls.

Therefore:

- **Pulse** has no visible effect in the real GLB viewer.
- **Reset view** has no visible effect in the real GLB viewer.
- **Labels** should be audited in the same repair because real labels are created by the root viewer, not by the legacy label overlay.

The labels shown in the user screenshot are from the real-viewer overlay, which is consistent with this diagnosis.

### 3. Architectural issue to avoid carrying forward

The legacy controller still constructs full-body placeholder data and registers it through the old registration path. Do not build new behavior around that path. The repair should enforce the documented contract instead:

```text
real mesh pick / validated query
  -> MoonBit action
  -> validated MoonBit snapshot
  -> renderer presentation
```

JavaScript must not introduce a second anatomy registry or a domain-state bypass for unsupported regions.

## Evidence collected

A deterministic compatibility probe against the current checkout produced:

```text
FAIL | all visible body regions have a real anatomy registry | shoulder, chest, arm, abdomen, back, thigh, calf
FAIL | root viewer receives a pulse command | no pulse bridge
FAIL | root viewer receives a reset-angle command | no reset bridge
PASS | legacy buttons themselves have click handlers | handlers present
PASS | non-neck selection deliberately falls back to the legacy detail canvas | fallback branch present
```

Relevant existing tests were also run successfully:

```text
node --test test/root-scm-integration.test.mjs test/neck-presentation.test.mjs
# 22 passed, 0 failed
```

These tests prove the frozen asset and neck runtime work, but they do not yet test UI affordance parity between the legacy controls and the real viewer.

## Recommended Stage 5B repair scope

Keep the repair deliberately bounded:

1. Make the left navigator truthful about the supported model.
   - Preferred: only offer the supported neck/shoulder area, or render all other body areas as visibly unavailable with a concise coverage message.
   - Unsupported clicks must not mutate MoonBit state or send the renderer into a legacy placeholder flow.
   - Do not add whole-body anatomy, new assets, or fallback pseudo-anatomy.

2. Reconcile the bottom controls with the real viewer.
   - Add a real-viewer reset-camera operation and bridge `#reset-angle` to it.
   - Either implement a subtle, accessible real-viewer pulse for the selected structure or remove/disable the Pulse control with honest copy. Do not retain a live-looking dead control.
   - Validate whether the labels toggle works in the real viewer; bridge it or remove/disable it consistently.

3. Keep MoonBit authoritative.
   - The renderer should receive only validated snapshots.
   - Do not preserve the legacy JS registry as a competing anatomy domain model.
   - Preserve existing StructureSet, movement mapping, comparison, query, and Coach C behavior for the 14 supported structures.

4. Add regression coverage.
   - Assert that every enabled navigation region has a canonical real-asset mapping.
   - Assert unsupported-region UI does not produce a renderer/domain transition.
   - Assert reset reaches the real viewer.
   - Assert Pulse and Labels have an explicit, testable behavior in the real viewer (implemented or deliberately unavailable).

## Hard boundaries

- Do not modify `assets/anatomy/human-atlas/neck-muscles.glb`.
- Frozen GLB SHA-256 must remain `FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065`.
- Preserve the 14 mesh/node count.
- Do not add anatomy assets, external API calls, keys, dependencies, AI, backend, medical/diagnostic features, or full-body scope.
- Keep offline `file://` behavior and zero runtime external requests.
- Generated browser artifacts must be regenerated through `npm run build`; do not hand-edit generated runtime assets.

## Relevant files

| File | Why it matters |
| --- | --- |
| `index.html` | Legacy whole-body navigator, legacy state/controller, and visible controls. |
| `src/root-scm/runtime-entry.mjs` | Real Three.js Human Atlas viewer; likely place for reset / label / optional pulse API. |
| `assets/runtime/root-scm-root-adapter.js` | Bridges page state to the real viewer; needs control bridging and honest fallback behavior. |
| `src/root-scm/presentation-plan.mjs` | Snapshot-driven material plans; use if a real selected-structure pulse is implemented. |
| `src/anatomy/neck-registry.mjs` | Canonical JavaScript projection of the 14 supported entries; do not add a second registry. |
| `moonbit/core/registry.mbt` | MoonBit canonical registry and source of domain authority. |
| `test/root-scm-integration.test.mjs` | Existing root/bridge tests; extend for the repaired controls and coverage boundary. |
| `test/neck-presentation.test.mjs` | Existing presentation and generated-artifact contracts. |
| `docs/MOONBIT_ARCHITECTURE.md` | Required architecture boundary reference. |

## Local worktree rules

First inspect:

```powershell
git status --short
git diff --exit-code
git diff --cached --exit-code
git fetch origin
git rev-parse origin/main
```

The only known permitted long-lived local path is:

```text
prototype/human-atlas-local/
```

They must not be edited, moved, deleted, staged, or committed. Do not use `git clean -fd`, `git clean -fdx`, `git reset --hard`, `git add .`, or `git add -A`. Use explicit paths when staging a repair.

## Verification target

At minimum run:

```powershell
npm run build
npm run check
npm run moonbit:stats
```

Then manually verify through `file://` at desktop and mobile sizes:

- supported neck/shoulder picks show real Human Atlas meshes;
- unsupported left-nav regions are visibly unavailable and cannot enter a blank detail flow;
- Reset view visibly restores the real viewer camera;
- Pulse and Labels have the exact advertised behavior;
- mesh click and query still flow through MoonBit to a validated snapshot;
- external runtime requests remain zero.

## Suggested opening prompt for the next conversation

> Continue the Stage 5B UI repair described in `docs/BODYMATE_STAGE5B_UI_REPAIR_HANDOFF.md`. Implement only the bounded repair: make unsupported body regions unavailable, bridge or honestly remove dead real-viewer controls, preserve MoonBit as the sole domain authority, keep the frozen 14-mesh Human Atlas asset unchanged, add regression tests, build, and verify `file://` behavior. Do not expand full-body anatomy or restart Stage 4B AI work.
