import { neckRegistry } from '../anatomy/neck-registry.mjs';

export const coachActionNames = Object.freeze(['FIND_STRUCTURE', 'SELECT_STRUCTURE', 'ISOLATE_SELECTED', 'RESTORE_CONTEXT', 'SHOW_REGION']);
const actionNames = new Set(coachActionNames);

const normalize = (value = '') => String(value).normalize('NFKC').toLocaleLowerCase()
  .replace(/[，、。！？!?;；:：()（）\[\]{}"'`~_\-./\\]/g, ' ')
  .replace(/\s+/g, ' ').trim();
const compact = (value = '') => normalize(value).replace(/\s/g, '');

const familyFor = (entry) => {
  if (entry.structureId.includes('.sternocleidomastoid.')) return 'scm';
  if (entry.structureId.includes('.trapezius.')) return 'trapezius';
  if (entry.structureId.includes('.levator-scapulae.')) return 'levator';
  if (entry.structureId.includes('.scalene.')) return 'scalene';
  if (entry.structureId.includes('.splenius.')) return 'splenius';
  return 'other';
};

// Search hints are deliberately product-facing labels, not a medical knowledge base.
const searchHints = Object.freeze({
  scm: Object.freeze({ terms: ['胸锁乳突肌', 'sternocleidomastoid', 'scm'], locations: ['颈前外侧', '脖子侧面', 'neck side'] }),
  trapezius: Object.freeze({ terms: ['斜方肌', 'trapezius', 'upper trap'], locations: ['肩颈', '肩上', 'upper shoulder'] }),
  levator: Object.freeze({ terms: ['肩胛提肌', 'levator scapulae', 'levator'], locations: ['肩胛上角', '颈肩后侧'] }),
  scalene: Object.freeze({ terms: ['斜角肌', 'scalene', 'scalenus'], locations: ['颈侧深层', '脖子侧面', 'neck side'] }),
  splenius: Object.freeze({ terms: ['头夹肌', 'splenius capitis', 'splenius'], locations: ['颈后侧', '后颈'] }),
});

const sideFor = (input) => {
  const text = normalize(input);
  const right = /右(?:侧|边)?/.test(text) || /(?:^|\s)(?:right|r)(?:\s|$)/.test(text);
  const left = /左(?:侧|边)?/.test(text) || /(?:^|\s)(?:left|l)(?:\s|$)/.test(text);
  return right === left ? null : right ? 'right' : 'left';
};
const withoutSide = (input) => normalize(input)
  .replace(/右侧|右边|左侧|左边|右|左/g, '')
  .replace(/(?:^|\s)(?:right|left|r|l)(?=\s|$)/g, ' ')
  .replace(/\s+/g, ' ').trim();
const includesHint = (input, hints) => hints.some((hint) => normalize(input).includes(normalize(hint)) || compact(input).includes(compact(hint)));
const candidateFor = (entry) => Object.freeze({ structureId: entry.structureId, displayNameZh: entry.displayNameZh, canonicalName: entry.canonicalName, side: entry.side, region: entry.region, uiGroup: entry.uiGroup });
const rankCandidates = (entries, side) => entries
  .filter((entry) => !side || entry.side === side)
  .sort((a, b) => (a.side === b.side ? a.structureId.localeCompare(b.structureId) : a.side === 'right' ? -1 : 1))
  .map(candidateFor)
  .slice(0, 6);
const action = (name, fields = {}) => Object.freeze({ schemaVersion: 1, action: name, confidence: fields.confidence ?? 1, source: 'local-resolver', ...(fields.structureId ? { structureId: fields.structureId } : {}), ...(fields.region ? { region: fields.region } : {}) });
const result = ({ classification, resolution, action: nextAction = null, candidates = [], confidence = 0, message }) => Object.freeze({ classification, resolution, action: nextAction, candidates: Object.freeze(candidates), confidence, message });

export function isValidCoachActionContract(next) {
  if (!next || next.schemaVersion !== 1 || !['local-resolver', 'ai-resolver'].includes(next.source) || !actionNames.has(next.action) || !Number.isFinite(next.confidence) || next.confidence < 0 || next.confidence > 1) return false;
  if (next.action === 'SELECT_STRUCTURE') return typeof next.structureId === 'string' && neckRegistry.some((entry) => entry.structureId === next.structureId);
  if (next.action === 'SHOW_REGION') return typeof next.region === 'string';
  return true;
}

// This is intentionally only an execution seam. The page controller supplies MoonBit-backed methods.
export function executeCoachAction(next, controller) {
  if (!isValidCoachActionContract(next) || !controller) return false;
  if (next.action === 'SELECT_STRUCTURE') return Boolean(controller.selectStructure?.(next.structureId));
  if (next.action === 'ISOLATE_SELECTED') return Boolean(controller.isolateSelected?.());
  if (next.action === 'RESTORE_CONTEXT') return Boolean(controller.restoreContext?.());
  if (next.action === 'SHOW_REGION') return Boolean(controller.showRegion?.(next.region));
  return false;
}

function healthResult() {
  return result({ classification: 'UNSUPPORTED_HEALTH_QUERY', resolution: 'NO_MATCH', confidence: 1, message: '这里目前用于认识结构，不提供诊断或治疗建议。' });
}

function commandResult(input) {
  if (includesHint(input, ['只看这块', '只显示这块', '单独看', 'isolate'])) return result({ classification: 'DOMAIN_COMMAND', resolution: 'EXACT', action: action('ISOLATE_SELECTED'), confidence: 1, message: '现在只显示当前结构。' });
  if (includesHint(input, ['显示周围', '恢复周围', '全部显示', 'restore'])) return result({ classification: 'DOMAIN_COMMAND', resolution: 'EXACT', action: action('RESTORE_CONTEXT'), confidence: 1, message: '周围结构已恢复。' });
  return null;
}

function familyMatches(input) {
  const normalized = withoutSide(input);
  return Object.entries(searchHints)
    .filter(([, hints]) => includesHint(normalized, hints.terms))
    .map(([family]) => family);
}

function exactEntry(input, side, families) {
  const normalized = normalize(input), compacted = compact(input);
  const direct = neckRegistry.find((entry) => normalized === normalize(entry.structureId)
    || compacted === compact(entry.structureId)
    || normalized === normalize(entry.displayNameZh)
    || normalized === normalize(entry.canonicalName));
  if (direct) return direct;
  const specific = neckRegistry.filter((entry) => families.includes(familyFor(entry)) && (!side || entry.side === side));
  return specific.length === 1 ? specific[0] : null;
}

export function resolveCoachQuery(text, context = {}) {
  const input = normalize(text);
  if (!input) return result({ classification: 'UNKNOWN', resolution: 'NO_MATCH', confidence: 0, message: '输入一个颈肩结构名称、位置，或试试“只看这块”。' });
  if (includesHint(input, ['疼', '痛', '受伤', '炎', '病', '麻', '治疗', '康复', '处方', '诊断', 'pain', 'injury', 'diagnose', 'treatment', 'rehab'])) return healthResult();
  const command = commandResult(input);
  if (command) return command;

  const side = sideFor(input), families = familyMatches(input);
  const direct = exactEntry(input, side, families);
  if (direct) return result({ classification: 'STRUCTURE_LOOKUP', resolution: 'EXACT', action: action('SELECT_STRUCTURE', { structureId: direct.structureId }), confidence: 1, message: `找到：${direct.displayNameZh}。` });

  const hasLocation = Object.values(searchHints).some((hints) => includesHint(input, hints.locations));
  let entries = families.length ? neckRegistry.filter((entry) => families.includes(familyFor(entry))) : [];
  if (!entries.length && hasLocation) entries = neckRegistry.filter((entry) => entry.region === 'neck' && ['scm', 'scalene'].includes(familyFor(entry)));
  if (!entries.length && side && /颈|脖|neck/.test(input)) entries = neckRegistry.filter((entry) => entry.region === 'neck' && ['scm', 'scalene'].includes(familyFor(entry)));
  const candidates = rankCandidates(entries, side);
  if (candidates.length) return result({ classification: 'STRUCTURE_LOOKUP', resolution: 'AMBIGUOUS', action: action('FIND_STRUCTURE', { confidence: .72 }), candidates, confidence: .72, message: `这里可能对应 ${candidates.length} 块结构，选一块看看。` });

  return result({ classification: 'STRUCTURE_LOOKUP', resolution: 'NO_MATCH', confidence: 0, message: '目前真实模型只覆盖颈肩的 14 块结构，可以换个位置或名称试试。' });
}
