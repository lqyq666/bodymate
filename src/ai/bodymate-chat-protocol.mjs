import { guardCommand, guardLookup } from './agent-guard.mjs';

const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_ITEMS = 6;
const MAX_REPLY_LENGTH = 600;
const MAX_QUERY_LENGTH = 80;

export class ChatProtocolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const text = (value, maximum) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const actionNone = () => Object.freeze({ kind: 'none' });

function parameterDefinitions(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  const unique = new Set(), fields = [];
  for (const raw of value) {
    const key = text(raw?.key, 64);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key) || unique.has(key)) continue;
    unique.add(key);
    fields.push(Object.freeze({
      key,
      label: text(raw.label, 80) || key,
      unit: text(raw.unit, 24),
      min: finite(raw.min) ? raw.min : undefined,
      max: finite(raw.max) ? raw.max : undefined,
      step: finite(raw.step) ? raw.step : undefined,
    }));
  }
  return Object.freeze(fields);
}

function parametersFor(input, fields) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return Object.freeze({});
  const values = {};
  for (const field of fields) if (finite(input[field.key])) values[field.key] = input[field.key];
  return Object.freeze(values);
}

function presetsFor(value, fields) {
  if (!Array.isArray(value)) return Object.freeze([]);
  const presets = [];
  for (const raw of value.slice(0, 8)) {
    const title = text(raw?.title, 80);
    if (!title) continue;
    presets.push(Object.freeze({ title, parameters: parametersFor(raw.parameters, fields) }));
  }
  return Object.freeze(presets);
}

export function normalizeCatalog(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  const ids = new Set(), catalog = [];
  for (const raw of value.slice(0, 12)) {
    const id = text(raw?.id, 64);
    const title = text(raw?.title, 80);
    if (!/^[a-z][a-z0-9_]*$/.test(id) || !title || ids.has(id)) continue;
    ids.add(id);
    const parameters = parameterDefinitions(raw.parameters);
    catalog.push(Object.freeze({ id, title, parameters, presets: presetsFor(raw.presets, parameters) }));
  }
  return Object.freeze(catalog);
}

function historyFor(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  const history = [];
  for (const raw of value.slice(-MAX_HISTORY_ITEMS)) {
    const role = raw?.role === 'assistant' ? 'assistant' : raw?.role === 'user' ? 'user' : '';
    const content = text(raw?.content, MAX_MESSAGE_LENGTH);
    if (role && content) history.push(Object.freeze({ role, content }));
  }
  return Object.freeze(history);
}

function contextFor(value, catalog) {
  const motionId = text(value?.motionId, 64);
  const motion = catalog.find((candidate) => candidate.id === motionId);
  if (!motion) return Object.freeze({ motionId: '', parameters: Object.freeze({}) });
  return Object.freeze({ motionId, parameters: parametersFor(value?.parameters, motion.parameters) });
}

export function normalizeChatRequest(value) {
  const message = text(value?.message, MAX_MESSAGE_LENGTH);
  if (!message) throw new ChatProtocolError('invalid_request', '请输入想观察的动作或肌肉。');
  const catalog = normalizeCatalog(value?.catalog);
  return Object.freeze({
    message,
    catalog,
    history: historyFor(value?.history),
    context: contextFor(value?.context, catalog),
  });
}

export function buildChatMessages(request) {
  const capabilities = request.catalog.map((motion) => ({
    id: motion.id,
    title: motion.title,
    parameters: motion.parameters,
    presets: motion.presets,
  }));
  const system = [
    '你是 BodyMate 人体动作实验室的中文对话助手。',
    '只能讨论当前提供的动作和肌肉观察能力；不得给出医疗诊断、疼痛判断、受伤处理、训练处方或实测发力结论。',
    '当用户要求演示已支持动作时，可选择 action.kind="motion"；动作会由本地 MoonBit 目录再次校验后播放，并以定性视觉提示高亮相关参与肌群。',
    '当用户只想定位肌肉时，可选择 action.kind="muscle" 并给出简短的本地检索词。',
    '不能选择未提供的动作，不能要求浏览器执行任何其他操作。回复保持简短、清楚、中文。',
    '只返回一个 JSON 对象，形如 {"reply":"...","action":{"kind":"none"}}。',
    '动作示例：{"reply":"正在演示俯卧撑。","action":{"kind":"motion","id":"push_up","parameters":{"handWidth":1.5}}}。',
    '肌肉示例：{"reply":"已定位胸大肌。","action":{"kind":"muscle","query":"胸大肌"}}。',
    `可用动作目录：${JSON.stringify(capabilities)}`,
  ].join('\n');
  const current = request.context.motionId
    ? `当前动作状态：${JSON.stringify(request.context)}`
    : '当前没有正在播放的动作。';
  return Object.freeze([
    Object.freeze({ role: 'system', content: system }),
    ...request.history,
    Object.freeze({ role: 'user', content: `${current}\n用户问题：${request.message}` }),
  ]);
}

function jsonFromModel(content) {
  const source = text(content, 8_000);
  const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : source);
}

function actionFor(value, catalog) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return actionNone();
  if (value.kind === 'motion') {
    const guarded = guardCommand(value.id, value.parameters, catalog.map((motion) => ({ id: motion.id, fields: motion.parameters.map((field) => field.key) })));
    return guarded ? Object.freeze({ kind: 'motion', id: guarded.id, parameters: Object.freeze(guarded.parameters) }) : actionNone();
  }
  if (value.kind === 'muscle') {
    const query = guardLookup(value.query, MAX_QUERY_LENGTH);
    return query ? Object.freeze({ kind: 'muscle', query }) : actionNone();
  }
  return actionNone();
}

export function normalizeAssistantResponse(content, catalog) {
  let parsed;
  try { parsed = jsonFromModel(content); } catch { return Object.freeze({ reply: '我没有取得可用的结构化答复，请换一种说法。', action: actionNone() }); }
  const reply = text(parsed?.reply, MAX_REPLY_LENGTH) || '我已理解你的问题，可以选择一个当前支持的动作或肌肉继续观察。';
  return Object.freeze({ reply, action: actionFor(parsed.action, catalog) });
}
