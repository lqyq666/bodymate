///| Domain-side anatomical laterality.
pub enum Side {
  Left
  Right
} derive(Eq)

///| Domain layer, intentionally distinct from renderer material choices.
pub enum Layer {
  Muscle
  Fascia
} derive(Eq)

///| Curated display grouping for the frozen neck package.
pub enum StructureGroup {
  Neck
  Shoulder
} derive(Eq)

///| Classification returned by the deterministic structure resolver.
pub enum QueryClassification {
  StructureLookup
  StructureSetLookup
  MovementLookup
  DomainCommand
  UnsupportedHealthQuery
  UnknownQuery
} derive(Eq)

///| Resolver certainty is a domain result, not a renderer hint.
pub enum Resolution {
  Exact
  Ambiguous
  NoMatch
} derive(Eq)

///| The complete v1 action allowlist.
pub enum ActionKind {
  FindStructure
  SelectStructure
  IsolateSelected
  RestoreContext
  ShowRegion
  HighlightStructureSet
  ClearStructureSet
  ShowMovementMapping
  UnknownAction
} derive(Eq)

///| Product-level movement grouping; this is not a training category.
pub enum MovementGroup {
  NeckMovement
  ShoulderGirdle
} derive(Eq)

///| Evidence-backed qualitative participation, never an activation measurement.
pub enum ParticipationRole {
  MainContributor
  Contributor
} derive(Eq)

///| Visual emphasis is a domain intent, not a renderer palette.
pub enum HighlightRole {
  Focus
  Primary
  Secondary
  Context
} derive(Eq)

///| The selected structure and a many-member highlight have distinct meanings.
pub enum HighlightMode {
  NoHighlight
  StructureSet
} derive(Eq)

///| Canonical metadata for one independently named public anatomy mesh.
pub struct Structure {
  presentation_id : String
  structure_id : String
  display_name_zh : String
  canonical_name : String
  region : String
  layer : Layer
  side : Side
  group : StructureGroup
  source_provider : String
  source_mesh_id : String
  source_concept_id : String
  source_chunk : String
  is_default : Bool
}

///| Versioned action contract represented inside the domain engine.
pub struct DomainAction {
  kind : ActionKind
  structure_id : String
  region : String
  confidence : Double
}

///| Resolver output before it crosses the JavaScript transport boundary.
pub struct QueryResult {
  classification : QueryClassification
  resolution : Resolution
  action : DomainAction?
  candidate_ids : Array[String]
  message_code : String
}

///| A stable product grouping derived from canonical registry entries.
pub struct StructureSet {
  id : String
  label : String
  members : Array[HighlightedStructure]
}

///| One member in a highlighted structure set.
pub struct HighlightedStructure {
  structure_id : String
  role : HighlightRole
  weight : Int
}

///| One canonical movement supported by the frozen current-model scope.
pub struct Movement {
  id : String
  display_name_zh : String
  canonical_name : String
  aliases : Array[String]
  movement_group : MovementGroup
  coverage_note : String
}

///| Bundled source metadata. No runtime fetch is performed.
pub struct EvidenceRef {
  id : String
  source_title : String
  source_url : String
  note : String
}

///| A current-model anatomy relationship backed by one or more evidence references.
pub struct MovementStructureMapping {
  structure_id : String
  role : ParticipationRole
  evidence_ids : Array[String]
}

///| Canonical mapping from one movement to existing BodyMate structures.
pub struct MovementMapping {
  movement_id : String
  mappings : Array[MovementStructureMapping]
}

///| A deterministic, bounded audit event. It is not analytics.
pub struct DomainEvent {
  revision : Int
  kind : String
  action : String
  selected : String
  previous_selected : String
  region : String
  result : String
  structure_set_id : String
  member_count : Int
  movement_id : String
}

///| Mutable runtime state; all mutations remain inside MoonBit.
pub struct DomainState {
  mut entries : Array[Structure]
  mut region : String
  mut selected : String
  mut layer : Layer
  mut isolated : Bool
  mut overview : Bool
  mut highlight_mode : HighlightMode
  mut active_structure_set : StructureSet?
  mut highlighted : Array[HighlightedStructure]
  mut active_movement : Movement?
  mut revision : Int
  mut events : Array[DomainEvent]
}
