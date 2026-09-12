// UI ranges are limits of this educational rig, not exercise prescriptions.
export const parameterDefinitions = Object.freeze({
  push_up: [
    { key: 'handWidth', label: '手距', unit: '倍肩宽', min: .8, max: 1.8, step: .05, initial: 1.5 },
    { key: 'elbowAngle', label: '底部肘部外展', unit: '°', min: 15, max: 70, step: 5, initial: 45 },
  ],
  squat: [
    { key: 'stanceWidth', label: '站距', unit: '倍髋宽', min: .8, max: 1.8, step: .05, initial: 1.2 },
    { key: 'toeAngle', label: '脚尖外展', unit: '°', min: 0, max: 35, step: 5, initial: 20 },
    { key: 'squatDepth', label: '下蹲幅度', unit: '%', min: 60, max: 110, step: 5, initial: 100 },
  ],
  curl: [],
});
export const motionPresets = Object.freeze({
  push_up: [
    { title: '窄距', parameters: { handWidth: .85, elbowAngle: 25 } },
    { title: '标准', parameters: { handWidth: 1.5, elbowAngle: 45 } },
    { title: '宽距', parameters: { handWidth: 1.8, elbowAngle: 60 } },
  ],
  squat: [
    { title: '窄站距', parameters: { stanceWidth: .8, toeAngle: 10, squatDepth: 100 } },
    { title: '标准', parameters: { stanceWidth: 1.2, toeAngle: 20, squatDepth: 100 } },
    { title: '宽站距', parameters: { stanceWidth: 1.8, toeAngle: 30, squatDepth: 100 } },
  ],
  curl: [],
});

export function normalizeMotionParameters(id, input = {}) {
  const definitions = parameterDefinitions[id];
  if (!definitions) throw Error(`Unknown motion parameters: ${id}`);
  const parameters = {}, notices = [];
  for (const field of definitions) {
    const supplied = input?.[field.key];
    const value = supplied === undefined || supplied === null || supplied === '' ? field.initial : Number(supplied);
    const finite = Number.isFinite(value) ? value : field.initial;
    const clamped = Math.max(field.min, Math.min(field.max, finite));
    parameters[field.key] = Number((Math.round((clamped - field.min) / field.step) * field.step + field.min).toFixed(2));
    if (supplied !== undefined && (!Number.isFinite(value) || Math.abs(parameters[field.key] - value) > .0001)) {
      notices.push(`${field.label}已调整为 ${parameters[field.key]}${field.unit}（本模型演示范围 ${field.min}–${field.max}${field.unit}）。`);
    }
  }
  return { parameters, notices };
}

export function parseMotionParameters(id, query, base = {}) {
  const input = { ...base }, text = String(query).normalize('NFKC');
  let recognized = false;
  const preset = /窄距|窄站距|窄脚距/.test(text) ? 0 : /宽距|宽站距|宽脚距/.test(text) ? 2 : /标准/.test(text) ? 1 : -1;
  if (preset >= 0 && motionPresets[id]?.[preset]) { Object.assign(input, motionPresets[id][preset].parameters); recognized = true; }
  const value = '\\s*(?:调整为|调整到|调到|改成|设为|为|到|是|[:：=])?\\s*(-?\\d+(?:\\.\\d+)?)\\s*';
  const patterns = id === 'push_up' ? [
    ['handWidth', `(?:手距|两手间距|双手间距|手间距)${value}倍(?!\\s*髋宽)\\s*(?:肩宽)?`],
    ['elbowAngle', `(?:肘部外展(?:角度|角)?|肘部夹角|肘角|上臂与躯干夹角|夹角)${value}(?:度|°)`],
  ] : id === 'squat' ? [
    ['stanceWidth', `(?:站距|脚距|脚间距|双脚间距|两脚间距)${value}倍(?!\\s*肩宽)\\s*(?:髋宽)?`],
    ['toeAngle', `(?:脚尖外展(?:角度|角)?|脚尖角度|脚尖角|脚尖外撇|外撇)${value}(?:度|°)`],
    ['squatDepth', `(?:下蹲幅度|下蹲深度|幅度|深度)${value}%`],
  ] : [];
  for (const [key, pattern] of patterns) {
    if (key === 'elbowAngle' && /地面夹角|躯干倾斜|身体倾斜|手腕夹角/.test(text)) continue;
    const match = text.match(new RegExp(pattern));
    if (match) { input[key] = Number(match[1]); recognized = true; }
  }
  const normalized = normalizeMotionParameters(id, input);
  // Never imply that a recognised action means arbitrary instructions were executed.
  const unsupported = /抬高|负重|单手|单脚|单腿|倾斜|手腕角|手腕夹角|掌心角|地面夹角/.test(text);
  if (unsupported) normalized.notices.push('本次只应用面板中的参数；抬高、负重、单侧或其他角度尚未支持。');
  if (!recognized && /手距|站距|脚距|夹角|外展|外撇|深度|幅度/.test(text)) normalized.notices.push('未识别具体参数，暂用当前或默认值。可输入“手距1.2倍肩宽、夹角45度”或“站距1.5倍髋宽、脚尖外展20度、深度80%”。');
  return { ...normalized, recognized };
}

