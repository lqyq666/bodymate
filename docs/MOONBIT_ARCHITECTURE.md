# MoonBit domain engine

## Why MoonBit owns this boundary

BodyMate has one mutable interaction truth: what anatomical region is active, which stable structure is selected, which layer is shown, whether the context is isolated, whether the view is overview, which structure set is highlighted, and which revision produced that state. Keeping that truth in the embedded MoonBit engine prevents the renderer, the natural-language adapter, and future bridges from creating competing selection state.

MoonBit owns the canonical 14-entry neck registry, derived structure sets, validated state transitions, the seven-action allowlist, deterministic query resolution, side and family matching, safe health-query rejection, bounded domain events, and versioned snapshots. JavaScript owns DOM events, Three.js loading/raycasting/materials/camera, rendering, browser controls, and UI copy.

The canonical registry is projected rather than re-authored:

```text
MoonBit canonical registry
  -> bodymate_domain_registry_v1
  -> scripts/build-moonbit-registry.mjs
  -> generated/anatomy-registry.json + src/anatomy/neck-registry.mjs
  -> Human Atlas builder + browser registry runtime
```

This keeps BodyMate stable IDs separate from source mesh IDs while preserving the pinned Human Atlas / BodyParts3D identity fields.

## Interaction flow

```text
real mesh click / Coach C query / button
  -> BodyMate stable structure ID, or MoonBit-derived structure-set ID / approved action
  -> MoonBit action validation and execution
  -> validated versioned snapshot + bounded event
  -> JavaScript renderer applies selection, isolation, focus, and UI
```

`FIND_STRUCTURE`, `SELECT_STRUCTURE`, `ISOLATE_SELECTED`, `RESTORE_CONTEXT`, `SHOW_REGION`, `HIGHLIGHT_STRUCTURE_SET`, and `CLEAR_STRUCTURE_SET` are the allowlist. Query resolution never mutates state. `selected` remains exactly one focus structure; `highlighted` may contain zero or more members. A structure set is derived only from canonical registry entries, has unique member IDs, and has a deterministic focus member. `ISOLATE_SELECTED` still renders only that focus member. Selecting a structure, showing a region, or resetting overview clears an active set.

The V2 resolver returns a set for family requests such as `右侧斜角肌`, `左侧斜角肌`, `斜角肌`, and `SCM`; exact full Chinese names still select one structure, while broad location language such as `右边脖子` remains ambiguous. JavaScript receives set members from the MoonBit wire and never maintains a family-to-ID table.

## Movement evidence domain

MoonBit also owns the small, evidence-backed movement catalog. A `Movement` has typed group metadata, aliases, a coverage note, and a `MovementMapping` whose members carry `MainContributor` or `Contributor` plus one or more bundled `EvidenceRef` IDs. The catalog validates unique IDs and aliases, canonical anatomy membership, duplicate-free mapping membership, and evidence completeness before an action can use it.

`SHOW_MOVEMENT_MAPPING` resolves a catalog ID, derives the existing `StructureSet` primitive, chooses focus inside MoonBit (keep the selected mapped structure; otherwise the first main contributor), and records movement events. It does not introduce a second highlight model. `SELECT_STRUCTURE`, overview reset, and clearing the active set clear active movement state deterministically.

Resolver v3 adds `MOVEMENT_LOOKUP` and `STRUCTURE_SET_LOOKUP`; health-language classification remains higher priority than movement lookup. Snapshot v4 adds active movement ID, label, canonical name, participation mappings/evidence IDs, and a current-model coverage note. Evidence source metadata is exported as a separate bundled wire for the offline evidence dialog. JavaScript parses these contracts; it neither maintains a movement catalog nor infers structure participation.

The current catalog is deliberately limited to shoulder-girdle elevation, right/left cervical rotation, and cervical flexion. It says “当前模型覆盖范围内的参与结构”, never activation percentage, EMG, diagnosis, or exercise prescription. See `docs/MOVEMENT_EVIDENCE.md` for sources and exclusions.

## Movement comparison and set algebra

Stage 5C reuses those validated mappings without adding movements or evidence claims. MoonBit exposes pure canonical-ID union, intersection, and directional-difference functions, then builds a `MovementComparison` that preserves each structure’s left/right `ParticipationRole` and evidence IDs. Canonical registry order makes the algebra deterministic and commutative where required.

`SHOW_MOVEMENT_COMPARISON` makes the comparison active, derives the existing `StructureSet` presentation primitive, and selects an overlap member when present (otherwise a deterministic directional member). Selecting a structure, showing a movement mapping, clearing the structure set, and resetting overview clear comparison state. Snapshot v5 carries movement labels and ordered comparison members as `structureId^bucket^leftRole^rightRole^leftEvidenceIds^rightEvidenceIds`; JavaScript parses it and has no comparison algebra or mapping table.

## Public bridge

The embedded IIFE exports legacy `bodymate_core_*` compatibility calls plus these domain calls:

- `bodymate_domain_registry_v1()`
- `bodymate_domain_reset()`
- `bodymate_domain_snapshot_v2()`
- `bodymate_domain_snapshot_v3()`
- `bodymate_domain_events_v1()`
- `bodymate_domain_resolve_query_v1(text)`
- `bodymate_domain_resolve_query_v2(text)`
- `bodymate_domain_execute_action_v1(kind, structureId, region)`

V3 adds `highlightMode`, set ID/label, and ordered member `structureId^role^weight` records while V2 remains available for compatibility. Events remain bounded to 32 records and include set ID/member count for highlight and clear transitions. Wire payloads are deliberately versioned text contracts. `window.__bodymate.domainDebug()` exposes the latest read-only snapshot/event payloads for local development without giving JavaScript a mutation backdoor.

## Reproducibility and failure behavior

`npm run build` compiles MoonBit, regenerates the registry projections, browser registry, Coach C runtime, and Human Atlas runtime. `npm run check` recompiles each artifact and rejects stale committed output. The frozen 14-mesh Human Atlas GLB is not regenerated by normal browser execution and its SHA-256 is covered by tests.

Normal verification never downloads anatomy source chunks. A missing source cache fails closed; an intentional source refresh must set `BODYMATE_ALLOW_NETWORK=1`, and deterministic reconstruction remains available when the verified cache is present.

If MoonBit rejects an action, no renderer callback runs. If a mesh has no registry mapping, the pick is inert. If the renderer cannot load the real neck runtime, the existing offline page preserves its fallback view; it does not fabricate a domain selection.

## Removing MoonBit later

MoonBit can be replaced only by implementing the same registry projection, resolver/action/snapshot/event contracts and replaying the MoonBit and cross-language tests against the replacement. The renderer and UI should not need a state-model rewrite because they consume stable IDs and validated snapshots rather than MoonBit internals.
