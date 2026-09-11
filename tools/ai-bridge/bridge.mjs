import { neckRegistry } from '../../src/anatomy/neck-registry.mjs';

const allowedActions = new Set(['FIND_STRUCTURE', 'SELECT_STRUCTURE', 'ISOLATE_SELECTED', 'RESTORE_CONTEXT', 'SHOW_REGION']);
const ids = new Set(neckRegistry.map((entry) => entry.structureId));
const maxTextLength = 600;
export class BridgeValidationError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = (code) => { throw new BridgeValidationError(code); };
const asJson = (raw) => { if (typeof raw === 'object' && raw) return raw; try { return JSON.parse(String(raw)); } catch { return fail('invalid_json'); } };
const safeContext = (context = {}) => ({ selectedStructureId: ids.has(context.selectedStructureId) ? context.selectedStructureId : null });
const action = (name, extra = {}) => ({ schemaVersion: 1, action: name, confidence: Number.isFinite(extra.confidence) ? Math.max(0, Math.min(1, extra.confidence)) : .75, source: 'ai-resolver', ...(extra.structureId ? { structureId: extra.structureId } : {}), ...(extra.region ? { region: extra.region } : {}) });

export function buildProviderPrompt() {
  const structures = neckRegistry.map((entry) => ({ structureId: entry.structureId, displayNameZh: entry.displayNameZh, canonicalName: entry.canonicalName, side: entry.side, group: entry.uiGroup }));
  return `You only resolve BodyMate anatomy queries. Return JSON only. Never provide prose, medical advice, JavaScript, URLs, tools, DOM selectors, renderer commands, or MoonBit commands. Use only the supplied structure IDs and actions. If uncertain return AMBIGUOUS candidates; never invent anatomy. Allowed actions: FIND_STRUCTURE, SELECT_STRUCTURE, ISOLATE_SELECTED, RESTORE_CONTEXT, SHOW_REGION. Registry: ${JSON.stringify(structures)}`;
}

export function normalizeProviderResult(raw) {
  const value = asJson(raw), classification = value.classification;
  if (!['STRUCTURE_LOOKUP', 'DOMAIN_COMMAND'].includes(classification) || !['EXACT', 'AMBIGUOUS', 'NO_MATCH'].includes(value.resolution)) fail('invalid_resolution');
  if (value.action && !allowedActions.has(value.action.action)) fail('disallowed_action');
  const candidateIds = Array.isArray(value.candidates) ? value.candidates.map((candidate) => typeof candidate === 'string' ? candidate : candidate?.structureId) : [];
  if (new Set(candidateIds).size !== candidateIds.length || candidateIds.length > 6 || candidateIds.some((id) => !ids.has(id))) fail('unknown_structure');
  if (value.resolution === 'EXACT') {
    if (value.action?.action !== 'SELECT_STRUCTURE' || !ids.has(value.action.structureId) || candidateIds.some((id) => id !== value.action.structureId) || candidateIds.length > 1) fail('invalid_exact');
    return Object.freeze({ schemaVersion: 1, classification, resolution: 'EXACT', action: action('SELECT_STRUCTURE', { structureId: value.action.structureId, confidence: value.action.confidence }), candidates: [value.action.structureId] });
  }
  if (value.resolution === 'AMBIGUOUS') {
    if (value.action?.action !== 'FIND_STRUCTURE' || candidateIds.length < 2) fail('invalid_ambiguous');
    return Object.freeze({ schemaVersion: 1, classification, resolution: 'AMBIGUOUS', action: action('FIND_STRUCTURE', { confidence: value.action.confidence }), candidates: candidateIds });
  }
  if (value.action || candidateIds.length) fail('invalid_no_match');
  return Object.freeze({ schemaVersion: 1, classification, resolution: 'NO_MATCH', action: null, candidates: [] });
}

export function configFromEnv(env = process.env) {
  const baseUrl = String(env.BODYMATE_AI_BASE_URL || '').replace(/\/$/, ''), apiKey = String(env.BODYMATE_AI_API_KEY || ''), model = String(env.BODYMATE_AI_MODEL || '');
  if (!baseUrl || !apiKey || !model) return null;
  const timeoutMs = Math.min(15000, Math.max(8000, Number(env.BODYMATE_AI_TIMEOUT_MS) || 10000));
  return Object.freeze({ baseUrl, apiKey, model, timeoutMs });
}

export function createOpenAiCompatibleProvider(config, fetchImpl = fetch) {
  return Object.freeze({ name: 'openai-compatible', async resolve({ text, context, signal }) {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` }, signal, body: JSON.stringify({ model: config.model, temperature: 0, messages: [{ role: 'system', content: buildProviderPrompt() }, { role: 'user', content: JSON.stringify({ text, context }) }] }) });
    if (!response.ok) throw Object.assign(Error('provider_http'), { code: `http_${response.status}` });
    const body = await response.json(), content = body?.choices?.[0]?.message?.content;
    if (!content) throw Object.assign(Error('empty_provider_response'), { code: 'empty_response' });
    return content;
  } });
}

export function createAiBridge({ provider, timeoutMs = 10000, now = () => Date.now() }) {
  return Object.freeze({ async resolve({ text, context = {} }) {
    if (typeof text !== 'string' || !text.trim()) return { status: 400, body: { error: 'empty_text' } };
    if (text.length > maxTextLength) return { status: 413, body: { error: 'text_too_long' } };
    const started = now(), controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const raw = await provider.resolve({ text: text.trim(), context: safeContext(context), signal: controller.signal });
      const result = normalizeProviderResult(raw);
      return { status: 200, body: { result, meta: { provider: provider.name || 'configured', latencyMs: Math.max(0, now() - started), validation: 'accepted' } } };
    } catch (error) {
      const timeout = error?.name === 'AbortError'; const invalid = error instanceof BridgeValidationError;
      return { status: timeout ? 504 : invalid ? 422 : 502, body: { error: timeout ? 'provider_timeout' : invalid ? error.code : 'provider_unavailable', meta: { provider: provider.name || 'configured', latencyMs: Math.max(0, now() - started), validation: invalid ? 'rejected' : 'unavailable' } } };
    } finally { clearTimeout(timer); }
  } });
}

export const isAllowedBrowserOrigin = (origin) => /^https?:\/\/(127\.0\.0\.1|localhost)(?::\d+)?$/i.test(origin || '');
