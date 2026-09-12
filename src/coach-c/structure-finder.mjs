import { neckRegistry } from '../anatomy/neck-registry.mjs';

export const coachActionNames = Object.freeze(['FIND_STRUCTURE', 'SELECT_STRUCTURE', 'ISOLATE_SELECTED', 'RESTORE_CONTEXT', 'SHOW_REGION', 'HIGHLIGHT_STRUCTURE_SET', 'CLEAR_STRUCTURE_SET', 'SHOW_MOVEMENT_MAPPING', 'SHOW_MOVEMENT_COMPARISON']);
const actionNames = new Set(coachActionNames);
const entriesById = new Map(neckRegistry.map((entry) => [entry.structureId, entry]));
const candidateFor = (entry) => Object.freeze({ structureId: entry.structureId, displayNameZh: entry.displayNameZh, canonicalName: entry.canonicalName, side: entry.side, region: entry.region, uiGroup: entry.uiGroup });
const messageFor = (code, candidates, structureSet = null, movement = null, comparison = null) => ({ exact: `找到：${candidates[0]?.displayNameZh ?? '结构'}。`, structure_set: `已高亮${structureSet?.label ?? '结构集合'}（${structureSet?.members.length ?? 0} 块），焦点为${structureSet?.members[0]?.displayNameZh ?? '当前结构'}。`, movement: `${movement?.label ?? '该动作'}：当前模型覆盖 ${movement?.mappings.length ?? 0} 个参与结构。`, comparison: `${comparison?.label ?? '这两个动作'}：将在当前模型覆盖范围内比较共同与各自映射结构。`, ambiguous: `这里可能对应 ${candidates.length} 块结构，选一块看看。`, uncovered: '目前真实模型只覆盖颈肩的 14 块结构，可以换个位置或名称试试。', health: '这里目前用于认识结构，不提供诊断或治疗建议。', isolate: '现在只显示当前结构。', restore: '周围结构已恢复。', empty: '输入一个颈肩结构名称、位置，或试试“只看这块”。' }[code] ?? '当前输入无法映射到已覆盖的结构。');

export function isValidCoachActionContract(next) {
  if (!next || next.schemaVersion !== 1 || next.source !== 'moonbit-domain' || !actionNames.has(next.action) || !Number.isFinite(next.confidence) || next.confidence < 0 || next.confidence > 1) return false;
  if (next.action === 'SELECT_STRUCTURE') return entriesById.has(next.structureId);
  if (next.action === 'HIGHLIGHT_STRUCTURE_SET') return typeof next.structureId === 'string' && next.structureSet && next.structureSet.id === next.structureId && typeof next.structureSet.label === 'string' && Array.isArray(next.structureSet.members) && next.structureSet.members.length > 0 && new Set(next.structureSet.members.map((item) => item.structureId)).size === next.structureSet.members.length && next.structureSet.members.every((item, index) => entriesById.has(item.structureId) && ['focus', 'primary', 'secondary', 'context'].includes(item.role) && Number.isSafeInteger(item.weight) && (index !== 0 || item.role === 'focus'));
  if (next.action === 'SHOW_MOVEMENT_MAPPING') return typeof next.structureId === 'string' && next.movement?.id === next.structureId && typeof next.movement.label === 'string' && typeof next.movement.canonicalName === 'string' && typeof next.movement.coverageNote === 'string' && Array.isArray(next.movement.mappings) && next.movement.mappings.length > 0 && new Set(next.movement.mappings.map((item) => item.structureId)).size === next.movement.mappings.length && next.movement.mappings.every((item) => entriesById.has(item.structureId) && ['main_contributor', 'contributor'].includes(item.role) && Array.isArray(item.evidenceIds) && item.evidenceIds.length && item.evidenceIds.every((id) => typeof id === 'string' && id));
  if (next.action === 'SHOW_MOVEMENT_COMPARISON') return typeof next.structureId === 'string' && next.structureId.split(',').length === 2 && next.structureId.split(',').every(Boolean) && typeof next.comparison?.label === 'string';
  if (next.action === 'SHOW_REGION') return next.region === 'neck';
  return true;
}

