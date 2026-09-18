import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const environmentFinishes = Object.freeze({
  platform: { roughness: .3, metalness: .15, clearcoat: .45, envMapIntensity: 1.05, platform: true },
});

export const environmentAssetPaths = Object.freeze({
  platform: 'assets/environment/runtime/observation-platform.glb',
});

// Center the planted support footprint, not the moving torso. This keeps feet
// (and push-up palms) stationary throughout a rep without altering the rig.
export function alignBodyToPlatform(model, motionId = null) {
  model.updateMatrixWorld(true);
  const footprint = new THREE.Box3(), point = new THREE.Vector3();
  model.traverse((node) => {
    if (!node.isSkinnedMesh || !(node.userData.region === 'foot' || motionId === 'push_up' && node.userData.region === 'hand')) return;
    for (let index = 0; index < node.geometry.attributes.position.count; index += 1) {
      node.getVertexPosition(index, point).applyMatrix4(node.matrixWorld);
      footprint.expandByPoint(point);
    }
  });
  if (footprint.isEmpty()) return;
  footprint.getCenter(point);
  model.position.add(new THREE.Vector3(-point.x, -footprint.min.y, -point.z));
  model.updateMatrixWorld(true);
}

function loadGltf(url) {
  return new Promise((resolve, reject) => new GLTFLoader().load(url, resolve, undefined, reject));
}

function finishMaterial(source, finish, environmentTexture, lightGain) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: source.map,
    normalMap: source.normalMap,
    roughness: finish.roughness,
    metalness: finish.metalness,
    clearcoat: finish.clearcoat,
    clearcoatRoughness: .22,
    envMapIntensity: finish.envMapIntensity,
    envMap: environmentTexture,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
  });
  if (source.normalScale) material.normalScale.copy(source.normalScale).multiplyScalar(.08);
  material.name = 'BodyMate silver ceramic / embedded light mask';
  // The imported atlas supplies material boundaries, not baked-in illumination.
  // Blue texels become luminous inserts; dark trim becomes reflective silver.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.labLightGain = lightGain;
    shader.vertexShader = 'varying vec3 labPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nlabPosition = position;');
    shader.fragmentShader = 'uniform float labLightGain;\nvarying vec3 labPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      float labMetal = 0.0;
      float labLight = 0.0;
      #ifdef USE_MAP
        vec3 atlas = texture2D(map, vMapUv).rgb;
        float luminance = dot(atlas, vec3(0.2126, 0.7152, 0.0722));
        labLight = smoothstep(0.06, 0.24, min(atlas.g, atlas.b) - atlas.r)
          * smoothstep(0.18, 0.45, atlas.b);
        ${finish.platform ? `labLight = max(labLight, (1.0 - smoothstep(0.002, 0.005, abs(labPosition.y - 0.032))) * smoothstep(0.462, 0.477, length(labPosition.xz)));` : ''}
        ${finish.ceiling ? `float radial = length(labPosition.xz);
          float rings = min(abs(radial - 0.32), min(abs(radial - 0.415), abs(radial - 0.474)));
          labLight = max(labLight, (1.0 - smoothstep(0.001, 0.003, rings)) * (1.0 - smoothstep(0.06, 0.11, labPosition.y)));` : ''}
        ${finish.wall ? `float rail = (1.0 - smoothstep(0.0015, 0.004, abs(abs(labPosition.x) - 0.432))) * smoothstep(0.02, 0.08, labPosition.y);
          float baseRail = 1.0 - smoothstep(0.0015, 0.0035, abs(labPosition.y - 0.03));
          labLight = max(labLight, max(rail, baseRail));` : ''}
        labMetal = (1.0 - smoothstep(0.36, 0.70, luminance)) * (1.0 - labLight);
        diffuseColor.rgb = mix(vec3(0.68, 0.72, 0.8), vec3(0.52, 0.59, 0.7), labMetal);
        diffuseColor.rgb *= mix(0.94, 1.04, luminance);
        diffuseColor.rgb *= mix(0.48, 1.0, smoothstep(0.02, 0.18, luminance));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.35, 0.65), labLight);
        totalEmissiveRadiance += vec3(0.18, 3.4, 12.0) * labLight * labLightGain;
      #endif
    `).replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = mix(roughness, 0.14, labMetal);
    `).replace('#include <metalnessmap_fragment>', `
      float metalnessFactor = mix(metalness, 0.84, labMetal);
    `);
  };
  material.customProgramCacheKey = () => `bodymate-silver-ceramic-v3-${Boolean(finish.platform)}-${Boolean(finish.ceiling)}-${Boolean(finish.wall)}`;
  const kept = new Set([source.map, source.normalMap]);
  const discarded = new Set(Object.values(source).filter(value => value?.isTexture && !kept.has(value)));
  for (const texture of discarded) texture.dispose();
  source.dispose();
  return material;
}

