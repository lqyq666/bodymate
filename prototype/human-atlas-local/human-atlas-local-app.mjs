import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { humanAtlasLocalRegistry, entryForHumanAtlasPart } from './human-atlas-registry.mjs';
import { focusPlanFromBounds, parseCoreSnapshot, visibilityForHumanAtlasSnapshot } from './human-atlas-domain.mjs';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const selection = document.querySelector('#selection');
const revision = document.querySelector('#revision');
const visibility = document.querySelector('#visibility');
const topology = document.querySelector('#topology');
const isolate = document.querySelector('#isolate');
const restore = document.querySelector('#restore');
const focus = document.querySelector('#focus');
const select = document.querySelector('#select');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(29, 1, .003, 10);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = .055;
controls.minDistance = .18;
controls.maxDistance = 2.5;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const scmGroup = new THREE.Group();
const contextGroup = new THREE.Group();
scmGroup.userData.structureId = humanAtlasLocalRegistry[0].structureId;
scene.add(contextGroup, scmGroup);
scene.add(new THREE.HemisphereLight(0xffffff, 0x7d91a7, 1.9));
const key = new THREE.DirectionalLight(0xffffff, 2.8); key.position.set(-1.2, 2.8, 2.4); scene.add(key);
const rim = new THREE.DirectionalLight(0x8fc6ff, 1.5); rim.position.set(2.2, 1.6, 1.3); scene.add(rim);
const pmrem = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment(); scene.environment = pmrem.fromScene(room, .045).texture; room.dispose(); pmrem.dispose();
const stage = new THREE.Mesh(new THREE.CircleGeometry(.42, 96), new THREE.MeshStandardMaterial({ color: 0xe4edf7, roughness: .79, metalness: .08 })); stage.rotation.x = -Math.PI / 2; stage.position.set(0, 1.355, 0); scene.add(stage);
const materials = { scm: new THREE.MeshPhysicalMaterial({ color: 0xdde7f0, roughness: .33, clearcoat: .21, sheen: .2, sheenColor: 0xd8edff, side: THREE.DoubleSide }), muscle: new THREE.MeshPhysicalMaterial({ color: 0xc9d5e1, roughness: .42, clearcoat: .1, side: THREE.DoubleSide, transparent: true, opacity: .8 }), bone: new THREE.MeshPhysicalMaterial({ color: 0xf1f4f7, roughness: .32, clearcoat: .16, side: THREE.DoubleSide }) };
let snapshot;

