import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { hasChineseMuscleName, muscleNameZh } from '../src/full-muscle/anatomy-name-zh.mjs';

const manifest = JSON.parse(await readFile(new URL('../assets/anatomy/human-atlas/rigged-body.manifest.json', import.meta.url), 'utf8'));
const muscles = manifest.entries.filter((entry) => entry.kind === 'muscle');

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

test('common muscles use standard concise Chinese names', () => {
  assert.equal(muscleNameZh('Right sternocleidomastoid'), '右侧胸锁乳突肌');
  assert.equal(muscleNameZh('Left gluteus maximus'), '左侧臀大肌');
  assert.equal(muscleNameZh('Long head of right biceps brachii'), '右侧肱二头肌长头');
  assert.equal(muscleNameZh('Diaphragm'), '膈肌');
});