export function parseMoonbitQueryResult(reply) {
  const fields = String(reply).split('|');
  if (fields.length === 13 && fields[0] === 'ok' && fields[1] === 'query-v3') return parseMoonbitQueryV3(fields);
  const isV1 = fields.length === 10 && fields[0] === 'ok' && fields[1] === 'query-v1';
  const isV2 = fields.length === 12 && fields[0] === 'ok' && fields[1] === 'query-v2';
  if (!isV1 && !isV2) return null;
  const [, , classification, resolution, actionName, structureId, setId = '', setLabel = '', region, confidenceRaw, candidateWire, messageCode] = isV2 ? fields : [...fields.slice(0, 6), '', '', ...fields.slice(6)];
  if (!['STRUCTURE_LOOKUP', 'DOMAIN_COMMAND', 'UNSUPPORTED_HEALTH_QUERY', 'UNKNOWN'].includes(classification) || !['EXACT', 'AMBIGUOUS', 'NO_MATCH'].includes(resolution)) return null;
  const ids = candidateWire ? candidateWire.split(',') : [];
  if (new Set(ids).size !== ids.length || ids.some((id) => !entriesById.has(id))) return null;
  const candidates = Object.freeze(ids.map((id) => candidateFor(entriesById.get(id))));
  const confidence = Number(confidenceRaw);
  const structureSet = setId ? Object.freeze({ id: setId, label: setLabel, members: candidates.map((candidate, index) => Object.freeze({ ...candidate, role: index === 0 ? 'focus' : 'secondary', weight: 100 - index * 10 })) }) : null;
  const action = actionName === 'UNKNOWN' ? null : Object.freeze({ schemaVersion: 1, action: actionName, ...(structureId ? { structureId } : {}), ...(region ? { region } : {}), ...(structureSet ? { structureSet } : {}), confidence, source: 'moonbit-domain' });
  if (action && !isValidCoachActionContract(action)) return null;
  if (resolution === 'EXACT' && classification === 'STRUCTURE_LOOKUP' && action?.action === 'SELECT_STRUCTURE' && (candidates.length !== 1 || candidates[0].structureId !== action.structureId)) return null;
  if (resolution === 'EXACT' && classification === 'STRUCTURE_LOOKUP' && action?.action !== 'SELECT_STRUCTURE' && action?.action !== 'HIGHLIGHT_STRUCTURE_SET') return null;
  if (resolution === 'AMBIGUOUS' && (!action || action.action !== 'FIND_STRUCTURE' || candidates.length < 2)) return null;
  if (action?.action === 'HIGHLIGHT_STRUCTURE_SET' && (!structureSet || !setLabel || resolution !== 'EXACT')) return null;
  if (resolution === 'NO_MATCH' && (action || candidates.length)) return null;
  return Object.freeze({ classification, resolution, action, candidates, structureSet, confidence: Number.isFinite(confidence) ? confidence : 0, message: messageFor(messageCode, candidates, structureSet) });
}

