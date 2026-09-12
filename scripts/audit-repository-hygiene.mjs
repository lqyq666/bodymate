import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const windowsUserPath = new RegExp('C:' + '\\\\' + 'Users' + '\\\\', 'i');
const macUserPath = new RegExp('/' + 'Users' + '/[^/\\s]+');
const linuxUserPath = new RegExp('/' + 'home' + '/[^/\\s]+');
const secretPatterns = [
  new RegExp('AK' + 'IA[0-9A-Z]{16}'),
  new RegExp('gh' + 'p_[A-Za-z0-9]{20,}'),
  new RegExp('github' + '_pat_[A-Za-z0-9_]{20,}'),
  new RegExp('Bearer\\s+' + '[A-Za-z0-9._~-]{20,}', 'i'),
];
const ignoredBinaryExtensions = new Set(['.glb', '.bin']);
const extensionOf = (file) => file.slice(file.lastIndexOf('.')).toLowerCase();
const failures = [];

for (const file of tracked) {
  if (ignoredBinaryExtensions.has(extensionOf(file))) continue;
  const content = await readFile(resolve(root, file));
  if (content.includes(0)) continue;
  const text = content.toString('utf8');
  if (windowsUserPath.test(text) || macUserPath.test(text) || linuxUserPath.test(text)) failures.push(`${file}: accidental absolute user path`);
  if (secretPatterns.some((pattern) => pattern.test(text))) failures.push(`${file}: possible credential or Authorization token`);
}

if (failures.length) {
  console.error('Repository hygiene audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Repository hygiene audit passed (${tracked.length} tracked files; no credential patterns or local user paths).`);
}
