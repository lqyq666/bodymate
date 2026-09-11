import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

test('CI caches and retries the verified MoonBit install without relaxing its version guard', () => {
  assert.match(workflow, /uses: actions\/cache@v4[\s\S]*path: ~\/.moon[\s\S]*key: moonbit-linux-0\.1\.20260904-v1/);
  assert.match(workflow, /curl --fail --show-error --location --retry 4 --retry-all-errors --connect-timeout 20 --max-time 60/);
  assert.match(workflow, /sed -i 's\/curl --fail --location --progress-bar\/curl --fail --location --progress-bar --retry 4 --retry-all-errors --connect-timeout 20 --max-time 90\/g'/);
  assert.match(workflow, /\"\$moon_bin\" --version \| grep -Fq 'moon 0\.1\.20260904'/);
});
