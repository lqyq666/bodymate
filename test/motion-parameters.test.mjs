import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { sampleMotion, rigJoints, restPoint, solveTwoBone } from '../src/full-muscle/rig-definition.mjs';
import { normalizeMotionParameters, parseMotionParameters, muscleProfileForMotion } from '../src/full-muscle/motion-parameters.mjs';

function worldPose(pose) {
  const points = new Map(), rotations = new Map();
  for (const joint of rigJoints) {
    const parent = rotations.get(joint.parent);
    rotations.set(joint.name, parent ? parent.clone().multiply(pose.rotations.get(joint.name)) : pose.rotations.get(joint.name).clone());
    points.set(joint.name, parent ? restPoint(joint.name).sub(restPoint(joint.parent)).applyQuaternion(parent).add(points.get(joint.parent)) : pose.root.clone());
  }
  return { points, rotations };
}

test('hand spacing and elbow flare change the actual rig, not only a displayed label', () => {
  const narrow = worldPose(sampleMotion('push_up', .5, { handWidth: .8, elbowAngle: 25 }));
  const wide = worldPose(sampleMotion('push_up', .5, { handWidth: 1.8, elbowAngle: 65 }));
  assert.ok(wide.points.get('leftHand').x - narrow.points.get('leftHand').x > .15);
  for (const handWidth of [.8, 1.3, 1.8]) for (const angle of [15, 45, 70]) {
    const pose = worldPose(sampleMotion('push_up', .5, { handWidth, elbowAngle: angle }));
    const arm = pose.points.get('leftForearm').clone().sub(pose.points.get('leftUpperArm')).applyQuaternion(pose.rotations.get('chest').clone().invert());
    assert.ok(Math.abs(Math.atan2(arm.x, -arm.y) * 180 / Math.PI - angle) < 1, `Bottom elbow flare must be ${angle} degrees`);
  }
});

test('text commands, follow-up adjustments and out-of-range input are explicit and bounded', () => {
  assert.deepEqual(parseMotionParameters('push_up', '窄距俯卧撑，夹角45度').parameters, { handWidth: .85, elbowAngle: 45 });
  assert.deepEqual(parseMotionParameters('push_up', '手距１.２倍肩宽，夹角３０度').parameters, { handWidth: 1.2, elbowAngle: 30 });
  assert.deepEqual(parseMotionParameters('squat', '站距1.5倍髋宽、脚尖外展30度、深度80%').parameters, { stanceWidth: 1.5, toeAngle: 30, squatDepth: 80 });
  assert.deepEqual(parseMotionParameters('squat', '脚尖外展15度', { stanceWidth: 1.5, toeAngle: 30, squatDepth: 80 }).parameters, { stanceWidth: 1.5, toeAngle: 15, squatDepth: 80 });
  const limited = parseMotionParameters('push_up', '手距9倍肩宽，夹角180度');
  assert.deepEqual(limited.parameters, { handWidth: 1.8, elbowAngle: 70 }); assert.equal(limited.notices.length, 2);
  assert.equal(normalizeMotionParameters('squat', { toeAngle: NaN, stanceWidth: Infinity, squatDepth: -1 }).notices.length, 3);
  assert.ok(parseMotionParameters('push_up', '抬高双脚').notices.length);
  assert.ok(parseMotionParameters('push_up', '手距三倍肩宽').notices.length);
  assert.equal(parseMotionParameters('squat', '站距1.5倍肩宽').recognized, false);
  assert.equal(parseMotionParameters('push_up', '身体与地面夹角45度').recognized, false);
  assert.equal(parseMotionParameters('curl', '胸大肌').recognized, false);
});

test('muscle profiles distinguish roles without inventing a force curve for every angle', () => {
  const narrow = muscleProfileForMotion('push_up', { handWidth: .85 }), wide = muscleProfileForMotion('push_up', { handWidth: 1.8 });
  assert.ok(narrow.groups.find(group => group.label === '上臂后侧').weight > wide.groups.find(group => group.label === '上臂后侧').weight);
  assert.ok(narrow.groups.find(group => group.label === '胸部').weight > wide.groups.find(group => group.label === '胸部').weight);
  assert.deepEqual(muscleProfileForMotion('squat', { toeAngle: 0 }).groups, muscleProfileForMotion('squat', { toeAngle: 35 }).groups);
  for (const profile of [narrow, wide, muscleProfileForMotion('squat')]) {
    assert.ok(profile.evidence.length); assert.ok(profile.groups.every(group => group.weight > 0 && group.weight <= 1));
    assert.equal(new Set(profile.groups.map(group => group.role)).size, 3);
  }
});

