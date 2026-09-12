# BodyMate — one-page project summary

**Problem and user.** Anatomy learners need a direct way to connect a question with visible, named anatomy. BodyMate serves reviewers and learners exploring a deliberately bounded 14-structure neck/shoulder model.

**Solution.** The offline browser demo renders real mapped Human Atlas / BodyParts3D meshes. A query or mesh pick flows through MoonBit, then a validated snapshot drives Three.js, Coach C, labels, and the information card.

**MoonBit architecture.** MoonBit is the authority for the canonical registry, deterministic resolver, StructureSet semantics, movement/evidence mapping, comparison set algebra, action validation, state transitions, events, and versioned snapshots. Three.js is the rendering boundary: GLB, raycast, materials, labels, camera, and orbit. It does not own domain rules.

**Canonical demos.** `右侧斜角肌` resolves to a three-mesh StructureSet. `耸肩涉及哪些肌肉` resolves to bounded evidence-backed coverage. `低头和向右转头有哪些共同结构` compares two mappings as overlap, only-left, and only-right.

**Verification and reproducibility.** Run `npm ci`, `npm run build`, `npm run check`, and `npm run moonbit:stats`, then open `index.html` using `file://`. Tests cover MoonBit, cross-language contracts, generated artifacts, asset integrity, safety, and offline runtime. The project has clean-clone verification and no required runtime network request.

**Open-source provenance and limits.** Source code is MIT; third-party anatomy assets retain their documented licenses and attribution. The model is limited to 14 structures and a small educational movement catalog. It is not complete anatomy, a biomechanics database, remote AI, or a medical/diagnostic product.
