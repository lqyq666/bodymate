import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createLabEnvironment, createNavigatorPlatform, disposeNavigatorPlatform, environmentAssetPaths } from '../src/full-muscle/lab-environment.mjs';

test('laboratory scene starts with asset containers only and one shadow light', () => {
  const scene = new THREE.Scene();
  const renderer = { setPixelRatio() {} };
  const environment = createLabEnvironment({ scene, camera: new THREE.PerspectiveCamera(), renderer, loadAsset: async () => ({ scene: new THREE.Group() }) });
  const root = scene.getObjectByName('bodymate-lab-environment');
  assert.ok(root);
  assert.ok(root.getObjectByName('lab-far-assets'));
  assert.ok(root.getObjectByName('lab-mid-assets'));
  let meshCount = 0;
  root.traverse((node) => { if (node.isMesh) meshCount += 1; });
  assert.equal(meshCount, 0);
  assert.equal(scene.children.filter((item) => item.isLight && item.castShadow).length, 1);
  environment.update({ frame: {
    parallaxX: 1, parallaxZ: 0, farParallax: .005, midParallax: .02, nearParallax: .05,
    showCloseDetail: true, detailOpacity: 1, showTransmission: true,
    keyIntensity: 2.3, fillIntensity: .9, rimIntensity: 1.2, rimAzimuth: 1,
    platformEmissive: .5, enableBloom: true,
  } });
  assert.ok(root.getObjectByName('lab-mid-assets').position.x > root.getObjectByName('lab-far-assets').position.x);
  environment.dispose();
  assert.equal(scene.getObjectByName('bodymate-lab-environment'), undefined);
});

function fakeAsset() {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
  return { scene };
}

test('environment GLBs load once per stable path with no procedural fallback geometry', async () => {
  const scene = new THREE.Scene(), calls = [];
  const environment = createLabEnvironment({
    scene,
    camera: new THREE.PerspectiveCamera(),
    renderer: { setPixelRatio() {} },
    loadAsset: async (url) => { calls.push(url); return fakeAsset(); },
  });
  await environment.ready;
  assert.equal(new Set(calls).size, 4);
  assert.equal(calls.length, 4);
  const root = scene.getObjectByName('bodymate-lab-environment');
  for (const name of ['lab-observation-platform', 'lab-ceiling-ring', 'lab-rear-portal', 'lab-curved-wall-bays']) {
    assert.equal(root.getObjectsByProperty('name', name).length, 1);
    assert.equal(root.getObjectByName(name).userData.assetState, 'loaded');
    assert.equal(root.getObjectByName(`${name}-fallback`), undefined);
  }
  assert.equal(root.getObjectByName('lab-curved-wall-bays').children.length, 10);
  const installedPlatform = root.getObjectByName('lab-observation-platform').children[0];
  const installedMesh = installedPlatform.children.find((child) => child.isMesh);
  assert.equal(installedMesh.material.isMeshPhysicalMaterial, true);
  assert.equal(installedMesh.material.map, null);
  const floor = root.getObjectByName('lab-floor-from-platform-glb');
  assert.ok(floor);
  assert.notEqual(floor.geometry, installedMesh.geometry);
  assert.equal(floor.geometry.attributes.position.count, installedMesh.geometry.attributes.position.count);
  assert.equal(installedMesh.material.aoMap, null);
  assert.equal(installedMesh.material.metalnessMap, null);
  const platformBounds = new THREE.Box3().setFromObject(installedPlatform);
  const platformCenter = platformBounds.getCenter(new THREE.Vector3());
  assert.ok(Math.hypot(platformCenter.x, platformCenter.z) < 1e-8);
  assert.ok(Math.abs(platformBounds.max.y) < 1e-8, 'Platform top defines the body contact height');
  const initialPlatformPosition = installedPlatform.getWorldPosition(new THREE.Vector3());
  environment.update({ frame: {
    parallaxX: 1, parallaxZ: -1, farParallax: .01, midParallax: .03,
    keyIntensity: 2, fillIntensity: 1, rimIntensity: 1, rimAzimuth: 2, platformEmissive: .5,
  } });
  assert.ok(installedPlatform.getWorldPosition(new THREE.Vector3()).distanceTo(initialPlatformPosition) < 1e-8, 'Camera parallax must not move the platform beneath the body');
  environment.dispose();
});

test('failed or late environment loads stay empty and cannot revive a disposed scene', async () => {
  const failedScene = new THREE.Scene(), errors = [];
  const failed = createLabEnvironment({
    scene: failedScene,
    camera: new THREE.PerspectiveCamera(),
    renderer: { setPixelRatio() {} },
    loadAsset: async () => { throw Error('offline'); },
    onAssetError: (error, url) => errors.push([error.message, url]),
  });
  await failed.ready;
  assert.equal(errors.length, 4);
  assert.equal(failedScene.getObjectByName('lab-observation-platform').children.length, 0);
  assert.equal(failedScene.getObjectByName('lab-observation-platform').userData.assetState, 'failed');
  failed.dispose();

  const lateScene = new THREE.Scene(), resolvers = [];
  const late = createLabEnvironment({
    scene: lateScene,
    camera: new THREE.PerspectiveCamera(),
    renderer: { setPixelRatio() {} },
    loadAsset: () => new Promise((resolve) => resolvers.push(resolve)),
  });
  await Promise.resolve();
  late.dispose();
  for (const resolve of resolvers) resolve(fakeAsset());
  await late.ready;
  assert.equal(lateScene.getObjectByName('bodymate-lab-environment'), undefined);
});

