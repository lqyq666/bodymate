import { readFile } from 'node:fs/promises';
import { runInThisContext } from 'node:vm';

const bundleUrl = new URL('../assets/runtime/moonbit-core.js', import.meta.url);

// Loads the generated MoonBit core bundle into this Node process so server-side and
// build-time code can call the same bodymate_* exports the browser uses.
export async function loadMoonBitCore({ probe = 'bodymate_anatomy_name_v1' } = {}) {
  if (typeof globalThis[probe] === 'function') return false;
  const bundle = await readFile(bundleUrl, 'utf8');
  runInThisContext(bundle, { filename: 'moonbit-core.js' });
  if (typeof globalThis[probe] !== 'function') throw Error('assets/runtime/moonbit-core.js does not expose the MoonBit anatomy exports; run npm run build.');
  return true;
}
