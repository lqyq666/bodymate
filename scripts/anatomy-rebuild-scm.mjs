import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assetDir, fetchScmSource, sha256 } from './anatomy-source.mjs';
import { buildScmAsset } from './anatomy-build-scm.mjs';

const temporary = await mkdtemp(join(tmpdir(), 'bodymate-scm-rebuild-'));
try {
  const source = await fetchScmSource({ refresh: true });
  const rebuilt = await buildScmAsset({ source, outputDir: temporary });
  const committed = await readFile(join(assetDir, 'scm-right.glb'));
  if (sha256(rebuilt.glb) !== sha256(committed)) throw Error(`Deterministic rebuild mismatch: ${sha256(rebuilt.glb)} !== ${sha256(committed)}`);
  console.log(`Deterministic SCM rebuild PASS (${sha256(committed)})`);
} finally { await rm(temporary, { recursive: true, force: true }); }
