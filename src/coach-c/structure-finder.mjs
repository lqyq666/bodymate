import { neckRegistry } from '../anatomy/neck-registry.mjs';

export const coachActionNames = Object.freeze(['FIND_STRUCTURE', 'SELECT_STRUCTURE', 'ISOLATE_SELECTED', 'RESTORE_CONTEXT', 'SHOW_REGION']);
const actionNames = new Set(coachActionNames);
const entriesById = new Map(neckRegistry.map((entry) => [entry.structureId, entry]));
const candidateFor = (entry) => Object.freeze({ structureId: entry.structureId, displayNameZh: entry.displayNameZh, canonicalName: entry.canonicalName, side: entry.side, region: entry.region, uiGroup: entry.uiGroup });
const messageFor = (code, candidates) => ({ exact: `找到：${candidates[0]?.displayNameZh ?? '结构'}。`, ambiguous: `这里可能对应 ${candidates.length} 块结构，选一块看看。`, uncovered: '目前真实模型只覆盖颈肩的 14 块结构，可以换个位置或名称试试。', health: '这里目前用于认识结构，不提供诊断或治疗建议。', isolate: '现在只显示当前结构。', restore: '周围结构已恢复。', empty: '输入一个颈肩结构名称、位置，或试试“只看这块”。' }[code] ?? '当前输入无法映射到已覆盖的结构。');

export function isValidCoachActionContract(next) {
  if (!next || next.schemaVersion !== 1 || next.source !== 'moonbit-domain' || !actionNames.has(next.action) || !Number.isFinite(next.confidence) || next.confidence < 0 || next.confidence > 1) return false;
  if (next.action === 'SELECT_STRUCTURE') return entriesById.has(next.structureId);
  if (next.action === 'SHOW_REGION') return next.region === 'neck';
  return true;
}

export function parseMoonbitQueryResult(reply) {
  const fields = String(reply).split('|');
  if (fields.length !== 10 || fields[0] !== 'ok' || fields[1] !== 'query-v1') return null;
  const [, , classification, resolution, actionName, structureId, region, confidenceRaw, candidateWire, messageCode] = fields;
  if (!['STRUCTURE_LOOKUP', 'DOMAIN_COMMAND', 'UNSUPPORTED_HEALTH_QUERY', 'UNKNOWN'].includes(classification) || !['EXACT', 'AMBIGUOUS', 'NO_MATCH'].includes(resolution)) return null;
  const ids = candidateWire ? candidateWire.split(',') : [];
  if (new Set(ids).size !== ids.length || ids.some((id) => !entriesById.has(id))) return null;
  const candidates = Object.freeze(ids.map((id) => candidateFor(entriesById.get(id))));
  const confidence = Number(confidenceRaw);
  const action = actionName === 'UNKNOWN' ? null : Object.freeze({ schemaVersion: 1, action: actionName, ...(structureId ? { structureId } : {}), ...(region ? { region } : {}), confidence, source: 'moonbit-domain' });
  if (action && !isValidCoachActionContract(action)) return null;
  if (resolution === 'EXACT' && classification === 'STRUCTURE_LOOKUP' && (!action || action.action !== 'SELECT_STRUCTURE' || candidates.length !== 1 || candidates[0].structureId !== action.structureId)) return null;
  if (resolution === 'AMBIGUOUS' && (!action || action.action !== 'FIND_STRUCTURE' || candidates.length < 2)) return null;
  if (resolution === 'NO_MATCH' && (action || candidates.length)) return null;
  return Object.freeze({ classification, resolution, action, candidates, confidence: Number.isFinite(confidence) ? confidence : 0, message: messageFor(messageCode, candidates) });
}

export function resolveCoachQuery(text, { core = globalThis } = {}) {
  const resolver = core?.bodymate_domain_resolve_query_v1;
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
