fn finite_double(value : Double) -> Bool {
  !value.is_nan() && value != @double.infinity && value != @double.neg_infinity
}

pub fn normalize(id : String, supplied : Array[MotionParameterValue]) -> Result[NormalizedParameters, MotionError] {
  guard definition(id) is Some(motion) else { return Err(UnknownMotion(id)) }
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
      notices.push(field.label + "已调整为 " + normalized.to_string() + field.unit + "（契约范围 " + field.minimum.to_string() + "–" + field.maximum.to_string() + field.unit + "）。")
    }
  }
  Ok({ values, notices })
}
