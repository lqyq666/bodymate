import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter((file) => file && /(?:\.m?js|\.html|\.json|\.md|\.yml)$/.test(file));
const required = ['.env.example', 'scripts/check-no-secrets.mjs'];
const files = [...new Set([...tracked, ...required])];
const assignedSecret = /^BODYMATE_AI_API_KEY=[^\S\r\n]*[^\s#\r\n]/m;
const inlineKey = /(?:api[_-]?key|authorization)\s*[:=]\s*['\"][^'\"]+/i;
const failures = [];

for (const file of files) {
  const text = await readFile(join(root, file), 'utf8');
  if (assignedSecret.test(text) || inlineKey.test(text)) failures.push(file);
}

if (failures.length) {
  throw new Error(`Potential committed credential value found in: ${failures.join(', ')}`);
}

console.log(`Secret regression gate passed for ${files.length} tracked text files.`);
