# Head display surface

Source: Human Atlas / BodyParts3D 4.0, pinned commit `1c38bf35c254a891200d3cedecfd57abebe83d8d`.

BodyParts3D, © The Database Center for Life Science. Licensed under **CC BY 4.0**.

Parts: FJ2810 Skin (head-only plane clipping), FJ2811 External ear, FJ2814 Lip, FJ1289/FJ1340 Cornea, FJ1317/FJ1368 Sclera.

All geometry comes from the project's existing verified source cache. Only the head portion of the skin is retained; no torso or genital skin is included. `scripts/build-head-surface.mjs` verifies the pinned atlas/chunk hashes and emits the local display surface. Coordinates retain the source alignment. At runtime the surface is attached to the existing head bone in its rest frame.

This optional visual layer is not added to the MoonBit registry, structure counts, muscle participation mappings, or medical evidence. Bone and x-ray modes hide the surface to reveal the original anatomy. The original neck and full-body GLB files remain unchanged.

Source attribution: https://github.com/ashemag/human-atlas/blob/1c38bf35c254a891200d3cedecfd57abebe83d8d/public/ATTRIBUTION.md
License: https://creativecommons.org/licenses/by/4.0/
