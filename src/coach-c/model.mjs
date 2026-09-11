const alignSegment = (THREE, segment, start, end) => {
  const direction = end.clone().sub(start), length = Math.max(direction.length(), .001);
  segment.position.copy(start).add(end).multiplyScalar(.5);
  segment.scale.set(1, length, 1);
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
};

export function createCoachC(THREE) {
  const group = new THREE.Group();
  group.name = 'Coach C procedural spatial companion';
  const white = new THREE.MeshStandardMaterial({ color: 0xe8f1f8, roughness: .48, metalness: .08 });
  const navy = new THREE.MeshStandardMaterial({ color: 0x132d4d, roughness: .32, metalness: .22 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x83b9f4, emissive: 0x1c5f9e, emissiveIntensity: .55, roughness: .38, metalness: .1 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(.29, 24, 18), white); head.position.y = .34; group.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(.225, 24, 16), navy); visor.position.set(0, .35, -.16); visor.scale.z = .32; group.add(visor);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), blue); eye.position.set(.075, .36, -.24); group.add(eye);
  const eyeMirror = eye.clone(); eyeMirror.position.x = -.075; group.add(eyeMirror);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .27, 8, 16), white); body.position.y = -.08; group.add(body);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.065, 14, 10), blue); core.position.set(0, -.06, -.17); group.add(core);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.14, .018, 8, 20), blue); collar.position.y = .12; collar.rotation.x = Math.PI / 2; group.add(collar);
  const staticArm = new THREE.Mesh(new THREE.CylinderGeometry(.042, .05, .34, 10), white); staticArm.position.set(-.24, -.03, 0); staticArm.rotation.z = -.42; group.add(staticArm);
  const staticHand = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10), white); staticHand.position.set(-.31, -.20, 0); group.add(staticHand);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(.043, .052, 1, 10), white);
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(.035, .043, 1, 10), white);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 10), white);
  const fingertip = new THREE.Mesh(new THREE.CylinderGeometry(.018, .025, .13, 8), blue);
  group.add(upper, forearm, hand, fingertip);
  group.traverse((node) => { if (!node.isMesh) return; node.renderOrder = 3; node.material.depthTest = false; node.material.depthWrite = false; });

  const update = ({ cameraPosition, target, pointSide = 1 }) => {
    const facing = cameraPosition.clone(); facing.y = group.position.y + .08; group.lookAt(facing);
    group.updateMatrixWorld(true);
    const localTarget = group.worldToLocal(target.clone());
    const shoulder = new THREE.Vector3(pointSide * .18, .02, .02);
    const elbow = shoulder.clone().lerp(localTarget, .48).add(new THREE.Vector3(pointSide * .07, -.02, .04));
    const wrist = shoulder.clone().lerp(localTarget, .84);
    alignSegment(THREE, upper, shoulder, elbow); alignSegment(THREE, forearm, elbow, wrist);
    hand.position.copy(wrist);
    const fingertipEnd = wrist.clone().lerp(localTarget, .28);
    alignSegment(THREE, fingertip, wrist, fingertipEnd);
  };
  return { group, update };
}
