import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { hasChineseMuscleName, hasChineseStructureName, muscleNameZh, searchStructures, structureNameZh } from '../src/full-muscle/anatomy-name-zh.mjs';

const manifest = JSON.parse(await readFile(new URL('../assets/anatomy/human-atlas/rigged-body.manifest.json', import.meta.url), 'utf8'));
const muscles = manifest.entries.filter((entry) => entry.kind === 'muscle');
const otherStructures = manifest.entries.filter((entry) => entry.kind !== 'muscle');

test('every pinned muscle has a Chinese click label with laterality', () => {
  const missing = muscles.filter((entry) => !hasChineseMuscleName(entry.canonicalName));
  assert.deepEqual(missing.map((entry) => entry.canonicalName), []);
  for (const entry of muscles) {
    const label = muscleNameZh(entry.canonicalName);
    assert.doesNotMatch(label, /[A-Za-z]/, entry.canonicalName);
    assert.match(label, /肌/, entry.canonicalName);
    if (/\bleft\b/i.test(entry.canonicalName)) assert.match(label, /^左侧/, entry.canonicalName);
    if (/\bright\b/i.test(entry.canonicalName)) assert.match(label, /^右侧/, entry.canonicalName);
  }
});

test('every pinned bone, tooth and other structure has a Chinese click label', () => {
  const missing = otherStructures.filter((entry) => !hasChineseStructureName(entry.canonicalName, entry.kind));
  assert.deepEqual(missing.map((entry) => entry.kind + ': ' + entry.canonicalName), []);
  for (const entry of otherStructures) {
    const label = structureNameZh(entry.canonicalName, entry.kind);
    assert.doesNotMatch(label, /[A-Za-z]/, entry.canonicalName);
    assert.doesNotMatch(label, /结构$/, entry.canonicalName);
    if (/\bleft\b/i.test(entry.canonicalName)) assert.match(label, /^左侧/, entry.canonicalName);
    if (/\bright\b/i.test(entry.canonicalName)) assert.match(label, /^右侧/, entry.canonicalName);
  }
});

test('common bones, teeth and cartilage use standard concise Chinese names', () => {
  assert.equal(structureNameZh('Left femur'), '左侧股骨');
  assert.equal(structureNameZh('Gingiva of upper jaw'), '上颌牙龈');
  assert.equal(structureNameZh('Distal phalanx of right thumb'), '右侧拇指远节指骨');
  assert.equal(structureNameZh('Distal phalanx of left big toe'), '左侧拇趾远节趾骨');
  assert.equal(structureNameZh('Intervertebral disk of fifth lumbar vertebra'), '第五腰椎椎间盘');
  assert.equal(structureNameZh('lower first secondary molar tooth'), '下颌第一磨牙');
  assert.equal(structureNameZh('Atlas'), '寰椎');
  assert.equal(structureNameZh('Right iliotibial tract', 'connective'), '右侧髂胫束');
  assert.equal(structureNameZh('Unmapped future bone', 'bone'), '骨骼结构');
  assert.equal(structureNameZh('Unmapped future part', 'connective'), '结缔结构');
  assert.equal(structureNameZh('Left gluteus maximus', 'muscle'), muscleNameZh('Left gluteus maximus'));
});

test('common muscles use standard concise Chinese names', () => {
  assert.equal(muscleNameZh('Right sternocleidomastoid'), '右侧胸锁乳突肌');
  assert.equal(muscleNameZh('Left gluteus maximus'), '左侧臀大肌');
  assert.equal(muscleNameZh('Long head of right biceps brachii'), '右侧肱二头肌长头');
  assert.equal(muscleNameZh('Diaphragm'), '膈肌');
});

test('structure search finds muscles and bones by Chinese or Latin name, muscles first', () => {
  const indexed = manifest.entries.map((entry) => ({ ...entry, displayNameZh: structureNameZh(entry.canonicalName, entry.kind) }));
  const psoas = searchStructures(indexed, '腰大肌');
  assert.equal(psoas.length, 2);
  assert.ok(psoas.every((entry) => entry.kind === 'muscle' && entry.displayNameZh.includes('腰大肌')));
  const sacrum = searchStructures(indexed, '骶骨');
  assert.equal(sacrum.length, 1);
  assert.equal(sacrum[0].canonicalName, 'Sacrum');
  const disks = searchStructures(indexed, '椎间盘');
  assert.ok(disks.length >= 20);
  assert.ok(disks.every((entry) => entry.kind === 'bone' && entry.displayNameZh.includes('椎间盘')));
  const latin = searchStructures(indexed, 'pectoralis major');
  assert.equal(latin.length, 6);
  assert.ok(latin.every((entry) => entry.kind === 'muscle'));
  const chest = searchStructures(indexed, '胸');
  const firstOther = chest.findIndex((entry) => entry.kind !== 'muscle');
  assert.ok(firstOther > 0);
  assert.ok(chest.slice(0, firstOther).every((entry) => entry.kind === 'muscle'));
  assert.ok(chest.slice(firstOther).every((entry) => entry.kind !== 'muscle'));
  assert.deepEqual(searchStructures(indexed, '   '), []);
});
