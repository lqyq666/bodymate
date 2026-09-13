///|
/// Pointer coordinates are normalized by the DOM adapter. MoonBit owns the
/// tactile bounds and accessibility policy; no animation state is retained.
fn feedback_axis(value : Double) -> Double {
  if value.is_nan() ||
    value == @double.infinity ||
    value == @double.neg_infinity {
    0.0
  } else if value < -1.0 {
    -1.0
  } else if value > 1.0 {
    1.0
  } else {
    value
  }
}

///|
#export_name("bodymate_ui_feedback_v1")
pub fn ui_feedback_v1(
  x : Double,
  y : Double,
  hovered : Bool,
  reduced_motion : Bool,
  fine_pointer : Bool,
) -> String {
  let enabled = hovered && fine_pointer && !reduced_motion
  let px = if enabled { feedback_axis(x) } else { 0.0 }
  let py = if enabled { feedback_axis(y) } else { 0.0 }
  let lift = if enabled { -2.0 } else { 0.0 }
  let duration = if reduced_motion || !fine_pointer { 0 } else { 200 }
  "ok|ui-feedback-v1|x=" +
  (px * 1.5).to_string() +
  ",y=" +
  lift.to_string() +
  ",rx=" +
  (py * -2.0).to_string() +
  ",ry=" +
  (px * 2.0).to_string() +
  ",duration=" +
  duration.to_string()
}
