///|
test "action engine executes every allowed state transition through one path" {
  ignore(domain_reset())
  assert_true(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.neck.sternocleidomastoid.right", "").contains("ok|neck|bodymate.neck.sternocleidomastoid.right"))
  assert_true(domain_execute_action_v1("ISOLATE_SELECTED", "", "").contains("|true|false|"))
  assert_true(domain_execute_action_v1("RESTORE_CONTEXT", "", "").contains("|false|false|"))
  assert_true(domain_execute_action_v1("SHOW_REGION", "", "neck").contains("ok|neck|"))
  assert_eq(domain_execute_action_v1("FIND_STRUCTURE", "", ""), "ok|find_structure")
}

///|
test "invalid actions and preconditions never mutate the accepted snapshot" {
  ignore(domain_reset())
  let before = domain_snapshot_v2()
  assert_eq(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.unknown", ""), "error|unknown_structure")
  assert_eq(domain_snapshot_v2(), before)
  assert_eq(domain_execute_action_v1("SHOW_REGION", "", "chest"), "error|invalid_region")
  assert_eq(domain_snapshot_v2(), before)
  assert_eq(domain_execute_action_v1("ISOLATE_SELECTED", "", ""), "error|nothing_visible_to_isolate")
  assert_eq(domain_snapshot_v2(), before)
  assert_eq(domain_execute_action_v1("DIAGNOSE", "", ""), "error|unknown_action")
  assert_eq(domain_snapshot_v2(), before)
}
