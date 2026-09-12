import { Matrix4, Quaternion, Vector3 } from 'three';
import { motionDefinitions, motionForQuery, normalizeMotionParameters, poseIntent } from './motion-domain.mjs';

export { motionDefinitions, motionForQuery };

// Atlas world coordinates, metres, +Y up and +Z anterior. These landmarks are aligned
// to the humeral heads, elbow surfaces, femoral heads, tibiae and tali in the source.
const joints = [
  ['pelvis', null, [0, .91, -.025]],
  ['spine', 'pelvis', [0, 1.08, -.04]],
  ['chest', 'spine', [0, 1.30, -.045]],
  ['neck', 'chest', [0, 1.455, -.032]],
  ['head', 'neck', [0, 1.54, -.012]],
];
for (const [side, sign] of [['right', -1], ['left', 1]]) {
  joints.push(
    [`${side}Shoulder`, 'chest', [sign * .115, 1.397, -.035]],
    [`${side}UpperArm`, `${side}Shoulder`, [sign * .165, 1.395, -.025]],
    [`${side}Forearm`, `${side}UpperArm`, [sign * .218, 1.112, -.017]],
    [`${side}Hand`, `${side}Forearm`, [sign * .252, .887, -.006]],
    [`${side}Thigh`, 'pelvis', [sign * .057, .888, -.022]],
    [`${side}Shin`, `${side}Thigh`, [sign * .075, .46, -.014]],
    [`${side}Foot`, `${side}Shin`, [sign * .067, .082, -.025]],
    [`${side}Toes`, `${side}Foot`, [sign * .071, .018, .104]],
  );
}
export const rigJoints = Object.freeze(joints.map(([name, parent, position]) => Object.freeze({ name, parent, position })));
export const restPoint = (name) => new Vector3().fromArray(rigJoints.find((joint) => joint.name === name).position);
const indexByName = new Map(rigJoints.map((joint, index) => [joint.name, index]));
const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
const blend = (a, b, t) => [[a, 1 - t], [b, t]];
const trunk = (y) => y > 1.46 ? blend('neck', 'head', smooth(1.46, 1.55, y))
  : y > 1.34 ? blend('chest', 'neck', smooth(1.37, 1.49, y))
  : y > 1.12 ? blend('spine', 'chest', smooth(1.12, 1.31, y))
  : blend('pelvis', 'spine', smooth(.98, 1.14, y));

export function classifyStructure(name, center, kind = 'muscle') {
  const n = name.toLowerCase(), declaredSide = /\bright\b/.test(n) ? 'right' : /\bleft\b/.test(n) ? 'left' : null;
  // Some atlas labels (notably flexor pollicis brevis) have swapped laterality. Bind
  // the complete structure to the side where its actual geometry lives, never per vertex.
  const side = declaredSide && Math.abs(center[0]) > .02 ? (center[0] < 0 ? 'right' : 'left') : declaredSide;
  const region = (part) => ({ side, region: part, kind });
  if (kind === 'bone') {
    if (/hip bone|sacrum/.test(n)) return region('pelvis');
    if (/humerus/.test(n)) return region('upperArm');
    if (/radius|ulna$/.test(n)) return region('forearm');
    if (/scapula|clavicle/.test(n)) return region('shoulder');
    if (/femur|patella/.test(n)) return region('thigh');
    if (/tibia$|fibula$/.test(n)) return region('shin');
    if (center[1] < .14) return region('foot');
    if (side && Math.abs(center[0]) > .19 && center[1] < .94) return region('hand');
    if (center[1] > 1.49) return region('head');
    return region('trunk');
  }
  if (/pectoralis major|latissimus dorsi/.test(n)) return region('chestAttachment');
  if (/deltoid|teres major|teres minor|infraspinatus|supraspinatus|subscapularis/.test(n)) return region('shoulderAttachment');
  if (/biceps brachii|triceps brachii|brachialis|coracobrachialis/.test(n)) return region('arm');
  if (/hand|(?:flexor|abductor) pollicis brevis|opponens pollicis|adductor pollicis/.test(n)) return region('hand');
  if (/carpi|pronator|supinator|anconeus|brachioradialis|pollicis (?:longus|brevis)|extensor digitorum$|extensor indicis|flexor digitorum (profundus|superficialis)|palmaris|extensor digiti minimi/.test(n)) return region('arm');
  if (/foot|hallucis brevis|adductor hallucis|abductor hallucis|flexor accessorius|digitorum brevis/.test(n)) return region('foot');
  if (/femoris|vastus|gluteus|adductor (brevis|longus|magnus|minimus)|sartorius|semitendinosus|semimembranosus|gracilis|pectineus|iliacus|psoas|obturator|piriformis|gemellus|gastrocnemius|soleus|tibialis|fibularis|plantaris|popliteus|hallucis longus|digitorum longus|iliotibial/.test(n)) return region('leg');
  return region('trunk');
}

