import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { neckRegistry } from '../anatomy/neck-registry.mjs';
import { combinedBounds, materialPlanForSnapshot, selectedFocusPlan } from './presentation-plan.mjs';
import { labelAnchorFromBounds, labelCapForViewport, layoutLabelPlans, rankedLabelEntries } from './label-layout.mjs';
import { createCoachC } from '../coach-c/model.mjs';
import { coachBubblePlan, coachPlacementPlan, coachPresentationPlan } from '../coach-c/placement.mjs';
import { humanAtlasNeckGlbBase64 } from 'virtual:bodymate-human-atlas-neck';

const bytes = Uint8Array.from(atob(humanAtlasNeckGlbBase64), (char) => char.charCodeAt(0));
const entriesById = new Map(neckRegistry.map((entry) => [entry.structureId, entry]));
const plainBounds = (box) => ({ min: { x: box.min.x, y: box.min.y, z: box.min.z }, max: { x: box.max.x, y: box.max.y, z: box.max.z } });

export function mount({ canvas, onPick, onError = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .001, 10), controls = new OrbitControls(camera, canvas);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), meshes = new Map(), meshBounds = new Map();
  const cameraGoal = new THREE.Vector3(), targetGoal = new THREE.Vector3();
  const coach = createCoachC(THREE), coachGoal = new THREE.Vector3();
  let disposed = false, snapshot = null, transitionActive = false, initialized = false, coachInitialized = false, selectedLabelScreen = null;
  scene.add(new THREE.HemisphereLight(0xf9fcff, 0x9cafc2, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.65); key.position.set(.8, 1.1, 1.55); scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfdcff, .34); fill.position.set(-1.3, .25, .8); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xe9f4ff, .16); rim.position.set(.1, .8, -1.5); scene.add(rim);
  coach.group.visible = false; scene.add(coach.group);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = .03; controls.maxDistance = 2.5;

  const labelLayer = document.createElement('div');
  labelLayer.className = 'real-neck-labels';
  Object.assign(labelLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '5' });
  canvas.parentElement?.append(labelLayer);
  const labelLines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  Object.assign(labelLines.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'visible' });
  labelLayer.append(labelLines);
  const coachBubble = document.createElement('div');
  coachBubble.className = 'coach-c-bubble'; coachBubble.hidden = true;
  Object.assign(coachBubble.style, { position: 'absolute', pointerEvents: 'none', width: '190px', minHeight: '62px', padding: '8px 10px', border: '1px solid #d6e4f1', borderRadius: '12px', background: '#fbfdffef', color: '#365575', font: '600 11px/1.35 system-ui,sans-serif', boxShadow: '0 7px 20px #5f789c20', zIndex: '6' });
  const coachBubbleTitle = document.createElement('strong'), coachBubbleCopy = document.createElement('small');
  Object.assign(coachBubbleTitle.style, { display: 'block', color: '#2679bb', fontSize: '11px' }); Object.assign(coachBubbleCopy.style, { display: 'block', marginTop: '3px', color: '#718aa4', fontSize: '9px', fontWeight: '500' });
  coachBubble.append(coachBubbleTitle, coachBubbleCopy); labelLayer.append(coachBubble);
  const labelNodes = new Map();
  const lineNodes = new Map();
  for (const entry of neckRegistry) {
    const node = document.createElement('button');
    node.type = 'button'; node.hidden = true; node.setAttribute('aria-label', `选择${entry.displayNameZh}`);
    Object.assign(node.style, { position: 'absolute', transform: 'translate(-50%,-50%)', pointerEvents: 'auto', border: '1px solid #c4d3e2', borderRadius: '9px', padding: '5px 7px', background: '#faffffeb', color: '#365575', font: '600 11px/1.25 system-ui,sans-serif', boxShadow: '0 4px 14px #5f789c21', textAlign: 'left', whiteSpace: 'nowrap' });
    const english = document.createElement('small'); english.textContent = entry.canonicalName.toUpperCase(); Object.assign(english.style, { display: 'block', fontSize: '7px', fontWeight: '500', letterSpacing: '.35px', color: '#7c91a7', marginTop: '2px' });
    node.textContent = entry.displayNameZh; node.append(english); node.onclick = (event) => { event.stopPropagation(); onPick(entry.structureId); };
    labelLayer.append(node); labelNodes.set(entry.structureId, node);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    labelLines.append(line, dot); lineNodes.set(entry.structureId, { line, dot });
  }

  const resize = () => { const box = canvas.getBoundingClientRect(); renderer.setSize(box.width, box.height, false); camera.aspect = box.width / Math.max(box.height, 1); camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const currentDirection = () => { const direction = camera.position.clone().sub(controls.target); return direction.lengthSq() > .000001 ? direction.normalize().toArray() : [1, .48, 1]; };
  const useCameraPlan = (plan) => {
    if (!plan) return;
    targetGoal.set(plan.target.x, plan.target.y, plan.target.z);
    cameraGoal.copy(targetGoal).addScaledVector(new THREE.Vector3(...plan.direction).normalize(), plan.distance);
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!initialized || reduced) { controls.target.copy(targetGoal); camera.position.copy(cameraGoal); controls.update(); initialized = true; transitionActive = false; return; }
    transitionActive = true;
  };
  const focusSelected = () => { const mesh = meshes.get(snapshot?.selected) || meshes.values().next().value; if (!mesh) return; const plan = selectedFocusPlan(meshBounds.get(mesh.userData.structureId), currentDirection()); const group = combinedBounds([...meshBounds.values()]); const contextPlan = group && selectedFocusPlan(group, plan.direction, { context: true }); useCameraPlan({ ...plan, distance: Math.max(plan.distance, (contextPlan?.distance || 0) * .48) }); };
  const focusContext = () => { const bounds = combinedBounds([...meshBounds.values()]); if (bounds) useCameraPlan(selectedFocusPlan(bounds, currentDirection(), { context: true })); };
  const paint = () => { for (const [id, mesh] of meshes) { const plan = materialPlanForSnapshot(snapshot, id), material = mesh.material; mesh.visible = plan.visible; material.transparent = false; material.opacity = plan.opacity; material.color.set(plan.color); material.emissive.set(plan.emissive); material.emissiveIntensity = plan.emissiveIntensity; material.roughness = plan.roughness; material.metalness = plan.metalness; material.needsUpdate = true; } };
  const updateLabels = () => {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height || !snapshot?.selected) return;
    const visibleEntries = neckRegistry.filter((entry) => meshes.has(entry.structureId) && (!snapshot.isolated || entry.structureId === snapshot.selected)).map((entry) => ({ entry, anchor: labelAnchorFromBounds(meshBounds.get(entry.structureId)) }));
    const plans = layoutLabelPlans(rankedLabelEntries(visibleEntries, snapshot.selected, snapshot.isolated ? 1 : labelCapForViewport(rect.width)), { width: rect.width, height: rect.height, project: (anchor) => { const point = new THREE.Vector3(anchor.x, anchor.y, anchor.z).project(camera); return { x: (point.x * .5 + .5) * rect.width, y: (-point.y * .5 + .5) * rect.height, z: point.z }; } });
    const planned = new Map(plans.map((plan) => [plan.entry.structureId, plan]));
    selectedLabelScreen = null;
    for (const [id, node] of labelNodes) { const plan = planned.get(id), lineNodesForId = lineNodes.get(id); node.hidden = !plan?.visible; lineNodesForId.line.style.display = plan?.visible ? '' : 'none'; lineNodesForId.dot.style.display = plan?.visible ? '' : 'none'; if (!plan?.visible) continue; node.style.left = `${plan.x}px`; node.style.top = `${plan.y}px`; node.style.zIndex = plan.selected ? '8' : '3'; node.style.borderColor = plan.selected ? '#83b9f4' : '#c4d3e2'; node.style.color = plan.selected ? '#236fae' : '#365575'; node.style.boxShadow = plan.selected ? '0 5px 18px #83b9f452' : '0 4px 14px #5f789c21'; if (plan.selected) selectedLabelScreen = { x: plan.x, y: plan.y }; const startX = plan.x + (plan.lane === 'left' ? 54 : -54); const stroke = plan.selected ? '#83b9f4' : '#bdcddd'; lineNodesForId.line.setAttribute('x1', String(startX)); lineNodesForId.line.setAttribute('y1', String(plan.y)); lineNodesForId.line.setAttribute('x2', String(plan.leader.x)); lineNodesForId.line.setAttribute('y2', String(plan.leader.y)); lineNodesForId.line.setAttribute('stroke', stroke); lineNodesForId.line.setAttribute('stroke-width', plan.selected ? '1.4' : '1'); lineNodesForId.dot.setAttribute('cx', String(plan.leader.x)); lineNodesForId.dot.setAttribute('cy', String(plan.leader.y)); lineNodesForId.dot.setAttribute('r', plan.selected ? '2.5' : '1.7'); lineNodesForId.dot.setAttribute('fill', stroke); }
  };
  const updateCoach = () => {
    const rect = canvas.getBoundingClientRect(), mesh = meshes.get(snapshot?.selected), entry = entriesById.get(snapshot?.selected);
    const presentation = mesh && coachPresentationPlan(snapshot, meshBounds.get(snapshot?.selected));
    if (!presentation?.visible || !rect.width || !rect.height) { coach.group.visible = false; coachBubble.hidden = true; return; }
    const target = new THREE.Vector3(presentation.target.x, presentation.target.y, presentation.target.z), projected = target.clone().project(camera);
    const plan = coachPlacementPlan({ bounds: meshBounds.get(snapshot.selected), viewport: { width: rect.width, height: rect.height }, projectedCenter: { x: (projected.x * .5 + .5) * rect.width, y: (-projected.y * .5 + .5) * rect.height }, cameraDirection: currentDirection(), cameraRight: new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize().toArray() });
    coachGoal.set(plan.position.x, plan.position.y, plan.position.z);
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!coachInitialized || reduced) { coach.group.position.copy(coachGoal); coach.group.scale.setScalar(plan.scale); coachInitialized = true; } else { coach.group.position.lerp(coachGoal, .14); coach.group.scale.lerp(new THREE.Vector3(plan.scale, plan.scale, plan.scale), .14); }
    coach.group.visible = true; coach.update({ cameraPosition: camera.position, target, pointSide: plan.side === 'right' ? -1 : 1 });
    const coachScreen = coach.group.position.clone().add(new THREE.Vector3(0, plan.scale * .7, 0)).project(camera);
    const bubble = coachBubblePlan({ coachScreen: { x: (coachScreen.x * .5 + .5) * rect.width, y: (-coachScreen.y * .5 + .5) * rect.height }, viewport: { width: rect.width, height: rect.height }, selectedLabelScreen });
    coachBubble.hidden = false; coachBubble.style.left = `${bubble.x}px`; coachBubble.style.top = `${bubble.y}px`; coachBubble.style.width = `${bubble.width}px`; coachBubbleTitle.textContent = entry.displayNameZh; coachBubbleCopy.textContent = rect.width <= 480 ? entry.displayNameZh : `现在看的是${entry.displayNameZh}。`;
  };
  const applySnapshot = (next) => { const previous = snapshot; snapshot = next; paint(); if (meshes.size && (!previous?.selected || previous.selected !== next?.selected)) focusSelected(); else if (previous?.isolated && !next?.isolated) focusContext(); };
  controls.addEventListener('start', () => { transitionActive = false; });
  const render = () => { if (disposed) return; if (transitionActive) { const speed = .14; controls.target.lerp(targetGoal, speed); camera.position.lerp(cameraGoal, speed); if (controls.target.distanceToSquared(targetGoal) < .0000001 && camera.position.distanceToSquared(cameraGoal) < .0000001) { controls.target.copy(targetGoal); camera.position.copy(cameraGoal); transitionActive = false; } } controls.update(); updateLabels(); updateCoach(); renderer.render(scene, camera); requestAnimationFrame(render); }; requestAnimationFrame(render);
  canvas.addEventListener('pointerup', (event) => { if (event.movementX || event.movementY || !meshes.size) return; const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects([...meshes.values()], false)[0]; if (hit) onPick(hit.object.userData.structureId); });
  new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', (gltf) => { gltf.scene.traverse((node) => { if (!node.isMesh) return; const id = node.userData?.structureId || node.name; if (!entriesById.has(id)) return; node.userData.structureId = id; node.material = node.material.clone(); meshes.set(id, node); meshBounds.set(id, plainBounds(new THREE.Box3().setFromObject(node))); }); if (meshes.size !== neckRegistry.length) throw Error('Human Atlas neck nodes missing from generated runtime.'); scene.add(gltf.scene); paint(); focusSelected(); }, onError);
  return { show() { canvas.hidden = false; }, hide() { canvas.hidden = true; coachBubble.hidden = true; }, applySnapshot, focusSelected, focusContext, dispose() { disposed = true; observer.disconnect(); labelLayer.remove(); renderer.dispose(); } };
}
