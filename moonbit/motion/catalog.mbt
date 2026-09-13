fn push_up_parameters() -> Array[MotionParameterDefinition] { [
  { key: "handWidth", label: "手距", unit: "倍肩宽", minimum: 0.8, maximum: 1.8, step: 0.05, initial: 1.5 },
  { key: "elbowAngle", label: "底部肘部外展", unit: "°", minimum: 15.0, maximum: 70.0, step: 5.0, initial: 45.0 },
] }

fn squat_parameters() -> Array[MotionParameterDefinition] { [
  { key: "stanceWidth", label: "站距", unit: "倍髋宽", minimum: 0.8, maximum: 1.8, step: 0.05, initial: 1.2 },
  { key: "toeAngle", label: "脚尖外展", unit: "°", minimum: 0.0, maximum: 35.0, step: 5.0, initial: 20.0 },
  { key: "squatDepth", label: "下蹲幅度", unit: "%", minimum: 60.0, maximum: 110.0, step: 5.0, initial: 100.0 },
] }

pub fn catalog() -> Array[MotionDefinition] { [
  {
    id: "push_up", title: "俯卧撑", aliases: ["俯卧撑", "卧撑", "push-up", "push up"], duration: 4.0,
    muscles: ["胸部", "肩部", "上臂后侧"], structure_pattern: "pectoralis major/deltoid/triceps brachii/serratus anterior",
    parameters: push_up_parameters(),
    presets: [
      { title: "窄距", values: [{ key: "handWidth", value: 0.85 }, { key: "elbowAngle", value: 25.0 }] },
      { title: "标准", values: [{ key: "handWidth", value: 1.5 }, { key: "elbowAngle", value: 45.0 }] },
      { title: "宽距", values: [{ key: "handWidth", value: 1.8 }, { key: "elbowAngle", value: 60.0 }] },
    ],
  },
  {
    id: "squat", title: "深蹲", aliases: ["深蹲", "squat"], duration: 4.4,
    muscles: ["大腿前侧", "臀部", "大腿后侧"], structure_pattern: "rectus femoris/vastus/gluteus/biceps femoris/semitendinosus/semimembranosus",
    parameters: squat_parameters(),
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
] }

pub fn definition(id : String) -> MotionDefinition? {
  for motion in catalog() { if motion.id == id { return Some(motion) } }
  None
}

fn parameter_value(values : Array[MotionParameterValue], key : String, fallback : Double) -> Double {
  for item in values { if item.key == key { return item.value } }
  fallback
}
