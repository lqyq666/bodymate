# Human Atlas neck-muscle integration

## Approved public derivative

This package uses the pinned [Human Atlas](https://github.com/ashemag/human-atlas) commit `1c38bf35c254a891200d3cedecfd57abebe83d8d`. Its anatomy package identifies the source as **BodyParts3D 4.0** and records the current upstream license as CC BY 4.0.

The official [BodyParts3D license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), updated 2025-02-27, permits redistribution and adapted works under CC BY 4.0 provided the database receives the prescribed attribution:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

`assets/anatomy/human-atlas/ATTRIBUTION.md` carries that attribution, the source commit, source URLs, and the BodyMate transformation statement.

## Included structures

| Stable BodyMate ID | Human Atlas mesh | FMA concept | Product display name |
| --- | --- | --- | --- |
| `bodymate.neck.sternocleidomastoid.right` | `FJ1595` | `FMA13408` | 右侧胸锁乳突肌 |
| `bodymate.neck.trapezius.upper.right` | `FJ1521` | `FMA33586` | 右侧斜方肌上部 |
| `bodymate.neck.levator-scapulae.right` | `FJ1532` | `FMA32540` | 右侧肩胛提肌 |

The package is a deterministic extraction from pinned `atlas.json`, `body-4.bin`, and `body-5.bin`. All three source file SHA-256 values, the derived GLB hash, source mesh IDs, counts, and bounds are in `assets/anatomy/human-atlas/manifest.json`.

BodyMate does not claim clinical or diagnostic use. This is an educational anatomy interface.
