///|
test "canonical state starts in overview and every accepted transition increments revision" {
  ignore(domain_reset())
  assert_eq(domain_snapshot_v2(), "ok|snapshot-v2|2|||muscle|false|true|0")
  assert_true(domain_execute_action_v1("SHOW_REGION", "", "neck").contains("|neck|bodymate.neck.sternocleidomastoid.right|muscle|false|false|1"))
  assert_true(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.neck.trapezius.upper.left", "").contains("|neck|bodymate.neck.trapezius.upper.left|muscle|false|false|2"))
  assert_true(domain_execute_action_v1("ISOLATE_SELECTED", "", "").contains("|true|false|3"))
  assert_true(domain_execute_action_v1("RESTORE_CONTEXT", "", "").contains("|false|false|4"))
}

///|
test "rejected state transitions preserve snapshot and report the rejected action" {
  ignore(domain_reset())
  let before = domain_snapshot_v2()
  assert_eq(domain_execute_action_v1("RESTORE_CONTEXT", "", ""), "error|overview_has_no_context")
  assert_eq(domain_snapshot_v2(), before)
  assert_eq(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.unknown", ""), "error|unknown_structure")
  assert_eq(domain_snapshot_v2(), before)
  assert_true(domain_events_v1().contains("ActionRejected^RESTORE_CONTEXT"))
  assert_true(domain_events_v1().contains("ActionRejected^SELECT_STRUCTURE"))
}
