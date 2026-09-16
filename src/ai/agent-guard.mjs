// Thin adapter over the MoonBit agent guard (lqyq666/bodymate/agent) exposed by
// assets/runtime/moonbit-core.js. MoonBit decides which model-proposed actions survive
// (allowlisted ids, declared finite fields, bounded lookup text); this file only encodes
// the wire, so the server proxy and the browser share one rule set.
const core = globalThis;
const WIRE_UNSAFE = /[|^~,=]/;

function call(name, ...args) {
  if (typeof core[name] !== 'function') throw Error(`MoonBit agent guard is unavailable: ${name}`);
  return core[name](...args);
}

function payload(wire, version) {
  const parts = String(wire).split('|');
  if (parts[0] !== 'ok' || parts[1] !== version) throw Error(`Invalid MoonBit ${version} response: ${wire}`);
  return parts.slice(2).join('|');
}

// [{ id, fields: [key] }] -> "id^key,key~id^key"
export function allowlistWire(commands) {
  return (Array.isArray(commands) ? commands : [])
    .map((command) => ({ id: String(command?.id ?? ''), fields: Array.isArray(command?.fields) ? command.fields.map(String) : [] }))
    .filter((command) => command.id && !WIRE_UNSAFE.test(command.id))
    .map((command) => `${command.id}^${command.fields.filter((key) => key && !WIRE_UNSAFE.test(key)).join(',')}`)
    .join('~');
}

// { key: number } -> "key=value,key=value"; non-numbers never reach MoonBit.
export function fieldsWire(parameters) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) return '';
  return Object.entries(parameters)
    .filter(([key, value]) => typeof value === 'number' && key && !WIRE_UNSAFE.test(key))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',');
}

function decode(wire) {
  const [kind, ...rest] = payload(wire, 'agent-guard-v1').split('|');
  if (kind === 'command') {
    const parameters = {};
    for (const pair of (rest[1] || '').split(',')) {
      if (!pair) continue;
      const index = pair.indexOf('=');
      parameters[pair.slice(0, index)] = Number(pair.slice(index + 1));
    }
    return { kind, id: rest[0], parameters };
  }
  if (kind === 'lookup') return { kind, query: rest.join('|') };
  return { kind: 'none' };
}

// Returns { id, parameters } when MoonBit accepts the command, otherwise null.
export function guardCommand(candidateId, parameters, commands) {
  const id = String(candidateId ?? '');
  if (!id || WIRE_UNSAFE.test(id)) return null;
  const decoded = decode(call('bodymate_agent_guard_command_v1', id, fieldsWire(parameters), allowlistWire(commands)));
  return decoded.kind === 'command' ? { id: decoded.id, parameters: decoded.parameters } : null;
}

// Returns the trimmed, capped lookup text when MoonBit accepts it, otherwise null.
export function guardLookup(query, maxChars = 80) {
  const decoded = decode(call('bodymate_agent_guard_lookup_v1', String(query ?? ''), Math.max(0, Math.trunc(Number(maxChars) || 0))));
  return decoded.kind === 'lookup' ? decoded.query : null;
}
