///|
test "pointer feedback is bounded and deterministic" {
  assert_eq(
    ui_feedback_v1(9.0, -8.0, true, false, true),
    ui_feedback_v1(1.0, -1.0, true, false, true),
  )
  assert_true(
    ui_feedback_v1(1.0, -1.0, true, false, true).contains(
      "x=1.5,y=-2,rx=2,ry=2,duration=200",
    ),
  )
}

///|
test "reduced motion and coarse pointers suppress all spatial feedback" {
  assert_eq(
    ui_feedback_v1(1.0, 1.0, true, true, true),
    ui_feedback_v1(1.0, 1.0, true, false, false),
  )
  assert_true(
    ui_feedback_v1(1.0, 1.0, true, true, true).contains(
      "x=0,y=0,rx=0,ry=0,duration=0",
    ),
  )
  assert_true(
    ui_feedback_v1(1.0, 1.0, false, false, true).contains(
      "x=0,y=0,rx=0,ry=0,duration=200",
    ),
  )
}

///|
test "invalid pointer coordinates resolve to the center" {
  assert_eq(
    ui_feedback_v1(@double.infinity, 0.0 / 0.0, true, false, true),
    ui_feedback_v1(0.0, 0.0, true, false, true),
  )
}
