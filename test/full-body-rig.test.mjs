import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { NodeIO } from '@gltf-transform/core';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import '../assets/runtime/moonbit-core.js';
import { rigJoints, motionDefinitions, motionForQuery, highlightForMotion, sampleMotion } from '../src/full-muscle/rig-definition.mjs';
import { fullMuscleExclusionReason } from '../src/anatomy/full-muscle-policy.mjs';
import { createMotionClip } from '../src/full-muscle/motion-clip.mjs';
import { alignBodyToPlatform } from '../src/full-muscle/lab-environment.mjs';
import { verifyCommittedRiggedBody } from '../scripts/build-rigged-body.mjs';

const runtime = await readFile(new URL('../src/full-muscle/runtime-entry.mjs', import.meta.url), 'utf8');
const asset = runtime.match(/assets\/anatomy\/human-atlas\/[\w-]+\.glb/)[0];
const document = await new NodeIO().read(fileURLToPath(new URL(`../${asset}`, import.meta.url)));
const bytes = await readFile(new URL(`../${asset}`, import.meta.url));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const meshes = []; gltf.scene.traverse((node) => { if (node.isSkinnedMesh) meshes.push(node); });
const mixer = new THREE.AnimationMixer(gltf.scene);
const point = (name) => gltf.scene.getObjectByName(name).getWorldPosition(new THREE.Vector3());
const pose = (clip, phase) => { mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().play(); action.time = phase * clip.duration; mixer.update(0); gltf.scene.updateMatrixWorld(true); };

test('clean-clone build verifies the committed rig without rewriting the large asset', async () => {
  const manifest = await verifyCommittedRiggedBody();
  assert.equal(manifest.muscleCount, 415);
  assert.equal(manifest.joints.length, rigJoints.length);
  assert.deepEqual(manifest.motions.map((motion) => motion.id), motionDefinitions.map((motion) => motion.id));
});

test('rigged-motion metadata retains one standard observation baseline for each adjustable motion', async () => {
  const manifest = await verifyCommittedRiggedBody();
  assert.deepEqual(manifest.motions.filter((motion) => motion.parameters.length).map((motion) => ({
    id: motion.id,
    baselines: motion.presets.filter((preset) => preset.isBaseline).map((preset) => preset.title),
  })), [
    { id: 'push_up', baselines: ['标准'] },
    { id: 'squat', baselines: ['标准'] },
  ]);
});

test('the displayed human has a shared skeleton and normalized vertex binding on every muscle', () => {
  const skins = document.getRoot().listSkins();
  assert.equal(skins.length, 1, 'The displayed human must have one shared skin, not independent rotating mesh groups.');
  assert.ok(skins[0].listJoints().length >= 21);
  for (const node of document.getRoot().listNodes().filter((node) => node.getMesh())) {
    assert.equal(node.getSkin(), skins[0], `Unbound structure: ${node.getName()}`);
    for (const primitive of node.getMesh().listPrimitives()) {
      const weights = primitive.getAttribute('WEIGHTS_0');
      const joints = primitive.getAttribute('JOINTS_0');
      assert.equal(weights?.getCount(), primitive.getAttribute('POSITION').getCount());
      for (let index = 0; index < weights.getCount(); index++) {
        const w = weights.getElement(index, []), j = joints.getElement(index, []);
        assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-5);
        assert.ok(w.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
        assert.ok(j.every((value) => value >= 0 && value < skins[0].listJoints().length));
      }
    }
  }
});

test('Three.js loads all clips and the rest pose preserves the original muscle and bone geometry', () => {
  assert.deepEqual(gltf.animations.map((clip) => clip.name).sort(), motionDefinitions.map((motion) => motion.id).sort());
  gltf.scene.updateMatrixWorld(true);
  for (const mesh of meshes) {
    const original = mesh.geometry.attributes.position;
    for (let index = 0; index < original.count; index += Math.max(1, Math.floor(original.count / 12))) {
      const expected = new THREE.Vector3().fromBufferAttribute(original, index);
      const actual = mesh.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      assert.ok(actual.distanceTo(expected) < 1e-5, `Changed rest geometry: ${mesh.name}`);
    }
  }
});

