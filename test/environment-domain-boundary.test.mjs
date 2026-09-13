import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import '../assets/runtime/moonbit-core.js';
import { environmentDomain } from '../src/full-muscle/environment-domain.mjs';

test('MoonBit owns normalized environment sectors, ranges and quality flags', () => {
  environmentDomain.reset();
  assert.equal(environmentDomain.sample({ azimuth: 0, elevation: .2, radius: 3 }).sector, 'front');
  assert.equal(environmentDomain.sample({ azimuth: Math.PI / 2, elevation: .2, radius: 3 }).sector, 'right');
  assert.equal(environmentDomain.sample({ azimuth: Math.PI, elevation: .2, radius: 3 }).sector, 'back');
  assert.equal(environmentDomain.sample({ azimuth: Math.PI * 1.5, elevation: .2, radius: 3 }).sector, 'left');
  assert.equal(environmentDomain.sample({ azimuth: Number.POSITIVE_INFINITY, elevation: Number.NaN, radius: Number.NEGATIVE_INFINITY }).sector, 'front');
  assert.equal(environmentDomain.setQuality('low').showTransmission, false);
  environmentDomain.setQuality('high');
  assert.equal(environmentDomain.sample({ azimuth: 0, elevation: .2, radius: 1.8 }).showCloseDetail, true);
});

test('JavaScript GLB layers consume only applicable policy without redefining it', async () => {
  const [domain, scene] = await Promise.all([
    readFile(new URL('../src/full-muscle/environment-domain.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/full-muscle/lab-environment.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(domain, /environment-frame-v1/);
  assert.doesNotMatch(scene, /radius\s*[<>]=?\s*\d|sector\s*===|quality\s*===|prefers-reduced-motion/);
  assert.match(scene, /frame\.farParallax/);
  assert.match(scene, /frame\.midParallax/);
  assert.doesNotMatch(scene, /frame\.nearParallax|frame\.showTransmission/);
  assert.match(scene, /frame\.rimAzimuth/);
});