// Values below are authored colour weights, NOT EMG, force, or hypertrophy percentages.
// Evidence anchors support qualitative comparisons only; combinations are not measured.
export function muscleProfileForMotion(id, input = {}) {
  const { parameters: p } = normalizeMotionParameters(id, input);
  const group = (label, match, role, weight) => ({ label, match, role, weight });
  if (id === 'push_up') {
    const narrow = p.handWidth <= 1, wide = p.handWidth >= 1.6;
    return {
      groups: [group('胸部', 'pectoralis major', '主要参与', narrow ? 1 : wide ? .82 : .9),
        group('上臂后侧', 'triceps brachii', '主要参与', narrow ? 1 : wide ? .78 : .88),
        group('肩部', 'deltoid', '辅助参与', .55), group('肩胛与核心', 'serratus anterior|rectus abdominis|external oblique', '稳定参与', .35)],
      note: `${narrow ? '窄距研究中胸大肌与肱三头肌的肌电活动均可能提高。' : wide ? '宽距不等于胸肌参与一定更多。' : '胸部与上臂后侧共同参与，肩部和核心协同。'}肘部夹角与手距的组合未作受力定量；颜色是参与提示，不是实测。`,
      evidence: [{ url: 'https://pubmed.ncbi.nlm.nih.gov/16095413/', scope: 'Acute surface EMG, narrow versus wide hands; not a continuous angle or hypertrophy model.' }],
    };
  }
  if (id === 'squat') return {
    groups: [group('大腿前侧', 'rectus femoris|vastus', '主要参与', .95), group('臀部', 'gluteus maximus', '主要参与', p.stanceWidth >= 1.6 ? 1 : .85),
      group('大腿内侧', 'adductor (?:magnus|longus|brevis)', '辅助参与', .5),
      group('大腿后侧与核心', 'biceps femoris|semitendinosus|semimembranosus|gluteus medius|rectus abdominis|external oblique', '稳定参与', .35)],
    note: `${p.stanceWidth >= 1.6 ? '部分宽站距研究观察到臀大肌肌电增加，不能据此预测增肌。' : '大腿前侧与臀部共同参与。'}脚尖角度和深度会改变姿态；这里不将它们换算成单块肌肉受力百分比。`,
    evidence: [
      { url: 'https://pubmed.ncbi.nlm.nih.gov/19130646/', scope: 'Six experienced lifters, back squats at selected widths and loads; qualitative gluteus maximus trend only.' },
      { url: 'https://pubmed.ncbi.nlm.nih.gov/30026952/', scope: 'Stance and foot angle affect joint motion and moments, not measured individual muscle forces.' },
    ],
  };
  return { groups: [group('上臂前侧', 'biceps brachii|brachialis', '主要参与', 1), group('前臂', 'brachioradialis', '辅助参与', .6)], note: '红色表示预设参与肌群，不是实测肌电或肌肉受力。', evidence: [] };
}