// Anatomical membership is chosen ONCE per mesh. The continuous field is then evaluated
// over its vertices. Crossing x=0 or a limb bounding box can never change bone membership.
export function weightsForPoint(binding, point) {
  const [x, y] = point, { side, region, kind } = binding;
  let weights;
  if (kind === 'bone' && region !== 'trunk') {
    const name = ['pelvis', 'head'].includes(region) ? region : `${side}${region[0].toUpperCase()}${region.slice(1)}`;
    weights = [[name, 1]];
  } else if (!side || region === 'trunk') weights = trunk(y);
  else if (region === 'hand' || region === 'foot') weights = [[`${side}${region === 'hand' ? 'Hand' : 'Foot'}`, 1]];
  else if (region === 'chestAttachment') {
    weights = blend('chest', `${side}UpperArm`, smooth(.105, .185, Math.abs(x)) * smooth(1.21, 1.32, y));
  } else if (region === 'shoulderAttachment') {
    const lateral = smooth(.105, .18, Math.abs(x));
    const distal = 1 - smooth(1.29, 1.435, y);
    weights = blend(`${side}Shoulder`, `${side}UpperArm`, Math.max(lateral * .8, distal));
  } else if (region === 'arm') {
    weights = y > 1.28 ? blend(`${side}UpperArm`, `${side}Shoulder`, smooth(1.32, 1.415, y))
      : y > .98 ? blend(`${side}Forearm`, `${side}UpperArm`, smooth(1.065, 1.16, y))
      : blend(`${side}Hand`, `${side}Forearm`, smooth(.84, .945, y));
  } else if (region === 'leg') {
    weights = y > .77 ? blend(`${side}Thigh`, 'pelvis', smooth(.83, .98, y))
      : y > .25 ? blend(`${side}Shin`, `${side}Thigh`, smooth(.39, .525, y))
      : blend(`${side}Foot`, `${side}Shin`, smooth(.04, .145, y));
  } else weights = trunk(y);
  const result = weights.filter(([, weight]) => weight > 0).map(([name, weight]) => [indexByName.get(name), weight]);
  if (result.some(([index, weight]) => index === undefined || !Number.isFinite(weight))) throw Error(`Invalid binding: ${JSON.stringify(binding)}`);
  return result;
}

const rotationX = (angle) => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle);
function orientWithPalmarNormal(restDirection, direction, palmarNormal) {
  const from = restDirection.clone().normalize(), to = direction.clone().normalize();
  const fromNormal = new Vector3(0, 0, 1).addScaledVector(from, -from.z).normalize();
  const toNormal = palmarNormal.clone().addScaledVector(to, -palmarNormal.dot(to)).normalize();
  const restFrame = new Matrix4().makeBasis(new Vector3().crossVectors(from, fromNormal), from, fromNormal);
  const targetFrame = new Matrix4().makeBasis(new Vector3().crossVectors(to, toNormal), to, toNormal);
  return new Quaternion().setFromRotationMatrix(targetFrame).multiply(new Quaternion().setFromRotationMatrix(restFrame).invert()).normalize();
}
export function solveTwoBone(start, target, a, b, pole) {
  const direction = target.clone().sub(start), requested = direction.length();
  const distance = Math.max(Math.abs(a - b) + 1e-5, Math.min(requested, a + b - 1e-5));
  if (requested < 1e-8) direction.set(0, -1, 0);
  direction.normalize();
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const normal = pole.clone().sub(start).addScaledVector(direction, -pole.clone().sub(start).dot(direction)).normalize();
  if (normal.lengthSq() < 1e-10) normal.set(Math.abs(direction.x) < .9 ? 1 : 0, Math.abs(direction.x) < .9 ? 0 : 1, 0).addScaledVector(direction, -normal.dot(direction)).normalize();
  const joint = start.clone().addScaledVector(direction, along).addScaledVector(normal, Math.sqrt(Math.max(0, a * a - along * along)));
  return { joint, end: start.clone().addScaledVector(direction, distance), reachable: requested <= a + b && requested >= Math.abs(a - b) };
}

// Intersect the elbow's IK circle with the requested upper-arm / torso plane.
// Near extension that plane can be unreachable: use its nearest circle point.
// The exposed angle is measured in the torso plane at the bottom of the rep.
function solvePushUpArm(start, target, a, b, torso, sign, angle) {
  const caudal = new Vector3(0, -1, 0).applyQuaternion(torso), lateral = new Vector3(sign, 0, 0);
  const radians = angle * Math.PI / 180;
  const preferred = caudal.clone().multiplyScalar(Math.cos(radians)).addScaledVector(lateral, Math.sin(radians));
  const solved = solveTwoBone(start, target, a, b, start.clone().add(preferred));
  const direction = solved.end.clone().sub(start).normalize(), offset = solved.joint.clone().sub(start);
  const along = offset.dot(direction), center = start.clone().addScaledVector(direction, along);
  const radius = solved.joint.distanceTo(center);
  const planeNormal = lateral.clone().multiplyScalar(Math.cos(radians)).addScaledVector(caudal, -Math.sin(radians));
  const projected = planeNormal.clone().addScaledVector(direction, -planeNormal.dot(direction));
  if (radius > 1e-7 && projected.length() > 1e-7) {
    const k = Math.max(-1, Math.min(1, -along * direction.dot(planeNormal) / (radius * projected.length())));
    projected.normalize();
    const across = new Vector3().crossVectors(direction, projected).normalize();
    if (across.dot(preferred) < 0) across.negate();
    solved.joint.copy(center).addScaledVector(projected, radius * k).addScaledVector(across, radius * Math.sqrt(1 - k * k));
  }
  return solved;
}

