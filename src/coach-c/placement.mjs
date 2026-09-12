import { boundsCenter, boundsRadius } from '../root-scm/presentation-plan.mjs';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalize = (vector, fallback) => {
  const length = Math.hypot(...vector);
  return length > .000001 ? vector.map((value) => value / length) : fallback;
};
const addScaled = (target, vector, amount) => ({ x: target.x + vector[0] * amount, y: target.y + vector[1] * amount, z: target.z + vector[2] * amount });

export function coachScaleForViewport({ viewport, radius }) {
  const desktopScale = clamp(radius * .34, .04, .062);
  return viewport.width <= 480 ? desktopScale * .88 : desktopScale;
}

export function coachPlacementPlan({ bounds, cameraDirection, cameraRight, viewport, projectedCenter }) {
  const target = boundsCenter(bounds), radius = boundsRadius(bounds);
  const side = projectedCenter.x > viewport.width * .56 ? 'left' : 'right';
  const lateral = normalize(cameraRight, [1, 0, 0]), towardCamera = normalize(cameraDirection, [0, .2, 1]);
  const offset = Math.max(radius * .75, .045), sign = side === 'right' ? 1 : -1;
  let position = addScaled(target, lateral, sign * offset);
  position = addScaled(position, towardCamera, offset * .28);
  position = { ...position, y: position.y + offset * .72 };
  return Object.freeze({ target, pointTarget: target, position, side, scale: coachScaleForViewport({ viewport, radius }) });
}

export function coachTransitionPlan({ from, to, reducedMotion }) {
  return Object.freeze({ from: [...from], to: [...to], immediate: Boolean(reducedMotion), damping: reducedMotion ? 1 : .14 });
}

export function coachBubblePlan({ coachScreen, viewport, selectedLabelScreen }) {
  const mobile = viewport.width <= 480, width = Math.min(mobile ? 145 : 190, viewport.width - 24), height = mobile ? 72 : 96;
  let x = clamp(coachScreen.x - width * .5, 12, viewport.width - width - 12);
  let y = clamp(coachScreen.y - height - 16, 12, viewport.height - height - 12);
  if (selectedLabelScreen && Math.abs(y - selectedLabelScreen.y) < 30 && Math.abs(x - selectedLabelScreen.x) < width) y = clamp(selectedLabelScreen.y + 52, 12, viewport.height - height - 12);
  return Object.freeze({ x, y, width, height });
}

export function coachPresentationPlan(snapshot, bounds) {
  return Object.freeze({ visible: Boolean(snapshot?.selected) && !snapshot?.overview, target: boundsCenter(bounds), isolated: Boolean(snapshot?.isolated) });
}
