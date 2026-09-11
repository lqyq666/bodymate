# Brief: Human Atlas local SCM reassembly

**Date:** 2026-09-11
**Status:** Locked
**Implemented:** 2026-09-11
**Branch:** feat/original-neck-visual-spike
**Research question:** Can the Human Atlas browser components be reassembled locally into a substantially more credible right-SCM inspection view while preserving BodyMate's MoonBit domain boundary and keeping unapproved geometry out of Git?

## Recommendation

Use the pinned Human Atlas browser package only for a local, ignored visual verification page. Reassemble its right SCM (`FJ1595`) with a deliberately small neck-shoulder context of independently addressable components. Do not commit, publish, or represent the downloaded geometry as approved BodyMate content.

## Evidence

1. Human Atlas commit `1c38bf35c254a891200d3cedecfd57abebe83d8d` contains a manifest plus binary chunks. Its manifest identifies `FJ1595` as right sternocleidomastoid (`FMA13408`), with 2,166 vertices and 2,274 triangles in chunk 5.
2. Its loader reconstructs each part from position, normalized Int16 normal, and UInt32 index ranges in the chunk buffer. The source IDs survive its browser optimization, so the selected component can be traced locally.
3. Human Atlas describes its anatomy data as BodyParts3D 4.0 / CC BY 4.0, but this repository already records a conflict between current archive terms and legacy OBJ-level notices. The existing Stage 2B decision therefore prohibits public BodyParts3D-derived geometry without written clarification.

## Approach

- Pin Human Atlas code/data URLs to the exact Git commit above.
- Download only five required uncompressed chunks and a generated local manifest into `prototype/human-atlas-local/local-assets/`, which is gitignored.
- Reassemble `FJ1595` (selected SCM), `FJ1573` (opposite SCM), bilateral upper trapezius components, bilateral clavicles, and C3-C7 reference vertebrae in an isolated Three.js view.
- Map only `FJ1595` through the local Anatomy Registry to `bodymate.neck.sternocleidomastoid.right`, then call MoonBit before any renderer state changes.
- Use mesh bounds for focus; isolate hides the reassembled context and restore brings it back.

## Constraints

- This is local verification only. No downloaded `.bin`, generated manifest, extracted geometry, Human Atlas source code, or BodyParts3D-derived binary can be staged or pushed.
- The optimized SCM has lower triangle density than the Stage 2C GLB; the expected improvement is real shape and coherent neighboring structures, not a claim of higher geometric resolution.
- Root `index.html`, the formal renderer, and Stage 2C stay unchanged.

## Alternatives rejected

- Continue refining the procedural tube: it cannot reproduce the attachment geometry or contextual fidelity requested.
- Commit Human Atlas data under its own attribution statement: blocked by the project’s existing recorded BodyParts3D license conflict.

## Implementation checklist

- [x] Pin the source, parse the component manifest, and document the local-only boundary.
- [x] Add an ignored, reproducible local downloader for the four required chunks.
- [x] Reassemble real components and connect SCM selection through Registry → MoonBit → renderer.
- [x] Test mapping, unknown inputs, isolate/restore, focus, and root regressions.
- [x] Verify the local browser page after the assets are downloaded.
