const core = globalThis;

function call(name, ...args) {
  if (typeof core[name] !== 'function') throw Error(`MoonBit environment domain is unavailable: ${name}`);
  return core[name](...args);
}

function parseValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const number = Number(value);
  return value !== '' && Number.isFinite(number) ? number : value;
}

export function environmentFrameFromWire(wire) {
  const [status, version, payload = ''] = String(wire).split('|');
  if (status !== 'ok' || version !== 'environment-frame-v1') throw Error(`Invalid MoonBit environment-frame-v1 response: ${wire}`);
  return Object.freeze(Object.fromEntries(payload.split(',').filter(Boolean).map((field) => {
    const index = field.indexOf('=');
    return [field.slice(0, index), parseValue(field.slice(index + 1))];
  })));
}

const frame = (name, ...args) => environmentFrameFromWire(call(name, ...args));

export const environmentDomain = Object.freeze({
  reset: () => frame('bodymate_environment_reset_v1'),
  setQuality: (quality) => frame('bodymate_environment_set_quality_v1', String(quality)),
  setReducedMotion: (reduced) => frame('bodymate_environment_set_reduced_motion_v1', Boolean(reduced)),
  sample: ({ azimuth, elevation, radius }) => frame('bodymate_environment_sample_v1', Number(azimuth), Number(elevation), Number(radius)),
  tick: ({ azimuth, elevation, radius, delta }) => frame('bodymate_environment_tick_v1', Number(azimuth), Number(elevation), Number(radius), Number(delta)),
  snapshot: () => frame('bodymate_environment_frame_v1'),
});
