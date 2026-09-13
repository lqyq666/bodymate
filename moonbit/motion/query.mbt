fn parse_double(value : StringView) -> Double? {
  try Some(@string.parse_double(value)) catch { _ => None }
}

/// Resolve the bounded Chinese/English vocabulary. No remote model is used.
pub fn resolve(query : String) -> String? {
  let input = query.to_lower().trim()
  for motion in catalog() {
    for query_alias in motion.aliases {
      if input.contains(query_alias.to_lower()) { return Some(motion.id) }
    }
  }
  None
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
pub fn parse_query(id : String, query : String, base : Array[MotionParameterValue]) -> Result[ParsedParameters, MotionError] {
  guard definition(id) is Some(motion) else { return Err(UnknownMotion(id)) }
  let text = query.trim().to_owned()
  let (preset_values, preset_recognized) = apply_matching_preset(motion, text, base)
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
  guard normalize(id, values) is Ok(normalized) else { return Err(UnknownMotion(id)) }
  let notices = normalized.notices
  if text.contains("抬高") || text.contains("负重") || text.contains("单手") || text.contains("单脚") || text.contains("单腿") || text.contains("倾斜") || text.contains("手腕角") || text.contains("手腕夹角") || text.contains("掌心角") || text.contains("地面夹角") {
    notices.push("本次只应用面板中的参数；抬高、负重、单侧或其他角度尚未支持。")
  }
  if !recognized && (text.contains("手距") || text.contains("站距") || text.contains("脚距") || text.contains("夹角") || text.contains("外展") || text.contains("外撇") || text.contains("深度") || text.contains("幅度")) {
    notices.push("未识别具体参数，暂用当前或默认值。可输入“手距1.2倍肩宽、夹角45度”或“站距1.5倍髋宽、脚尖外展20度、深度80%”。")
  }
  Ok({ values: normalized.values, notices, recognized })
}