test('all original muscles survive the derived rig and genital-region exclusions still apply', async () => {
  const original = await new NodeIO().read(fileURLToPath(new URL('../assets/anatomy/human-atlas/full-muscles.glb', import.meta.url)));
  const byName = new Map(document.getRoot().listNodes().map((node) => [node.getName(), node]));
  for (const node of original.getRoot().listNodes()) {
    const expected = node.getMesh().listPrimitives()[0].getAttribute('POSITION').getArray();
    const actual = byName.get(node.getName())?.getMesh().listPrimitives()[0].getAttribute('POSITION').getArray();
    assert.deepEqual(actual, expected, `${node.getName()} was replaced or reshaped`);
  }
  for (const mesh of meshes) assert.equal(fullMuscleExclusionReason(mesh.userData.canonicalName), null);
  assert.equal(meshes.filter((mesh) => mesh.userData.kind === 'muscle').length, 415);
});

test('action aliases and muscle flashing are extensible, bounded and respect pause and reduced motion', () => {
  assert.equal(motionForQuery('给我演示俯卧撑').id, 'push_up');
  assert.equal(motionForQuery('squat').id, 'squat');
  assert.equal(motionForQuery('弯举').id, 'curl');
  assert.equal(motionForQuery('未制作的动作'), undefined);
  assert.throws(() => sampleMotion('unknown', .5), /No pose sampler/);
  const low = highlightForMotion('push_up', .7, Math.PI * 300);
  const high = highlightForMotion('push_up', .7, Math.PI * 100);
  assert.ok(high.strength - low.strength > .2 && high.emissive - low.emissive > .1);
  for (const options of [{ paused: true }, { reducedMotion: true }, { pulseEnabled: false }]) {
    assert.deepEqual(highlightForMotion('push_up', .7, 0, options), highlightForMotion('push_up', .7, 450, options));
  }
});

test('every clip keeps bone lengths fixed and the support hands and feet stay planted', () => {
  const lengths = new Map(rigJoints.filter((joint) => joint.parent).map((joint) => [joint.name, new THREE.Vector3(...joint.position).distanceTo(new THREE.Vector3(...rigJoints.find((parent) => parent.name === joint.parent).position))]));
  for (const clip of gltf.animations) {
    pose(clip, 0);
    const contacts = clip.name === 'push_up' ? ['rightHand', 'leftHand', 'rightFoot', 'leftFoot'] : ['rightFoot', 'leftFoot'];
    const initial = contacts.map(point);
    for (const phase of [.125, .25, .375, .5, .625, .75, .875, .99999]) {
      pose(clip, phase);
      for (const joint of rigJoints.filter((joint) => joint.parent)) assert.ok(Math.abs(point(joint.name).distanceTo(point(joint.parent)) - lengths.get(joint.name)) < 1e-5, `${clip.name}: ${joint.name} stretched`);
      contacts.forEach((name, index) => assert.ok(point(name).distanceTo(initial[index]) < .001, `${clip.name}: ${name} slid ${point(name).distanceTo(initial[index])}m`));
    }
  }
});

test('push-up palms face the floor and the fingers point forwards throughout the rep', () => {
  const clip = gltf.animations.find((candidate) => candidate.name === 'push_up');
  for (const phase of [0, .25, .5, .75]) {
    pose(clip, phase);
    for (const [side, sign] of [['right', -1], ['left', 1]]) {
      const longitudinal = new THREE.Vector3(sign * .024, -.149, .093).normalize();
      const palmarNormal = new THREE.Vector3(0, 0, 1).addScaledVector(longitudinal, -longitudinal.z).normalize();
      const rotation = gltf.scene.getObjectByName(`${side}Hand`).getWorldQuaternion(new THREE.Quaternion());
      assert.ok(palmarNormal.applyQuaternion(rotation).dot(new THREE.Vector3(0, -1, 0)) > .95, `${side} palm is turned away from the floor`);
      assert.ok(longitudinal.applyQuaternion(rotation).dot(new THREE.Vector3(0, 0, 1)) > .95, `${side} fingers point backwards`);
    }
    for (const mesh of meshes.filter((node) => node.userData.region === 'hand')) {
      for (let index = 0; index < mesh.geometry.attributes.position.count; index++) {
        const vertex = mesh.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
        assert.ok(vertex.y >= -.006, `${mesh.userData.canonicalName}: palm penetrates the floor`);
      }
    }
  }
});

