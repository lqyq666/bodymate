import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const humanAtlasCommit = '1c38bf35c254a891200d3cedecfd57abebe83d8d';
export const humanAtlasRepository = 'https://github.com/ashemag/human-atlas';
export const rawBaseUrl = `https://raw.githubusercontent.com/ashemag/human-atlas/${humanAtlasCommit}/public/models`;
export const attributionUrl = `${humanAtlasRepository}/blob/${humanAtlasCommit}/public/ATTRIBUTION.md`;
export const sourceFiles = Object.freeze({
  'atlas.json': 'C359F4BCD2CBA90B7411D66D5E9FC04DC81294D46CD5C1E8B212C824F2E5BBEE',
  'body-4.bin': '0509E6C996FE5B935ACE770A5DBF2D83A474330B7E541A844052A080BBF814BB',
  'body-5.bin': '32A967198FFED45839968228898F3D246C67F86FB26892C3AE270BE30E2F1149',
});

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();

export async function fetchVerifiedHumanAtlasSource({ cacheDir = join(tmpdir(), 'bodymate-human-atlas'), allowNetwork = process.env.BODYMATE_ALLOW_NETWORK === '1' } = {}) {
  await mkdir(cacheDir, { recursive: true });
  const files = {};
  for (const [file, expected] of Object.entries(sourceFiles)) {
    const target = join(cacheDir, file);
    if (!existsSync(target) && !allowNetwork) throw Error(`Human Atlas source cache is missing ${file}. Set BODYMATE_ALLOW_NETWORK=1 only for an explicit source refresh.`);
    const bytes = existsSync(target) ? await readFile(target) : new Uint8Array(await (await fetch(`${rawBaseUrl}/${file}`)).arrayBuffer());
    if (sha256(bytes) !== expected) throw Error(`Human Atlas ${file} SHA-256 mismatch; refusing to build.`);
    if (!existsSync(target)) await writeFile(target, bytes);
    files[file] = bytes;
  }
  return files;
}
