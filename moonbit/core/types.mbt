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
  UnknownAction
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
  mut revision : Int
  mut events : Array[DomainEvent]
}
