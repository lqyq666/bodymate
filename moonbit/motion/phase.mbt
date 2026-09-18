///| Authored teaching checkpoints for the three supported motions.
///| They describe the fixed BodyMate demonstration pose, rather than exercise advice or measured force.
pub fn phase_guides(id : String) -> Result[Array[MotionPhaseGuide], MotionError] {
  guard definition(id) is Some(_) else { return Err(UnknownMotion(id)) }
  match id {
    "push_up" => Ok([
      { id: "push_up_ready", phase: 0.0, start: 0.875, end: 0.125, title: "准备姿势", detail: "从头到脚保持教学模型的整体对齐；这一阶段用于观察起始位置。" },
      { id: "push_up_lower", phase: 0.25, start: 0.125, end: 0.4375, title: "下降", detail: "躯干向下移动，胸部与上臂后侧的参与提示开始显现。" },
      { id: "push_up_bottom", phase: 0.5, start: 0.4375, end: 0.5625, title: "最低点", detail: "动作到达示范最低位置；手距与肘部外展会改变当前教学姿态。" },
      { id: "push_up_rise", phase: 0.75, start: 0.5625, end: 0.875, title: "推起", detail: "躯干回到准备位置；颜色只表示定性参与，不表示实测受力。" },
    ])
    "squat" => Ok([
      { id: "squat_ready", phase: 0.0, start: 0.875, end: 0.125, title: "准备姿势", detail: "双脚站距与脚尖方向使用当前参数；此处是比较的起点。" },
      { id: "squat_lower", phase: 0.25, start: 0.125, end: 0.4375, title: "下降", detail: "髋与膝共同屈曲；可在相同阶段切换站距、脚尖外展和幅度。" },
      { id: "squat_bottom", phase: 0.5, start: 0.4375, end: 0.5625, title: "最低点", detail: "当前下蹲幅度达到最大；模型范围是教学约束，不是训练建议。" },
      { id: "squat_rise", phase: 0.75, start: 0.5625, end: 0.875, title: "起身", detail: "髋与膝伸展回到准备位置；观察臀部与大腿区域的定性提示。" },
    ])
    "curl" => Ok([
      { id: "curl_ready", phase: 0.0, start: 0.875, end: 0.125, title: "准备姿势", detail: "手臂位于教学模型的起始位置。" },
      { id: "curl_flex", phase: 0.25, start: 0.125, end: 0.4375, title: "屈肘", detail: "前臂向上移动；上臂前侧为主要参与提示。" },
      { id: "curl_top", phase: 0.5, start: 0.4375, end: 0.5625, title: "最高点", detail: "肘部屈曲达到示范最高位置；停在这里便于观察前臂与上臂关系。" },
      { id: "curl_extend", phase: 0.75, start: 0.5625, end: 0.875, title: "伸肘", detail: "前臂回到起始位置；颜色是教学提示，不代表力或肌电。" },
    ])
    _ => Err(UnknownMotion(id))
  }
}
