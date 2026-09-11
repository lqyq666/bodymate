import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const assetRelativeDir = 'assets/anatomy/open-anatomy';
export const assetDir = join(root, assetRelativeDir);
export const outputRelativeFile = `${assetRelativeDir}/scm-right.glb`;
export const sourceFile = 'head-neck-2016-09/models/Model_62_right_sternocleidomastoideus_muscle.vtk';
export const sourceArchiveLicense = 'head-neck-2016-09/LICENSE.md';
export const sourceArchive = 'head-neck-2016-09.zip';
export const sourceUrl = 'https://www.openanatomy.org/atlases/nac/head-neck-2016-09.zip';
export const archiveSha256 = 'C224F054569B284C9A948F6F96B0299EAEE13D3AC661A3386657A743FA8552C4';
export const sourceSha256 = '0648D7493750FFD03DDAA38D61F4879322E856FE26A0EBAC7406FE8B451206B2';
export const licenseUrl = 'https://raw.githubusercontent.com/Slicer/Slicer/68ff0ae7114e4378322740f117643d7513a71110/License.txt';
export const licenseSha256 = '03FC5CD907E5C2004CE199D66318D32A08FA2DE2B5B28BEE184EDDA6307D0B86';

export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
export function defaultCacheDir() { return process.env.BODYMATE_ANATOMY_CACHE || join(tmpdir(), 'bodymate-anatomy-scm'); }
function assertHash(bytes, expected, label) { const actual = sha256(bytes); if (actual !== expected) throw Error(`${label} SHA-256 mismatch: expected ${expected}, got ${actual}. Refusing to continue.`); }
async function download(url, target) { const response = await fetch(url); if (!response.ok) throw Error(`Unable to fetch ${url}: HTTP ${response.status}`); const bytes = new Uint8Array(await response.arrayBuffer()); await writeFile(target, bytes); return bytes; }
function extract(archive, destination) { const result = spawnSync('tar', ['-xf', archive, '-C', destination, sourceFile, sourceArchiveLicense], { encoding: 'utf8' }); if (result.status !== 0) throw Error(`Could not extract the pinned SCM source with tar: ${result.stderr || result.stdout}`); }
export async function fetchScmSource({ cacheDir = defaultCacheDir(), refresh = false } = {}) {
  const archive = join(cacheDir, sourceArchive), extractDir = join(cacheDir, 'extracted'), vtk = join(extractDir, sourceFile), archiveLicense = join(extractDir, sourceArchiveLicense), completeLicense = join(cacheDir, '3D-Slicer-License.txt');
  await mkdir(cacheDir, { recursive: true });
  const archiveBytes = refresh || !existsSync(archive) ? await download(sourceUrl, archive) : await readFile(archive); assertHash(archiveBytes, archiveSha256, 'Pinned upstream archive');
  if (refresh || !existsSync(vtk) || !existsSync(archiveLicense)) { await rm(extractDir, { recursive: true, force: true }); await mkdir(extractDir, { recursive: true }); extract(archive, extractDir); }
  const vtkBytes = await readFile(vtk); assertHash(vtkBytes, sourceSha256, 'Pinned SCM VTK');
  const licenseBytes = refresh || !existsSync(completeLicense) ? await download(licenseUrl, completeLicense) : await readFile(completeLicense); assertHash(licenseBytes, licenseSha256, '3D Slicer License Part B');
  return { cacheDir, archive, vtk, archiveLicense, completeLicense, archiveBytes, vtkBytes, licenseBytes };
}
export async function copySourceNotices(source, destination) { await mkdir(destination, { recursive: true }); await copyFile(source.completeLicense, join(destination, 'LICENSE.md')); await copyFile(source.archiveLicense, join(destination, 'UPSTREAM_ARCHIVE_LICENSE.md')); }
