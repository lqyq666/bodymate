fn structure_wire(entry : Structure) -> String {
  "\{entry.presentation_id}^\{entry.structure_id}^\{entry.display_name_zh}^\{entry.canonical_name}^\{entry.region}^\{layer_text(entry.layer)}^\{side_text(entry.side)}^\{group_text(entry.group)}^\{entry.source_provider}^\{entry.source_mesh_id}^\{entry.source_concept_id}^\{entry.source_chunk}^\{entry.is_default}"
}

///| Canonical registry projection for deterministic Node/browser generation.
#export_name("bodymate_domain_registry_v1")
pub fn domain_registry_v1() -> String {
  let mut output = "ok|registry-v1|"
  for index = 0; index < canonical_registry.length(); index = index + 1 {
    if index > 0 { output = output + "~" }
    output = output + structure_wire(canonical_registry[index])
  }
  output
}

///| Reset only domain state to the frozen canonical registry.
#export_name("bodymate_domain_reset")
pub fn domain_reset() -> String { reset_to_canonical() }

///| Versioned snapshot for review/debug integrations.
#export_name("bodymate_domain_snapshot_v2")
pub fn domain_snapshot_v2() -> String { "ok|snapshot-v2|2|\{state.region}|\{state.selected}|\{layer_text(state.layer)}|\{state.isolated}|\{state.overview}|\{state.revision}" }

///| V3 adds domain-owned multi-highlight state while retaining v2 compatibility.
#export_name("bodymate_domain_snapshot_v3")
pub fn domain_snapshot_v3() -> String {
  let set_id = match state.active_structure_set { Some(value) => value.id; None => "" }
  let set_label = match state.active_structure_set { Some(value) => value.label; None => "" }
  let mut members = ""
  for index = 0; index < state.highlighted.length(); index = index + 1 {
    let item = state.highlighted[index]
    let role = match item.role { Focus => "focus"; Primary => "primary"; Secondary => "secondary"; Context => "context" }
    if index > 0 { members = members + "~" }
    members = members + "\{item.structure_id}^\{role}^\{item.weight}"
  }
  "ok|snapshot-v3|3|\{state.region}|\{state.selected}|\{layer_text(state.layer)}|\{state.isolated}|\{state.overview}|\{state.revision}|\{highlight_mode_text(state.highlight_mode)}|\{set_id}|\{set_label}|\{members}"
}

///| Read-only bounded event representation.
#export_name("bodymate_domain_events_v1")
pub fn domain_events_v1() -> String { events_wire() }

///| Deterministic resolver export. It never mutates state.
#export_name("bodymate_domain_resolve_query_v1")
pub fn domain_resolve_query_v1(text : String) -> String { query_result_wire(resolve_query(text)) }

///| Structure-set aware resolver export for product integrations.
#export_name("bodymate_domain_resolve_query_v2")
pub fn domain_resolve_query_v2(text : String) -> String { resolve_query_v2(text) }

///| The sole richer action transition entry point for browser/controller flows.
#export_name("bodymate_domain_execute_action_v1")
pub fn domain_execute_action_v1(kind : String, structure_id : String, region : String) -> String {
  execute_action({ kind: parse_action(kind), structure_id, region, confidence: 1.0 })
}

///| Backward-compatible v1 APIs delegate to the same MoonBit state machine.
#export_name("bodymate_core_clear")
pub fn clear() -> String { clear_legacy_state() }

#export_name("bodymate_core_register")
pub fn register(id : String, label : String, region : String, layer : String, is_default : Bool) -> String {
  if id == "" || label == "" || region == "" { return fail("invalid_registration") }
  match parse_layer(layer) {
    None => fail("invalid_registration")
    Some(parsed_layer) => match find_entry(id) {
      Some(_) => if canonical_by_id(id) is Some(_) { "ok|registered" } else { fail("duplicate_id") }
      None => { state.entries.push({ presentation_id: id, structure_id: id, display_name_zh: label, canonical_name: label, region, layer: parsed_layer, side: Right, group: Neck, source_provider: "legacy-presentation", source_mesh_id: "", source_concept_id: "", source_chunk: "", is_default }); "ok|registered" }
    }
  }
}

#export_name("bodymate_core_select_region")
pub fn select_region(region : String) -> String { select_region_internal(region, state.layer, "SELECT_REGION") }

#export_name("bodymate_core_select_region_layer")
pub fn select_region_layer(region : String, layer : String) -> String {
  match parse_layer(layer) {
    Some(parsed) => select_region_internal(region, parsed, "SELECT_REGION_LAYER")
    None => fail("unknown_layer")
  }
}

#export_name("bodymate_core_select_structure")
pub fn select_structure(id : String) -> String { select_structure_internal(id, "SELECT_STRUCTURE") }

#export_name("bodymate_core_set_layer")
pub fn set_layer(layer : String) -> String {
  match parse_layer(layer) {
    Some(parsed) => set_layer_internal(parsed, "SET_LAYER")
    None => fail("unknown_layer")
  }
}

#export_name("bodymate_core_isolate_selected")
pub fn isolate_selected() -> String { isolate_internal("ISOLATE_SELECTED") }

#export_name("bodymate_core_restore_context")
pub fn restore_context() -> String { restore_internal("RESTORE_CONTEXT") }

#export_name("bodymate_core_reset_overview")
pub fn reset_overview() -> String { reset_overview_internal("RESET_OVERVIEW") }

#export_name("bodymate_core_snapshot")
pub fn core_snapshot() -> String { snapshot() }
