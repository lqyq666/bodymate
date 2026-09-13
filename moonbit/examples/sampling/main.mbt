fn main raise {
  let parameters : Array[@motion.MotionParameterValue] = [{ key: "squatDepth", value: 80.0 }]
  for phase in [0.0, 0.25, 0.5, 0.75, 1.0] {
    let pose = @motion.pose_intent("squat", phase, parameters).unwrap()
    assert_eq(pose, @motion.pose_intent("squat", phase, parameters).unwrap())
    println("phase=\{phase}; depth=\{pose.depth}; excursion=\{pose.excursion}; rootY=\{pose.root_y}")
  }
  let bottom = @motion.pose_intent("squat", 0.5, parameters).unwrap()
  assert_eq(bottom.excursion, 0.8)
  println("scenario=sampling; deterministic=true; rendererRequired=false; PASS")
}
