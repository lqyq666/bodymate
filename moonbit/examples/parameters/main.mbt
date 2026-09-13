fn main raise {
  let query = "宽站距，脚尖外展25度，深度80%"
  let parsed = @motion.parse_query("squat", query, []).unwrap()
  assert_true(parsed.recognized)
  assert_eq(parsed.values[0].value, 1.8)
  assert_eq(parsed.values[1].value, 25.0)
  assert_eq(parsed.values[2].value, 80.0)
  println("scenario=parameters; motion=squat; stanceWidth=1.8; toeAngle=25; squatDepth=80; PASS")
  let bounded = @motion.normalize("push_up", [{ key: "handWidth", value: 9.0 }]).unwrap()
  assert_eq(bounded.values[0].value, 1.8)
  assert_eq(bounded.notices.length(), 1)
  println(bounded.notices[0])
}