function configureAsset(root, finish, environmentTexture, lightGain, anisotropy) {
  const replacements = new Map();
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = true;
    const sources = Array.isArray(node.material) ? node.material : [node.material];
    const replacement = sources.map((source) => {
      if (!replacements.has(source)) {
        const material = finishMaterial(source, finish, environmentTexture, lightGain);
        for (const texture of [material.map, material.normalMap]) if (texture) texture.anisotropy = anisotropy;
        replacements.set(source, material);
      }
      return replacements.get(source);
    });
    node.material = Array.isArray(node.material) ? replacement : replacement[0];
  });
  return root;
}

// Environment subtraction (mobile-first): only the observation platform under
// the figure remains; ceiling ring, rear portal, wall bays and the reflective
// floor were removed on purpose. Parallax groups stay so the MoonBit
// environment frame contract is unchanged.
function assetInstance(scene, { position, rotation = [0, 0, 0], scale }) {
  const instance = scene.clone(true);
  instance.position.set(...position);
  instance.rotation.set(...rotation);
  instance.scale.set(...scale);
  return instance;
}

function disposeMaterial(material, ignoredTexture = null) {
  for (const value of Object.values(material)) if (value?.isTexture && value !== ignoredTexture) value.dispose();
  material.dispose();
}

// The navigator reuses the imported platform and its silver / blue finish.
// Its loader owns these resources independently of the animated main viewport.
export function createNavigatorPlatform(asset, environmentTexture = null) {
  configureAsset(asset, environmentFinishes.platform, environmentTexture, { value: .8 }, 4);
  const platform = assetInstance(asset, { position: [0, 0, 0], scale: [1.1, .9, 1.1] });
  platform.name = 'navigator-observation-platform';
  platform.userData.sourceAsset = environmentAssetPaths.platform;
  const bounds = new THREE.Box3().setFromObject(platform);
  if (!bounds.isEmpty()) {
    const center = bounds.getCenter(new THREE.Vector3());
    platform.position.set(-center.x, -bounds.max.y, -center.z);
  }
  return platform;
}

