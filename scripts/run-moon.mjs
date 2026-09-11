import { fileURLToPath } from 'node:url';
import { runMoon, verifyMoonVersion } from './moon-toolchain.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
try {
  verifyMoonVersion({ cwd: root });
  runMoon(process.argv.slice(2), { cwd: root });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
