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

`selected` is one current focus. `highlighted` is independently a zero-or-more StructureSet. A movement and a comparison reuse that existing set primitive; neither gives JavaScript a second source of anatomy state.

## What JavaScript owns

JavaScript is deliberately a transport and presentation layer. It calls the embedded MoonBit exports, validates and parses their versioned wire payloads, forwards accepted actions, and turns snapshots into materials, cards, labels, camera targets, Coach C copy, and local evidence dialogs. It has no family-to-ID table, movement-to-structure mapping, comparison algebra, action transition switch, or shadow domain state.

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

## Exported browser boundary

The embedded IIFE exposes compatibility functions plus domain registry, reset, resolver V1/V2/V3, action execution, event V1/V2, and snapshot V2/V3/V4/V5 calls. The transport is deliberately versioned text rather than an implicit renderer object. `window.__bodymate.domainDebug()` is read-only development inspection; it does not provide a JavaScript mutation backdoor.

## MoonBit language use

The engine uses structs for structures, sets, movements, comparisons, state, events, and snapshot records; enums for roles, modes, query classification, and action kinds; `Option` / error results for lookup and action rejection; pattern matching for action and resolver branches; and pure functions for deterministic registry/set/comparison operations. The only JS boundary is the explicit exported wire API in `moonbit/core/moon.pkg`.

## Offline and failure behavior

`npm run build` regenerates all committed browser/runtime projections. `npm run check` recompiles and rejects stale output, verifies the frozen 14-mesh GLB, and rejects runtime remote dependencies. Normal verification never fetches anatomy. If MoonBit rejects an input, JavaScript does not call the renderer mutation path; if a mesh has no canonical mapping, the pick is inert.

## If MoonBit is removed

The following meaningful capabilities disappear together: canonical structure identity; deterministic structure resolution; StructureSet semantics; movement domain and evidence mapping; movement comparison; set algebra; action validation; state transitions; events; and versioned snapshots. Replacing MoonBit would require independently rebuilding and proving all of these contracts. The renderer would still draw meshes, but it would no longer have the product’s deterministic domain engine.

## Deliberate limits

The model covers 14 neck/shoulder structures, not complete anatomy. The movement catalog is intentionally small and educational; it is not an activation, EMG, diagnosis, treatment, or training system. There is no remote AI, backend, account, or runtime network dependency.
