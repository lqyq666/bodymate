///| One renderer-independent parameter exposed by the complete-body motion model.
pub struct MotionParameterDefinition {
  key : String
  label : String
  unit : String
  minimum : Double
  maximum : Double
  step : Double
  initial : Double
}

///| A named parameter set owned by the motion domain.
pub struct MotionPreset {
  title : String
  values : Array[MotionParameterValue]
}

///| A normalized parameter value.
pub struct MotionParameterValue {
  key : String
  value : Double
}

///| One qualitative participation group. Weight is authored visual emphasis, not EMG.
pub struct MotionParticipationGroup {
  label : String
  structure_pattern : String
  role : String
  weight : Double
}

///| One bundled evidence anchor for a qualitative participation statement.
pub struct MotionEvidence {
  url : String
  scope : String
}

///| Canonical complete-body movement definition.
pub struct MotionDefinition {
  id : String
  title : String
  aliases : Array[String]
  duration : Double
  muscles : Array[String]
  structure_pattern : String
  parameters : Array[MotionParameterDefinition]
  presets : Array[MotionPreset]
}

let push_up_parameters : Array[MotionParameterDefinition] = [
  { key: "handWidth", label: "手距", unit: "倍肩宽", minimum: 0.8, maximum: 1.8, step: 0.05, initial: 1.5 },
  { key: "elbowAngle", label: "底部肘部外展", unit: "°", minimum: 15.0, maximum: 70.0, step: 5.0, initial: 45.0 },
]

let squat_parameters : Array[MotionParameterDefinition] = [
  { key: "stanceWidth", label: "站距", unit: "倍髋宽", minimum: 0.8, maximum: 1.8, step: 0.05, initial: 1.2 },
  { key: "toeAngle", label: "脚尖外展", unit: "°", minimum: 0.0, maximum: 35.0, step: 5.0, initial: 20.0 },
  { key: "squatDepth", label: "下蹲幅度", unit: "%", minimum: 60.0, maximum: 110.0, step: 5.0, initial: 100.0 },
]

let motion_catalog : Array[MotionDefinition] = [
  {
    id: "push_up", title: "俯卧撑", aliases: ["俯卧撑", "卧撑", "push-up", "push up"], duration: 4.0,
    muscles: ["胸部", "肩部", "上臂后侧"], structure_pattern: "pectoralis major/deltoid/triceps brachii/serratus anterior",
    parameters: push_up_parameters,
    presets: [
      { title: "窄距", values: [{ key: "handWidth", value: 0.85 }, { key: "elbowAngle", value: 25.0 }] },
      { title: "标准", values: [{ key: "handWidth", value: 1.5 }, { key: "elbowAngle", value: 45.0 }] },
      { title: "宽距", values: [{ key: "handWidth", value: 1.8 }, { key: "elbowAngle", value: 60.0 }] },
    ],
  },
  {
    id: "squat", title: "深蹲", aliases: ["深蹲", "squat"], duration: 4.4,
    muscles: ["大腿前侧", "臀部", "大腿后侧"], structure_pattern: "rectus femoris/vastus/gluteus/biceps femoris/semitendinosus/semimembranosus",
    parameters: squat_parameters,
    presets: [
      { title: "窄站距", values: [{ key: "stanceWidth", value: 0.8 }, { key: "toeAngle", value: 10.0 }, { key: "squatDepth", value: 100.0 }] },
      { title: "标准", values: [{ key: "stanceWidth", value: 1.2 }, { key: "toeAngle", value: 20.0 }, { key: "squatDepth", value: 100.0 }] },
      { title: "宽站距", values: [{ key: "stanceWidth", value: 1.8 }, { key: "toeAngle", value: 30.0 }, { key: "squatDepth", value: 100.0 }] },
    ],
  },
  {
    id: "curl", title: "弯举", aliases: ["弯举", "二头弯举", "curl"], duration: 3.6,
    muscles: ["上臂前侧", "前臂"], structure_pattern: "biceps brachii/brachialis/brachioradialis",
    parameters: [], presets: [],
  },
]

fn motion_by_id(id : String) -> MotionDefinition? {
  for motion in motion_catalog { if motion.id == id { return Some(motion) } }
  None
}

fn parameter_value(values : Array[MotionParameterValue], key : String, fallback : Double) -> Double {
  for item in values { if item.key == key { return item.value } }
  fallback
}

