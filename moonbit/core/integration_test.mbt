///|
test "query action event and snapshot form one deterministic domain path" {
  ignore(domain_reset())
  let query = domain_resolve_query_v1("右侧胸锁乳突肌")
  assert_true(query.contains("STRUCTURE_LOOKUP|EXACT|SELECT_STRUCTURE|bodymate.neck.sternocleidomastoid.right"))
  assert_true(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.neck.sternocleidomastoid.right", "").contains("ok|neck|bodymate.neck.sternocleidomastoid.right"))
  assert_true(domain_events_v1().contains("StructureSelected^SELECT_STRUCTURE^bodymate.neck.sternocleidomastoid.right"))
  assert_true(domain_snapshot_v2().contains("snapshot-v2|2|neck|bodymate.neck.sternocleidomastoid.right"))
}
