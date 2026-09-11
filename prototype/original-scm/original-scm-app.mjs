import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { originalScmMeshNames, originalScmRegistry, entryForOriginalMeshName } from './original-scm-registry.mjs';
import { focusPlanFromBounds, parseCoreSnapshot, rendererVisibilityForSnapshot } from './original-scm-domain.mjs';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const selection = document.querySelector('#selection');
const revision = document.querySelector('#revision');
const visibility = document.querySelector('#visibility');
const isolateButton = document.querySelector('#isolate');
const restoreButton = document.querySelector('#restore');
const focusButton = document.querySelector('#focus');
const selectButton = document.querySelector('#select');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 30);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 1.2;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI * 0.73;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const contextGroup = new THREE.Group();
const scmGroup = new THREE.Group();
scmGroup.name = 'procedural-scm-right';
scmGroup.userData.structureId = originalScmRegistry[0].structureId;
scene.add(contextGroup, scmGroup);

scene.add(new THREE.HemisphereLight(0xf9fcff, 0x7c91a9, 2.45));
const key = new THREE.DirectionalLight(0xffffff, 2.8);
key.position.set(2.8, 4.7, 3.4);
scene.add(key);
const edge = new THREE.DirectionalLight(0x8ec5ff, 1.1);
edge.position.set(-2.8, 1.7, 3.2);
scene.add(edge);
const floor = new THREE.Mesh(new THREE.CircleGeometry(2.45, 96), new THREE.MeshBasicMaterial({ color: 0xdceafa, transparent: true, opacity: 0.56 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.34;
contextGroup.add(floor);

const neutralMaterials = [];
const scmMaterials = [];
let snapshot;

function neutralMaterial(color = 0xd8e1eb, opacity = 1) {
  const material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, metalness: 0, clearcoat: 0.13, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  neutralMaterials.push(material);
  return material;
}

function scmMaterial(color, opacity = 1) {
  const material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, metalness: 0, clearcoat: 0.19, sheen: 0.22, sheenColor: 0xd9edff, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  scmMaterials.push(material);
  return material;
}

function addEllipsoid(target, name, position, scale, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  target.add(mesh);
  return mesh;
}

function curveFrom(points) {
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
}

function taperedTube(curve, radii, tubularSegments, radialSegments, material, name) {
  const positions = [];
  const normals = [];
  const indices = [];
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const reference = new THREE.Vector3(0, 0, 1);
  for (let segment = 0; segment <= tubularSegments; segment += 1) {
    const t = segment / tubularSegments;
    curve.getPointAt(t, point);
    curve.getTangentAt(t, tangent).normalize();
    if (Math.abs(tangent.dot(reference)) > 0.92) reference.set(1, 0, 0); else reference.set(0, 0, 1);
    normal.crossVectors(reference, tangent).normalize();
    binormal.crossVectors(tangent, normal).normalize();
    const radius = THREE.MathUtils.lerp(radii[0], radii[1], Math.sin(t * Math.PI * 0.98) ** 0.72);
    for (let side = 0; side <= radialSegments; side += 1) {
      const angle = side / radialSegments * Math.PI * 2;
      const radial = normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle));
      const vertex = point.clone().addScaledVector(radial, radius);
      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(radial.x, radial.y, radial.z);
    }
  }
  const ring = radialSegments + 1;
  for (let segment = 0; segment < tubularSegments; segment += 1) {
    for (let side = 0; side < radialSegments; side += 1) {
      const a = segment * ring + side;
      const b = (segment + 1) * ring + side;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

function buildContext() {
  addEllipsoid(contextGroup, 'reference-head', [0, 1.63, -0.04], [0.69, 0.8, 0.62], neutralMaterial(0xe2e8ef, 0.88));
  addEllipsoid(contextGroup, 'reference-neck', [0, 0.62, 0], [0.42, 1.07, 0.4], neutralMaterial(0xd7e0ea, 0.56));
  addEllipsoid(contextGroup, 'reference-shoulder', [-0.03, -1.0, -0.05], [1.5, 0.39, 0.75], neutralMaterial(0xd4dee9, 0.72));
  const clavicle = curveFrom([[-0.95, -0.9, 0.12], [-0.42, -0.72, 0.29], [0.08, -0.84, 0.31], [0.95, -0.88, 0.17]]);
  contextGroup.add(taperedTube(clavicle, [0.048, 0.054], 80, 10, neutralMaterial(0xf1f4f8, 0.95), 'reference-clavicle'));
  const neckLine = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.012, 10, 64), new THREE.MeshBasicMaterial({ color: 0xaabed6, transparent: true, opacity: 0.48 }));
  neckLine.rotation.x = Math.PI / 2;
  neckLine.position.y = 0.1;
  contextGroup.add(neckLine);
}

function buildScm() {
  const points = [[0.43, 1.28, 0.2], [0.56, 0.98, 0.31], [0.51, 0.57, 0.38], [0.38, 0.04, 0.36], [0.23, -0.53, 0.29], [0.12, -1.0, 0.23]];
  const mainCurve = curveFrom(points);
  scmGroup.add(taperedTube(mainCurve, [0.073, 0.145], 192, 24, scmMaterial(0xd9e4ee, 0.98), originalScmMeshNames[0]));
  for (let index = 0; index < 15; index += 1) {
    const lane = (index - 7) / 11;
    const depth = ((index % 3) - 1) * 0.019;
    const fiber = curveFrom(points.map(([x, y, z], pointIndex) => [x + lane * (0.058 + pointIndex * 0.006), y, z + depth + Math.sin((pointIndex + 1) * (index + 2)) * 0.008]));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(fiber, 150, 0.0085, 7, false), scmMaterial(0x8fa6bf, 0.66));
    mesh.name = originalScmMeshNames[index + 1];
    scmGroup.add(mesh);
  }
}

function coreCall(name, ...args) {
  const fn = globalThis[name];
  if (typeof fn !== 'function') throw Error(`MoonBit core missing: ${name}`);
  const next = parseCoreSnapshot(fn(...args));
  if (!next) throw Error(`MoonBit rejected ${name}`);
  snapshot = next;
  return next;
}

function initialiseCore() {
  if (typeof globalThis.bodymate_core_clear !== 'function') throw Error('MoonBit build is missing; run npm run build first.');
  globalThis.bodymate_core_clear();
  for (const entry of originalScmRegistry) {
    const reply = globalThis.bodymate_core_register(entry.structureId, entry.displayNameZh, entry.region, entry.layer, true);
    if (reply !== 'ok|registered') throw Error(`MoonBit registration failed: ${reply}`);
  }
  snapshot = parseCoreSnapshot(globalThis.bodymate_core_select_structure(originalScmRegistry[0].structureId));
  if (!snapshot) throw Error('MoonBit could not establish the default SCM selection.');
}

function entryForObject(object) {
  for (let current = object; current; current = current.parent) {
    const byName = entryForOriginalMeshName(current.name);
    if (byName) return byName;
    const byId = originalScmRegistry.find((entry) => entry.structureId === current.userData?.structureId);
    if (byId) return byId;
  }
  return null;
}

function paint(selected) {
  for (const material of scmMaterials) {
    material.color.setHex(selected ? 0x9fc9ff : 0xd9e4ee);
    material.emissive.setHex(selected ? 0x1d72d3 : 0x000000);
    material.emissiveIntensity = selected ? 0.19 : 0;
    material.roughness = selected ? 0.28 : 0.38;
  }
  for (let index = 1; index < scmMaterials.length; index += 1) scmMaterials[index].color.setHex(selected ? 0xc8e3ff : 0x8fa6bf);
}

function focusStructure() {
  const box = new THREE.Box3().setFromObject(scmGroup);
  const plan = focusPlanFromBounds(box);
  const target = new THREE.Vector3(plan.target.x, plan.target.y, plan.target.z);
  const direction = new THREE.Vector3(1.15, 0.46, 1.1).normalize();
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, plan.distance);
  controls.update();
  return plan;
}