fn parameter_wire(values : Array[MotionParameterValue]) -> String {
  let output : Array[String] = []
  for item in values { output.push(item.key + "=" + item.value.to_string()) }
  output.join(",")
}

fn parse_double(value : StringView) -> Double? {
  try Some(@string.parse_double(value)) catch { _ => None }
}

fn parse_parameter_wire(input : String) -> Array[MotionParameterValue] {
  let values : Array[MotionParameterValue] = []
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

fn finite_double(value : Double) -> Bool {
  !value.is_nan() && value != @double.infinity && value != @double.neg_infinity
}

fn normalize_parameters(id : String, input : String) -> (Array[MotionParameterValue], Array[String])? {
  guard motion_by_id(id) is Some(motion) else { return None }
  let supplied = parse_parameter_wire(input)
  let values : Array[MotionParameterValue] = []
  let notices : Array[String] = []
  for field in motion.parameters {
    let requested = parameter_value(supplied, field.key, field.initial)
    let finite = if finite_double(requested) { requested } else { field.initial }
    let clamped = if finite < field.minimum { field.minimum } else if finite > field.maximum { field.maximum } else { finite }
    let stepped = ((clamped - field.minimum) / field.step).round() * field.step + field.minimum
    let normalized = (stepped * 100.0).round() / 100.0
    values.push({ key: field.key, value: normalized })
    let mut was_supplied = false
    for item in supplied { if item.key == field.key { was_supplied = true } }
    if was_supplied && (!finite_double(requested) || (normalized - requested).abs() > 0.0001) {
      notices.push(field.label + "已调整为 " + normalized.to_string() + field.unit + "（本模型演示范围 " + field.minimum.to_string() + "–" + field.maximum.to_string() + field.unit + "）。")
    }
  }
  Some((values, notices))
}

fn preset_wire(preset : MotionPreset) -> String { preset.title + "@" + parameter_wire(preset.values) }

fn motion_wire(motion : MotionDefinition) -> String {
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
  for motion in motion_catalog { records.push(motion_wire(motion)) }
  "ok|motion-registry-v1|" + records.join("~")
}

///| Resolve aliases inside MoonBit so the presentation layer has no movement vocabulary.
#export_name("bodymate_motion_resolve_v1")
pub fn motion_resolve_v1(query : String) -> String {
  let input = query.to_lower().trim()
  for motion in motion_catalog {
    for query_alias in motion.aliases {
      if input.contains(query_alias.to_lower()) { return "ok|motion-resolve-v1|" + motion.id }
    }
  }
  "ok|motion-resolve-v1|"
}

fn notices_wire(notices : Array[String]) -> String { notices.join("~") }

///| Normalize/clamp/step-round parameters using domain-owned definitions.
#export_name("bodymate_motion_parameters_v1")
pub fn motion_parameters_v1(id : String, input : String) -> String {
  match normalize_parameters(id, input) {
    None => "error|unknown_motion"
    Some((values, notices)) => "ok|motion-parameters-v1|" + parameter_wire(values) + "|" + notices_wire(notices)
  }
}

fn set_parameter(values : Array[MotionParameterValue], key : String, value : Double) -> Array[MotionParameterValue] {
  let output : Array[MotionParameterValue] = []
  for item in values { if item.key != key { output.push(item) } }
  output.push({ key, value })
  output
}

fn number_for_pattern(text : String, pattern : String) -> Double? {
  match @string.Regex::unsafe_from_string(pattern).execute(text) {
    None => None
    Some(result) => match result.group(1) {
      None => None
      Some(value) => parse_double(value)
    }
  }
}

fn apply_matching_number(values : Array[MotionParameterValue], key : String, text : String, pattern : String) -> (Array[MotionParameterValue], Bool) {
  match number_for_pattern(text, pattern) {
    None => (values, false)
    Some(value) => (set_parameter(values, key, value), true)
  }
}

fn apply_matching_preset(motion : MotionDefinition, text : String, values : Array[MotionParameterValue]) -> (Array[MotionParameterValue], Bool) {
  let mut index = -1
  if text.contains("窄距") || text.contains("窄站距") || text.contains("窄脚距") { index = 0 }
  else if text.contains("宽距") || text.contains("宽站距") || text.contains("宽脚距") { index = 2 }
  else if text.contains("标准") { index = 1 }
  if index < 0 || index >= motion.presets.length() { return (values, false) }
  let mut output = values
  for item in motion.presets[index].values { output = set_parameter(output, item.key, item.value) }
  (output, true)
}

///| Parse supported Chinese parameter instructions without leaking the vocabulary into JS.
#export_name("bodymate_motion_parse_query_v1")
pub fn motion_parse_query_v1(id : String, query : String, base : String) -> String {
  guard motion_by_id(id) is Some(motion) else { return "error|unknown_motion" }
  let text = query.trim().to_owned()
  let (preset_values, preset_recognized) = apply_matching_preset(motion, text, parse_parameter_wire(base))
  let mut values = preset_values
  let mut recognized = preset_recognized
  let value = "[[:space:]]*(?:调整为|调整到|调到|改成|设为|为|到|是|:|：|=)?[[:space:]]*(-?[[:digit:]]+(?:\\.[[:digit:]]+)?)[[:space:]]*"
  if id == "push_up" {
    if !text.contains("倍髋宽") {
      let (next_hand, hand_found) = apply_matching_number(values, "handWidth", text, "(?:手距|两手间距|双手间距|手间距)" + value + "倍(?:肩宽)?")
      values = next_hand
      recognized = recognized || hand_found
    }
    if !text.contains("地面夹角") && !text.contains("躯干倾斜") && !text.contains("身体倾斜") && !text.contains("手腕夹角") {
      let (next_elbow, elbow_found) = apply_matching_number(values, "elbowAngle", text, "(?:肘部外展(?:角度|角)?|肘部夹角|肘角|上臂与躯干夹角|夹角)" + value + "(?:度|°)")
      values = next_elbow
      recognized = recognized || elbow_found
    }
  } else if id == "squat" {
    if !text.contains("倍肩宽") {
      let (next_stance, stance_found) = apply_matching_number(values, "stanceWidth", text, "(?:站距|脚距|脚间距|双脚间距|两脚间距)" + value + "倍(?:髋宽)?")
      values = next_stance
      recognized = recognized || stance_found
    }
    let (next_toe, toe_found) = apply_matching_number(values, "toeAngle", text, "(?:脚尖外展(?:角度|角)?|脚尖角度|脚尖角|脚尖外撇|外撇)" + value + "(?:度|°)")
    values = next_toe
    recognized = recognized || toe_found
    let (next_depth, depth_found) = apply_matching_number(values, "squatDepth", text, "(?:下蹲幅度|下蹲深度|幅度|深度)" + value + "%")
    values = next_depth
    recognized = recognized || depth_found
  }
  guard normalize_parameters(id, parameter_wire(values)) is Some((normalized, domain_notices)) else { return "error|unknown_motion" }
  let notices = domain_notices
  if text.contains("抬高") || text.contains("负重") || text.contains("单手") || text.contains("单脚") || text.contains("单腿") || text.contains("倾斜") || text.contains("手腕角") || text.contains("手腕夹角") || text.contains("掌心角") || text.contains("地面夹角") {
    notices.push("本次只应用面板中的参数；抬高、负重、单侧或其他角度尚未支持。")
  }
  if !recognized && (text.contains("手距") || text.contains("站距") || text.contains("脚距") || text.contains("夹角") || text.contains("外展") || text.contains("外撇") || text.contains("深度") || text.contains("幅度")) {
    notices.push("未识别具体参数，暂用当前或默认值。可输入“手距1.2倍肩宽、夹角45度”或“站距1.5倍髋宽、脚尖外展20度、深度80%”。")
  }
  "ok|motion-parse-v1|" + parameter_wire(normalized) + "|" + notices_wire(notices) + "|" + recognized.to_string()
}

fn group_wire(group : MotionParticipationGroup) -> String {
  group.label + "@" + group.structure_pattern + "@" + group.role + "@" + group.weight.to_string()
}

///| Domain-owned qualitative participation profile and evidence note.
#export_name("bodymate_motion_profile_v1")
pub fn motion_profile_v1(id : String, input : String) -> String {
  guard normalize_parameters(id, input) is Some((p, _)) else { return "error|unknown_motion" }
  let groups : Array[MotionParticipationGroup] = []
  let evidence : Array[MotionEvidence] = []
  let mut note = ""
  if id == "push_up" {
    let hand_width = parameter_value(p, "handWidth", 1.5)
    let narrow = hand_width <= 1.0
    let wide = hand_width >= 1.6
    groups.push({ label: "胸部", structure_pattern: "pectoralis major", role: "主要参与", weight: if narrow { 1.0 } else if wide { 0.82 } else { 0.9 } })
    groups.push({ label: "上臂后侧", structure_pattern: "triceps brachii", role: "主要参与", weight: if narrow { 1.0 } else if wide { 0.78 } else { 0.88 } })
    groups.push({ label: "肩部", structure_pattern: "deltoid", role: "辅助参与", weight: 0.55 })
    groups.push({ label: "肩胛与核心", structure_pattern: "serratus anterior/rectus abdominis/external oblique", role: "稳定参与", weight: 0.35 })
    note = (if narrow { "窄距研究中胸大肌与肱三头肌的肌电活动均可能提高。" } else if wide { "宽距不等于胸肌参与一定更多。" } else { "胸部与上臂后侧共同参与，肩部和核心协同。" }) + "肘部夹角与手距的组合未作受力定量；颜色是参与提示，不是实测。"
    evidence.push({ url: "https://pubmed.ncbi.nlm.nih.gov/16095413/", scope: "Acute surface EMG, narrow versus wide hands; not a continuous angle or hypertrophy model." })
  } else if id == "squat" {
    let wide = parameter_value(p, "stanceWidth", 1.2) >= 1.6
    groups.push({ label: "大腿前侧", structure_pattern: "rectus femoris/vastus", role: "主要参与", weight: 0.95 })
    groups.push({ label: "臀部", structure_pattern: "gluteus maximus", role: "主要参与", weight: if wide { 1.0 } else { 0.85 } })
    groups.push({ label: "大腿内侧", structure_pattern: "adductor magnus/adductor longus/adductor brevis", role: "辅助参与", weight: 0.5 })
    groups.push({ label: "大腿后侧与核心", structure_pattern: "biceps femoris/semitendinosus/semimembranosus/gluteus medius/rectus abdominis/external oblique", role: "稳定参与", weight: 0.35 })
    note = (if wide { "部分宽站距研究观察到臀大肌肌电增加，不能据此预测增肌。" } else { "大腿前侧与臀部共同参与。" }) + "脚尖角度和深度会改变姿态；这里不将它们换算成单块肌肉受力百分比。"
    evidence.push({ url: "https://pubmed.ncbi.nlm.nih.gov/19130646/", scope: "Six experienced lifters, back squats at selected widths and loads; qualitative gluteus maximus trend only." })
    evidence.push({ url: "https://pubmed.ncbi.nlm.nih.gov/30026952/", scope: "Stance and foot angle affect joint motion and moments, not measured individual muscle forces." })
  } else {
    groups.push({ label: "上臂前侧", structure_pattern: "biceps brachii/brachialis", role: "主要参与", weight: 1.0 })
    groups.push({ label: "前臂", structure_pattern: "brachioradialis", role: "辅助参与", weight: 0.6 })
    note = "红色表示预设参与肌群，不是实测肌电或肌肉受力。"
  }
  let group_records : Array[String] = []
  for group in groups { group_records.push(group_wire(group)) }
  let evidence_records : Array[String] = []
  for item in evidence { evidence_records.push(item.url + "@" + item.scope) }
  "ok|motion-profile-v1|" + group_records.join("~") + "|" + note + "|" + evidence_records.join("~")
}

///| Key scalar targets for the Three.js pose applicator.
#export_name("bodymate_motion_pose_intent_v1")
pub fn motion_pose_intent_v1(id : String, phase : Double, input : String) -> String {
  guard normalize_parameters(id, input) is Some((p, _)) else { return "error|unknown_motion" }
  let bounded_phase = if phase < 0.0 { 0.0 } else if phase > 1.0 { 1.0 } else { phase }
  let depth = 0.5 - 0.5 * @math.cos(bounded_phase * @math.PI * 2.0)
  let excursion = if id == "squat" { depth * parameter_value(p, "squatDepth", 100.0) / 100.0 } else { depth }
  "ok|pose-intent-v1|depth=" + depth.to_string() + ",excursion=" + excursion.to_string() + ",handWidth=" + parameter_value(p, "handWidth", 1.5).to_string() + ",elbowAngle=" + parameter_value(p, "elbowAngle", 45.0).to_string() + ",stanceWidth=" + parameter_value(p, "stanceWidth", 1.2).to_string() + ",toeAngle=" + parameter_value(p, "toeAngle", 20.0).to_string()
}
