import * as THREE from 'three';

// Tissue-toned anatomy palette: muscles read as deep tissue red, bones as
// ivory, display shells stay neutral. The previous single sculpture-white
// finish made the shell meshes read as a pale, hollow ghost; per-tissue colour
// plus double-sided shading makes the gaps between shells show shaded anatomy
// surfaces instead of the background.
export const muscleTone = '#AC5148';
export const boneTone = '#E9E1CC';
export const surfaceTone = '#D8D3CA';

// Presentation only: callers own their cloned material; geometry and skin stay intact.
export function applySculptureFinish(material, kind = 'muscle') {
  material.name = 'BodyMate / tissue-toned anatomical sculpture';
  if (kind === 'bone') {
    material.color.set(boneTone);
    material.roughness = .55;
  } else if (kind === 'surface') {
    material.color.set(surfaceTone);
    material.roughness = .6;
  } else {
    material.color.set(muscleTone);
    material.roughness = .38;
    // Cheap subsurface approximation: deep-red translucency on grazing angles
    // reads as light passing through wet tissue. Injection point follows the
    // same emissive-payload pattern as the lab environment materials.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         {
           float muscleFacing = saturate(dot(normal, normalize(vViewPosition)));
           float muscleRim = pow(1.0 - muscleFacing, 3.0);
           totalEmissiveRadiance += vec3(0.62, 0.11, 0.08) * muscleRim * 0.55;
         }`);
    };
    material.customProgramCacheKey = () => 'bodymate-muscle-translucency-v1';
  }
  material.metalness = 0;
  material.side = THREE.DoubleSide;
  material.emissive.set('#000000');
  material.emissiveIntensity = 0;
  return material;
}
