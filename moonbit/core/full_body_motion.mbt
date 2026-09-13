fn parameter_wire(values : Array[@motion.MotionParameterValue]) -> String {
  let output : Array[String] = []
  for item in values { output.push(item.key + "=" + item.value.to_string()) }
  output.join(",")
}

fn parse_double(value : StringView) -> Double? {
  try Some(@string.parse_double(value)) catch { _ => None }
}

fn parse_parameter_wire(input : String) -> Array[@motion.MotionParameterValue] {
  let values : Array[@motion.MotionParameterValue] = []
  if input == "" { return values }
  for pair in input.split(",") {
    let parts = pair.split("=").to_array()
    if parts.length() == 2 {
      match parse_double(parts[1]) {
        Some(value) => values.push({ key: parts[0].to_owned(), value })
        None => ()
      }
    }
  }
  values
}


fn notices_wire(notices : Array[String]) -> String { notices.join("~") }
fn motion_error_wire(error : @motion.MotionError) -> String {
  match error {
    @motion.UnknownMotion(_) => "error|unknown_motion"
    @motion.NoActiveMotion => "error|no_active_motion"
  }
}
fn preset_wire(preset : @motion.MotionPreset) -> String { preset.title + "@" + parameter_wire(preset.values) }

fn motion_wire(motion : @motion.MotionDefinition) -> String {
  let fields : Array[String] = []
  for field in motion.parameters {
    fields.push(field.key + "@" + field.label + "@" + field.unit + "@" + field.minimum.to_string() + "@" + field.maximum.to_string() + "@" + field.step.to_string() + "@" + field.initial.to_string())
  }
  let presets : Array[String] = []
  for preset in motion.presets { presets.push(preset_wire(preset)) }
  motion.id + "^" + motion.title + "^" + motion.duration.to_string() + "^" + motion.aliases.join(";") + "^" + motion.muscles.join(";") + "^" + motion.structure_pattern + "^" + fields.join(";") + "^" + presets.join(";")
}

///| Complete-body registry; JS receives data and must not redefine it.
#export_name("bodymate_motion_registry_v1")
pub fn motion_registry_v1() -> String {
  let records : Array[String] = []
  for motion in @motion.catalog() { records.push(motion_wire(motion)) }
  "ok|motion-registry-v1|" + records.join("~")
}

#export_name("bodymate_motion_resolve_v1")
pub fn motion_resolve_v1(query : String) -> String {
  "ok|motion-resolve-v1|" + @motion.resolve(query).unwrap_or("")
}

#export_name("bodymate_motion_parameters_v1")
pub fn motion_parameters_v1(id : String, input : String) -> String {
  match @motion.normalize(id, parse_parameter_wire(input)) {
    Err(error) => motion_error_wire(error)
    Ok(value) => "ok|motion-parameters-v1|" + parameter_wire(value.values) + "|" + notices_wire(value.notices)
  }
}

#export_name("bodymate_motion_parse_query_v1")
pub fn motion_parse_query_v1(id : String, query : String, base : String) -> String {
  match @motion.parse_query(id, query, parse_parameter_wire(base)) {
    Err(error) => motion_error_wire(error)
    Ok(value) => "ok|motion-parse-v1|" + parameter_wire(value.values) + "|" + notices_wire(value.notices) + "|" + value.recognized.to_string()
  }
}

#export_name("bodymate_motion_profile_v1")
pub fn motion_profile_v1(id : String, input : String) -> String {
  match @motion.profile(id, parse_parameter_wire(input)) {
    Err(error) => motion_error_wire(error)
    Ok(value) => {
      let groups : Array[String] = []
      for group in value.groups {
        groups.push(group.label + "@" + group.structure_pattern + "@" + group.role + "@" + group.weight.to_string())
      }
      let evidence : Array[String] = []
      for item in value.evidence { evidence.push(item.url + "@" + item.scope) }
      "ok|motion-profile-v1|" + groups.join("~") + "|" + value.note + "|" + evidence.join("~")
    }
  }
}

#export_name("bodymate_motion_pose_intent_v1")
pub fn motion_pose_intent_v1(id : String, phase : Double, input : String) -> String {
  match @motion.pose_intent(id, phase, parse_parameter_wire(input)) {
    Err(error) => motion_error_wire(error)
    Ok(p) => "ok|pose-intent-v1|depth=" + p.depth.to_string() +
      ",excursion=" + p.excursion.to_string() + ",rootY=" + p.root_y.to_string() +
      ",rootZ=" + p.root_z.to_string() + ",torsoX=" + p.torso_x.to_string() +
      ",handWidth=" + p.hand_width.to_string() + ",elbowAngle=" + p.elbow_angle.to_string() +
      ",wristX=" + p.wrist_x.to_string() + ",wristY=" + p.wrist_y.to_string() + ",wristZ=" + p.wrist_z.to_string() +
      ",stanceWidth=" + p.stance_width.to_string() + ",toeAngle=" + p.toe_angle.to_string() +
      ",ankleX=" + p.ankle_x.to_string() + ",upperArmX=" + p.upper_arm_x.to_string() + ",forearmX=" + p.forearm_x.to_string()
  }
}
