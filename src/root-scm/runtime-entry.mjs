import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { rootScmRegistry } from './registry.mjs';
import { focusPlanFromBounds } from './domain-adapter.mjs';
import { humanAtlasNeckGlbBase64 } from 'virtual:bodymate-human-atlas-neck';

const bytes = Uint8Array.from(atob(humanAtlasNeckGlbBase64), (char) => char.charCodeAt(0));
const realNeckIds = new Set(rootScmRegistry.map((entry) => entry.structureId));

export function mount({ canvas, onPick, onError = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .001, 10), controls = new OrbitControls(camera, canvas);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8da1b5, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.7); key.position.set(.7, 1.2, 1.4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9ecbff, .45); fill.position.set(-1, .4, 1); scene.add(fill);
  const meshes = new Map(); let disposed = false, snapshot = null;
  const resize = () => { const box = canvas.getBoundingClientRect(); renderer.setSize(box.width, box.height, false); camera.aspect = box.width / Math.max(box.height, 1); camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const paint = () => { for (const [id, mesh] of meshes) { const active = snapshot?.selected === id && !snapshot?.overview; mesh.visible = !snapshot?.isolated || active; const material = mesh.material; material.transparent = !active; material.opacity = active ? 1 : .46; material.color.set(active ? 0x83b9f4 : 0xe7edf1); material.emissive.set(active ? 0x163d6d : 0x000000); material.emissiveIntensity = active ? .13 : 0; material.roughness = .62; material.metalness = .02; } };
  const focusSelected = () => { const mesh = meshes.get(snapshot?.selected) ?? meshes.values().next().value; if (!mesh) return; const box = new THREE.Box3().setFromObject(mesh); const plan = focusPlanFromBounds(box); controls.target.set(plan.target.x, plan.target.y, plan.target.z); camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(...plan.direction).normalize(), plan.distance); controls.update(); };
  const applySnapshot = (next) => { snapshot = next; paint(); };
  const render = () => { if (disposed) return; controls.update(); renderer.render(scene, camera); requestAnimationFrame(render); }; requestAnimationFrame(render);
  canvas.addEventListener('pointerup', (event) => { if (event.movementX || event.movementY || !meshes.size) return; const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects([...meshes.values()], false)[0]; if (hit) onPick(hit.object.userData.structureId); });
  new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', (gltf) => { gltf.scene.traverse((node) => { if (!node.isMesh) return; const id = node.userData?.structureId || node.name; if (!realNeckIds.has(id)) return; node.userData.structureId = id; node.material = node.material.clone(); meshes.set(id, node); }); if (!meshes.size) throw Error('Human Atlas neck nodes missing from generated runtime.'); scene.add(gltf.scene); paint(); focusSelected(); }, onError);
  return { show() { canvas.hidden = false; }, hide() { canvas.hidden = true; }, applySnapshot, focusSelected, dispose() { disposed = true; observer.disconnect(); renderer.dispose(); } };
}