test('animated real triangles stay finite without the long spikes produced by hard coordinate weights', () => {
  const scratch = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let worst = { extension: 0 };
  for (const clip of gltf.animations) for (const phase of [0, .25, .5, .75]) {
    pose(clip, phase);
    for (const mesh of meshes) {
      const geometry = mesh.geometry, indices = geometry.index, positions = geometry.attributes.position;
      const stride = Math.max(3, Math.floor(indices.count / 240 / 3) * 3);
      for (let index = 0; index + 1 < indices.count; index += stride) {
        const a = indices.getX(index), b = indices.getX(index + 1);
        scratch[0].fromBufferAttribute(positions, a); scratch[1].fromBufferAttribute(positions, b);
        mesh.getVertexPosition(a, scratch[2]); mesh.getVertexPosition(b, scratch[3]);
        const restLength = scratch[0].distanceTo(scratch[1]), animated = scratch[2].distanceTo(scratch[3]);
        assert.ok(Number.isFinite(animated), `${mesh.name}: non-finite vertex`);
        if (mesh.userData.kind === 'bone' && mesh.userData.region !== 'trunk') assert.ok(Math.abs(restLength - animated) < 1e-5, `${mesh.name}: bone deformation`);
        const extension = animated - restLength;
        if (extension > worst.extension) worst = { extension, name: mesh.name, clip: clip.name, phase, restLength, animated };
      }
    }
  }
  assert.ok(worst.extension < .055, `Triangle tearing: ${JSON.stringify(worst)}`);
});

test('runtime parameter clips bind to the real asset without contact drift, palm penetration or abrupt flips', () => {
  const variants = [
    ...[.8, 1.8].flatMap(handWidth => [15, 45, 70].map(elbowAngle => ['push_up', { handWidth, elbowAngle }])),
    ...[.8, 1.8].flatMap(stanceWidth => [0, 20, 35].map(toeAngle => ['squat', { stanceWidth, toeAngle, squatDepth: 110 }])),
  ];
  const first = new THREE.Vector3(), second = new THREE.Vector3();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  let worst = { extension: 0 };
  for (const [id, parameters] of variants) {
    const clip = createMotionClip(id, parameters);
    for (const track of clip.tracks.filter(track => track.name.endsWith('.quaternion'))) {
      for (let index = 4; index < track.values.length; index += 4) {
        qa.fromArray(track.values, index - 4).normalize(); qb.fromArray(track.values, index).normalize();
        assert.ok(qa.angleTo(qb) < .5, `${id} ${JSON.stringify(parameters)}: abrupt ${track.name} twist at ${index / 4}`);
      }
    }
    const contacts = id === 'push_up' ? ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] : ['leftFoot', 'rightFoot'];
    pose(clip, 0); const initial = contacts.map(point);
    for (const phase of [.137, .25, .5, .737, .875]) {
      pose(clip, phase);
      contacts.forEach((name, index) => assert.ok(point(name).distanceTo(initial[index]) < .001, `${id} ${JSON.stringify(parameters)}: ${name} drifted`));
      for (const mesh of meshes) {
        const positions = mesh.geometry.attributes.position, indices = mesh.geometry.index;
        for (let index = 0; index < positions.count; index += Math.max(1, Math.floor(positions.count / 30))) {
          mesh.getVertexPosition(index, first).applyMatrix4(mesh.matrixWorld);
          assert.ok(first.toArray().every(Number.isFinite));
          if (mesh.userData.region === 'foot' || id === 'push_up' && mesh.userData.region === 'hand') assert.ok(first.y >= -.006, `${id}: ${mesh.userData.canonicalName} penetrates the floor`);
        }
        for (let index = 0; index + 1 < indices.count; index += Math.max(3, Math.floor(indices.count / 60 / 3) * 3)) {
          const a = indices.getX(index), b = indices.getX(index + 1);
          const restLength = first.fromBufferAttribute(positions, a).distanceTo(second.fromBufferAttribute(positions, b));
          const animated = mesh.getVertexPosition(a, first).distanceTo(mesh.getVertexPosition(b, second));
          if (mesh.userData.kind === 'bone' && mesh.userData.region !== 'trunk') assert.ok(Math.abs(restLength - animated) < 1e-5);
          if (animated - restLength > worst.extension) worst = { extension: animated - restLength, name: mesh.name, id, parameters, phase };
        }
      }
    }
    mixer.stopAllAction(); mixer.uncacheClip(clip);
  }
  assert.ok(worst.extension < .055, `Variant triangle tearing: ${JSON.stringify(worst)}`);
});

