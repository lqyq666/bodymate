# Real Neck Asset Feasibility Spike

This isolated prototype proves a real-mesh route without replacing the Stage 1 `index.html` renderer or UI. Run `npm install`, `npm run build`, then `npm run spike:serve` and open `/prototype/real-neck/`. The supplied server deliberately serves `.mjs` as JavaScript; basic Python static servers may not.

## Asset decision

Source: [BodyParts3D Release 4.0 archive](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html). The archive maps FMA concepts to BP representation IDs and atomic FJ OBJ meshes.

| BodyMate ID | Source concept / representation | Local mesh | Mesh count |
| --- | --- | --- |
| `bodymate.neck.sternocleidomastoid.right` | `FMA13408` / `BP4909` | `FJ1595.obj` | 1 |
| `bodymate.neck.trapezius.upper.right` | `FMA33586` / `BP5636` | `FJ1521.obj` | 1 |

The 2025 archive README declares CC BY 4.0, permits redistribution and derivatives, and requires the attribution: `BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International`.

However, the extracted OBJ headers still declare the older CC BY-SA 2.1 Japan wording. Because that embedded-file notice conflicts with the current archive page, neither OBJ is committed to this public repository. `local-assets/` is ignored. For a local verification, download the official `isa_BP3D_4.0_obj_99.zip`, extract only `FJ1595.obj` and `FJ1521.obj` from its `isa_BP3D_4.0_obj_99/` directory into `prototype/real-neck/local-assets/`, then run `npm run spike:verify-local`.

This is a technical feasibility result, not a medical claim or a production-asset approval. Before shipping assets publicly, obtain written clarification from DBCLS about which of the two license notices governs the files.

## Chain under test

`real OBJ raycast → registry mesh name → stable BodyMate structure ID → MoonBit select_structure → validated snapshot → Three.js material/visibility`.

Three.js is isolated here because `OBJLoader`, mesh traversal, raycasting, PBR materials, orbit controls, and bounds-driven camera focus materially reduce renderer complexity. It remains a rendering/picking layer; MoonBit remains the only domain-state authority.
