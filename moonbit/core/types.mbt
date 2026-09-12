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
  UnknownAction
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

///| A deterministic, bounded audit event. It is not analytics.
pub struct DomainEvent {
  revision : Int
  kind : String
  action : String
  selected : String
  previous_selected : String
  region : String
  result : String
}

///| Mutable runtime state; all mutations remain inside MoonBit.
pub struct DomainState {
  mut entries : Array[Structure]
  mut region : String
  mut selected : String
  mut layer : Layer
  mut isolated : Bool
  mut overview : Bool
  mut revision : Int
  mut events : Array[DomainEvent]
}