function applySnapshot() {
  const entry = originalScmRegistry.find((candidate) => candidate.structureId === snapshot.selected);
  const map = rendererVisibilityForSnapshot(snapshot, originalScmRegistry[0].structureId);
  scmGroup.visible = map.structureVisible;
  contextGroup.visible = map.contextVisible;
  paint(Boolean(entry));
  selection.textContent = entry?.displayNameZh ?? '尚未选择';
  revision.textContent = String(snapshot.revision);
  visibility.textContent = snapshot.isolated ? 'SCM 16 / 16 · 参考体隐藏' : 'SCM 16 / 16 · 参考体可见';
  isolateButton.disabled = !entry || snapshot.isolated;
  restoreButton.disabled = !snapshot.isolated;
  focusButton.disabled = !entry;
}

function selectScm() {
  const entry = originalScmRegistry[0];
  coreCall('bodymate_core_select_structure', entry.structureId);
  applySnapshot();
  focusStructure();
  status.textContent = '已通过原创 Registry → MoonBit → validated snapshot 选择 SCM';
}

function resize() {
  const box = canvas.getBoundingClientRect();
  renderer.setSize(box.width, box.height, false);
  camera.aspect = box.width / box.height;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(canvas);
resize();
canvas.addEventListener('pointerup', (event) => {
  if (event.movementX || event.movementY) return;
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(scmGroup.children, false)[0];
  const entry = hit && entryForObject(hit.object);
  if (entry) selectScm();
});
selectButton.addEventListener('click', selectScm);
focusButton.addEventListener('click', () => { focusStructure(); status.textContent = '相机已按原创 SCM 的实际 bounds 重新聚焦'; });
isolateButton.addEventListener('click', () => { coreCall('bodymate_core_isolate_selected'); applySnapshot(); status.textContent = 'MoonBit 已隔离 SCM；原创参考体已隐藏'; });
restoreButton.addEventListener('click', () => { coreCall('bodymate_core_restore_context'); applySnapshot(); status.textContent = 'MoonBit 已恢复周围原创参考体'; });

try {
  buildContext();
  buildScm();
  initialiseCore();
  applySnapshot();
  focusStructure();
  status.textContent = '原创程序化 SCM 已就绪 · 点击蓝色部位或使用右侧按钮';
  (function render() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(render); }());
} catch (error) {
  console.error(error);
  status.textContent = `原创 SCM 验证失败：${error.message}`;
}
