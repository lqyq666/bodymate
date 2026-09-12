///|
test "derived structure sets expose canonical membership and deterministic focus" {
  let right = domain_resolve_query_v2("右侧斜角肌")
  assert_true(right.contains("bodymate.neck.set.scalene.right|右侧斜角肌群"))
  assert_true(right.contains("bodymate.neck.scalene.anterior.right,bodymate.neck.scalene.medius.right,bodymate.neck.scalene.posterior.right"))
  let bilateral = domain_resolve_query_v2("斜角肌")
  assert_true(bilateral.contains("bodymate.neck.set.scalene|双侧斜角肌群"))
  assert_true(bilateral.contains("bodymate.neck.scalene.posterior.left"))
}

///|
test "structure-set action updates v3 state and isolates only focused selection" {
  ignore(domain_reset())
  let accepted = domain_execute_action_v1("HIGHLIGHT_STRUCTURE_SET", "bodymate.neck.set.scalene.right", "")
  assert_true(accepted.contains("ok|neck|bodymate.neck.scalene.anterior.right|muscle|false|false|1"))
  let snapshot = domain_snapshot_v3()
  assert_true(snapshot.contains("snapshot-v3|3|neck|bodymate.neck.scalene.anterior.right|muscle|false|false|1|structure_set|bodymate.neck.set.scalene.right"))
  assert_true(snapshot.contains("bodymate.neck.scalene.posterior.right^secondary"))
  ignore(domain_execute_action_v1("ISOLATE_SELECTED", "", ""))
  assert_true(domain_snapshot_v3().contains("|true|false|2|structure_set|bodymate.neck.set.scalene.right"))
  ignore(domain_execute_action_v1("RESTORE_CONTEXT", "", ""))
  ignore(domain_execute_action_v1("CLEAR_STRUCTURE_SET", "", ""))
  assert_true(domain_snapshot_v3().contains("|none|||"))
  assert_true(domain_events_v1().contains("StructureSetHighlighted^HIGHLIGHT_STRUCTURE_SET"))
  assert_true(domain_events_v1().contains("StructureSetCleared^CLEAR_STRUCTURE_SET"))
}

///|
test "v2 resolver upgrades anatomy families without changing exact or ambiguous policy" {
  assert_true(domain_resolve_query_v2("右侧斜角肌").contains("query-v2|STRUCTURE_LOOKUP|EXACT|HIGHLIGHT_STRUCTURE_SET|bodymate.neck.set.scalene.right|bodymate.neck.set.scalene.right"))
  assert_true(domain_resolve_query_v2("斜角肌").contains("bodymate.neck.set.scalene|双侧斜角肌群"))
  assert_true(domain_resolve_query_v2("SCM").contains("HIGHLIGHT_STRUCTURE_SET|bodymate.neck.set.scm"))
  assert_true(domain_resolve_query_v2("右侧胸锁乳突肌").contains("EXACT|SELECT_STRUCTURE|bodymate.neck.sternocleidomastoid.right"))
  assert_true(domain_resolve_query_v2("右边脖子").contains("AMBIGUOUS|FIND_STRUCTURE"))
}

///|
test "invalid structure set cannot mutate domain state" {
  ignore(domain_reset())
  let before = domain_snapshot_v3()
  assert_eq(domain_execute_action_v1("HIGHLIGHT_STRUCTURE_SET", "bodymate.neck.set.unknown", ""), "error|unknown_structure_set")
  assert_eq(domain_snapshot_v3(), before)
}
