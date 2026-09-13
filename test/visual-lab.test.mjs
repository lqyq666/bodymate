import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layoutLabelPlans } from '../src/root-scm/label-layout.mjs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { gunzipSync } from 'node:zlib';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('only complete-body presentation is mounted, including retired view URLs', async () => {
  const html = await read('index.html'), full = await read('assets/runtime/full-muscle-root-adapter.js'), shell = await read('assets/runtime/visual-lab-shell.js');
  assert.match(html, /full-muscle-root-adapter\.js/);
  assert.match(shell, /searchParams\.set\('view', 'full-body'\)/);
  assert.match(shell, /history\.replaceState/);
  assert.match(shell, /完整人体/);
  for (const source of [html, full, shell, await read('assets/runtime/real-body-navigator.js'), await read('src/full-muscle/navigator.mjs')]) {
    assert.doesNotMatch(source, /neck-lab|onNeckFocus|real-nav-focus|颈肩放大/);
  }
  assert.doesNotMatch(html, /class="rail"|root-scm-runtime|root-scm-root-adapter|coach-query-root-adapter|Interaction controller/);
});
test('model status derives real counts and UI actions use existing controllers', async () => {
  const shell = await read('assets/runtime/visual-lab-shell.js'), full = await read('assets/runtime/full-muscle-root-adapter.js');
  assert.match(shell, /正在加载/); assert.match(full, /onReady: \(\{ count, boneCount \}\)/);
  assert.match(shell, /requestSubmit\(\)/);
  assert.doesNotMatch(shell, /bodymate_domain_.*\(/);
  assert.doesNotMatch(shell, /75%|训练进度|本周训练|向 AI 提问/);
});
test('foreground sculpture stays opaque above the scene blend and uses the imported platform', async () => {
  const css = await read('assets/visual-full-body.css'), shell = await read('assets/visual-lab.css'), navigator = await read('src/full-muscle/navigator.mjs');
  assert.match(css, /#full-muscle-canvas\{z-index:1;mask-image:linear-gradient/);
  assert.match(shell, /\.navigator\{[^}]*position:absolute;[^}]*z-index:3/);
  assert.doesNotMatch(shell, /real-nav-focus|nav-view:after|root-scm-canvas|rail-button/);
  assert.match(navigator, /createNavigatorPlatform\(gltf.scene, environmentTarget.texture\)/);
  assert.doesNotMatch(navigator, /opacity\s*=|transparent\s*=/);
});
test('crowded labels remain separated and bounded, including anchors near the lower edge', () => {
  const entries = Array.from({length:5}, (_,i)=>({entry:{structureId:String(i),side:'right'},anchor:{x:i,y:0,z:0}}));
  const plans = layoutLabelPlans(entries,{width:800,height:400,project:()=>({x:650,y:399,z:0})});
  assert.equal(plans[0].selected,true);
  assert.ok(plans.every(p=>p.y>=20&&p.y<=380));
  for(const lane of ['left','right']) { const ys=plans.filter(p=>p.lane===lane).map(p=>p.y).sort((a,b)=>a-b); for(let i=1;i<ys.length;i++) assert.ok(ys[i]-ys[i-1]>=44); }
});
test('camera skips zero-sized hidden mounts and orbit drag cannot select hidden meshes', async () => {
  const runtime = await read('src/root-scm/runtime-entry.mjs');
  assert.match(runtime, /if \(!box.width \|\| !box.height\) return/);
  assert.match(runtime, /Math.hypot\(event.clientX - start.x, event.clientY - start.y\) > 5/);
  assert.match(runtime, /filter\(\(mesh\) => mesh.visible\)/);
});
test('comparison evidence reuses both existing provenance lists without new evidence', async () => {
  const adapter = await read('assets/runtime/root-scm-root-adapter.js');
  assert.match(adapter, /\.\.\.item.leftEvidenceIds, \.\.\.item.rightEvidenceIds/);
  assert.match(adapter, /evidenceById\(\)/);
});
test('the real miniature shares geometry but keeps a separate standing skeleton from animated anatomy', async () => {
  const bytes = await readFile(new URL('../assets/anatomy/human-atlas/rigged-body.glb',import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const main = clone(gltf.scene), mini = clone(gltf.scene), standing = [];
  let count=0;
  mini.traverse(node=>{if(node.isBone)standing.push([node,node.position.toArray(),node.quaternion.toArray()]);if(node.isMesh){count++;assert.equal(node.geometry,main.getObjectByName(node.name).geometry);assert.notEqual(node.skeleton.bones[0],main.getObjectByName(node.name).skeleton.bones[0]);}});
  assert.equal(count,697);
  const mixer=new THREE.AnimationMixer(main), clip=gltf.animations.find(clip=>clip.name==='push_up');mixer.clipAction(clip).play();mixer.update(clip.duration*.35);
  for(const [bone,position,rotation] of standing){assert.deepEqual(bone.position.toArray(),position);assert.deepEqual(bone.quaternion.toArray(),rotation);}
  const source=await read('src/full-muscle/navigator.mjs'); assert.match(source,/new THREE.PerspectiveCamera/); assert.match(source,/controls.addEventListener\('change',draw\)/);
});
test('file transport losslessly reproduces the existing bound body without changing its bytes', async () => {
  const source=await read('assets/runtime/rigged-body-offline.js');const match=source.match(/BodyMateRiggedBodyOffline=("[^"]+")/);
  assert.ok(match);const decoded=gunzipSync(Buffer.from(JSON.parse(match[1]),'base64'));
  assert.deepEqual(decoded,await readFile(new URL('../assets/anatomy/human-atlas/rigged-body.glb',import.meta.url)));
});
