fn action_text(kind : ActionKind) -> String {
  match kind {
    FindStructure => "FIND_STRUCTURE"
    SelectStructure => "SELECT_STRUCTURE"
    IsolateSelected => "ISOLATE_SELECTED"
    RestoreContext => "RESTORE_CONTEXT"
    ShowRegion => "SHOW_REGION"
    UnknownAction => "UNKNOWN"
  }
}

fn parse_action(value : String) -> ActionKind {
  if value == "FIND_STRUCTURE" { FindStructure }
  else if value == "SELECT_STRUCTURE" { SelectStructure }
  else if value == "ISOLATE_SELECTED" { IsolateSelected }
  else if value == "RESTORE_CONTEXT" { RestoreContext }
  else if value == "SHOW_REGION" { ShowRegion }
  else { UnknownAction }
}

fn valid_region(region : String) -> Bool { region == "neck" }

fn execute_action(action : DomainAction) -> String {
  match action.kind {
    FindStructure => "ok|find_structure"
    SelectStructure => select_structure_internal(action.structure_id, action_text(action.kind))
    IsolateSelected => isolate_internal(action_text(action.kind))
    RestoreContext => restore_internal(action_text(action.kind))
    ShowRegion => if valid_region(action.region) { select_region_internal(action.region, state.layer, action_text(action.kind)) } else { record_event("ActionRejected", action_text(action.kind), state.selected, "invalid_region"); fail("invalid_region") }
    UnknownAction => { record_event("ActionRejected", "UNKNOWN", state.selected, "unknown_action"); fail("unknown_action") }
  }
}
