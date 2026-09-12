///|
test "movement catalog is deterministic and evidence-complete" {
  let evidence = domain_evidence_v1()
  assert_true(evidence.contains("evidence-v1"))
  assert_true(evidence.contains("ev.scapula.elevation^NCBI Bookshelf"))
  assert_true(evidence.contains("ev.neck.rotation-flexion^OpenStax"))
  assert_true(domain_resolve_query_v3("耸肩").contains("bodymate.neck.trapezius.upper.right^main_contributor^ev.scapula.elevation"))
  assert_true(domain_resolve_query_v3("耸肩").contains("bodymate.neck.levator-scapulae.left^contributor^ev.scapula.elevation"))
}

///|
test "movement mapping validation rejects empty and duplicate structure entries" {
  assert_false(movement_mapping_members_are_valid("shoulder_girdle_elevation", [], ["ev.scapula.elevation"]))
  assert_false(movement_mapping_members_are_valid("shoulder_girdle_elevation", ["bodymate.neck.trapezius.upper.right", "bodymate.neck.trapezius.upper.right"], ["ev.scapula.elevation"]))
  assert_false(movement_mapping_members_are_valid("shoulder_girdle_elevation", ["bodymate.neck.trapezius.upper.right"], []))
}

///|
test "movement aliases resolve deterministically before structure fallback" {
  assert_true(domain_resolve_query_v3("耸肩").contains("|shoulder_girdle_elevation|"))
  assert_true(domain_resolve_query_v3("shoulder shrug").contains("|shoulder_girdle_elevation|"))
  assert_true(domain_resolve_query_v3("向右转头涉及哪些结构").contains("|cervical_rotation_right|"))
  assert_true(domain_resolve_query_v3("向左转头").contains("|cervical_rotation_left|"))
  assert_true(domain_resolve_query_v3("低头").contains("|cervical_flexion|"))
}

///|
test "movement resolver v3 preserves structure and health classification boundaries" {
  assert_true(domain_resolve_query_v3("耸肩涉及哪些肌肉").contains("query-v3|MOVEMENT_LOOKUP|EXACT|SHOW_MOVEMENT_MAPPING|shoulder_girdle_elevation"))
  assert_true(domain_resolve_query_v3("shrug").contains("shoulder_girdle_elevation"))
  assert_true(domain_resolve_query_v3("向右转头").contains("cervical_rotation_right"))
  assert_true(domain_resolve_query_v3("向左转头").contains("cervical_rotation_left"))
  assert_true(domain_resolve_query_v3("neck flexion").contains("cervical_flexion"))
  assert_true(domain_resolve_query_v3("右侧斜角肌").contains("STRUCTURE_SET_LOOKUP|EXACT|HIGHLIGHT_STRUCTURE_SET"))
  assert_true(domain_resolve_query_v3("右边脖子").contains("STRUCTURE_LOOKUP|AMBIGUOUS|FIND_STRUCTURE"))
  assert_true(domain_resolve_query_v3("转头时脖子疼").contains("UNSUPPORTED_HEALTH_QUERY|NO_MATCH|UNKNOWN"))
}

///|
test "movement action reuses structure set and exposes snapshot v4" {
  ignore(domain_reset())
  let before = domain_snapshot_v4()
  assert_eq(domain_execute_action_v1("SHOW_MOVEMENT_MAPPING", "movement.unknown", ""), "error|unknown_movement")
  assert_eq(domain_snapshot_v4(), before)
  let accepted = domain_execute_action_v1("SHOW_MOVEMENT_MAPPING", "shoulder_girdle_elevation", "")
  assert_true(accepted.contains("bodymate.neck.trapezius.upper.right"))
  let snapshot = domain_snapshot_v4()
  assert_true(snapshot.contains("snapshot-v4|4|neck|bodymate.neck.trapezius.upper.right|muscle|false|false|1|structure_set|bodymate.movement.set.shoulder_girdle_elevation"))
  assert_true(snapshot.contains("|shoulder_girdle_elevation|肩胛带上提 / 耸肩|Shoulder Girdle Elevation|"))
  assert_true(snapshot.contains("bodymate.neck.levator-scapulae.left^contributor^ev.scapula.elevation"))
  assert_true(domain_events_v2().contains("MovementResolved^SHOW_MOVEMENT_MAPPING"))
  assert_true(domain_events_v2().contains("MovementMappingShown^SHOW_MOVEMENT_MAPPING"))
}

///|
test "movement focus keeps an already selected mapped structure and selection clears movement" {
  ignore(domain_reset())
  ignore(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.neck.levator-scapulae.left", ""))
  ignore(domain_execute_action_v1("SHOW_MOVEMENT_MAPPING", "shoulder_girdle_elevation", ""))
  assert_true(domain_snapshot_v4().contains("|bodymate.neck.levator-scapulae.left|muscle|false|false|2|structure_set"))
  ignore(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.neck.splenius.capitis.left", ""))
  assert_true(domain_snapshot_v4().contains("|none|||"))
  assert_true(domain_snapshot_v4().contains("||||"))
  assert_true(domain_events_v2().contains("MovementMappingCleared^SELECT_STRUCTURE"))
}

///|
test "clearing a movement-derived structure set clears active movement" {
  ignore(domain_reset())
  ignore(domain_execute_action_v1("SHOW_MOVEMENT_MAPPING", "cervical_rotation_right", ""))
  ignore(domain_execute_action_v1("CLEAR_STRUCTURE_SET", "", ""))
  let snapshot = domain_snapshot_v4()
  assert_true(snapshot.contains("|none|||||"))
  assert_true(domain_events_v2().contains("MovementMappingCleared^CLEAR_STRUCTURE_SET"))
}
