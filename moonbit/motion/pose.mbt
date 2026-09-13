///| Key scalar targets for the Three.js pose applicator.
pub fn pose_intent(id : String, phase : Double, input : Array[MotionParameterValue]) -> Result[PoseIntent, MotionError] {
  guard normalize(id, input) is Ok(normalized) else { return Err(UnknownMotion(id)) }
  let p = normalized.values
  let finite_phase = if finite_double(phase) { phase } else { 0.0 }
  let bounded_phase = if finite_phase < 0.0 { 0.0 } else if finite_phase > 1.0 { 1.0 } else { finite_phase }
  let depth = 0.5 - 0.5 * @math.cos(bounded_phase * @math.PI * 2.0)
  let excursion = if id == "squat" { depth * parameter_value(p, "squatDepth", 100.0) / 100.0 } else { depth }
  let hand_width = parameter_value(p, "handWidth", 1.5)
  let elbow_angle = parameter_value(p, "elbowAngle", 45.0)
  let stance_width = parameter_value(p, "stanceWidth", 1.2)
  let toe_angle = parameter_value(p, "toeAngle", 20.0)
  let mut root_y = 0.91
  let mut root_z = -0.025
  let mut torso_x = 0.0
  let mut wrist_x = 0.0
  let mut wrist_y = 0.0
  let mut wrist_z = 0.0
  let mut ankle_x = 0.0
  let mut upper_arm_x = 0.0
  let mut forearm_x = 0.0
  if id == "push_up" {
    torso_x = 1.31 + 0.20 * depth
    root_y = 0.171 + 0.828 * @math.cos(torso_x)
    root_z = -0.025 + 0.828 * @math.sin(torso_x)
    wrist_x = 0.33 * hand_width / 2.0
    wrist_y = 0.031
    wrist_z = 1.285
  } else if id == "squat" {
    let span = 0.29 * stance_width / 2.0
    let thigh = (0.018 * 0.018 + 0.428 * 0.428 + 0.008 * 0.008).sqrt()
    let shin = (0.008 * 0.008 + 0.378 * 0.378 + 0.011 * 0.011).sqrt()
    let leg_length = thigh + shin - 0.008
    let standing_height = 0.104 + (leg_length * leg_length - (span - 0.057) * (span - 0.057) - 0.003 * 0.003).sqrt()
    root_y = standing_height - 0.30 * excursion
    root_z = -0.025 - 0.17 * excursion
    torso_x = 0.32 * excursion
    wrist_x = 0.255
    wrist_y = root_y + 0.28 + 0.04 * depth
    wrist_z = 0.38 + 0.07 * depth
    ankle_x = span
  } else {
    upper_arm_x = -0.07
    forearm_x = -0.07 - 2.05 * depth
  }
  Ok({ depth, excursion, root_y, root_z, torso_x, hand_width, elbow_angle,
    wrist_x, wrist_y, wrist_z, stance_width, toe_angle, ankle_x, upper_arm_x, forearm_x })
}
