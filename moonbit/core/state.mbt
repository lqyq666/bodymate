let state : DomainState = { entries: [], region: "", selected: "", layer: Muscle, isolated: false, overview: true, highlight_mode: NoHighlight, active_structure_set: None, highlighted: [], active_movement: None, active_comparison: None, revision: 0, events: [] }

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
  state.active_movement = None
  state.active_comparison = None
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
  state.active_movement = None
  state.active_comparison = None
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

fn drop_active_movement() -> Movement? {
  let previous = state.active_movement
  state.active_movement = None
  previous
}

fn drop_active_comparison() -> MovementComparison? {
  let previous = state.active_comparison
  state.active_comparison = None
  previous
}

fn note_dropped_comparison(previous : MovementComparison?, action : String, previous_selected : String) -> Unit {
  match previous { Some(value) => record_comparison_event("MovementComparisonCleared", action, previous_selected, value, state.selected); None => () }
}

fn note_dropped_structure_set(previous : StructureSet?, action : String, previous_selected : String) -> Unit {
  match previous {
    Some(value) => record_structure_set_event("StructureSetCleared", action, previous_selected, "accepted", value.id, value.members.length())
    None => ()
  }
}

fn note_dropped_movement(previous : Movement?, action : String, previous_selected : String) -> Unit {
  match previous {
    Some(value) => {
      let member_count = match movement_mapping_by_id(value.id) {
        Some(mapping) => mapping.mappings.length()
        None => 0
      }
      record_movement_event("MovementMappingCleared", action, previous_selected, "accepted", value.id, member_count, "")
    }
    None => ()
  }
}

fn select_entry(entry : Structure, action : String) -> String {
  let previous = state.selected
  let previous_comparison = drop_active_comparison()
  let previous_movement = drop_active_movement()
  let previous_set = drop_active_structure_set()
  state.region = entry.region
  state.selected = entry.structure_id
  state.layer = entry.layer
  state.isolated = false
  state.overview = false
  bump()
  note_dropped_comparison(previous_comparison, action, previous)
  note_dropped_movement(previous_movement, action, previous)
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
      let previous_comparison = drop_active_comparison()
      let previous_movement = drop_active_movement()
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
          note_dropped_comparison(previous_comparison, action, previous)
          note_dropped_movement(previous_movement, action, previous)
          record_structure_set_event("StructureSetHighlighted", action, previous, "accepted", set.id, set.members.length())
          snapshot()
        }
      }
    }
  }
}

fn clear_structure_set_internal(action : String) -> String {
  let previous = state.selected
  let previous_comparison = drop_active_comparison()
  let previous_movement = drop_active_movement()
  match drop_active_structure_set() {
    Some(set) => { bump(); note_dropped_comparison(previous_comparison, action, previous); note_dropped_movement(previous_movement, action, previous); record_structure_set_event("StructureSetCleared", action, previous, "accepted", set.id, set.members.length()); snapshot() }
    None => match previous_movement {
      Some(_) => { bump(); note_dropped_comparison(previous_comparison, action, previous); note_dropped_movement(previous_movement, action, previous); snapshot() }
      None => snapshot()
    }
  }
}

fn show_movement_mapping_internal(id : String, action : String) -> String {
  if !valid_movement_catalog() {
    record_event("ActionRejected", action, state.selected, "invalid_movement_catalog")
    return fail("invalid_movement_catalog")
  }
  match movement_by_id(id) {
    None => { record_event("ActionRejected", action, state.selected, "unknown_movement"); fail("unknown_movement") }
    Some(movement) => match movement_mapping_by_id(id) {
      None => { record_event("ActionRejected", action, state.selected, "unknown_movement"); fail("unknown_movement") }
      Some(mapping) => match movement_structure_set_for(id, state.selected) {
        None => { record_event("ActionRejected", action, state.selected, "invalid_movement_mapping"); fail("invalid_movement_mapping") }
        Some(set) => if !valid_structure_set(set) {
          record_event("ActionRejected", action, state.selected, "invalid_movement_mapping")
          fail("invalid_movement_mapping")
        } else {
          let previous = state.selected
          match find_entry(set.members[0].structure_id) {
            None => { record_event("ActionRejected", action, previous, "unregistered_movement_mapping"); fail("unregistered_movement_mapping") }
            Some(entry) => {
              let previous_comparison = drop_active_comparison()
              let previous_movement = drop_active_movement()
              let previous_set = drop_active_structure_set()
              state.region = entry.region
              state.selected = set.members[0].structure_id
              state.layer = entry.layer
              state.isolated = false
              state.overview = false
              state.highlight_mode = StructureSet
              state.active_structure_set = Some(set)
              state.highlighted = set.members
              state.active_movement = Some(movement)
              bump()
              note_dropped_comparison(previous_comparison, action, previous)
              note_dropped_movement(previous_movement, action, previous)
              note_dropped_structure_set(previous_set, action, previous)
              record_movement_event("MovementResolved", action, previous, "accepted", movement.id, mapping.mappings.length(), set.members[0].structure_id)
              record_structure_set_event("StructureSetHighlighted", action, previous, "accepted", set.id, set.members.length())
              record_movement_event("MovementMappingShown", action, previous, "accepted", movement.id, mapping.mappings.length(), set.members[0].structure_id)
              snapshot()
            }
          }
        }
      }
    }
  }
}

