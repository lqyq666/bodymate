import { Document, NodeIO } from '@gltf-transform/core';
import { Matrix4 } from 'three';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { fullMuscleSourceFiles, sourceFiles, sha256, humanAtlasCommit } from './human-atlas-source.mjs';
import { fullMuscleExclusionReason } from '../src/anatomy/full-muscle-policy.mjs';
import { rigJoints, classifyStructure, weightsForPoint, sampleMotion, motionDefinitions } from '../src/full-muscle/rig-definition.mjs';

const root = new URL('../', import.meta.url);
const pinned = { ...fullMuscleSourceFiles,
  'body-12.bin': '61A6C8DA89BB20DF50C575964AC81AA4090EABFC2CB27AD2155AEA325F31C6C0',
  'body-13.bin': '4C51B6BE85D5B705D2B52B79B9AD1CDAE0B65AD03C9402A2F2673C7633FD94F3',
};
const correctedMuscle = /fibularis|tibialis|subscapularis|levator scapulae/i;
export async function buildRiggedBody({ fromFrozen = false } = {}) {
  const atlasPath = new URL('prototype/human-atlas-local/local-assets/atlas.json', root);
  let parts;
  const files = new Map();
  if (fromFrozen || !existsSync(atlasPath)) {
    // The derived GLB retains the original rest geometry, so a checkout can re-bake
    // new actions offline without carrying the entire private source cache.
    const frozenBytes = await readFile(new URL('assets/anatomy/human-atlas/rigged-body.glb', root));
    const manifest = JSON.parse(await readFile(new URL('assets/anatomy/human-atlas/rigged-body.manifest.json', root), 'utf8'));
    if (sha256(frozenBytes) !== manifest.outputSha256 || manifest.sourceCommit !== humanAtlasCommit) throw Error('Frozen geometry provenance mismatch');
    const frozen = await new NodeIO().readBinary(frozenBytes);
    const byId = new Map(frozen.getRoot().listNodes().filter((node) => node.getMesh()).map((node) => [node.getName(), node]));
    parts = manifest.entries.map((entry) => {
      const primitive = byId.get(entry.structureId).getMesh().listPrimitives()[0];
      const position = primitive.getAttribute('POSITION').getArray().slice();
      const bounds = [primitive.getAttribute('POSITION').getMin([]), primitive.getAttribute('POSITION').getMax([])];
      return { id: entry.sourceMeshId, name: entry.canonicalName, system: entry.kind === 'muscle' ? 'muscular' : 'skeletal', bounds,
        vertexCount: entry.vertexCount, indexCount: entry.triangles * 3,
        geometry: { position, normal: primitive.getAttribute('NORMAL').getArray().slice(), indices: primitive.getIndices().getArray().slice() } };
    });
  } else {
    const atlasBytes = await readFile(atlasPath);
    if (sha256(atlasBytes) !== sourceFiles['atlas.json']) throw Error('Atlas identity mismatch');
    const atlas = JSON.parse(atlasBytes);
    parts = atlas.parts.filter((part) => !fullMuscleExclusionReason(part.name) && (part.system === 'muscular' || part.system === 'skeletal'));
    for (const chunk of new Set(parts.map((part) => `body-${part.chunk}.bin`))) {
      const data = await readFile(new URL(`prototype/human-atlas-local/local-assets/${chunk}`, root));
      if (!pinned[chunk] || sha256(data) !== pinned[chunk]) throw Error(`Unverified atlas chunk ${chunk}`);
      files.set(chunk, data);
    }
  }
  const doc = new Document(), buffer = doc.createBuffer('bodymate-rigged-body');
  const scene = doc.createScene('BodyMate anatomy rig');
  const material = doc.createMaterial('Muscle').setBaseColorFactor([.7, .35, .31, 1]).setRoughnessFactor(.72);
  const boneMaterial = doc.createMaterial('Bone').setBaseColorFactor([.91, .86, .72, 1]).setRoughnessFactor(.64);
  const accessoryMaterial = doc.createMaterial('Connective tissue').setBaseColorFactor([.81, .78, .71, 1]).setRoughnessFactor(.8);
  const accessor = (name, type, array) => doc.createAccessor(name).setType(type).setArray(array).setBuffer(buffer);
  const nodes = new Map(rigJoints.map((joint) => [joint.name, doc.createNode(joint.name)]));
  const inverseMatrices = [];
  for (const joint of rigJoints) {
    const parent = rigJoints.find((candidate) => candidate.name === joint.parent);
    nodes.get(joint.name).setTranslation(joint.position.map((value, axis) => value - (parent?.position[axis] || 0)));
    if (parent) nodes.get(parent.name).addChild(nodes.get(joint.name));
    else scene.addChild(nodes.get(joint.name));
    inverseMatrices.push(...new Matrix4().makeTranslation(...joint.position).invert().elements);
  }
  const skin = doc.createSkin('BodyMate shared anatomical rig').setSkeleton(nodes.get('pelvis'))
    .setInverseBindMatrices(accessor('inverse-bind-matrices', 'MAT4', new Float32Array(inverseMatrices)));
  for (const joint of rigJoints) skin.addJoint(nodes.get(joint.name));
  const entries = [];
  for (const part of parts) {
    if (fullMuscleExclusionReason(part.name)) throw Error(`Excluded structure in rig: ${part.name}`);
    const bytes = files.get(`body-${part.chunk}.bin`), base = bytes?.byteOffset;
    const position = part.geometry?.position || new Float32Array(bytes.buffer, base + part.positions, part.vertexCount * 3).slice();
    const normal = part.geometry?.normal || Float32Array.from(new Int16Array(bytes.buffer, base + part.normals, part.vertexCount * 3), (value) => value / 32767);
    const indices = part.geometry?.indices || new Uint32Array(bytes.buffer, base + part.indices, part.indexCount).slice();
    const kind = part.system === 'muscular' || correctedMuscle.test(part.name) ? 'muscle' : /iliotibial tract/i.test(part.name) ? 'connective' : 'bone';
    const center = part.bounds[0].map((value, axis) => (value + part.bounds[1][axis]) / 2);
    const binding = classifyStructure(part.name, center, kind);
    const jointIds = new Uint16Array(part.vertexCount * 4), weights = new Float32Array(part.vertexCount * 4);
    for (let index = 0; index < part.vertexCount; index++) {
      const influences = weightsForPoint(binding, position.subarray(index * 3, index * 3 + 3));
      for (let slot = 0; slot < influences.length; slot++) {
        jointIds[index * 4 + slot] = influences[slot][0]; weights[index * 4 + slot] = influences[slot][1];
      }
    }
    const structureId = `bodymate.${kind}.${part.id.toLowerCase()}`;
    const extras = { structureId, sourceMeshId: part.id, canonicalName: part.name, kind, region: binding.region, side: binding.side || 'midline' };
    const primitive = doc.createPrimitive().setAttribute('POSITION', accessor(`${part.id}-position`, 'VEC3', position))
      .setAttribute('NORMAL', accessor(`${part.id}-normal`, 'VEC3', normal))
      .setAttribute('JOINTS_0', accessor(`${part.id}-joints`, 'VEC4', jointIds))
      .setAttribute('WEIGHTS_0', accessor(`${part.id}-weights`, 'VEC4', weights))
      .setIndices(accessor(`${part.id}-indices`, 'SCALAR', indices))
      .setMaterial(kind === 'muscle' ? material : /cartilage|gingiva|tract|disk/i.test(part.name) ? accessoryMaterial : boneMaterial);
    scene.addChild(doc.createNode(structureId).setMesh(doc.createMesh(structureId).addPrimitive(primitive)).setSkin(skin).setExtras(extras));
    entries.push({ ...extras, vertexCount: part.vertexCount, triangles: part.indexCount / 3 });
  }
  for (const motion of motionDefinitions) {
    const animation = doc.createAnimation(motion.id);
    const steps = Math.round(motion.duration * 30), times = Float32Array.from({ length: steps + 1 }, (_, index) => index * motion.duration / steps);
    const timesAccessor = accessor(`${motion.id}-time`, 'SCALAR', times);
    const poses = [...times].map((_, index) => sampleMotion(motion.id, index / steps));
    const addTrack = (name, path, type, values) => {
      const sampler = doc.createAnimationSampler().setInput(timesAccessor).setOutput(accessor(`${motion.id}-${name}-${path}`, type, new Float32Array(values))).setInterpolation('LINEAR');
      animation.addSampler(sampler);
      animation.addChannel(doc.createAnimationChannel().setTargetNode(nodes.get(name)).setTargetPath(path).setSampler(sampler));
    };
    addTrack('pelvis', 'translation', 'VEC3', poses.flatMap((pose) => pose.root.toArray()));
    for (const joint of rigJoints) {
      const values = []; let previous = null;
      for (const pose of poses) {
        const q = pose.rotations.get(joint.name).toArray();
        if (previous && q.reduce((sum, value, index) => sum + value * previous[index], 0) < 0) q.forEach((_, index) => { q[index] *= -1; });
        values.push(...q); previous = q;
      }
      addTrack(joint.name, 'rotation', 'VEC4', values);
    }
  }
  const glb = await new NodeIO().writeBinary(doc);
  const manifest = { schemaVersion: 1, sourceCommit: humanAtlasCommit, sourceHashes: pinned, outputSha256: sha256(glb),
    license: 'CC BY 4.0', muscleCount: entries.filter((entry) => entry.kind === 'muscle').length,
    boneCount: entries.filter((entry) => entry.kind !== 'muscle').length,
    joints: rigJoints, motions: motionDefinitions, entries,
    notes: 'Derived educational animation rig. Original geometry retained. Atlas muscle system misclassifications corrected for fibularis, tibialis, subscapularis and levator scapulae. Hand digits share a wrist and foot digits share the foot. Not a measured biomechanical simulation.',
  };
  await writeFile(new URL('assets/anatomy/human-atlas/rigged-body.glb', root), glb);
  await writeFile(new URL('assets/anatomy/human-atlas/rigged-body.manifest.json', root), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Built rigged body: ${manifest.muscleCount} muscles, ${manifest.boneCount} skeletal structures, ${rigJoints.length} joints, ${motionDefinitions.length} clips (${Math.round(glb.length / 1024 / 1024)} MB)`);
  return manifest;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await buildRiggedBody({ fromFrozen: process.argv.includes('--from-frozen') });
