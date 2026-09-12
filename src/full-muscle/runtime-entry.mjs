import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { highlightForMotion } from './rig-definition.mjs';
import { createMotionClip } from './motion-clip.mjs';
import { motionDefinitions, motionForQuery, normalizeMotionParameters, muscleProfileForMotion, motionSession } from './motion-domain.mjs';
import { createCoachC } from '../coach-c/model.mjs';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { mountRealBodyNavigator } from './navigator.mjs';
import { attachHeadSurface } from './head-surface.mjs';

let riggedAssetPromise;
const loadRiggedAsset = () => riggedAssetPromise ||= (async () => {
  const loader = new GLTFLoader();
  if (location.protocol !== 'file:') return loader.loadAsync(new URL('assets/anatomy/human-atlas/rigged-body.glb', document.baseURI).href);
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/runtime/rigged-body-offline.js';script.onload=resolve;script.onerror=()=>reject(Error('Missing offline anatomy transport. Run npm run full-muscle:build-runtime.'));document.body.append(script);});
  const compressed=Uint8Array.from(atob(globalThis.BodyMateRiggedBodyOffline),char=>char.charCodeAt(0));delete globalThis.BodyMateRiggedBodyOffline;
  const bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return loader.parseAsync(bytes,'');
})();
export async function mountNavigator(options) { const gltf = await loadRiggedAsset(); return mountRealBodyNavigator({ ...options, source: gltf.scene }); }

