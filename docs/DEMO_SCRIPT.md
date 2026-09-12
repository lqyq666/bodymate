# BodyMate demo script

## 60 seconds

BodyMate is an offline anatomy explorer with 14 real neck-and-shoulder meshes. Enter `右侧斜角肌`: MoonBit resolves one StructureSet and Three.js highlights three actual meshes. Then enter `耸肩涉及哪些肌肉`: MoonBit maps a deliberately bounded, evidence-backed movement set and the card opens its local citations. Finally enter `低头和向右转头有哪些共同结构`: MoonBit compares two existing mappings with union, intersection, and directional difference. Everything runs from local files; MoonBit decides the domain result and Three.js renders it. It is educational, bounded, and not diagnostic.

## 3 minutes

Start on the real 14-mesh neck view. Pick a mesh to show that mesh clicks go through the same MoonBit action boundary as text queries. Enter `右侧斜角肌`; explain that `selected` is one focus while `highlighted` is a distinct StructureSet of three canonical registry members. Use isolate and restore to show the renderer obeys the validated snapshot.

Enter `耸肩涉及哪些肌肉`. Explain that the catalog is small by design: it names only structures supported by the bundled source and present in the current model. Open `查看依据`; citations are packaged locally and only navigate if a reviewer chooses to open a link.

Enter `低头和向右转头有哪些共同结构`. Explain the left/right ordered mapping inputs, MoonBit union/intersection/difference, the overlap and two directional buckets, and preserved evidence IDs. Finish with `我脖子疼怎么办`: the product gives a boundary message and does not assign a muscle or diagnosis.

## 8-minute technical demo

1. **Problem (0:00–0:45).** Static anatomy labels make it hard to connect a question, a real mesh, and a bounded explanation. BodyMate keeps one interaction truth for a deliberately small model.
2. **Product (0:45–1:30).** Show mesh picking, labels, orbit, isolate/restore, Coach C, and the right information card. State the 14-structure scope.
3. **MoonBit architecture (1:30–3:00).** Follow query/pick → resolver → action engine → registry/movement/evidence/StructureSet/comparison → state/events → versioned snapshot. MoonBit decides what; Three.js decides how it looks.
4. **Real anatomy and StructureSet (3:00–4:00).** Run `右侧斜角肌`, inspect the three highlight roles, and point to pinned Human Atlas / BodyParts3D provenance.
5. **Movement evidence (4:00–5:15).** Run `耸肩涉及哪些肌肉`, open bundled evidence, and explain current-model coverage wording rather than biological completeness.
6. **Set algebra (5:15–6:15).** Run `低头和向右转头有哪些共同结构`; show overlap, only-left, only-right, stable registry order, and each side’s evidence provenance.
7. **Tests and offline delivery (6:15–7:20).** Run `npm run check`; explain MoonBit, cross-language, GLB/hash, generated-artifact, offline, and hygiene gates. Open `index.html` with `file://`.
8. **Limits (7:20–8:00).** This is no AI, no remote backend, no diagnosis, no treatment, no EMG claim, and no complete movement or anatomy model.