fn comparison_focus_id(comparison : MovementComparison) -> String? {
  if comparison.overlap.length() > 0 { Some(comparison.overlap[0].structure_id) }
  else if comparison.only_left.length() > 0 { Some(comparison.only_left[0].structure_id) }
  else if comparison.only_right.length() > 0 { Some(comparison.only_right[0].structure_id) }
  else { None }
}

fn comparison_structure_set(comparison : MovementComparison, label : String) -> StructureSet? {
  match comparison_focus_id(comparison) {
    None => None
    Some(focus_id) => {
      let members : Array[HighlightedStructure] = [{ structure_id: focus_id, role: Focus, weight: 100 }]
      for item in comparison.overlap { if item.structure_id != focus_id { members.push({ structure_id: item.structure_id, role: Primary, weight: 80 }) } }
      for item in comparison.only_left { if item.structure_id != focus_id { members.push({ structure_id: item.structure_id, role: Secondary, weight: 70 }) } }
      for item in comparison.only_right { if item.structure_id != focus_id { members.push({ structure_id: item.structure_id, role: Context, weight: 60 }) } }
      Some({ id: "bodymate.comparison.set." + comparison.left_movement_id + "." + comparison.right_movement_id, label, members })
    }
  }
}

fn show_movement_comparison_internal(ids : String, action : String) -> String {
  let parts : Array[String] = []
  for part in ids.split(",") { parts.push(part.trim().to_owned()) }
  if parts.length() != 2 { record_event("ActionRejected", action, state.selected, "invalid_movement_comparison"); return fail("invalid_movement_comparison") }
  let left_id = parts[0]
  let right_id = parts[1]
  match movement_comparison_for(left_id, right_id) {
    None => { record_event("ActionRejected", action, state.selected, "unknown_movement_comparison"); fail("unknown_movement_comparison") }
    Some(comparison) => match movement_by_id(left_id) {
      None => fail("unknown_movement_comparison")
      Some(left) => match movement_by_id(right_id) {
        None => fail("unknown_movement_comparison")
        Some(right) => match comparison_structure_set(comparison, left.display_name_zh + " vs " + right.display_name_zh) {
          None => fail("invalid_movement_comparison")
          Some(set) => match find_entry(set.members[0].structure_id) {
            None => fail("unregistered_movement_comparison")
            Some(entry) => {
              let previous = state.selected
              let previous_comparison = drop_active_comparison()
              let previous_movement = drop_active_movement()
              let previous_set = drop_active_structure_set()
              state.region = entry.region
              state.selected = set.members[0].structure_id
              state.layer = entry.layer
              state.isolated = false
              state.overview = false
              state.highlight_mode = StructureSet
              state.active_structure_set = Some(set)
              state.highlighted = set.members
              state.active_comparison = Some(comparison)
              bump()
              note_dropped_comparison(previous_comparison, action, previous)
              note_dropped_movement(previous_movement, action, previous)
              note_dropped_structure_set(previous_set, action, previous)
              record_comparison_event("MovementComparisonShown", action, previous, comparison, state.selected)
              snapshot()
            }
          }
        }
      }
    }
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
  let previous_comparison = drop_active_comparison()
  let previous_movement = drop_active_movement()
  let previous_set = drop_active_structure_set()
  state.isolated = false
  state.overview = true
  bump()
  note_dropped_comparison(previous_comparison, action, previous)
  note_dropped_movement(previous_movement, action, previous)
  note_dropped_structure_set(previous_set, action, previous)
  record_event("OverviewReset", action, state.selected, "accepted")
  snapshot()
}

///| Compatibility v1 snapshot. New consumers should use `domain_snapshot_v2`.
pub fn snapshot() -> String {
  "ok|\{state.region}|\{state.selected}|\{layer_text(state.layer)}|\{state.isolated}|\{state.overview}|\{state.revision}"
}
