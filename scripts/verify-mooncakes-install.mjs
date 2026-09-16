import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMoon, verifyMoonVersion } from './moon-toolchain.mjs';

// Proves the published library installs and runs from the Mooncakes registry: a throwaway
// consumer module adds lqyq666/bodymate@<version> with `moon add`, imports all four packages
// and executes a small program. Needs network access to mooncakes.io; not part of `npm run check`.
const root = fileURLToPath(new URL('..', import.meta.url));
const module = 'lqyq666/bodymate';
const version = process.argv[2] || /version\s*=\s*"([^"]+)"/.exec(await readFile(join(root, 'moon.mod'), 'utf8'))?.[1];
if (!version) throw Error('Could not determine the module version to install.');
verifyMoonVersion({ cwd: root });

const workspace = await mkdtemp(join(tmpdir(), 'bodymate-install-'));
const project = join(workspace, 'consumer');
const expected = 'install-check|command|push_up|handWidth=1.8,mode~wide|夹角60度|左侧股骨|1';
try {
  const created = runMoon(['new', project, '--user', 'installcheck', '--name', 'consumer'], { cwd: workspace, capture: true });
  if (created.status !== 0) throw Error(`moon new failed: ${created.stderr || created.stdout}`);
  const added = runMoon(['add', `${module}@${version}`], { cwd: project, capture: true });
  if (added.status !== 0) throw Error(`moon add ${module}@${version} failed: ${added.stderr || added.stdout}`);
  await writeFile(join(project, 'cmd/main/moon.pkg'), `import {\n  "${module}/agent",\n  "${module}/zhnum",\n  "${module}/anatomy",\n  "${module}/motion",\n}\npkgtype(kind: "executable")\n`);
  await writeFile(join(project, 'cmd/main/main.mbt'), [
    'fn main {',
    '  let allowed = @agent.parse_allowlist("push_up^handWidth:0.8:1.8,mode?wide?narrow")',
    '  let guarded = @agent.action_wire(@agent.guard_command("push_up", [("handWidth", @agent.FieldValue::Num(2.5)), ("mode", @agent.FieldValue::Str("wide")), ("invented", @agent.FieldValue::Num(7.0))], allowed))',
    '  let zh = @zhnum.normalize_numerals("夹角六十度")',
    '  let bone = @anatomy.structure_name_zh("Left femur", @anatomy.kind_from_string("bone"))',
    '  let pose = @motion.pose_intent("squat", 0.5, []).unwrap()',
    '  println("install-check|" + guarded + "|" + zh + "|" + bone + "|" + pose.depth.to_string())',
    '}',
    '',
  ].join('\n'));
  const run = runMoon(['run', 'cmd/main', '--target', 'js'], { cwd: project, capture: true });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  if (run.status !== 0 || !output.includes(expected)) throw Error(`Installed consumer did not produce the expected line.\n${output}`);
  console.log(`Mooncakes install check passed: ${module}@${version} added with moon add, four packages imported and executed (js target).`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
