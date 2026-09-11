# BodyMate Stage 2 — ChatGPT Review Handoff

## Requested review

Act as the final product-and-engineering reviewer for the next BodyMate increment. Review the facts below, identify any blocking inconsistency, and choose exactly one next action:

1. **Approve Stage 2D — minimum product integration**: integrate the already-approved public right SCM asset into the root offline BodyMate experience while retaining the existing left full-body navigator and MoonBit authority.
2. **Rework Stage 2C before integration**: specify only concrete defects in PR #4 that must be resolved first.
3. **Block on provenance**: identify the exact evidence missing before any public binary may be used.
4. **Approve a different narrowly scoped next increment**: explain why it is a better hackathon path than option 1, give its acceptance criteria, and list what remains explicitly out of scope.

Do not approve an unbounded UI rewrite, a full-body real-asset import, C coach, AI, accounts, backend, medical guidance, action library, or a renderer migration detached from a demonstrable user flow.

## Product target and constraints

The intended demo is a cool-white research workspace:

- the left side keeps complete-body orientation and navigation;
- the center shows a high-quality, real local anatomy view;
- the selected structure receives a soft light-blue highlight while neighbouring structures remain legible;
- selecting a structure focuses the camera;
- the right panel serves the current structure;
- future C coach is beside the selected structure, but is not part of the next increment.

All structural domain state remains authoritative in MoonBit:

`region`, `selected structure`, `layer`, `isolated`, `overview`, and `revision`.

Three.js may render and raycast only. Renderer objects must never become a second source of domain truth. The root page must remain offline-capable.

## Repository facts — observed 2026-09-11

| Item | Fact |
| --- | --- |
| Public base | `main` at `512c520e390e2b3412d878089030a3dfe70ab81d` |
| Current local prototype branch | `feat/original-neck-visual-spike` at `80b78f7c1308449c3798f445bb543843ed703608` |
| Open PR | [#4](https://github.com/lqyq666/bodymate/pull/4), `feat/public-scm-glb` → `main` |
| PR #4 head | `ae07431a86325ccc9f7ec486af5cdedb8da24fad` |
| PR #4 state | Open, clean merge state, GitHub Actions checks successful |
| Current local verification | `npm run check` passed: MoonBit 3/3; Node 17/17 |
| Untracked local files | Only `.agent-loop/`, `.opencode/`, `AGENT_LOOP.md`, `agent-loop.ps1`; do not stage, move, or delete them |

## What is already complete

### Stage 1 — merged

MoonBit is the domain-state authority; selection, region, layer, isolate/restore, overview, revision, build consistency checks, tests, and offline root-page behaviour were established.

### Stage 2A / 2B — merged

The project established an Anatomy Registry contract and approved an initial public source decision. The approved minimum future structure is:

`bodymate.neck.sternocleidomastoid.right`

The approved source is the Open Anatomy / SPL Head and Neck Atlas, right SCM VTK:

`head-neck-2016-09/models/Model_62_right_sternocleidomastoideus_muscle.vtk`

The decision, hashes, source identity, required notices, and rejected candidates are documented in:

- `docs/ANATOMY_ASSET_DECISION.md`
- `docs/anatomy-asset-candidates.json`

### Stage 2C — PR #4, review/merge decision pending

PR #4 adds exactly one public anatomy binary:

- `assets/anatomy/open-anatomy/scm-right.glb`
- 312,476 bytes
- 6,507 vertices / 12,834 triangles
- SHA-256: `0C4E76694D9206AE1DC160C44B3019B9C4819EB4C8F6FBDDBB2993828C8FCFA7`

The source archive and VTK hashes are pinned. Conversion is reproducible, has no centering, simplification, or compression, and preserves atlas coordinate relationships. The source package's full license and required notice are carried with the binary. PR #4 uses Three.js only in `prototype/public-scm/`; it does **not** migrate the root renderer or change Target UI v1.

Review these areas in PR #4:

- `assets/anatomy/open-anatomy/`
- `scripts/anatomy-*.mjs`
- `prototype/public-scm/`
- `test/public-scm-asset.test.mjs`
- `test/moonbit-ci-install.test.mjs`

### Current full-body local visual verification — not a public asset path

`prototype/human-atlas-local/` contains a separate local-only Human Atlas evaluation:

- it downloads a pinned Human Atlas package to `prototype/human-atlas-local/local-assets/`;
- the directory is gitignored and contains 15 binary chunks only on the developer's machine;
- the default local preview renders 2,234 components across 15 chunks, excluding reproductive anatomy;
- a separately rendered right SCM maps through `FJ1595 → Anatomy Registry → BodyMate stable ID → MoonBit → validated renderer snapshot`;
- isolate/restore and bounds-driven focus have automated coverage;
- browser verification observed the complete navigator loaded, SCM selected, and isolate/focus controls enabled.

This path demonstrates navigation and composition only. It must not be treated as a public asset import or silently become the root renderer.

## License/provenance issue requiring deliberate review

The official BodyParts3D archive license page currently states CC BY 4.0 and explicitly permits acquiring, redistributing, and creating derivatives with the required attribution. However, the project previously inspected legacy per-OBJ headers identifying CC BY-SA 2.1 Japan. `docs/ANATOMY_ASSET_DECISION.md` therefore deliberately keeps BodyParts3D-derived assets technical-only until that contradiction is resolved by authoritative evidence.

Do **not** infer that the hackathon context removes licensing obligations. For any public release, use the source's applicable license, attribution, notice, and change-marking rules. The locally ignored Human Atlas geometry remains outside the public repository unless the documented decision is deliberately revised with evidence.

## Recommended next increment: Stage 2D — minimum product integration

Subject to approval and merge of PR #4, the recommended next implementation is a limited product integration of the single approved Open Anatomy right SCM GLB.

### Scope

1. Keep the existing root left-side body navigator and existing offline UI shell.
2. Add one isolated central Three.js local viewer that loads only `scm-right.glb` from the repository.
3. Route a click or explicit SCM selection through the existing Anatomy Registry and MoonBit; renderer highlight and visibility must derive from the validated snapshot.
4. Use real mesh bounds for camera focus, isolate, and restore.
5. Make the right panel describe the selected SCM only; no AI or medical claims.
6. Provide desktop and mobile browser regressions plus deterministic tests for registry mapping, selection, isolate/restore, focus, and offline asset loading.

### Acceptance criteria

- one real public SCM is visibly more detailed than the current placeholder while preserving a cool-white visual direction;
- no new third-party anatomy asset is introduced;
- `npm run check` remains green;
- no external runtime CDN or network request is required;
- MoonBit remains the sole domain-state authority;
- root `index.html` does not regress its existing Stage 1 interaction contract;
- license, notice, and provenance remain adjacent to the shipped GLB;
- no source asset is accidentally duplicated into an ignored/local-only or product directory.

### Explicit non-goals

- full-body real mesh migration;
- Human Atlas binary publication or renderer import;
- whole trapezius, levator, scalenes, or any extra muscles;
- C coach/robot, AI/RAG, action database, user data, accounts, backend, training records, or medical guidance;
- visual redesign unrelated to the selected SCM flow.

## Required reviewer response

Return in this exact structure:

1. `VERDICT: APPROVE | REWORK | BLOCKED`
2. Chosen next action (one of the four options above)
3. Blocking findings, if any, with file paths and concrete fixes
4. The smallest acceptable Stage 2D acceptance checklist
5. License/provenance conclusion for each of: Open Anatomy SCM, Human Atlas local assets
6. Risks that would invalidate the recommended path
7. A single next branch name and a single-sentence implementation objective
