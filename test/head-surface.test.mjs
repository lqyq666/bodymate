import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { attachHeadSurface } from '../src/full-muscle/head-surface.mjs';

const root=new URL('../',import.meta.url), data=JSON.parse(await readFile(new URL('assets/presentation/head-surface.json',root),'utf8'));
const bytes=await readFile(new URL('assets/anatomy/human-atlas/rigged-body.glb',root));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();

test('head display data retains verified source identity and contains only the head surface',()=>{
  assert.equal(data.sourceCommit,'1c38bf35c254a891200d3cedecfd57abebe83d8d');assert.equal(data.license,'CC BY 4.0');
  assert.deepEqual(data.parts.map(p=>p.sourceMeshId),['FJ2810','FJ2811','FJ2814','FJ1289','FJ1317','FJ1340','FJ1368']);
  for(const part of data.parts){
    const positions=Buffer.from(part.positions,'base64'),normals=Buffer.from(part.normals,'base64');
    assert.equal(sha(Buffer.concat([positions,normals])),part.sha256);
    assert.equal(positions.length,part.triangles*9*4);assert.equal(normals.length,positions.length);
    for(let i=0;i<positions.length;i+=12){const x=positions.readFloatLE(i),y=positions.readFloatLE(i+4),z=positions.readFloatLE(i+8);assert.ok([x,y,z].every(Number.isFinite));assert.ok(y>1.48&&y<1.73);if(part.sourceMeshId==='FJ2810')assert.ok(y+.25*z>=1.512-1e-6);}
  }
});
test('surface aligns exactly with original world coordinates in the existing head rest frame',()=>{
  const model=clone(gltf.scene),surface=attachHeadSurface(model);model.updateMatrixWorld(true);
  assert.equal(surface.group.parent,model.getObjectByName('head'));assert.equal(surface.group.userData.presentationOnly,true);
  const mesh=surface.group.children[0], positions=Buffer.from(data.parts[0].positions,'base64');
  for(let i=0;i<mesh.geometry.attributes.position.count;i+=37){const actual=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld),expected=new THREE.Vector3(positions.readFloatLE(i*12),positions.readFloatLE(i*12+4),positions.readFloatLE(i*12+8));assert.ok(actual.distanceTo(expected)<1e-6);}
});
test('surface follows every existing clip without modifying the rig or joining muscle counts',()=>{
  const model=clone(gltf.scene),surface=attachHeadSurface(model),mixer=new THREE.AnimationMixer(model),mesh=surface.group.children[0];
  const local=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,0),head=model.getObjectByName('head');
  for(const clip of gltf.animations)for(const phase of [0,.25,.5,.75]){mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();action.time=phase*clip.duration;mixer.update(0);model.updateMatrixWorld(true);const actual=local.clone().applyMatrix4(mesh.matrixWorld),expected=local.clone().applyMatrix4(head.matrixWorld);assert.ok(actual.distanceTo(expected)<1e-8);assert.ok(actual.toArray().every(Number.isFinite));}
  let muscles=0,bones=0;model.traverse(node=>{if(node.isSkinnedMesh){if(node.userData.kind==='muscle')muscles++;else bones++;}});assert.equal(muscles,415);assert.equal(bones,282);
});
test('bone and x-ray views hide only the new surface and restore it in muscle view',()=>{
  const surface=attachHeadSurface(clone(gltf.scene));surface.setView('bone');assert.equal(surface.group.visible,false);surface.setView('xray');assert.equal(surface.group.visible,false);surface.setView('muscle');assert.equal(surface.group.visible,true);
});

test('sculpture finish changes only presentation material and preserves the exact head geometry', () => {
  const normal = attachHeadSurface(clone(gltf.scene));
  const sculpture = attachHeadSurface(clone(gltf.scene), { sculpture: true });
  for (let index = 0; index < normal.group.children.length; index++) {
    const original = normal.group.children[index], styled = sculpture.group.children[index];
    assert.deepEqual(styled.geometry.attributes.position.array, original.geometry.attributes.position.array);
    assert.deepEqual(styled.geometry.attributes.normal.array, original.geometry.attributes.normal.array);
    assert.equal(styled.material.color.getHexString(), 'd8d3ca');
    assert.equal(styled.material.transparent, false);
  }
  sculpture.setView('bone'); assert.equal(sculpture.group.visible, false);
});
test('frozen anatomy and the miniature use the same head surface without registry changes',async()=>{
  assert.equal(sha(bytes),'CD2E2108F7551B87928989C445C78E8BB35D867C89D90CD766623CB4CF7E1522');
  assert.equal(sha(await readFile(new URL('assets/anatomy/human-atlas/neck-muscles.glb',root))),'FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065');
  for(const file of ['src/full-muscle/runtime-entry.mjs','src/full-muscle/navigator.mjs'])assert.match(await readFile(new URL(file,root),'utf8'),/attachHeadSurface\(model(?:,|\))/);
});
