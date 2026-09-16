///| Authored key-frame annotations for the three sample motions.
///| They describe the fixed reference pose defined by the parameter contract, rather than
///| exercise advice or measured force.
pub fn phase_guides(id : String) -> Result[Array[MotionPhaseGuide], MotionError] {
  guard definition(id) is Some(_) else { return Err(UnknownMotion(id)) }
  match id {
    "push_up" => Ok([
      { id: "push_up_ready", phase: 0.0, start: 0.875, end: 0.125, title: "准备姿势", detail: "参照骨架保持整体对齐；该关键帧是起始位置基线。" },
      { id: "push_up_lower", phase: 0.25, start: 0.125, end: 0.4375, title: "下降", detail: "躯干下降；胸部与上臂后侧的定性参与映射开始显现。" },
      { id: "push_up_bottom", phase: 0.5, start: 0.4375, end: 0.5625, title: "最低点", detail: "到达契约定义的最低位置；手距与肘部外展参数在此帧改变姿态。" },
      { id: "push_up_rise", phase: 0.75, start: 0.5625, end: 0.875, title: "推起", detail: "躯干回到起始位置；颜色只表示定性参与映射，不表示实测受力。" },
    ])
    "squat" => Ok([
      { id: "squat_ready", phase: 0.0, start: 0.875, end: 0.125, title: "准备姿势", detail: "双脚站距与脚尖方向取自当前参数；此帧是比较的基线。" },
      { id: "squat_lower", phase: 0.25, start: 0.125, end: 0.4375, title: "下降", detail: "髋与膝共同屈曲；可在同一关键帧切换站距、脚尖外展和幅度。" },
      { id: "squat_bottom", phase: 0.5, start: 0.4375, end: 0.5625, title: "最低点", detail: "下蹲幅度达到当前参数最大值；范围来自参数契约，不是训练建议。" },
      { id: "squat_rise", phase: 0.75, start: 0.5625, end: 0.875, title: "起身", detail: "髋与膝伸展回到起始位置；臀部与大腿区域为定性参与映射。" },
    ])
    "curl" => Ok([
      { id: "curl_ready", phase: 0.0, start: 0.875, end: 0.125, title: "准备姿势", detail: "手臂位于参照骨架的起始位置。" },
      { id: "curl_flex", phase: 0.25, start: 0.125, end: 0.4375, title: "屈肘", detail: "前臂上举；上臂前侧为主要参与映射。" },
      { id: "curl_top", phase: 0.5, start: 0.4375, end: 0.5625, title: "最高点", detail: "肘部屈曲达到契约最高位置；停在此帧便于检视前臂与上臂关系。" },
      { id: "curl_extend", phase: 0.75, start: 0.5625, end: 0.875, title: "伸肘", detail: "前臂回到起始位置；颜色是定性参与映射，不代表力或肌电。" },
    ])
    _ => Err(UnknownMotion(id))
  }
}