function parseMoonbitQueryV3(fields) {
  const [, , classification, resolution, actionName, structureId, label, region, confidenceRaw, messageCode, canonicalName, coverageNote, membersWire] = fields;
  if (!['STRUCTURE_LOOKUP', 'STRUCTURE_SET_LOOKUP', 'MOVEMENT_LOOKUP', 'MOVEMENT_COMPARISON', 'DOMAIN_COMMAND', 'UNSUPPORTED_HEALTH_QUERY', 'UNKNOWN'].includes(classification) || !['EXACT', 'AMBIGUOUS', 'NO_MATCH'].includes(resolution)) return null;
  const confidence = Number(confidenceRaw);
  const parseCandidates = () => membersWire ? membersWire.split(',').map((item) => { const id = item.split('^')[0]; return entriesById.get(id) ? candidateFor(entriesById.get(id)) : null; }) : [];
  const parseSet = () => membersWire ? membersWire.split('~').map((item) => { const [id, role, weightRaw] = item.split('^'), weight = Number(weightRaw); const entry = entriesById.get(id); return entry && ['focus', 'primary', 'secondary', 'context'].includes(role) ? Object.freeze({ ...candidateFor(entry), role, weight: Number.isSafeInteger(weight) ? weight : role === 'focus' ? 100 : 70 }) : null; }) : [];
  const parseMovement = () => membersWire ? membersWire.split('~').map((item) => { const [id, role, evidenceWire] = item.split('^'), entry = entriesById.get(id), evidenceIds = evidenceWire ? evidenceWire.split(',') : []; return entry && ['main_contributor', 'contributor'].includes(role) && evidenceIds.length && evidenceIds.every(Boolean) ? Object.freeze({ ...candidateFor(entry), role, evidenceIds: Object.freeze(evidenceIds) }) : null; }) : [];
  let candidates = [], structureSet = null, movement = null, comparison = null;
  if (classification === 'MOVEMENT_LOOKUP') { const mappings = parseMovement(); if (!label || !canonicalName || !coverageNote || mappings.includes(null) || !mappings.length) return null; movement = Object.freeze({ id: structureId, label, canonicalName, coverageNote, mappings: Object.freeze(mappings) }); }
  else if (classification === 'MOVEMENT_COMPARISON') { if (!label || !coverageNote || structureId.split(',').length !== 2) return null; comparison = Object.freeze({ ids: Object.freeze(structureId.split(',')), label, coverageNote }); }
  else if (classification === 'STRUCTURE_SET_LOOKUP') { const members = parseSet(); if (!label || !structureId || members.includes(null) || !members.length || members[0].role !== 'focus') return null; structureSet = Object.freeze({ id: structureId, label, members: Object.freeze(members) }); candidates = structureSet.members; }
  else { candidates = parseCandidates(); if (candidates.includes(null) || new Set(candidates.map((item) => item.structureId)).size !== candidates.length) return null; candidates = Object.freeze(candidates); }
  const action = actionName === 'UNKNOWN' ? null : Object.freeze({ schemaVersion: 1, action: actionName, ...(structureId ? { structureId } : {}), ...(region ? { region } : {}), ...(structureSet ? { structureSet } : {}), ...(movement ? { movement } : {}), ...(comparison ? { comparison } : {}), confidence, source: 'moonbit-domain' });
  if (action && !isValidCoachActionContract(action)) return null;
  if (classification === 'MOVEMENT_LOOKUP' && (resolution !== 'EXACT' || action?.action !== 'SHOW_MOVEMENT_MAPPING')) return null;
  if (classification === 'MOVEMENT_COMPARISON' && (resolution !== 'EXACT' || action?.action !== 'SHOW_MOVEMENT_COMPARISON')) return null;
  if (classification === 'STRUCTURE_SET_LOOKUP' && (resolution !== 'EXACT' || action?.action !== 'HIGHLIGHT_STRUCTURE_SET')) return null;
  if (classification === 'STRUCTURE_LOOKUP' && resolution === 'EXACT' && action?.action === 'SELECT_STRUCTURE' && (candidates.length !== 1 || candidates[0].structureId !== structureId)) return null;
  if (resolution === 'AMBIGUOUS' && (!action || action.action !== 'FIND_STRUCTURE' || candidates.length < 2)) return null;
  if (resolution === 'NO_MATCH' && (action || candidates.length || structureSet || movement || comparison)) return null;
  return Object.freeze({ classification, resolution, action, candidates, structureSet, movement, comparison, confidence: Number.isFinite(confidence) ? confidence : 0, message: messageFor(messageCode, candidates, structureSet, movement, comparison) });
}

export function resolveCoachQuery(text, { core = globalThis } = {}) {
  const resolver = core?.bodymate_domain_resolve_query_v3 || core?.bodymate_domain_resolve_query_v2;
  return typeof resolver === 'function' ? parseMoonbitQueryResult(resolver(String(text ?? ''))) : null;
}

// The renderer receives a validated snapshot only after MoonBit accepts the transition.
export function executeCoachAction(next, { core = globalThis, onAccepted = () => {} } = {}) {
  if (!isValidCoachActionContract(next) || typeof core?.bodymate_domain_execute_action_v1 !== 'function') return false;
  const reply = String(core.bodymate_domain_execute_action_v1(next.action, next.structureId ?? '', next.region ?? ''));
  if (!reply.startsWith('ok|')) return false;
  onAccepted(reply, next);
  return true;
}
