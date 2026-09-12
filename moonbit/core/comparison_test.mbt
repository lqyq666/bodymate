///|
test "set algebra is unique directional and deterministic" {
  let left = ["bodymate.neck.sternocleidomastoid.right", "bodymate.neck.sternocleidomastoid.left"]
  let right = ["bodymate.neck.sternocleidomastoid.left", "bodymate.neck.splenius.capitis.right"]
  assert_eq(set_union(left, right).length(), 3)
  assert_eq(set_intersection(left, right), ["bodymate.neck.sternocleidomastoid.left"])
  assert_eq(set_difference(left, right), ["bodymate.neck.sternocleidomastoid.right"])
  assert_eq(set_difference(left, left).length(), 0)
  assert_eq(set_intersection(left, left), left)
  assert_eq(set_union(left, left), left)
  assert_eq(set_intersection(left, right), set_intersection(right, left))
  assert_eq(set_union(left, right), set_union(right, left))
}

///|
test "comparison preserves mappings provenance and state transitions" {
  match movement_comparison_for("cervical_flexion", "cervical_rotation_right") {
    Some(value) => { assert_eq(value.overlap.length(), 1); assert_eq(value.only_left.length(), 1); assert_eq(value.only_right.length(), 1); assert_eq(value.union_structure_ids.length(), 3); assert_true(value.overlap[0].left_evidence_ids.contains("ev.neck.rotation-flexion")); assert_true(value.overlap[0].right_evidence_ids.contains("ev.neck.rotation-flexion")) }
    None => panic()
  }
  match movement_comparison_for("cervical_rotation_right", "cervical_rotation_left") { Some(value) => { assert_eq(value.overlap.length(), 0); assert_eq(value.only_left.length(), 2); assert_eq(value.only_right.length(), 2); assert_eq(value.union_structure_ids.length(), 4) }; None => panic() }
  match movement_comparison_for("cervical_flexion", "cervical_flexion") { Some(value) => { assert_eq(value.overlap.length(), 2); assert_eq(value.only_left.length(), 0); assert_eq(value.only_right.length(), 0); assert_eq(value.union_structure_ids.length(), 2) }; None => panic() }
  ignore(domain_reset()); let before = domain_snapshot_v5(); assert_eq(domain_execute_action_v1("SHOW_MOVEMENT_COMPARISON", "cervical_flexion,unknown", ""), "error|unknown_movement_comparison"); assert_eq(domain_snapshot_v5(), before); ignore(domain_execute_action_v1("SHOW_MOVEMENT_COMPARISON", "cervical_flexion,cervical_rotation_right", "")); assert_true(domain_snapshot_v5().contains("snapshot-v5|5")); assert_true(domain_events_v2().contains("MovementComparisonShown^SHOW_MOVEMENT_COMPARISON")); ignore(domain_execute_action_v1("SELECT_STRUCTURE", "bodymate.neck.splenius.capitis.left", "")); assert_true(domain_snapshot_v5().has_suffix("|||||")); ignore(domain_execute_action_v1("SHOW_MOVEMENT_COMPARISON", "cervical_rotation_right,cervical_rotation_left", "")); ignore(domain_execute_action_v1("SHOW_MOVEMENT_MAPPING", "cervical_flexion", "")); assert_true(domain_snapshot_v5().has_suffix("|||||")); ignore(reset_overview()); assert_true(domain_snapshot_v5().has_suffix("|||||"))
}