export { motionDefinitions, motionForQuery };
export { parameterDefinitions, motionPresets, parseMotionParameters } from './motion-parameters.mjs';
const aliases = [
  ['胸大肌', 'pectoralis major'], ['胸小肌', 'pectoralis minor'], ['胸部', 'pectoralis'], ['三角肌', 'deltoid'], ['肩部', 'deltoid'],
  ['斜方肌', 'trapezius'], ['肱二头肌', 'biceps brachii'], ['肱三头肌', 'triceps brachii'],
  ['腹外斜肌', 'external oblique'], ['臀大肌', 'gluteus maximus'], ['臀部', 'gluteus'], ['股四头肌', 'rectus femoris|vastus'],
  ['腘绳肌', 'biceps femoris|semitendinosus|semimembranosus'], ['腓肠肌', 'gastrocnemius'], ['比目鱼肌', 'soleus'], ['胫骨前肌', 'tibialis anterior'],
  ['胸锁乳突肌', 'sternocleidomastoid'], ['肩胛提肌', 'levator scapulae'], ['斜角肌', 'scalenus'],
];
export function mount({ canvas, onPick = () => {}, onReady = () => {}, onError = () => {}, onState = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .01, 30);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .1; controls.minDistance = .7; controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * .49;
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let disposed = false, loaded = false, model = null, mixer = null, activeAction = null, motion = null;
  let session = motionSession.reset(), view = 'muscle', pulseEnabled = true, selected = new Set();
  let lastTime = 0, lastState = 0, frame = 0, framing = false;
  let profile = null, dynamicClip = null;
  let headSurface = null;
  const muscleWeights = new Map();
  const meshes = new Map(), entries = [], clips = new Map(), rest = new Map();
  const cameraGoal = new THREE.Vector3(), targetGoal = new THREE.Vector3();
  const cold = new THREE.Color('#E7EDF1'), hot = new THREE.Color('#F02D33'), selectionBlue = new THREE.Color('#2388F7');
  const labStyle = document.body.classList.contains('visual-lab-active');
  const coach = labStyle ? createCoachC(THREE) : null;
  const coachBubble = document.createElement('div'); coachBubble.className = 'full-body-coach-bubble'; coachBubble.hidden = true;
  if (coach) { scene.add(coach.group); canvas.parentElement.append(coachBubble); }
  scene.add(new THREE.HemisphereLight(0xfaf9f7, 0x8595aa, 2));
  const key = new THREE.DirectionalLight(0xfff7ee, 2.7); key.position.set(2.5, 4, 3);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 2.2, bottom: -1.8, near: .1, far: 9 });
  key.shadow.bias = -.0003; key.shadow.normalBias = .006; scene.add(key);
  const fill = new THREE.DirectionalLight(0xc4ddff, 1); fill.position.set(-3, 2, -2); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.006; ground.receiveShadow = true; scene.add(ground);
  const floorGrid = new THREE.GridHelper(4, 16, 0xbac9d6, 0xd6e0e9);
  floorGrid.position.y = -.008; floorGrid.material.transparent = true; floorGrid.material.opacity = .22; scene.add(floorGrid);

  const state = () => ({ loaded, motion: session.motion, title: motion?.title || '全身解剖',
    phase: session.phase, paused: session.paused, speed: session.speed, view, pulseEnabled,
    parameters: { ...session.parameters }, parameterNotices: [...session.parameterNotices], muscleNote: profile?.note || '' });
  const emit = () => { const snapshot = state(); canvas.dataset.motion = snapshot.motion || 'rest'; canvas.dataset.paused = String(session.paused); canvas.dataset.parameters = JSON.stringify(session.parameters); onState(snapshot); };
  const fit = (id = null, immediate = false) => {
    const horizontal = id === 'push_up';
    targetGoal.set(0, horizontal ? .32 : id === 'squat' ? .78 : .88, horizontal ? .68 : 0);
    const direction = horizontal ? new THREE.Vector3(2.6, 1.1, 1.6) : new THREE.Vector3(1.8, .22, 3.2);
    const verticalFov = camera.fov * Math.PI / 180, horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const distance = Math.max((horizontal ? 1.05 : 1.85) / (2 * Math.tan(verticalFov / 2)), (horizontal ? 2 : .7) / (2 * Math.tan(horizontalFov / 2))) * (labStyle ? 1.04 : 1.22);
    cameraGoal.copy(targetGoal).add(direction.normalize().multiplyScalar(distance));
    framing = !immediate && !reduced?.matches;
    if (!framing) { camera.position.copy(cameraGoal); controls.target.copy(targetGoal); controls.update(); }
  };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
    if (loaded) fit(motion?.id, true);
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  controls.addEventListener('start', () => { framing = false; });
  const paint = (time = 0) => {
    headSurface?.setView(view);
    const phase = motion ? session.phase : 0;
    const highlight = highlightForMotion(motion?.id, phase, time, { pulseEnabled, reducedMotion: reduced?.matches, paused: session.paused });
    for (const [id, mesh] of meshes) {
      const muscle = mesh.userData.kind === 'muscle', active = selected.has(id), material = mesh.material;
      mesh.visible = (!muscle || view !== 'bone') && !(headSurface && view === 'muscle' && mesh.userData.kind === 'bone' && mesh.userData.region === 'head');
      if (!muscle) continue;
      material.transparent = view === 'xray'; material.opacity = view === 'xray' ? (active ? .8 : .16) : 1;
      material.depthWrite = view !== 'xray'; mesh.castShadow = view !== 'xray';
      material.color.copy(cold); material.emissive.set('#3D0608'); material.emissiveIntensity = 0;
      if (active) {
        const weight = muscleWeights.get(id) ?? 1;
        material.color.lerp(motion ? hot : selectionBlue, highlight.strength * weight); material.emissiveIntensity = highlight.emissive * weight;
      }
    }
  };
  const restore = ({ stopSession = true } = {}) => {
    if (stopSession) session = motionSession.stop();
    mixer?.stopAllAction(); activeAction = null; motion = null;
    if (dynamicClip) { mixer?.uncacheClip(dynamicClip); dynamicClip = null; }
    profile = null; muscleWeights.clear();
    for (const [node, transform] of rest) { node.position.copy(transform.position); node.quaternion.copy(transform.quaternion); }
    model?.updateMatrixWorld(true);
  };
  const stopExercise = ({ focus = true } = {}) => { restore(); selected.clear(); paint(); if (focus) fit(); emit(); return true; };
  const playMotion = (id, input = {}, { preservePlayback = false } = {}) => {
    if (!loaded || !clips.has(id)) return null;
    const previous = state();
    const normalized = normalizeMotionParameters(id, input);
    // Generate first: a rejected clip must not destroy the current animation.
    const nextClip = createMotionClip(id, normalized.parameters);
    restore({ stopSession: false });
    session = motionSession.play(id, normalized.parameters, preservePlayback && previous.motion === id, preservePlayback ? previous.paused : Boolean(reduced?.matches));
    motion = motionDefinitions.find((item) => item.id === id);
    profile = muscleProfileForMotion(id, session.parameters);
    const groups = profile.groups.map(group => ({ ...group, pattern: new RegExp(group.match, 'i') }));
    const matches = entries.filter((entry) => {
      if (entry.kind !== 'muscle') return false;
      const group = groups.find(candidate => candidate.pattern.test(entry.canonicalName));
      if (group) muscleWeights.set(entry.structureId, group.weight);
      return Boolean(group);
    });
    selected = new Set(matches.map((entry) => entry.structureId));
    dynamicClip = nextClip; activeAction = mixer.clipAction(dynamicClip); activeAction.reset().play(); activeAction.paused = true;
    activeAction.time = session.phase * motion.duration;
    mixer.update(0); model.updateMatrixWorld(true); paint(); if (!preservePlayback) fit(id); emit();
    return { ...motion, parameters: { ...session.parameters }, notices: [...session.parameterNotices], profile, count: matches.length, entries: matches };
  };
  const findAll = (query) => {
    const normalized = String(query || '').trim().toLowerCase(); if (!normalized) return [];
    const alias = aliases.find(([zh]) => normalized.includes(zh));
    return entries.filter((entry) => entry.kind === 'muscle' && (alias ? new RegExp(alias[1], 'i').test(entry.canonicalName) : entry.canonicalName.toLowerCase().includes(normalized)));
  };
  const selectGroup = (matched, { notify = true } = {}) => {
    restore(); selected = new Set(matched.map((entry) => entry.structureId)); paint(); fit(); emit();
    if (notify && matched[0]) onPick(matched[0]); return matched;
  };
  let pointerStart = null;
  const down = (event) => { pointerStart = [event.clientX, event.clientY]; };
  const up = (event) => {
    if (!loaded || !pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 5) return;
    pointerStart = null;
    // While a clip is playing, clicking inspects its current pose without resetting it.
    const rect = canvas.getBoundingClientRect(), raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const candidates = [...meshes.values()].filter((mesh) => mesh.visible);
    for (const mesh of candidates) { mesh.boundingSphere = null; mesh.boundingBox = null; }
    const hit = raycaster.intersectObjects(candidates, false)[0];
    if (!hit) return;
    const entry = hit.object.userData;
    if (!motion) { selected = new Set([entry.structureId]); paint(); }
    onPick(entry);
  };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up);
  const render = (timestamp) => {
    if (disposed) return;
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .05) : 0; lastTime = timestamp;
    if (motion && activeAction) {
      session = motionSession.tick(delta);
      activeAction.time = session.phase * motion.duration;
      mixer.update(0);
    }
    if (model) model.updateMatrixWorld(true);
    if (framing) {
      const smoothing = 1 - Math.exp(-delta * 9);
      camera.position.lerp(cameraGoal, smoothing); controls.target.lerp(targetGoal, smoothing);
      if (camera.position.distanceTo(cameraGoal) < .001) framing = false;
    }
    paint(timestamp); controls.update();
    if (coach && loaded) {
      const rect = canvas.getBoundingClientRect(), mesh = meshes.get(selected.values().next().value) || [...meshes.values()].find(item => /pectoralis major/i.test(item.userData.canonicalName));
      if (mesh && rect.width && rect.height) {
        mesh.computeBoundingBox(); const target = mesh.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld), projected = target.clone().project(camera);
        const screenX = rect.width - (rect.width <= 480 ? 44 : 66), screenY = rect.height * .74;
        coach.group.position.set(screenX / rect.width * 2 - 1, 1 - screenY / rect.height * 2, projected.z).unproject(camera);
        const scale = camera.position.distanceTo(target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * .24;
        coach.group.scale.setScalar(scale); coach.update({ cameraPosition: camera.position, target, pointSide: -1 });
        coachBubble.hidden = false; coachBubble.textContent = motion ? motion.title + ' · 观察参与肌群' : selected.size ? '已定位所选结构' : '完整人体 · 旋转观察';
        coachBubble.style.left = Math.max(8, screenX - 140) + 'px'; coachBubble.style.top = Math.max(12, canvas.offsetTop + screenY - rect.height * .16) + 'px';
      }
    }
    renderer.render(scene, camera);
    if (loaded && timestamp - lastState > 100) { emit(); lastState = timestamp; }
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
  loadRiggedAsset().then((gltf) => {
    if (disposed) return;
    model = clone(gltf.scene);
    model.traverse((node) => {
      if (node.isBone) rest.set(node, { position: node.position.clone(), quaternion: node.quaternion.clone() });
      if (!node.isMesh) return;
      if (!node.isSkinnedMesh || !node.geometry.attributes.skinWeight) throw Error('Human structure has no skin binding.');
      node.frustumCulled = false; node.castShadow = true; node.receiveShadow = false;
      node.material = node.material.clone(); node.material.roughness = .66; node.material.metalness = 0;
      const metadata = node.userData; entries.push(metadata); meshes.set(metadata.structureId, node);
    });
    headSurface = attachHeadSurface(model);
    scene.add(model); mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) clips.set(clip.name, clip);
    loaded = true; canvas.hidden = false; resize(); fit(null, true); paint();
    onReady({ count: entries.filter((entry) => entry.kind === 'muscle').length, boneCount: entries.filter((entry) => entry.kind !== 'muscle').length, entries, motions: motionDefinitions });
    emit();
  }).catch(onError);
  const changeMotionPreference = () => { if (reduced?.matches && activeAction) { session = motionSession.setPaused(true); emit(); } };
  reduced?.addEventListener('change', changeMotionPreference);
  return {
    findAll, selectGroup, playMotion, stopExercise, getState: state,
    setParameters(input) { return motion ? playMotion(motion.id, { ...session.parameters, ...input }, { preservePlayback: true }) : null; },
    playPushUp() { return playMotion('push_up')?.entries || []; },
    select(id) { const entry = meshes.get(id)?.userData; return entry ? selectGroup([entry])[0] : null; },
    focusAll() { fit(motion?.id); },
    resetCamera() { stopExercise(); },
    setPaused(value) { session = motionSession.setPaused(Boolean(value)); emit(); },
    setSpeed(value) { session = motionSession.setSpeed(value); emit(); },
    seek(value) { if (!activeAction) return; session = motionSession.seek(value); activeAction.time = session.phase * motion.duration; mixer.update(0); model.updateMatrixWorld(true); paint(); emit(); },
    setView(value) { if (['muscle', 'bone', 'xray'].includes(value)) { view = value; paint(); emit(); } },
    setPulse(value) { pulseEnabled = Boolean(value); paint(); emit(); },
    dispose() {
      coachBubble.remove();
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); mixer?.stopAllAction();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); reduced?.removeEventListener('change', changeMotionPreference);
      scene.traverse((node) => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } }); renderer.dispose();
    },
  };
}
