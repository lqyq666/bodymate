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

export const fullMuscleSourceFiles = Object.freeze({
  'atlas.json': sourceFiles['atlas.json'],
  'body-0.bin': 'B33B2B5AAC20F35FBF6871F916607BF3C4D386321C8C0FDADCCA6B5D24E3641E',
  'body-1.bin': 'AA077A4675F0D0DD3C9B0AF39DC8CF6BCB348C3BF7D283478D4206CE30A5A0DE',
  'body-2.bin': '4B3ACFC35B91E4427EACA0E3BE897D33F144354342AE0E52A2328B582CA8BDBE',
  'body-3.bin': '6FEBB76B50423331F66802A63BB43F04F99CE08129837015910EED43D0719268',
  'body-4.bin': sourceFiles['body-4.bin'],
  'body-5.bin': sourceFiles['body-5.bin'],
  'body-8.bin': '18BEACFDEADC8AD483D692672AAE165F4323704CD7A9BFCBEBBD703F5E268E25',
  'body-9.bin': '0AA8AA09A379A2D759872659A2EF68FC4510EE37E435C4EBC63EE679722A4547',
  'body-10.bin': '4A959D998ACD35CF88518A0F2F8AB99B42D9F69C7CE0D6A814DF315EEAC807AC',
  'body-11.bin': 'E8C1AFE7F30FE710AD164EC9CD2287A32881606E7EB590AF47D76B3F84405027',
});

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();

export async function fetchVerifiedHumanAtlasSource({ cacheDir = join(tmpdir(), 'bodymate-human-atlas'), allowNetwork = process.env.BODYMATE_ALLOW_NETWORK === '1', requiredFiles = sourceFiles } = {}) {
  await mkdir(cacheDir, { recursive: true });
  const files = {};
  for (const [file, expected] of Object.entries(requiredFiles)) {
    const target = join(cacheDir, file);
    if (!existsSync(target) && !allowNetwork) throw Error(`Human Atlas source cache is missing ${file}. Set BODYMATE_ALLOW_NETWORK=1 only for an explicit source refresh.`);
    const bytes = existsSync(target) ? await readFile(target) : new Uint8Array(await (await fetch(`${rawBaseUrl}/${file}`)).arrayBuffer());
    if (sha256(bytes) !== expected) throw Error(`Human Atlas ${file} SHA-256 mismatch; refusing to build.`);
    if (!existsSync(target)) await writeFile(target, bytes);
    files[file] = bytes;
  }
  return files;
}
