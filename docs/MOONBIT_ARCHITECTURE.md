# MoonBit domain architecture

BodyMate has one authoritative domain engine. MoonBit decides **what the user’s request means and whether state may change**. Three.js decides **how an accepted snapshot looks**: GLB loading, mesh picking, materials, labels, camera, orbit, Coach C placement, and UI layout.

```text
User Input / Mesh Pick
        ↓
MoonBit Resolver
        ↓
MoonBit Action Engine
        ↓
Registry / Movement / Evidence /
StructureSet / Comparison
        ↓
MoonBit State + Events
        ↓
Versioned Snapshot
        ↓
JS presentation adapter
        ↓
Three.js / Coach C / UI
```

## What MoonBit owns

- The canonical, ordered 14-entry anatomy registry and its pinned stable identifiers.
- Deterministic structure resolution, including exact names, ambiguity, sides, families, and derived StructureSets.
- The bounded movement catalog and evidence references, with current-model coverage wording.
- Comparison inputs, pure canonical-ID union/intersection/directional-difference functions, comparison buckets, per-side roles, and evidence provenance.
- The action allowlist, validation, state transitions, revision, bounded event log, and snapshot versions V2 through V5.
- Health-query rejection before any selection, movement, or comparison action can mutate state.
- Complete-body motion definitions, aliases, parameter ranges, presets, text parsing, qualitative participation profiles, and evidence notes.
- Complete-body playback phase, pause/resume, speed, seek, parameter transitions, and renderer-independent pose intent scalars.

`selected` is one current focus. `highlighted` is independently a zero-or-more StructureSet. A movement and a comparison reuse that existing set primitive; neither gives JavaScript a second source of anatomy state.

## What JavaScript owns

JavaScript is deliberately a transport and presentation layer. It calls the generated external MoonBit IIFE, validates and parses versioned wire payloads, forwards accepted actions, and turns snapshots or pose intents into Three.js vectors/quaternions, materials, cards, labels, camera targets, Coach C copy, and local evidence dialogs. It has no family-to-ID table, motion registry, parameter/preset table, participation mapping, comparison algebra, action transition switch, or shadow playback/domain state.

The generated registry projection is intentionally not a second authored registry:

```text
MoonBit canonical registry
  -> bodymate_domain_registry_v1
  -> build-moonbit-registry.mjs
  -> generated/anatomy-registry.json + src/anatomy/neck-registry.mjs
  -> browser registry/runtime presentation
```

## Domain paths

### StructureSet

`右侧斜角肌` resolves in MoonBit to the canonical right-scalene set. The action selects its deterministic focus and highlights the other canonical members. Selecting one exact structure, showing a movement, clearing the set, or resetting overview clears the active set according to MoonBit transition rules.

### Movement mapping

`耸肩涉及哪些肌肉` resolves to a small evidence-backed catalog entry. MoonBit validates the mapping against canonical IDs and evidence references, derives a StructureSet, and exports V4 fields for label, roles, evidence IDs, and coverage note. The renderer never infers participation.

### Movement comparison

`低头和向右转头有哪些共同结构` resolves to an ordered pair. MoonBit performs deterministic union, intersection, and directional difference over canonical IDs, derives a set focus (overlap first), stores comparison state/events, and emits V5 members with left/right roles and evidence IDs. Presentation uses the supplied buckets only.

### Complete-body motion session

`full_body_motion.mbt` is the canonical source for push-up, squat, and curl identity, aliases, duration, parameter contracts, presets, query parsing, qualitative participation, and key pose scalars. `motion_session.mbt` is the sole playback state: play/stop, phase, pause/resume, speed, seek, and normalized parameters. The render loop asks MoonBit to tick and then positions a paused Three.js `AnimationAction` at the returned phase; Three.js does not advance domain time independently.

## Exported browser boundary

The generated IIFE in `assets/runtime/moonbit-core.js` exposes compatibility functions plus neck-domain and complete-body motion/session contracts. `index.html` contains only one external script reference, so reviewers can inspect source and generated output independently. The transport is deliberately versioned text rather than an implicit renderer object. `window.__bodymate.domainDebug()` is read-only development inspection; it does not provide a JavaScript mutation backdoor.

## MoonBit language use

The engine uses structs for structures, sets, movements, comparisons, state, events, and snapshot records; enums for roles, modes, query classification, and action kinds; `Option` / error results for lookup and action rejection; pattern matching for action and resolver branches; and pure functions for deterministic registry/set/comparison operations. The only JS boundary is the explicit exported wire API in `moonbit/core/moon.pkg`.

## Offline and failure behavior

`npm run build` regenerates all committed browser/runtime projections. `npm run check` recompiles and rejects stale output, verifies the frozen 14-mesh GLB, and rejects runtime remote dependencies. Normal verification never fetches anatomy. If MoonBit rejects an input, JavaScript does not call the renderer mutation path; if a mesh has no canonical mapping, the pick is inert.

## If MoonBit is removed

The following meaningful capabilities disappear together: canonical structure identity; deterministic structure resolution; StructureSet semantics; movement domain and evidence mapping; movement comparison; set algebra; complete-body action/parameter/profile definitions; playback transitions; pose intents; action validation; events; and versioned snapshots. Replacing MoonBit would require independently rebuilding and proving all of these contracts. The renderer could still draw a static mesh, but the product’s deterministic interaction and motion engine would be gone.

## Deliberate limits

The evidence-backed query model covers 14 neck/shoulder structures, while the presentation asset contains a broader complete body. The three complete-body actions use an educational rig and qualitative profiles, not a biomechanics, activation, EMG, diagnosis, treatment, or training system. There is no remote AI, backend, account, or runtime network dependency.
