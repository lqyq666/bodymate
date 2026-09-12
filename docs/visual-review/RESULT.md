# BodyMate visual polish and real navigator — 2026-09-12

## Delivered scope

The user's follow-ups override the original neck-only default: the home page now shows the existing complete bound human. The neck explorer remains an explicit `?view=neck-lab` view. The left navigator is a miniature of the same real asset, not the procedural whitebox. No anatomy or MoonBit domain expansion was made.

- Complete body: 415 muscle meshes, 282 skeletal/related meshes, existing 21-joint rig and 3 actions.
- Independent miniature: shared immutable geometry; separately cloned skeleton and camera. Front/back/side, manual orbit, and actual neck-bound focus marker. It stays standing during main-view motion.
- Cold-white/blue glass shell, actual model counts, local question search, real selected-mesh thumbnail in neck view, larger anatomy framing, restrained labels, Coach C with bounded pointing arm.
- Existing push-up/squat/curl, posture controls, bone/x-ray display, playback and activation flashing retained.
- Neck queries still execute through the existing MoonBit controller. Full-body neck questions navigate into that explorer rather than fabricating new mappings.

## Evidence

`npm run check`: PASS. MoonBit **30/30**; Node **91/91**. Generated artifact gate and repository hygiene gate passed. `git diff --check` passed (line-ending warnings only).

All **34** files under `moonbit` and `assets/anatomy` were SHA-256-compared with this task's baseline: **0 changed, 0 missing**. Frozen neck GLB still has 14 structures/14 nodes:

`FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065`

Existing rigged full-body GLB remains:

`CD2E2108F7551B87928989C445C78E8BB35D867C89D90CD766623CB4CF7E1522`

Browser checks on the local page:

| Check | Observed result |
|---|---|
| Right scalene query | 3 highlighted right scalene structures |
| Shrug query | 4 mapped participants; existing evidence opens |
| Flexion vs right rotation | 1 shared, 1 only A, 1 only B; existing evidence opens |
| Isolate / restore | One visible label when isolated; surrounding structures restored |
| Label selection | Selected structure/title changes through the existing controller |
| Central orbit | Drag changes view without changing selection |
| Full-body actions | Push-up and squat playback, pause and return to standing verified |
| Bone view | Correct pressed/display mode; return to muscle mode verified |
| Independent miniature | Miniature side view while main remains paused in push-up |
| Mobile | 390×844 CSS viewport; no horizontal overflow; real miniature present |
| Network | Localhost resources only; full model fetched once and shared by both views |

Automated rig tests additionally cover palm orientation, finite deformed triangles, contact stability, and all 3 clips. These are engineering checks, not medical validation.

## Screenshots

- [Desktop 1440×900](desktop-1440x900.jpg)
- [Mobile viewport capture](mobile-viewport.jpg)

The mobile viewport was set to **390×844**. The browser's exported viewport image is **375×812** due to its capture/scaling behavior; it is not represented as a pixel-exact 390×844 artifact.

## Changed files in this task

- `index.html`
- `assets/visual-lab.css` (new)
- `assets/visual-full-body.css` (new)
- `assets/runtime/visual-lab-shell.js` (new)
- `assets/runtime/real-body-navigator.js` (new)
- `assets/runtime/root-scm-root-adapter.js`
- `assets/runtime/full-muscle-root-adapter.js`
- `src/root-scm/runtime-entry.mjs`
- `src/root-scm/label-layout.mjs`
- `src/coach-c/model.mjs`
- `src/coach-c/placement.mjs`
- `src/full-muscle/runtime-entry.mjs`
- `src/full-muscle/navigator.mjs` (new)
- `scripts/build-full-muscle-runtime.mjs`
- `scripts/check-generated.mjs`
- `package.json`
- `test/visual-lab.test.mjs` (new)
- Generated: `assets/runtime/root-scm-runtime.js`, `assets/runtime/full-muscle-runtime.js`, `assets/runtime/rigged-body-offline.js` (new lossless gzip/base64 transport)
- This report and its screenshots.

Pre-existing dirty/untracked work was preserved. No commit or deployment was performed.

## Remaining differences and limits

- Full-body default is intentional per the user's correction, rather than the reference image's giant neck/face bust. The existing anatomy lacks the reference's fine rendered fiber texture and polished soft-tissue face. No fake mesh or new GLB was introduced.
- Motion activation remains the existing red qualitative indication; static selection uses blue. It is not measured muscle force or a clinically validated biomechanical simulation.
- `file://` now has a generated compressed classic-script transport for the existing complete model, including the real navigator. An executable test verifies byte-for-byte decompression to the GLB. **Browser runtime acceptance is unverified:** the browser tool rejected file URLs by policy, and no bypass was attempted.
- The offline transport adds approximately 31 MB to the local package; HTTP pages do not request it.
- Status: **MODIFIED / TESTED / BUILT / LOCAL_BROWSER_VERIFIED**, with the explicit screenshot and file-protocol limits above. Not deployed or formally accepted.
