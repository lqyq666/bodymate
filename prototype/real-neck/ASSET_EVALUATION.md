# BodyParts3D neck asset evaluation

## Decision

**Use for a local Stage 2A feasibility check only; do not commit the OBJ files yet.**

## Evidence

- Source archive: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html>
- Downloaded mesh bundle: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip>
- Metadata table: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt>
- Atomic mesh mapping: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt>

The current archive README (updated 2025-02-25) says CC BY 4.0, grants acquisition, redistribution, and derivative-work distribution, and mandates this attribution:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

## Registered concepts

| Stable BodyMate ID | Anatomical concept | Source IDs | Atomic OBJ mesh count |
| --- | --- | --- | --- |
| `bodymate.neck.sternocleidomastoid.right` | right sternocleidomastoid | `FMA13408`, `BP4909`, `FJ1595` | 1 |
| `bodymate.neck.trapezius.upper.right` | descending part of right trapezius | `FMA33586`, `BP5636`, `FJ1521` | 1 |

BodyParts3D explicitly separates concepts, representations, and elementary polygon files. The registry therefore never treats an OBJ name as a product identifier; a future asset can replace the mesh list without changing BodyMate IDs.

## Redistribution risk

Both extracted OBJ headers still say CC BY-SA 2.1 Japan, which conflicts with the archive's current CC BY 4.0 statement. The archive is official but the per-file notices are also provenance data. Until DBCLS confirms which notice governs the actual polygon files, the public repository must not ship either OBJ or derived geometry. The local asset directory is ignored, and the spike has no remote fallback.

## Recommendation

Technically adopt this source for the next reviewed asset step: it provides independently selectable meshes, dependable FMA/BP/FJ metadata, and works with the registry → MoonBit → renderer chain. Legally, obtain DBCLS clarification before public redistribution; otherwise retain only the importer/mapping pattern and choose a source with unambiguous per-file terms.
