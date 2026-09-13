fn main raise {
  let left = @motion.Session::new()
  let right = @motion.Session::new()
  ignore(left.play("squat", []).unwrap())
  ignore(right.play("curl", []).unwrap())
  assert_eq(left.tick(2.2).phase, 0.5)
  ignore(left.set_paused(true))
  assert_eq(left.tick(10.0).phase, 0.5)
  assert_eq(right.snapshot().phase, 0.0)
  assert_eq(right.tick(1.8).phase, 0.5)
  ignore(left.reset())
  assert_eq(right.snapshot().motion_id, "curl")
  println("scenario=sessions; independent=true; pause=true; resetIsolation=true; PASS")
}
