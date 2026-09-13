import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { attachHeadSurface } from './head-surface.mjs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { alignBodyToPlatform, createNavigatorPlatform, disposeNavigatorPlatform, environmentAssetPaths } from './lab-environment.mjs';
import { applySculptureFinish } from './sculpture-material.mjs';

// The miniature shares immutable geometry, never the main viewer's pose or camera.
export function mountRealBodyNavigator({ canvas, source }) {
  const model = clone(source), scene = new THREE.Scene(); scene.add(model);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio, 1.5), 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const studio = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromScene(studio, .04);
  studio.dispose(); pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(26, 1, .01, 20), controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = false;
  controls.minPolarAngle = Math.PI * .32; controls.maxPolarAngle = Math.PI * .49;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9bdc4, 1.7));
  const light = new THREE.DirectionalLight(0xffffff, 2.5); light.position.set(-2, 4, 3); scene.add(light);
  light.castShadow = true; light.shadow.mapSize.set(512, 512);
  Object.assign(light.shadow.camera, { left: -.85, right: .85, top: 1.9, bottom: -.5, near: .1, far: 8 });
  light.shadow.bias = -.0003; light.shadow.normalBias = .005;
  model.traverse(node => { if (!node.isMesh) return; node.material = applySculptureFinish(node.material.clone(), node.userData.kind); node.castShadow = true; node.frustumCulled = false; });
  model.updateMatrixWorld(true);
  const headSurface = attachHeadSurface(model, { sculpture: true });
  alignBodyToPlatform(model);
  model.traverse(node=>{if(node.isMesh && node.userData.kind==='bone' && node.userData.region==='head')node.visible=false;});
  const bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3());
  let view = 'front', disposed = false, platform = null;
  const draw = () => {
    if (disposed) return; const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    renderer.render(scene,camera);
  };
  const fit = () => {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width,rect.height,false); camera.aspect=rect.width/rect.height; camera.updateProjectionMatrix();
    const size = bounds.getSize(new THREE.Vector3()), width = view === 'side' ? size.z : size.x;
    const distance = Math.max(size.y / .92, width / camera.aspect / .88) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const direction = view === 'back' ? [0,.12,-1] : view === 'side' ? [1,.12,0] : [0,.12,1];
    controls.target.copy(center); camera.position.copy(center).addScaledVector(new THREE.Vector3(...direction).normalize(),distance); controls.update(); draw();
  };
  controls.addEventListener('change',draw);
  const observer = new ResizeObserver(fit); observer.observe(canvas); fit();
  canvas.dataset.platform = 'loading';
  new GLTFLoader().loadAsync(new URL(environmentAssetPaths.platform, document.baseURI).href).then(gltf => {
    if (disposed) { disposeNavigatorPlatform(gltf.scene); return; }
    platform = createNavigatorPlatform(gltf.scene, environmentTarget.texture); scene.add(platform);
    bounds.union(new THREE.Box3().setFromObject(platform)); bounds.getCenter(center);
    canvas.dataset.platform = 'loaded'; fit();
  }).catch(error => {
    if (!disposed) { canvas.dataset.platform = 'failed'; console.warn('Navigator platform could not load; anatomy remains available.', error); }
  });
  return { setView(value) { if (['front','back','side'].includes(value)) { view=value; canvas.dataset.view=value; fit(); } }, dispose() {
    disposed=true;observer.disconnect();controls.dispose();
    model.traverse(node=>{if(node.isMesh)node.material.dispose();});
    headSurface.group.traverse(node=>node.geometry?.dispose());
    if (platform) disposeNavigatorPlatform(platform);
    light.shadow.map?.dispose(); environmentTarget.dispose(); renderer.dispose();
  } };
}
