import { fileURLToPath } from 'node:url';
import { runMoon, verifyMoonVersion } from './moon-toolchain.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
verifyMoonVersion({ cwd: root });
for (const scenario of ['parameters', 'sessions', 'sampling']) {
  runMoon(['run', `moonbit/examples/${scenario}`, '--target', 'js'], { cwd: root });
}
