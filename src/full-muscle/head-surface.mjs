import * as THREE from 'three';
import { applySculptureFinish } from './sculpture-material.mjs';
import data from '../../assets/presentation/head-surface.json' with { type: 'json' };

const decode = text => new Float32Array(Uint8Array.from(atob(text),char=>char.charCodeAt(0)).buffer);

export function attachHeadSurface(model, { sculpture = false } = {}) {
  const head = model.getObjectByName('head');
  if (!head?.isBone) throw Error('Head display surface requires the existing head bone.');
  model.updateMatrixWorld(true);
  const inverseRest = head.matrixWorld.clone().invert();
  const group = new THREE.Group(); group.name='head-display-surface'; group.userData.presentationOnly=true;
  for (const part of data.parts) {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(decode(part.positions),3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(decode(part.normals),3));
    geometry.applyMatrix4(inverseRest);
    const material=new THREE.MeshStandardMaterial({color:'#E7EDF1',roughness:.64,metalness:0,side:THREE.DoubleSide});
    if (sculpture) applySculptureFinish(material, 'surface');
    const mesh=new THREE.Mesh(geometry,material);mesh.name='display-'+part.sourceMeshId;
    mesh.userData={presentationOnly:true,sourceMeshId:part.sourceMeshId,canonicalName:part.canonicalName};
    mesh.castShadow=true; group.add(mesh);
  }
  head.add(group);
  return { group, setView(view) { group.visible=view==='muscle'; } };
}
