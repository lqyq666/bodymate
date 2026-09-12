import { AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import { motionDefinitions, rigJoints, sampleMotion } from './rig-definition.mjs';
import { normalizeMotionParameters } from './motion-parameters.mjs';

// Rebuild only animation tracks on parameter changes. Geometry and skin stay loaded.
// Keep just the active clip in the viewer; slider use cannot accumulate mixer bindings.
export function createMotionClip(id, input = {}) {
  const motion = motionDefinitions.find(item => item.id === id);
  if (!motion) throw Error(`No pose sampler for ${id}`);
  const { parameters } = normalizeMotionParameters(id, input);
  const steps = Math.round(motion.duration * 60);
  const times = Float32Array.from({ length: steps + 1 }, (_, index) => index * motion.duration / steps);
  const poses = Array.from(times, (_, index) => sampleMotion(id, index / steps, parameters));
  const tracks = [new VectorKeyframeTrack('pelvis.position', times, poses.flatMap(pose => pose.root.toArray()))];
  for (const joint of rigJoints) {
    const values = []; let previous;
    for (const pose of poses) {
      const q = pose.rotations.get(joint.name).toArray();
      if (previous && q.reduce((sum, value, index) => sum + value * previous[index], 0) < 0) q.forEach((_, index) => { q[index] *= -1; });
      values.push(...q); previous = q;
    }
    tracks.push(new QuaternionKeyframeTrack(`${joint.name}.quaternion`, times, values));
  }
  return new AnimationClip(`${id}:${JSON.stringify(parameters)}`, motion.duration, tracks);
}
