fn record_event(kind : String, action : String, previous_selected : String, result : String) -> Unit {
  if state.events.length() >= 32 {
    let retained : Array[DomainEvent] = []
    for index = 1; index < state.events.length(); index = index + 1 { retained.push(state.events[index]) }
    state.events = retained
  }
  state.events.push({ revision: state.revision, kind, action, selected: state.selected, previous_selected, region: state.region, result, structure_set_id: "", member_count: 0, movement_id: "", comparison_left_id: "", comparison_right_id: "", overlap_count: 0, only_left_count: 0, only_right_count: 0 })
}

fn record_structure_set_event(kind : String, action : String, previous_selected : String, result : String, set_id : String, member_count : Int) -> Unit {
  if state.events.length() >= 32 {
    let retained : Array[DomainEvent] = []
    for index = 1; index < state.events.length(); index = index + 1 { retained.push(state.events[index]) }
    state.events = retained
  }
  state.events.push({ revision: state.revision, kind, action, selected: state.selected, previous_selected, region: state.region, result, structure_set_id: set_id, member_count, movement_id: "", comparison_left_id: "", comparison_right_id: "", overlap_count: 0, only_left_count: 0, only_right_count: 0 })
}

fn record_movement_event(kind : String, action : String, previous_selected : String, result : String, movement_id : String, member_count : Int, focus_id : String) -> Unit {
  if state.events.length() >= 32 {
    let retained : Array[DomainEvent] = []
    for index = 1; index < state.events.length(); index = index + 1 { retained.push(state.events[index]) }
    state.events = retained
  }
  state.events.push({ revision: state.revision, kind, action, selected: if focus_id == "" { state.selected } else { focus_id }, previous_selected, region: state.region, result, structure_set_id: "", member_count, movement_id, comparison_left_id: "", comparison_right_id: "", overlap_count: 0, only_left_count: 0, only_right_count: 0 })
}

fn record_comparison_event(kind : String, action : String, previous_selected : String, comparison : MovementComparison, focus_id : String) -> Unit {
  if state.events.length() >= 32 { let retained : Array[DomainEvent] = []; for index = 1; index < state.events.length(); index = index + 1 { retained.push(state.events[index]) }; state.events = retained }
  state.events.push({ revision: state.revision, kind, action, selected: focus_id, previous_selected, region: state.region, result: "accepted", structure_set_id: "", member_count: comparison.union_structure_ids.length(), movement_id: "", comparison_left_id: comparison.left_movement_id, comparison_right_id: comparison.right_movement_id, overlap_count: comparison.overlap.length(), only_left_count: comparison.only_left.length(), only_right_count: comparison.only_right.length() })
}

fn event_wire(event : DomainEvent) -> String {
  "\{event.revision}^\{event.kind}^\{event.action}^\{event.selected}^\{event.previous_selected}^\{event.region}^\{event.result}^\{event.structure_set_id}^\{event.member_count}"
}

fn event_wire_v2(event : DomainEvent) -> String {
  "\{event.revision}^\{event.kind}^\{event.action}^\{event.selected}^\{event.previous_selected}^\{event.region}^\{event.result}^\{event.structure_set_id}^\{event.member_count}^\{event.movement_id}"
}

fn events_wire() -> String {
  let mut output = "ok|events-v1|"
  for index = 0; index < state.events.length(); index = index + 1 {
    if index > 0 { output = output + "~" }
    output = output + event_wire(state.events[index])
  }
  output
}

fn events_wire_v2() -> String {
  let mut output = "ok|events-v2|"
  for index = 0; index < state.events.length(); index = index + 1 {
    if index > 0 { output = output + "~" }
    output = output + event_wire_v2(state.events[index])
  }
  output
}
