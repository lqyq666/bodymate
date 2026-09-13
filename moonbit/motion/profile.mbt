///| Domain-owned qualitative participation profile and evidence note.
pub fn profile(id : String, input : Array[MotionParameterValue]) -> Result[MotionProfile, MotionError] {
  guard normalize(id, input) is Ok(normalized) else { return Err(UnknownMotion(id)) }
  let p = normalized.values
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
  Ok({ groups, note, evidence })
}
