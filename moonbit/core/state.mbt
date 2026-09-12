let state : DomainState = { entries: [], region: "", selected: "", layer: Muscle, isolated: false, overview: true, revision: 0, events: [] }

fn layer_text(layer : Layer) -> String {
  match layer {
    Muscle => "muscle"
    Fascia => "fascia"
  }
}
fn parse_layer(layer : String) -> Layer? { if layer == "muscle" { Some(Muscle) } else if layer == "fascia" { Some(Fascia) } else { None } }
fn side_text(side : Side) -> String {
  match side {
    Left => "left"
    Right => "right"
  }
}
fn group_text(group : StructureGroup) -> String {
  match group {
    Neck => "neck"
    Shoulder => "shoulder"
  }
}

fn reset_to_canonical() -> String {
  state.entries = canonical_entries()
  state.region = ""
  state.selected = ""
  state.layer = Muscle
  state.isolated = false
  state.overview = true
  state.revision = 0
  state.events = []
  snapshot()
}

fn clear_legacy_state() -> String {
  state.entries = []
  state.region = ""
  state.selected = ""
  state.layer = Muscle
  state.isolated = false
  state.overview = true
  state.revision = 0
  state.events = []
  snapshot()
}

fn fail(code : String) -> String { "error|\{code}" }
fn bump() -> Unit { state.revision = state.revision + 1 }

fn find_entry(id : String) -> Structure? {
  for entry in state.entries { if entry.structure_id == id { return Some(entry) } }
  None
}

fn first_in(region : String, layer : Layer) -> Structure? {
  let mut fallback : Structure? = None
  for entry in state.entries {
    if entry.region == region && entry.layer == layer {
      if entry.is_default { return Some(entry) }
      if fallback is None { fallback = Some(entry) }
    }
  }
  fallback
}

fn select_entry(entry : Structure, action : String) -> String {
  let previous = state.selected
  state.region = entry.region
  state.selected = entry.structure_id
  state.layer = entry.layer
  state.isolated = false
  state.overview = false
  bump()
  record_event("StructureSelected", action, previous, "accepted")
  snapshot()
}

fn select_region_internal(region : String, layer : Layer, action : String) -> String {
  match first_in(region, layer) {
    Some(entry) => select_entry(entry, action)
    None => { record_event("ActionRejected", action, state.selected, "uncovered_region_or_layer"); fail("uncovered_region_or_layer") }
  }
}

fn select_structure_internal(id : String, action : String) -> String {
  match find_entry(id) {
    Some(entry) => select_entry(entry, action)
    None => { record_event("ActionRejected", action, state.selected, "unknown_structure"); fail("unknown_structure") }
  }
}

fn set_layer_internal(layer : Layer, action : String) -> String {
  if state.overview {
    state.layer = layer
    record_event("LayerChanged", action, state.selected, "accepted")
    return snapshot()
  }
  select_region_internal(state.region, layer, action)
}

fn isolate_internal(action : String) -> String {
  if state.overview || state.selected == "" {
    record_event("ActionRejected", action, state.selected, "nothing_visible_to_isolate")
    return fail("nothing_visible_to_isolate")
  }
  state.isolated = true
  bump()
  record_event("Isolated", action, state.selected, "accepted")
  snapshot()
}

fn restore_internal(action : String) -> String {
  if state.overview {
    record_event("ActionRejected", action, state.selected, "overview_has_no_context")
    return fail("overview_has_no_context")
  }
  state.isolated = false
  bump()
  record_event("ContextRestored", action, state.selected, "accepted")
  snapshot()
}

fn reset_overview_internal(action : String) -> String {
  state.isolated = false
  state.overview = true
  bump()
  record_event("OverviewReset", action, state.selected, "accepted")
  snapshot()
}

///| Compatibility v1 snapshot. New consumers should use `domain_snapshot_v2`.
pub fn snapshot() -> String {
  "ok|\{state.region}|\{state.selected}|\{layer_text(state.layer)}|\{state.isolated}|\{state.overview}|\{state.revision}"
}
