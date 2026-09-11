# Public neck anatomy asset decision

## Decision: APPROVED_PUBLIC_ASSET

The approved future source asset for the minimum Stage 2B target is the **right sternocleidomastoid** in the Open Anatomy / Surgical Planning Laboratory (SPL) Head and Neck Atlas:

- Exact upstream package: <https://www.openanatomy.org/atlases/nac/head-neck-2016-09.zip>
- Exact file: `head-neck-2016-09/models/Model_62_right_sternocleidomastoideus_muscle.vtk`
- Source structure ID: `Model_62_right_sternocleidomastoideus_muscle`
- Granularity: one independently named mesh for the right SCM.
- Measured source complexity: 6,507 vertices, 2,524 triangle strips / 15,358 triangles, 237,940 bytes.
- Pinned archive: 31,612,667 bytes, SHA-256 `C224F054569B284C9A948F6F96B0299EAEE13D3AC661A3386657A743FA8552C4`.

The release page identifies this as a CT-based atlas of the MANIX/OsiriX data set with 3D models of the labelled anatomy, identifies Marianna Jakab and Ron Kikinis as authors, and releases the atlas under [3D Slicer License Part B](https://www.openanatomy.org/atlas-pages/slicer-license.html#PART-B). The exact archive root `LICENSE.md` applies that license to the atlas. No contradictory file-local notice was found in the SCM VTK file.

The license grants use, reproduction, derivative works, display, distribution, and sublicensing. This permits an offline VTK-to-GLB conversion and public GitHub redistribution **only if** the distributed asset carries the license's mandatory preface, the complete license text, and applicable copyright/attribution notices. Commercialization is not prohibited, but is at the distributor's sole risk; this does not authorize clinical claims.

Mandatory preface:

> All or portions of this licensed product (such portions are the “Software”) have been obtained under license from The Brigham and Women’s Hospital, Inc. and are subject to the following terms and conditions:

For a later public binary import, add a `NOTICE` file containing that text, the full Part B license, and an explicit credit to “SPL Head and Neck Atlas — Marianna Jakab and Ron Kikinis — Open Anatomy / Surgical Planning Laboratory.” Pin the archive and source-file SHA-256 values from the JSON manifest before conversion.

## Structure coverage

The same source package contains independent right-side meshes for:

| Structure | Exact source ID | Mesh status |
| --- | --- | --- |
| SCM | `Model_62_right_sternocleidomastoideus_muscle` | Approved minimum public source asset |
| Trapezius | `Model_54_right_trapezius_muscle` | Whole right trapezius, not upper-only; do not map it to the existing upper-trapezius BodyMate ID without a product-semantic decision |
| Levator scapulae | `Model_58_right_levator_scapulae_muscle` | Distinct future candidate |
| Scalenius | `Model_60_right_scalenius_muscle` | Distinct future candidate, but not separately anterior/middle/posterior |

All source IDs, sizes, topology counts, licenses, provenance, and hashes are in [anatomy-asset-candidates.json](anatomy-asset-candidates.json). The proposed process is: download the pinned upstream archive outside the repository; verify hashes and license obligations; convert only the approved VTK input deterministically to GLB; validate GLB mesh names against the Anatomy Registry; distribute the resulting asset with `NOTICE` and the full license.

## Rejected candidates

- **BodyParts3D 4.0**: its current archive declares CC BY 4.0 but inspected `FJ1595.obj` and `FJ1521.obj` headers declare CC BY-SA 2.1 Japan. It remains a technical-only candidate until DBCLS gives written clarification.
- **Z-Anatomy**: its `Startup.blend` contains the named neck objects, but its own provenance and attribution explicitly inherit BodyParts3D. The unresolved upstream chain prevents approval.
- **Kevin-Mattheus-Moerman BodyParts3D STL conversion**: transparent CC BY-SA 2.1 Japan provenance, but still BodyParts3D-derived and therefore governed by the same Stage 2B restriction.
- **Visible Human / Segmented Internal Organs**: the reviewed open derivative release does not supply an independent neck SCM mesh.

No real anatomy binary is committed by this decision. This does not migrate the production renderer, change the Target UI, or begin Stage 2C.
