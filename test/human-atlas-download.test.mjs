import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchPinnedBytes } from '../prototype/human-atlas-local/download.mjs';

test('Human Atlas download retries a reset connection and validates byte length before returning', async () => {
  let calls = 0;
  const bytes = await fetchPinnedBytes('https://example.invalid/body-7.bin', { expectedBytes: 4, attempts: 2, wait: () => Promise.resolve(), fetchImpl: async () => { calls += 1; if (calls === 1) { const error = new Error('read ECONNRESET'); error.code = 'ECONNRESET'; throw error; } return new Response(new Uint8Array([1, 2, 3, 4])); } });
  assert.equal(calls, 2);
  assert.deepEqual([...bytes], [1, 2, 3, 4]);
});
