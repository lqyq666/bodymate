# Development retrospective

## Early development history (September 11)

BodyMate began with a practical educational problem: a viewer should connect a question to a visible, named anatomy structure rather than present a generic static illustration. The product narrowed that problem to 14 real neck/shoulder meshes so provenance, labels, interaction, and verification could be made concrete.

The early MoonBit boundary was too thin: it could support individual selection, but JavaScript still had too much pressure to interpret queries and coordinate presentation. That would have made multi-structure semantics, movement coverage, and comparison results easy to duplicate inconsistently. The correction was to migrate domain rules into MoonBit rather than add another browser-side state layer.

The resulting sequence was deliberate: canonical registry and deterministic resolver; StructureSet with a distinct `selected` focus and multi-member `highlighted` set; a bounded movement/evidence catalog; then comparison over existing mappings using pure set algebra. MoonBit now owns validation, transitions, events, and versioned snapshots. Three.js owns GLB loading, raycasting, camera, labels, materials, and presentation only.

## Collaboration and decision authority

ChatGPT and Codex assisted with analysis, implementation, test design, documentation, command execution, and review evidence. This is AI-assisted development, not a claim that a human manually authored every line. Human decision authority remained responsible for product scope, anatomy/source selection, license acceptance, safety boundaries, and merge direction; automation executed only within those decisions.

The delivery workflow used focused branches, PRs, CI, clean-clone checks, generated-artifact guards, and post-merge verification. A useful correction came from the clean clone: Windows line-ending conversion made generated artifacts appear dirty after a build. `.gitattributes` was added so builders' LF output leaves a clean checkout.

## Dependencies, assets, and lessons

The project uses MoonBit, Three.js, esbuild, and glTF tooling. The root source code is MIT-licensed; third-party anatomy assets retain their own terms. Human Atlas / BodyParts3D provenance and CC BY attribution live with the asset manifest and attribution file; retained Open Anatomy materials keep their own license documents. Movement evidence is bundled as citations, not fetched at runtime.

The main lesson is that a small, inspectable domain model is more credible than broad claims. Tests should prove the seam that matters: mesh/query to MoonBit action to validated snapshot to renderer. Offline delivery, artifact freshness, and provenance checks are product-quality work, not release paperwork.

## Current full-body project (September 13)

The active product now has one complete-body page with 415 muscle meshes, 282 skeletal and related structures, three parameterized actions, Chinese picking and an independent standing reference. The earlier neck page is retired; its contracts remain for compatibility tests.

The current refinement extracts the existing full-body domain into `lqyq666/bodymate/motion`: a typed, renderer-independent package with private per-instance sessions, detached snapshots, explicit errors and deterministic pose targets. The browser wire adapter and three standalone MoonBit examples import this same implementation. Black-box tests verify real consumer boundaries, including non-finite phase and extreme elapsed-time cases. An actual packaged ZIP is unpacked and built/tested separately from the application.

This work improves reuse and reviewability without claiming a new generic biomechanics engine. The fixed teaching rig, three prepared actions, qualitative profiles, no independent fingers/toes, and no medical or training claims remain deliberate limits. Current local verification is separate from remote CI, Mooncakes publication and formal acceptance.
