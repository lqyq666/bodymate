///|
test "domain events preserve selection revision and rejected action semantics" {
  ignore(domain_reset())
  ignore(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.neck.sternocleidomastoid.right", ""))
  let events = domain_events_v1()
  assert_true(events.contains("StructureSelected^SELECT_STRUCTURE^bodymate.neck.sternocleidomastoid.right"))
  ignore(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.unknown", ""))
  assert_true(domain_events_v1().contains("ActionRejected^SELECT_STRUCTURE"))
}

///|
test "event log is bounded and versioned for read-only transport" {
  ignore(domain_reset())
  for index = 0; index < 40; index = index + 1 {
    ignore(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.neck.sternocleidomastoid.right", ""))
  }
  let payload = domain_events_v1()
  assert_true(payload.has_prefix("ok|events-v1|"))
  let mut records = 0
  for _ in payload.split("~") { records = records + 1 }
  assert_true(records <= 32)
}