test('two-bone solver remains finite at folded, unreachable and collinear targets', () => {
  for (const target of [new Vector3(), new Vector3(0, -1, 0), new Vector3(0, -.01, 0)]) {
    const solved = solveTwoBone(new Vector3(), target, .3, .2, target);
    assert.ok(Math.abs(solved.joint.length() - .3) < 1e-6);
    assert.ok(Math.abs(solved.end.distanceTo(solved.joint) - .2) < 1e-6);
    assert.ok(solved.joint.toArray().every(Number.isFinite)); assert.equal(solved.reachable, false);
  }
});

test('squat stance, toe angle and depth affect their corresponding joint geometry', () => {
  const narrow = worldPose(sampleMotion('squat', .5, { stanceWidth: .8, toeAngle: 0, squatDepth: 60 }));
  const wide = worldPose(sampleMotion('squat', .5, { stanceWidth: 1.8, toeAngle: 35, squatDepth: 110 }));
  assert.ok(wide.points.get('leftFoot').x - narrow.points.get('leftFoot').x > .13);
  assert.ok(narrow.points.get('pelvis').y - wide.points.get('pelvis').y > .12);
  const forward = new Vector3(0, 0, 1).applyQuaternion(wide.rotations.get('leftFoot'));
  assert.ok(Math.abs(Math.atan2(forward.x, forward.z) * 180 / Math.PI - 35) < .01);
});

test('parameter extremes retain planted supports, bone lengths, down-facing palms and loop continuity', () => {
  const variants = [
    ...[.8, 1.3, 1.8].flatMap(handWidth => [15, 45, 70].map(elbowAngle => ['push_up', { handWidth, elbowAngle }])),
    ...[.8, 1.3, 1.8].flatMap(stanceWidth => [0, 20, 35].flatMap(toeAngle => [60, 100, 110].map(squatDepth => ['squat', { stanceWidth, toeAngle, squatDepth }]))),
  ];
  for (const [id, parameters] of variants) {
    const start = worldPose(sampleMotion(id, 0, parameters));
    for (let frame = 0; frame <= 40; frame++) {
      const pose = worldPose(sampleMotion(id, frame / 40, parameters));
      for (const joint of rigJoints) {
        assert.ok(pose.points.get(joint.name).toArray().every(Number.isFinite));
        assert.ok(Math.abs(pose.rotations.get(joint.name).length() - 1) < 1e-6);
        if (joint.parent) assert.ok(Math.abs(pose.points.get(joint.name).distanceTo(pose.points.get(joint.parent)) - restPoint(joint.name).distanceTo(restPoint(joint.parent))) < 1e-6);
        if (frame === 40) assert.ok(pose.points.get(joint.name).distanceTo(start.points.get(joint.name)) < 1e-6);
      }
      for (const [side, sign] of [['left', 1], ['right', -1]]) {
        const contacts = id === 'push_up' ? [`${side}Hand`, `${side}Foot`] : [`${side}Foot`];
        for (const contact of contacts) assert.ok(pose.points.get(contact).distanceTo(start.points.get(contact)) < .001, `${id} ${JSON.stringify(parameters)}: ${contact} slid`);
        if (id === 'push_up') {
          const axis = new Vector3(sign * .024, -.149, .093).normalize();
          const normal = new Vector3(0, 0, 1).addScaledVector(axis, -axis.z).normalize();
          const q = pose.rotations.get(`${side}Hand`);
          assert.ok(normal.applyQuaternion(q).y < -.99);
          assert.ok(axis.applyQuaternion(q).z > .99);
        } else {
          assert.ok(new Vector3(0, 1, 0).applyQuaternion(pose.rotations.get(`${side}Foot`)).y > .999);
        }
      }
    }
  }
});