// Shoulder joint span and rounded external pelvic breadth measured from this atlas.
export const bodyMetrics = Object.freeze({ shoulderWidth: .33, hipWidth: .29 });

// Shared by the asset baker and tests. All links retain their rest length. Root and joint
// quaternions are baked as standard glTF animation tracks; playback needs no mesh grouping.
export function sampleMotion(id, phase, input = {}) {
  if (!['push_up', 'squat', 'curl'].includes(id)) throw Error(`No pose sampler for ${id}`);
  const { parameters } = normalizeMotionParameters(id, input);
  const intent = poseIntent(id, phase, parameters);
  const depth = intent.depth;
  const world = new Map(), local = new Map();
  const root = new Vector3(0, intent.rootY, intent.rootZ), torso = rotationX(intent.torsoX);
  const put = (name, quaternion) => world.set(name, quaternion.clone());
  for (const name of ['pelvis', 'spine', 'chest', 'neck', 'head']) put(name, torso);
  const bodyPoint = (name) => restPoint(name).sub(restPoint('pelvis')).applyQuaternion(torso).add(root);
  const aim = (name, child, start, end) => new Quaternion().setFromUnitVectors(restPoint(child).sub(restPoint(name)).normalize(), end.clone().sub(start).normalize());
  for (const [side, sign] of [['right', -1], ['left', 1]]) {
    const upper = `${side}UpperArm`, fore = `${side}Forearm`, hand = `${side}Hand`;
    put(`${side}Shoulder`, torso);
    const shoulder = bodyPoint(upper);
    const a = restPoint(fore).distanceTo(restPoint(upper)), b = restPoint(hand).distanceTo(restPoint(fore));
    if (id === 'push_up' || id === 'squat') {
      const wrist = new Vector3(sign * intent.wristX, intent.wristY, intent.wristZ);
      const solved = id === 'push_up' ? solvePushUpArm(shoulder, wrist, a, b, torso, sign, intent.elbowAngle)
        : solveTwoBone(shoulder, wrist, a, b, shoulder.clone().add(new Vector3(sign * .12, -.5, .15)));
      put(upper, aim(upper, fore, shoulder, solved.joint));
      put(fore, id === 'push_up'
        ? orientWithPalmarNormal(restPoint(hand).sub(restPoint(fore)), solved.end.clone().sub(solved.joint), new Vector3(0, -1, 0))
        : aim(fore, hand, solved.joint, solved.end));
      put(hand, id === 'push_up'
        ? orientWithPalmarNormal(new Vector3(sign * .024, -.149, .093), new Vector3(0, 0, 1), new Vector3(0, -1, 0))
        : world.get(fore));
    } else {
      put(upper, rotationX(intent.upperArmX));
      put(fore, rotationX(intent.forearmX));
      put(hand, world.get(fore));
    }
    const thigh = `${side}Thigh`, shin = `${side}Shin`, foot = `${side}Foot`;
    if (id === 'squat') {
      const hip = bodyPoint(thigh), ankle = restPoint(foot); ankle.x = sign * intent.ankleX;
      const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), sign * intent.toeAngle * Math.PI / 180);
      const kneePole = ankle.clone().add(new Vector3(0, .4, .6).applyQuaternion(yaw));
      const solved = solveTwoBone(hip, ankle, restPoint(shin).distanceTo(restPoint(thigh)), restPoint(foot).distanceTo(restPoint(shin)), kneePole);
      put(thigh, aim(thigh, shin, hip, solved.joint)); put(shin, aim(shin, foot, solved.joint, solved.end)); put(foot, yaw);
    } else { put(thigh, torso); put(shin, torso); put(foot, id === 'push_up' ? rotationX(1.10) : torso); }
    put(`${side}Toes`, world.get(foot));
  }
  for (const joint of rigJoints) {
    const q = world.get(joint.name);
    local.set(joint.name, joint.parent ? world.get(joint.parent).clone().invert().multiply(q) : q.clone());
  }
  return { root, rotations: local, depth };
}

export function activationForMotion(id, phase) {
  const depth = .5 - .5 * Math.cos(phase * 2 * Math.PI);
  const working = Math.sin(phase * Math.PI * 2) < 0;
  return .26 + .38 * depth + (working ? .22 : .04);
}

export function highlightForMotion(id, phase, time, { pulseEnabled = true, reducedMotion = false, paused = false } = {}) {
  const activity = id ? activationForMotion(id, phase) : .5;
  const blink = !pulseEnabled || reducedMotion || paused ? .5 : .5 + .5 * Math.sin(time * .005);
  return { strength: .42 + activity * .32 + blink * .22, emissive: .12 + blink * activity * .45 };
}
