let state : DomainState = { entries: [], region: "", selected: "", layer: Muscle, isolated: false, overview: true, highlight_mode: NoHighlight, active_structure_set: None, highlighted: [], revision: 0, events: [] }

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
fn highlight_mode_text(mode : HighlightMode) -> String {
  match mode { NoHighlight => "none"; StructureSet => "structure_set" }
}

fn reset_to_canonical() -> String {
  state.entries = canonical_entries()
  state.region = ""
  state.selected = ""
  state.layer = Muscle
  state.isolated = false
  state.overview = true
  state.highlight_mode = NoHighlight
  state.active_structure_set = None
  state.highlighted = []
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
  state.highlight_mode = NoHighlight
  state.active_structure_set = None
  state.highlighted = []
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

fn drop_active_structure_set() -> StructureSet? {
  let previous = state.active_structure_set
  state.highlight_mode = NoHighlight
  state.active_structure_set = None
  state.highlighted = []
  previous
}

fn note_dropped_structure_set(previous : StructureSet?, action : String, previous_selected : String) -> Unit {
  match previous {
    Some(value) => record_structure_set_event("StructureSetCleared", action, previous_selected, "accepted", value.id, value.members.length())
    None => ()
  }
}

fn select_entry(entry : Structure, action : String) -> String {
  let previous = state.selected
  let previous_set = drop_active_structure_set()
  state.region = entry.region
  state.selected = entry.structure_id
  state.layer = entry.layer
  state.isolated = false
  state.overview = false
  bump()
  note_dropped_structure_set(previous_set, action, previous)
  record_event("StructureSelected", action, previous, "accepted")
  snapshot()
}

fn valid_structure_set(set : StructureSet) -> Bool {
  if set.members.length() == 0 { return false }
  let ids : Array[String] = []
  for item in set.members {
    if ids.contains(item.structure_id) || canonical_by_id(item.structure_id) is None { return false }
    ids.push(item.structure_id)
  }
  true
}

fn highlight_structure_set_internal(id : String, action : String) -> String {
  match structure_set_by_id(id) {
    None => { record_event("ActionRejected", action, state.selected, "unknown_structure_set"); fail("unknown_structure_set") }
    Some(set) => if !valid_structure_set(set) { record_event("ActionRejected", action, state.selected, "invalid_structure_set"); fail("invalid_structure_set") } else {
      let previous = state.selected
      let focus = set.members[0]
      match find_entry(focus.structure_id) {
        None => { record_event("ActionRejected", action, previous, "unregistered_structure_set"); fail("unregistered_structure_set") }
        Some(entry) => {
          state.region = entry.region
          state.selected = focus.structure_id
          state.layer = entry.layer
          state.isolated = false
          state.overview = false
          state.highlight_mode = StructureSet
          state.active_structure_set = Some(set)
          state.highlighted = set.members
          bump()
          record_structure_set_event("StructureSetHighlighted", action, previous, "accepted", set.id, set.members.length())
          snapshot()
        }
      }
    }
  }
}

fn clear_structure_set_internal(action : String) -> String {
  let previous = state.selected
  match drop_active_structure_set() {
    None => snapshot()
    Some(set) => { bump(); record_structure_set_event("StructureSetCleared", action, previous, "accepted", set.id, set.members.length()); snapshot() }
  }
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
  let previous = state.selected
  let previous_set = drop_active_structure_set()
  state.isolated = false
  state.overview = true
  bump()
  note_dropped_structure_set(previous_set, action, previous)
  record_event("OverviewReset", action, state.selected, "accepted")
  snapshot()
}

///| Compatibility v1 snapshot. New consumers should use `domain_snapshot_v2`.
pub fn snapshot() -> String {
  "ok|\{state.region}|\{state.selected}|\{layer_text(state.layer)}|\{state.isolated}|\{state.overview}|\{state.revision}"
}
