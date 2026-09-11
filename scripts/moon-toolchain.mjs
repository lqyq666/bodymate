import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const verifiedVersion = '0.1.20260904';

export function resolveMoon() {
  if (process.env.MOON) return process.env.MOON;
  const binary = process.platform === 'win32' ? 'moon.exe' : 'moon';
  const installed = join(homedir(), '.moon', 'bin', binary);
  return existsSync(installed) ? installed : binary;
}

export function runMoon(args, { cwd, stdio = 'inherit', capture = false } = {}) {
  const moon = resolveMoon();
  const result = spawnSync(moon, args, { cwd, stdio: capture ? 'pipe' : stdio, encoding: capture ? 'utf8' : undefined });
  if (result.error) throw new Error(`Unable to start MoonBit compiler (${moon}): ${result.error.message}. Set MOON to its executable path or add it to PATH.`);
  if (result.status !== 0) throw new Error(`MoonBit command failed (${moon} ${args.join(' ')}) with exit code ${result.status ?? 1}.`);
  return result;
}

export function verifyMoonVersion({ cwd } = {}) {
  const result = runMoon(['--version'], { cwd, capture: true });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (!output.includes(`moon ${verifiedVersion}`)) throw new Error(`Unsupported MoonBit version: ${output.trim() || 'no version output'}. BodyMate is verified with moon ${verifiedVersion}; set MOON to that toolchain.`);
}
