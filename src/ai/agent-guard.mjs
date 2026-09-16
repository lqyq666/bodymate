// Thin adapter over the MoonBit agent guard (lqyq666/bodymate/agent) exposed by
// assets/runtime/moonbit-core.js. MoonBit decides which model-proposed actions survive
// (allowlisted ids, declared finite fields, bounds, bounded lookup text); this file only
// encodes the wire, so the server proxy and the browser share one rule set.
const core = globalThis;
const WIRE_UNSAFE = /[|^~,=:]/;

function call(name, ...args) {
  if (typeof core[name] !== 'function') throw Error(`MoonBit agent guard is unavailable: ${name}`);
  return core[name](...args);
}

function payload(wire, version) {
  const parts = String(wire).split('|');
  if (parts[0] !== 'ok' || parts[1] !== version) throw Error(`Invalid MoonBit ${version} response: ${wire}`);
  return parts.slice(2).join('|');
}

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

// A field is either a key string, { key, min?, max? } or { key, options };
// bounds travel as `key:min:max` (one-sided leaves the other side empty),
// enum options travel as `key?opt1?opt2` so MoonBit can clamp, reject or match.
function fieldWire(field) {
  const spec = typeof field === 'string' ? { key: field } : field || {};
  const key = String(spec.key ?? '');
  if (!key || WIRE_UNSAFE.test(key)) return '';
  if (Array.isArray(spec.options) && spec.options.length > 0) {
    const options = spec.options.map(String).filter((option) => !WIRE_UNSAFE.test(option));
    return options.length > 0 ? `${key}?${options.join('?')}` : '';
  }
  const min = finite(spec.min) ? String(spec.min) : '';
  const max = finite(spec.max) ? String(spec.max) : '';
  return min || max ? `${key}:${min}:${max}` : key;
}

// [{ id, fields }] -> "id^key:min:max,key~id^key"
export function allowlistWire(commands) {
  return (Array.isArray(commands) ? commands : [])
    .map((command) => ({ id: String(command?.id ?? ''), fields: Array.isArray(command?.fields) ? command.fields : [] }))
    .filter((command) => command.id && !WIRE_UNSAFE.test(command.id))
    .map((command) => `${command.id}^${command.fields.map(fieldWire).filter(Boolean).join(',')}`)
    .join('~');
}

// { key: number | string } -> "key=value,key~text"; other types never reach MoonBit.
export function fieldsWire(parameters) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) return '';
  return Object.entries(parameters)
    .filter(([key, value]) => (typeof value === 'number' || typeof value === 'string') && key && !WIRE_UNSAFE.test(key))
    .map(([key, value]) => (typeof value === 'number' ? `${key}=${String(value)}` : `${key}~${value}`))
    .join(',');
}

function decodeAction(body) {
  const [kind, ...rest] = body.split('|');
  if (kind === 'command') {
    const parameters = {};
    for (const pair of (rest[1] || '').split(',')) {
      if (!pair) continue;
      const eq = pair.indexOf('='), tilde = pair.indexOf('~');
      if (tilde >= 0 && (eq < 0 || tilde < eq)) {
        parameters[pair.slice(0, tilde)] = pair.slice(tilde + 1);
      } else if (eq >= 0) {
        parameters[pair.slice(0, eq)] = Number(pair.slice(eq + 1));
      }
    }
    return { kind, id: rest[0], parameters };
  }
  if (kind === 'lookup') return { kind, query: rest.join('|') };
  return { kind: 'none' };
}

// Returns { id, parameters } when MoonBit accepts the command (out-of-range values clamped), otherwise null.
export function guardCommand(candidateId, parameters, commands) {
  const id = String(candidateId ?? '');
  if (!id || WIRE_UNSAFE.test(id)) return null;
  const decoded = decodeAction(payload(call('bodymate_agent_guard_command_v1', id, fieldsWire(parameters), allowlistWire(commands)), 'agent-guard-v1'));
  return decoded.kind === 'command' ? { id: decoded.id, parameters: decoded.parameters } : null;
}

// Like guardCommand but also returns MoonBit's reason codes; policy is 'clamp' (default) or 'reject'.
export function explainCommand(candidateId, parameters, commands, policy = 'clamp') {
  const id = String(candidateId ?? '');
  if (!id || WIRE_UNSAFE.test(id)) return { action: null, reasons: ['unknown_id:'] };
  const body = payload(call('bodymate_agent_explain_command_v1', id, fieldsWire(parameters), allowlistWire(commands), String(policy)), 'agent-explain-v1');
  const separator = body.lastIndexOf('|');
  const reasons = separator >= 0 ? body.slice(separator + 1) : '';
  const decoded = decodeAction(separator >= 0 ? body.slice(0, separator) : body);
  return {
    action: decoded.kind === 'command' ? { id: decoded.id, parameters: decoded.parameters } : null,
    reasons: reasons ? reasons.split(';').filter(Boolean) : [],
  };
}

// Returns the trimmed, capped lookup text when MoonBit accepts it, otherwise null.
export function guardLookup(query, maxChars = 80) {
  const decoded = decodeAction(payload(call('bodymate_agent_guard_lookup_v1', String(query ?? ''), Math.max(0, Math.trunc(Number(maxChars) || 0))), 'agent-guard-v1'));
  return decoded.kind === 'lookup' ? decoded.query : null;
}
