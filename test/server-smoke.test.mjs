import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createBodyMateAiServer } from '../scripts/serve-bodymate-ai.mjs';

const root = new URL('../', import.meta.url);
const indexHtml = await readFile(new URL('index.html', root), 'utf8');
const referencedAssets = [...indexHtml.matchAll(/(?:src|href)="([^"?]+)(?:\?[^"]*)?"/g)].map((match) => match[1]).filter((path) => path.startsWith('assets/'));

async function withServer(run) {
  const server = createBodyMateAiServer({ processEnvironment: {}, environmentLoader: async () => ({}), fetchImpl: async () => { throw new Error('upstream must not be called'); } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((resolve) => server.close(resolve)); }
}

test('local service serves the lab page and every asset it references', async () => {
  assert.ok(referencedAssets.length >= 5);
  await withServer(async (base) => {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.equal(await page.text(), indexHtml);
    for (const asset of referencedAssets) {
      const response = await fetch(`${base}/${asset}?v=cache-buster`);
      assert.equal(response.status, 200, asset);
      assert.match(response.headers.get('content-type'), asset.endsWith('.css') ? /text\/css/ : /text\/javascript/, asset);
      assert.ok((await response.text()).length > 0, asset);
    }
    const manifest = await fetch(`${base}/assets/anatomy/human-atlas/rigged-body.manifest.json`);
    assert.match(manifest.headers.get('content-type'), /application\/json/);
    const body = await manifest.json();
    assert.equal(body.muscleCount, 415);
    assert.equal(body.entries.length, 697);
    for (const path of ['console.html', 'assets/console.css', 'assets/runtime/console.js', 'assets/theme-engineer.css']) {
      const response = await fetch(`${base}/${path}`);
      assert.equal(response.status, 200, path);
      assert.ok((await response.text()).length > 0, path);
    }
    const head = await fetch(`${base}/`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  });
});

test('local service reports an unconfigured AI honestly and refuses hidden or missing files', async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/api/ai/health`);
    assert.deepEqual(await health.json(), { configured: false, model: null, endpoint: null });
    for (const hidden of ['/.gitignore', '/.git/HEAD', '/.env.local', '/assets/../.env.local']) {
      const response = await fetch(`${base}${hidden}`);
      assert.equal(response.status, 403, hidden);
    }
    assert.equal((await fetch(`${base}/assets/runtime/missing-file.js`)).status, 404);
    assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
    const chat = await fetch(`${base}/api/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '你好', catalog: [] }) });
    assert.equal(chat.status, 503);
    assert.match((await chat.json()).message, /尚未配置/);
  });
});
