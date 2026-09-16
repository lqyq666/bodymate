import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMoon, verifyMoonVersion } from './moon-toolchain.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
verifyMoonVersion({ cwd: root });
runMoon(['package'], { cwd: root });
const manifest = await readFile(join(root, 'moon.mod'), 'utf8');
const name = manifest.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
const version = manifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (!name || !version) throw Error('Missing package name/version.');
const archive = join(root, '_build/publish', `${name.replaceAll('/', '-')}-${version}.zip`);
const auditRoot = join(root, '_build/package-audit');
await mkdir(auditRoot, { recursive: true });
const isolated = await mkdtemp(join(auditRoot, 'run-'));
// Inspect the actual archive, then compile its extracted contents without the app.
const audit = execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', `
import json, pathlib, re, sys, zipfile
destination = pathlib.Path(sys.argv[2]).resolve()
with zipfile.ZipFile(sys.argv[1]) as archive:
    entries = archive.infolist()
    names = []
    total = 0
    for entry in entries:
        path = entry.filename.replace('\\\\', '/')
        if entry.is_dir():
            continue
        allowed = path in ['moon.mod', 'LICENSE', 'README.md'] or re.fullmatch(r'moonbit/(motion|anatomy|examples)/[A-Za-z0-9_./-]+\\.(mbt|mbti|pkg|md)', path)
        if not allowed or '..' in pathlib.PurePosixPath(path).parts:
            raise RuntimeError('Unexpected archive member: ' + path)
        target = (destination / path).resolve()
        if not target.is_relative_to(destination):
            raise RuntimeError('Archive path escaped audit directory')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.read(entry))
        names.append(path)
        total += entry.file_size
    required = ['moon.mod', 'LICENSE', 'moonbit/motion/moon.pkg', 'moonbit/motion/motion_test.mbt', 'moonbit/anatomy/moon.pkg', 'moonbit/anatomy/anatomy_test.mbt']
    required += ['moonbit/examples/' + scenario + '/main.mbt' for scenario in ['parameters', 'sessions', 'sampling']]
    if any(path not in names for path in required):
        raise RuntimeError('Incomplete MoonBit archive')
    if total > 200000:
        raise RuntimeError('Library archive unexpectedly exceeds 200 KB source budget')
    print(json.dumps({'files': len(names), 'uncompressedBytes': total, 'archiveBytes': pathlib.Path(sys.argv[1]).stat().st_size}))
`, archive, isolated], { encoding: 'utf8' });
runMoon(['check', '--target', 'js'], { cwd: isolated });
runMoon(['build', '--target', 'js'], { cwd: isolated });
runMoon(['test', '--target', 'js'], { cwd: isolated });
for (const scenario of ['parameters', 'sessions', 'sampling']) {
  runMoon(['run', `moonbit/examples/${scenario}`, '--target', 'js'], { cwd: isolated });
}
console.log(`MoonBit package audit passed: ${audit.trim()}. No app, GLB, vendor JS or npm dependency is packaged. Local verification only; nothing uploaded.`);