function materialFor(part) { return part.id === 'FJ1595' ? materials.scm : part.system === 'skeletal' ? materials.bone : materials.muscle; }
function makeGeometry(buffer, part) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
function coreCall(name, ...args) { const fn = globalThis[name]; if (typeof fn !== 'function') throw Error(`MoonBit core missing: ${name}`); const next = parseCoreSnapshot(fn(...args)); if (!next) throw Error(`MoonBit rejected ${name}`); snapshot = next; return next; }
function initialiseCore() { globalThis.bodymate_core_clear(); const entry = humanAtlasLocalRegistry[0]; if (globalThis.bodymate_core_register(entry.structureId, entry.displayNameZh, entry.region, entry.layer, true) !== 'ok|registered') throw Error('MoonBit registration failed.'); snapshot = parseCoreSnapshot(globalThis.bodymate_core_select_structure(entry.structureId)); if (!snapshot) throw Error('MoonBit could not select SCM.'); }
function entryForObject(object) { for (let current = object; current; current = current.parent) { const entry = entryForHumanAtlasPart(current.name) ?? humanAtlasLocalRegistry.find((candidate) => candidate.structureId === current.userData?.structureId); if (entry) return entry; } return null; }
function paint(selected) { materials.scm.color.setHex(selected ? 0x8fc5ff : 0xdde7f0); materials.scm.emissive.setHex(selected ? 0x1469c9 : 0x000000); materials.scm.emissiveIntensity = selected ? .2 : 0; materials.scm.roughness = selected ? .27 : .33; }
function focusScm() { const box = new THREE.Box3().setFromObject(scmGroup); const plan = focusPlanFromBounds(box); controls.target.set(plan.target.x, plan.target.y, plan.target.z); camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(-.73, .3, 1).normalize(), plan.distance); controls.update(); }
function applySnapshot() { const entry = humanAtlasLocalRegistry.find((candidate) => candidate.structureId === snapshot.selected); const shown = visibilityForHumanAtlasSnapshot(snapshot, humanAtlasLocalRegistry[0].structureId); scmGroup.visible = shown.selectedVisible; contextGroup.visible = shown.contextVisible; paint(Boolean(entry)); selection.textContent = entry?.displayNameZh ?? '尚未选择'; revision.textContent = String(snapshot.revision); visibility.textContent = snapshot.isolated ? 'SCM 可见 · 14 个上下文组件隐藏' : 'SCM + 14 个上下文组件可见'; isolate.disabled = !entry || snapshot.isolated; restore.disabled = !snapshot.isolated; focus.disabled = !entry; }
function selectScm() { coreCall('bodymate_core_select_structure', humanAtlasLocalRegistry[0].structureId); applySnapshot(); focusScm(); status.textContent = 'FJ1595 → Anatomy Registry → MoonBit → validated snapshot 已完成'; }
async function loadLocalAtlas() {
  const manifest = await fetch('./local-assets/manifest.json', { cache: 'no-store' }).then((response) => { if (!response.ok) throw Error('本地 Human Atlas 组件尚未下载。先运行 npm run human-atlas:fetch-local。'); return response.json(); });
  const buffers = new Map(await Promise.all(manifest.chunks.map(async (chunk) => [chunk.index, await fetch(`./local-assets/${chunk.file}`, { cache: 'no-store' }).then((response) => { if (!response.ok) throw Error(`缺少本地分块 ${chunk.file}`); return response.arrayBuffer(); })])));
  for (const part of manifest.parts) { const mesh = new THREE.Mesh(makeGeometry(buffers.get(part.chunk), part), materialFor(part)); mesh.name = part.id; mesh.userData.partId = part.id; (part.id === 'FJ1595' ? scmGroup : contextGroup).add(mesh); }
  const scm = manifest.parts.find((part) => part.id === 'FJ1595'); topology.textContent = `${scm.vertexCount.toLocaleString()} vertices · ${(scm.indexCount / 3).toLocaleString()} triangles`;
}
function resize() { const box = canvas.getBoundingClientRect(); renderer.setSize(box.width, box.height, false); camera.aspect = box.width / box.height; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(canvas); resize();
canvas.addEventListener('pointerup', (event) => { if (event.movementX || event.movementY) return; const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(scmGroup.children, false)[0]; if (hit && entryForObject(hit.object)) selectScm(); });
select.onclick = selectScm; focus.onclick = () => { focusScm(); status.textContent = '相机已按 FJ1595 实际 mesh bounds 聚焦'; }; isolate.onclick = () => { coreCall('bodymate_core_isolate_selected'); applySnapshot(); status.textContent = 'MoonBit isolate：仅显示真实 SCM 组件'; }; restore.onclick = () => { coreCall('bodymate_core_restore_context'); applySnapshot(); status.textContent = 'MoonBit restore：已恢复真实颈肩上下文组件'; };
try { if (typeof globalThis.bodymate_core_clear !== 'function') throw Error('MoonBit build missing; run npm run build.'); await loadLocalAtlas(); initialiseCore(); applySnapshot(); focusScm(); status.textContent = '本地 Human Atlas 颈肩组件已重组 · 点击 SCM 验证完整链路'; (function render() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(render); }()); } catch (error) { console.error(error); status.textContent = `本地验证未就绪：${error.message}`; }