export function disposeNavigatorPlatform(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  for (const material of materials) {
    for (const [key, value] of Object.entries(material)) if (value?.isTexture && key !== 'envMap') textures.add(value);
    material.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
}

export function createLabEnvironment({ scene, camera, renderer, loadAsset = loadGltf, onAssetError = (error, url) => console.warn(`BodyMate environment asset failed: ${url}`, error) }) {
  const environmentStartedAt = performance.now();
  const previousBackground = scene.background;
  scene.background = new THREE.Color(0xeeeff9);
  let environmentTexture = null, environmentTarget = null;
  const lightGain = { value: 1 };
  const anisotropy = Math.min(8, renderer.capabilities?.getMaxAnisotropy?.() || 1);
  if (renderer.isWebGLRenderer) {
    const studio = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    environmentTarget = pmrem.fromScene(studio, .04);
    environmentTexture = environmentTarget.texture;
    studio.dispose();
    pmrem.dispose();
  }
  const root = new THREE.Group();
  root.name = 'bodymate-lab-environment';
  const far = new THREE.Group(), mid = new THREE.Group();
  far.name = 'lab-far-assets'; mid.name = 'lab-mid-assets';
  root.add(far, mid);
  scene.add(root);
  const platformRoot = new THREE.Group();
  platformRoot.name = 'lab-observation-platform';
  // The contact surface must share the body's fixed world origin, not parallax.
  root.add(platformRoot);

  let disposed = false;
  const assetCache = new Map();
  const loadOnce = (url) => {
    if (!assetCache.has(url)) assetCache.set(url, Promise.resolve().then(() => loadAsset(url)));
    return assetCache.get(url);
  };
  const install = (url, target, finish, createInstances) => {
    target.userData.assetState = 'loading';
    return loadOnce(url).then((gltf) => {
      if (disposed) {
        gltf.scene.traverse((node) => {
          node.geometry?.dispose();
          if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) disposeMaterial(material);
        });
        return;
      }
      configureAsset(gltf.scene, finish, environmentTexture, lightGain, anisotropy);
      target.add(...createInstances(gltf.scene));
      target.userData.assetState = 'loaded';
    }).catch((error) => {
      if (disposed) return;
      target.userData.assetState = 'failed';
      onAssetError(error, url);
    });
  };
  const pendingAssets = [
    install(environmentAssetPaths.platform, platformRoot, environmentFinishes.platform, (asset) => {
      const platform = assetInstance(asset, { position: [0, 0, 0], scale: [3.27, 1.44, 3.27] });
      const bounds = new THREE.Box3().setFromObject(platform);
      if (!bounds.isEmpty()) {
        const center = bounds.getCenter(new THREE.Vector3());
        platform.position.set(-center.x, -bounds.max.y, -center.z);
      }
      return [platform];
    }),
  ];
  let assetsReady = false, firstCompleteFrameRecorded = false;
  const ready = Promise.allSettled(pendingAssets).then((results) => { assetsReady = true; return results; });

  const hemisphere = new THREE.HemisphereLight(0xf6f9ff, 0x7f90a9, .85);
  const key = new THREE.DirectionalLight(0xfffbf5, 2.35);
  key.position.set(2.6, 4.2, 3.1); key.castShadow = true; key.shadow.mapSize.set(1536, 1536);
  Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.7, bottom: -2, near: .1, far: 10 });
  key.shadow.bias = -.0003; key.shadow.normalBias = .006;
  const fill = new THREE.DirectionalLight(0xe1e8f0, .92); fill.position.set(-3.4, 2.2, -2.6);
  const rim = new THREE.DirectionalLight(0xd5e6fa, 1.2); rim.position.set(-2.4, 2.5, 2.8);
  scene.add(hemisphere, key, fill, rim);

  // Supersampling resolves geometry edges without an extra softening FXAA pass
  // or the cost of multisampling the already enlarged HDR render targets.
  const composer = renderer.isWebGLRenderer ? new EffectComposer(renderer) : null;
  let bloom = null, output = null;
  if (composer) {
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .14, .2, 2.5);
    composer.addPass(bloom);
    output = new OutputPass();
    composer.addPass(output);
  }

  let lastFrame = null;
  const resize = ({ width, height, pixelRatio }) => {
    if (!(width > 0 && height > 0 && Number.isFinite(width * height))) return;
    // Supersample ordinary displays too; bound GPU memory on large / high-DPI views.
    const ratio = Math.min(Math.max(pixelRatio || 1, 1.5), 2, Math.sqrt(3_000_000 / (width * height)));
    renderer.setPixelRatio(ratio);
    composer?.setPixelRatio(ratio);
    composer?.setSize(width, height);
  };
  const update = ({ frame }) => {
    lastFrame = frame;
    far.position.set(frame.parallaxX * frame.farParallax, 0, frame.parallaxZ * frame.farParallax);
    mid.position.set(frame.parallaxX * frame.midParallax, 0, frame.parallaxZ * frame.midParallax);
    key.intensity = frame.keyIntensity;
    fill.intensity = frame.fillIntensity;
    rim.intensity = frame.rimIntensity;
    rim.position.set(Math.sin(frame.rimAzimuth) * 3.6, 2.65, Math.cos(frame.rimAzimuth) * 3.6);
    lightGain.value = .75 + frame.platformEmissive;
  };
  return {
    update, resize,
    ready,
    render() {
      if (lastFrame?.enableBloom && composer) composer.render(); else renderer.render(scene, camera);
      if (assetsReady && !firstCompleteFrameRecorded) {
        firstCompleteFrameRecorded = true;
        performance.measure('bodymate-environment-first-complete-frame', { start: environmentStartedAt, end: performance.now() });
      }
    },
    get frame() { return lastFrame; },
    dispose() {
      disposed = true;
      scene.remove(root, hemisphere, key, fill, rim);
      scene.background = previousBackground;
      environmentTarget?.dispose();
      const geometries = new Set(), assetMaterials = new Set();
      root.traverse((node) => {
        if (node.geometry && !geometries.has(node.geometry)) { geometries.add(node.geometry); node.geometry.dispose(); }
        if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) assetMaterials.add(material);
      });
      for (const material of assetMaterials) disposeMaterial(material, environmentTexture);
      key.shadow.map?.dispose();
      bloom?.dispose(); output?.dispose(); composer?.dispose();
    },
  };
}