test('environment keeps post-processing but contains no procedural layout geometry', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/full-muscle/lab-environment.mjs', import.meta.url), 'utf8'));
  assert.match(source, /UnrealBloomPass/);
  assert.match(source, /OutputPass/);
  assert.match(source, /2\.5/);
  assert.doesNotMatch(source, /new THREE\.(?:Circle|Box|Torus|Cylinder|Plane)Geometry/);
  assert.doesNotMatch(source, /build(?:Shell|Platform|Landmarks|ObservationPanels|ReferenceAccents)/);
});

test('finishes preserve imported detail textures and leave the anatomy environment unchanged', async () => {
  const scene = new THREE.Scene();
  const anatomyEnvironment = new THREE.Texture();
  scene.environment = anatomyEnvironment;
  const assets = [];
  const environment = createLabEnvironment({
    scene, camera: new THREE.PerspectiveCamera(), renderer: { setPixelRatio() {}, capabilities: { getMaxAnisotropy: () => 16 } },
    loadAsset: async () => {
      const asset = fakeAsset();
      const source = asset.scene.children[0].material;
      source.map = new THREE.Texture();
      source.normalMap = new THREE.Texture();
      source.roughnessMap = new THREE.Texture();
      assets.push({ asset, map: source.map, normal: source.normalMap });
      return asset;
    },
  });
  await environment.ready;
  for (const { asset, map, normal } of assets) {
    assert.equal(asset.scene.children[0].material.map, map);
    assert.equal(asset.scene.children[0].material.normalMap, normal);
    assert.equal(asset.scene.children[0].material.roughnessMap, null);
    assert.equal(map.anisotropy, 8);
    assert.equal(normal.anisotropy, 8);
  }
  assert.equal(scene.environment, anatomyEnvironment);
  environment.dispose();
  assert.equal(scene.environment, anatomyEnvironment);
  anatomyEnvironment.dispose();
});

test('laboratory supersamples fine detail within a fixed pixel budget and ignores hidden canvas sizes', async () => {
  const ratios = [];
  const environment = createLabEnvironment({
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(),
    renderer: { setPixelRatio(ratio) { ratios.push(ratio); } },
    loadAsset: async () => ({ scene: new THREE.Group() }),
  });
  for (const size of [
    { width: 810, height: 629, pixelRatio: 1 },
    { width: 350, height: 430, pixelRatio: 3 },
    { width: 3840, height: 2160, pixelRatio: 3 },
  ]) {
    environment.resize(size);
    const ratio = ratios.at(-1);
    assert.ok(Number.isFinite(ratio) && ratio > 0);
    assert.ok(size.width * size.height * ratio ** 2 <= 3_000_001, 'Large high-DPI views must not allocate unbounded render targets');
  }
  assert.equal(ratios[0], 1.5, 'Ordinary displays also need supersampled anatomy detail');
  assert.equal(ratios[1], 2, 'High-DPI detail must not be restricted to the old 1.25 scale');
  environment.resize({ width: 0, height: 0, pixelRatio: 2 });
  assert.equal(ratios.length, 3, 'Hidden mounts must not invalidate the active render size');
  await environment.ready;
  environment.dispose();
});

test('navigator platform reuses imported geometry, centers its contact plane and releases owned resources only', () => {
  const { scene } = fakeAsset(), mesh = scene.children[0];
  mesh.position.set(.3, .2, -.4);
  const original = Array.from(mesh.geometry.attributes.position.array);
  const texture = new THREE.Texture(), studio = new THREE.Texture();
  mesh.material.map = texture;
  const platform = createNavigatorPlatform(scene, studio);
  assert.equal(platform.userData.sourceAsset, environmentAssetPaths.platform);
  assert.equal(platform.children[0].geometry, mesh.geometry);
  assert.deepEqual(Array.from(mesh.geometry.attributes.position.array), original);
  const bounds = new THREE.Box3().setFromObject(platform), center = bounds.getCenter(new THREE.Vector3());
  assert.ok(Math.hypot(center.x, center.z) < 1e-8);
  assert.ok(Math.abs(bounds.max.y) < 1e-8);
  let geometryDisposals = 0, textureDisposals = 0, studioDisposals = 0;
  mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  texture.addEventListener('dispose', () => textureDisposals++);
  studio.addEventListener('dispose', () => studioDisposals++);
  disposeNavigatorPlatform(platform);
  assert.equal(geometryDisposals, 1);
  assert.equal(textureDisposals, 1);
  assert.equal(studioDisposals, 0, 'The renderer owns the studio environment, not the platform');
  studio.dispose();
});
