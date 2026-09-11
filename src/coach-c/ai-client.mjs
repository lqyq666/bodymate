import { neckRegistry } from '../anatomy/neck-registry.mjs';
import { isValidCoachActionContract } from './structure-finder.mjs';

const entriesById = new Map(neckRegistry.map((entry) => [entry.structureId, entry]));
const allowedClassifications = new Set(['STRUCTURE_LOOKUP', 'DOMAIN_COMMAND']);
const allowedResolutions = new Set(['EXACT', 'AMBIGUOUS', 'NO_MATCH']);
const candidateFor = (entry) => Object.freeze({ structureId: entry.structureId, displayNameZh: entry.displayNameZh, canonicalName: entry.canonicalName, side: entry.side, region: entry.region, uiGroup: entry.uiGroup });
const messageFor = (resolution, candidates) => resolution === 'EXACT' ? `找到：${candidates[0]?.displayNameZh || '结构'}。` : resolution === 'AMBIGUOUS' ? `这里可能对应 ${candidates.length} 块结构，选一块看看。` : '当前真实模型还没有覆盖这个结构。';

export function normalizeAiResolution(payload) {
  const value = payload?.result || payload;
  if (!value || !allowedClassifications.has(value.classification) || !allowedResolutions.has(value.resolution)) return null;
  const ids = Array.isArray(value.candidates) ? value.candidates.map((candidate) => typeof candidate === 'string' ? candidate : candidate?.structureId) : [];
  if (new Set(ids).size !== ids.length || ids.some((id) => !entriesById.has(id))) return null;
  const candidates = ids.map((id) => candidateFor(entriesById.get(id))).slice(0, 6);
  const action = value.action ? { ...value.action, schemaVersion: 1, source: 'ai-resolver' } : null;
  if (value.resolution === 'EXACT') {
    if (!action || action.action !== 'SELECT_STRUCTURE' || !isValidCoachActionContract(action) || candidates.length > 1 || candidates.some((candidate) => candidate.structureId !== action.structureId)) return null;
    const selected = candidateFor(entriesById.get(action.structureId));
    return Object.freeze({ classification: value.classification, resolution: 'EXACT', action, candidates: Object.freeze([selected]), confidence: action.confidence, message: messageFor('EXACT', [selected]) });
  }
  if (value.resolution === 'AMBIGUOUS') {
    if (!action || action.action !== 'FIND_STRUCTURE' || !isValidCoachActionContract(action) || candidates.length < 2) return null;
    return Object.freeze({ classification: value.classification, resolution: 'AMBIGUOUS', action, candidates: Object.freeze(candidates), confidence: action.confidence, message: messageFor('AMBIGUOUS', candidates) });
  }
  if (action || candidates.length) return null;
  return Object.freeze({ classification: value.classification, resolution: 'NO_MATCH', action: null, candidates: Object.freeze([]), confidence: 0, message: messageFor('NO_MATCH', []) });
}

export function isAiEligible(local) { return local?.classification === 'STRUCTURE_LOOKUP' && ['AMBIGUOUS', 'NO_MATCH'].includes(local.resolution); }

export function createLatestAiRouter({ bridgeUrl, request, applyLocal, applyAi, onStatus = () => {} }) {
  let latest = 0, active = null;
  return Object.freeze({
    async resolve({ text, local, selectedStructureId = null }) {
      if (!bridgeUrl || !isAiEligible(local)) { applyLocal(local, text); return 'local'; }
      active?.abort(); const requestId = ++latest; const controller = new AbortController(); active = controller;
      onStatus('loading');
      try {
        const response = await request(bridgeUrl, { text, context: { selectedStructureId } }, controller.signal);
        if (requestId !== latest) return 'stale';
        const normalized = normalizeAiResolution(response);
        if (!normalized) throw Error('invalid_ai_resolution');
        applyAi(normalized, text); onStatus('ready'); return 'ai';
      } catch (error) {
        if (requestId !== latest || error?.name === 'AbortError') return 'stale';
        applyLocal(local, text); onStatus('fallback'); return 'fallback';
      }
    },
  });
}