test('rest and every exercise stay centered on the platform without sliding support contacts', () => {
  const footprint = (id) => {
    const bounds = new THREE.Box3(), vertex = new THREE.Vector3();
    for (const mesh of meshes.filter(node => node.userData.region === 'foot' || id === 'push_up' && node.userData.region === 'hand')) {
      for (let index = 0; index < mesh.geometry.attributes.position.count; index++) {
        mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld);
        bounds.expandByPoint(vertex);
      }
    }
    return bounds;
  };
  const centered = (id) => {
    const bounds = footprint(id), center = bounds.getCenter(new THREE.Vector3());
    assert.ok(Math.hypot(center.x, center.z) < .001, `${id}: footprint drifted off center`);
    assert.ok(Math.abs(bounds.min.y) < .001, `${id}: contact height drifted`);
  };
  try {
    mixer.stopAllAction(); gltf.scene.position.set(0, 0, 0);
    alignBodyToPlatform(gltf.scene);
    centered('rest');
    const standingPosition = gltf.scene.position.clone();
    alignBodyToPlatform(gltf.scene);
    assert.ok(gltf.scene.position.distanceTo(standingPosition) < 1e-6, 'Repeated alignment must not accumulate an offset');
    const variants = [
      ...motionDefinitions.map(({ id }) => [id, {}]),
      ['push_up', { handWidth: .8, elbowAngle: 15 }],
      ['push_up', { handWidth: 1.8, elbowAngle: 70 }],
      ['squat', { stanceWidth: .8, toeAngle: 0, squatDepth: 110 }],
      ['squat', { stanceWidth: 1.8, toeAngle: 35, squatDepth: 110 }],
    ];
    for (const [id, parameters] of variants) {
      const clip = createMotionClip(id, parameters);
      pose(clip, .137);
      const bonePositions = rigJoints.map(({ name }) => [name, gltf.scene.getObjectByName(name).position.clone()]);
      alignBodyToPlatform(gltf.scene, id);
      for (const [name, local] of bonePositions) assert.ok(gltf.scene.getObjectByName(name).position.distanceTo(local) < 1e-8, 'Alignment must not change the rig pose');
      const contacts = id === 'push_up' ? ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] : ['leftFoot', 'rightFoot'];
      const planted = contacts.map(point);
      for (const phase of [0, .25, .5, .75, .99999]) {
        pose(clip, phase);
        centered(id);
        contacts.forEach((name, index) => assert.ok(point(name).distanceTo(planted[index]) < .001, `${id}: ${name} slid while centered`));
      }
      mixer.stopAllAction(); mixer.uncacheClip(clip);
    }
    alignBodyToPlatform(gltf.scene);
    centered('rest');
    assert.ok(gltf.scene.position.distanceTo(standingPosition) < 1e-6, 'Returning to rest must restore the original centered placement');
  } finally {
    mixer.stopAllAction(); gltf.scene.position.set(0, 0, 0); gltf.scene.updateMatrixWorld(true);
  }
});
