import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { attachHeadSurface } from './head-surface.mjs';

// The miniature shares immutable geometry, never the main viewer's pose or camera.
export function mountRealBodyNavigator({ canvas, source, onNeckFocus = () => {} }) {
  const model = clone(source), scene = new THREE.Scene(); scene.add(model);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const camera = new THREE.PerspectiveCamera(26, 1, .01, 20), controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x98acc2, 1.7));
  const light = new THREE.DirectionalLight(0xffffff, 2.5); light.position.set(-2, 4, 3); scene.add(light);
  let neck = null;
  model.traverse(node => { if (!node.isMesh) return; node.material = node.material.clone(); node.material.color.set(node.userData.kind === 'muscle' ? '#E7EDF1' : '#F0EEE6'); node.material.emissive.set('#000000'); node.material.emissiveIntensity = 0; node.material.roughness = .7; node.material.metalness = 0; node.frustumCulled = false; if (/sternocleidomastoid/i.test(node.userData.canonicalName || '')) neck = node; });
  model.updateMatrixWorld(true);
  attachHeadSurface(model);
  model.traverse(node=>{if(node.isMesh && node.userData.kind==='bone' && node.userData.region==='head')node.visible=false;});
  const bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3());
  const neckCenter = neck ? new THREE.Box3().setFromObject(neck).getCenter(new THREE.Vector3()) : center.clone();
  const marker = document.createElement('button'); marker.className = 'real-nav-focus'; marker.type = 'button'; marker.setAttribute('aria-label','放大真实颈肩结构'); marker.title = '颈肩放大'; marker.onclick = onNeckFocus; canvas.parentElement.append(marker);
  let view = 'front', disposed = false;
  const draw = () => {
    if (disposed) return; const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    renderer.render(scene,camera); const point = neckCenter.clone().project(camera);
    marker.style.left = ((point.x * .5 + .5) * rect.width) + 'px'; marker.style.top = ((-point.y * .5 + .5) * rect.height) + 'px';
  };
  const fit = () => {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width,rect.height,false); camera.aspect=rect.width/rect.height; camera.updateProjectionMatrix();
    const size = bounds.getSize(new THREE.Vector3()), width = view === 'side' ? size.z : size.x;
    const distance = Math.max(size.y / .92, width / camera.aspect / .88) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const direction = view === 'back' ? [0,0,-1] : view === 'side' ? [1,0,0] : [0,0,1];
    controls.target.copy(center); camera.position.copy(center).addScaledVector(new THREE.Vector3(...direction),distance); controls.update(); draw();
  };
  controls.addEventListener('change',draw);
  const observer = new ResizeObserver(fit); observer.observe(canvas); fit();
  return { setView(value) { if (['front','back','side'].includes(value)) { view=value; canvas.dataset.view=value; fit(); } }, dispose() { disposed=true;observer.disconnect();controls.dispose();marker.remove();model.traverse(node=>{if(node.isMesh)node.material.dispose();});renderer.dispose(); } };
}
