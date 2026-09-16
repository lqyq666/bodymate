const core = globalThis;

function call(name, ...args) {
  if (typeof core[name] !== 'function') throw Error(`MoonBit motion domain is unavailable: ${name}`);
  return core[name](...args);
}

function result(wire, version) {
  const parts = String(wire).split('|');
  if (parts[0] !== 'ok' || parts[1] !== version) throw Error(`Invalid MoonBit ${version} response: ${wire}`);
  return parts;
}

function valuesFromWire(wire = '') {
  return Object.fromEntries(wire ? wire.split(',').filter(Boolean).map((pair) => {
    const index = pair.indexOf('=');
    return [pair.slice(0, index), Number(pair.slice(index + 1))];
  }) : []);
}

function valuesToWire(values = {}) {
  return Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${Number(value)}`).join(',');
}

function pattern(value) { return value.replaceAll('/', '|'); }

function parseRegistry() {
  const parts = result(call('bodymate_motion_registry_v1'), 'motion-registry-v1');
  return parts.slice(2).join('|').split('~').filter(Boolean).map((record) => {
    const [id, title, duration, aliases, muscles, match, fields, presets] = record.split('^');
    const parameters = fields ? fields.split(';').map((field) => {
      const [key, label, unit, min, max, step, initial] = field.split('@');
      return { key, label, unit, min: Number(min), max: Number(max), step: Number(step), initial: Number(initial) };
    }) : [];
    return Object.freeze({
      id, title, duration: Number(duration), aliases: Object.freeze(aliases.split(';')), muscles: Object.freeze(muscles.split(';')),
      match: pattern(match), parameters: Object.freeze(parameters),
      presets: Object.freeze(presets ? presets.split(';').map((preset) => {
        const [title, baseline, ...values] = preset.split('@');
        return Object.freeze({ title, isBaseline: baseline === 'true', parameters: valuesFromWire(values.join('@')) });
      }) : []),
    });
  });
}

export const motionDefinitions = Object.freeze(parseRegistry());
export const parameterDefinitions = Object.freeze(Object.fromEntries(motionDefinitions.map((motion) => [motion.id, motion.parameters])));
export const motionPresets = Object.freeze(Object.fromEntries(motionDefinitions.map((motion) => [motion.id, motion.presets])));
const phaseGuidesByMotion = new Map();

export function motionForQuery(query) {
  const [, , id] = result(call('bodymate_motion_resolve_v1', String(query).normalize('NFKC')), 'motion-resolve-v1');
  return motionDefinitions.find((motion) => motion.id === id);
}

export function normalizeMotionParameters(id, input = {}) {
  const [, , values, notices = ''] = result(call('bodymate_motion_parameters_v1', id, valuesToWire(input)), 'motion-parameters-v1');
  return { parameters: valuesFromWire(values), notices: notices ? notices.split('~') : [] };
}

export function motionParameterComparison(id, input = {}) {
  const motion = motionDefinitions.find((candidate) => candidate.id === id);
  if (!motion) throw Error(`Unknown motion comparison: ${id}`);
  const { parameters } = normalizeMotionParameters(id, input);
  const baseline = motion.presets.find((preset) => preset.isBaseline);
  if (!baseline) return Object.freeze({ title: '', baselineTitle: '', isBaseline: true, deltas: Object.freeze([]) });
  const deltas = [];
  for (const field of motion.parameters) {
    const delta = Math.round((parameters[field.key] - baseline.parameters[field.key]) * 1e6) / 1e6;
    if (delta !== 0) deltas.push(Object.freeze({ key: field.key, label: field.label, unit: field.unit, delta }));
  }
  const currentPreset = motion.presets.find((preset) => motion.parameters.every((field) => parameters[field.key] === preset.parameters[field.key]));
  return Object.freeze({
    title: currentPreset?.title || '自定义', baselineTitle: baseline.title,
    isBaseline: deltas.length === 0, deltas: Object.freeze(deltas),
  });
}

export function parseMotionParameters(id, query, base = {}) {
  const [, , values, notices = '', recognized = 'false'] = result(call('bodymate_motion_parse_query_v1', id, String(query).normalize('NFKC'), valuesToWire(base)), 'motion-parse-v1');
  return { parameters: valuesFromWire(values), notices: notices ? notices.split('~') : [], recognized: recognized === 'true' };
}

export function muscleProfileForMotion(id, input = {}) {
  const [, , groups = '', note = '', evidence = ''] = result(call('bodymate_motion_profile_v1', id, valuesToWire(input)), 'motion-profile-v1');
  return {
    groups: groups ? groups.split('~').map((record) => {
      const [label, match, role, weight] = record.split('@');
      return { label, match: pattern(match), role, weight: Number(weight) };
    }) : [],
    note,
    evidence: evidence ? evidence.split('~').map((record) => {
      const index = record.indexOf('@');
      return { url: record.slice(0, index), scope: record.slice(index + 1) };
    }) : [],
  };
}

export function motionPhaseGuides(id) {
  const key = String(id);
  if (phaseGuidesByMotion.has(key)) return phaseGuidesByMotion.get(key);
  const [, , records = ''] = result(call('bodymate_motion_phase_guides_v1', key), 'motion-phase-guides-v1');
  const guides = Object.freeze(records ? records.split('~').map((record) => {
    const [guideId, phase, start, end, title, detail] = record.split('^');
    return Object.freeze({ id: guideId, phase: Number(phase), start: Number(start), end: Number(end), title, detail });
  }) : []);
  phaseGuidesByMotion.set(key, guides);
  return guides;
}

export function poseIntent(id, phase, input = {}) {
  const [, , values] = result(call('bodymate_motion_pose_intent_v1', id, Number(phase), valuesToWire(input)), 'pose-intent-v1');
  return valuesFromWire(values);
}

function sessionFromWire(wire) {
  const [, , motion, phase, paused, speed, parameters, notices = '', revision] = result(wire, 'motion-session-v1');
  return { motion: motion || null, phase: Number(phase), paused: paused === 'true', speed: Number(speed), parameters: valuesFromWire(parameters), parameterNotices: notices ? notices.split('~') : [], revision: Number(revision) };
}

export const motionSession = Object.freeze({
  reset: () => sessionFromWire(call('bodymate_motion_session_reset')),
  play: (id, parameters, preservePhase = false, initiallyPaused = false) => sessionFromWire(call('bodymate_motion_session_play_v1', id, valuesToWire(parameters), Boolean(preservePhase), Boolean(initiallyPaused))),
  stop: () => sessionFromWire(call('bodymate_motion_session_stop_v1')),
  setParameters: (parameters) => sessionFromWire(call('bodymate_motion_session_set_parameters_v1', valuesToWire(parameters))),
  setPaused: (paused) => sessionFromWire(call('bodymate_motion_session_set_paused_v1', Boolean(paused))),
  setSpeed: (speed) => sessionFromWire(call('bodymate_motion_session_set_speed_v1', Number(speed))),
  seek: (phase) => sessionFromWire(call('bodymate_motion_session_seek_v1', Number(phase))),
  tick: (delta) => sessionFromWire(call('bodymate_motion_session_tick_v1', Number(delta))),
  snapshot: () => sessionFromWire(call('bodymate_motion_session_snapshot_v1')),
});
