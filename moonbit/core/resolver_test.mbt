///|
test "resolver handles Chinese English stable ID and SCM alias queries" {
  assert_true(domain_resolve_query_v1("右侧胸锁乳突肌").contains("SELECT_STRUCTURE|bodymate.neck.sternocleidomastoid.right"))
  assert_true(domain_resolve_query_v1("right sternocleidomastoid").contains("SELECT_STRUCTURE|bodymate.neck.sternocleidomastoid.right"))
  assert_true(domain_resolve_query_v1("bodymate.neck.splenius.capitis.left").contains("SELECT_STRUCTURE|bodymate.neck.splenius.capitis.left"))
  assert_true(domain_resolve_query_v1("SCM").contains("AMBIGUOUS|FIND_STRUCTURE"))
  assert_true(domain_resolve_query_v1("SCM!!!").contains("AMBIGUOUS|FIND_STRUCTURE"))
}

///|
test "resolver normalizes side and ranks family candidates deterministically" {
  let right_scalene = domain_resolve_query_v1("右侧斜角肌")
  assert_true(right_scalene.contains("bodymate.neck.scalene.anterior.right,bodymate.neck.scalene.medius.right,bodymate.neck.scalene.posterior.right"))
  let all_scalene = domain_resolve_query_v1("scalene")
  assert_true(all_scalene.contains("bodymate.neck.scalene.anterior.right"))
  assert_true(all_scalene.contains("bodymate.neck.scalene.posterior.left"))
  assert_true(domain_resolve_query_v1("右边脖子").contains("AMBIGUOUS|FIND_STRUCTURE"))
}

///|
test "resolver keeps unsupported anatomy and health queries safe" {
  assert_true(domain_resolve_query_v1("胸大肌").contains("NO_MATCH|UNKNOWN"))
  for query in ["我脖子疼怎么办", "脖子受伤了", "需要诊断", "治疗方案", "康复练习", "拉伸处方", "diagnose neck pain", "injury treatment", "rehab stretch"] {
    assert_true(domain_resolve_query_v1(query).contains("UNSUPPORTED_HEALTH_QUERY|NO_MATCH|UNKNOWN"))
  }
}

///|
test "resolver maps deterministic commands without mutating state" {
  ignore(domain_reset())
  let before = domain_snapshot_v2()
  assert_true(domain_resolve_query_v1("只看这块").contains("DOMAIN_COMMAND|EXACT|ISOLATE_SELECTED"))
  assert_true(domain_resolve_query_v1("显示周围").contains("DOMAIN_COMMAND|EXACT|RESTORE_CONTEXT"))
  assert_eq(domain_snapshot_v2(), before)
}
