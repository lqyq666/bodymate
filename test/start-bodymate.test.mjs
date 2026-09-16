import assert from 'node:assert/strict';
import test from 'node:test';
import { labUrl, openCommand, startBodyMate } from '../scripts/start-bodymate.mjs';

test('browser open command matches the host platform', () => {
  assert.deepEqual(openCommand('http://127.0.0.1:4174/?view=full-body', 'win32'), { file: 'cmd.exe', args: ['/c', 'start', '', 'http://127.0.0.1:4174/?view=full-body'] });
  assert.deepEqual(openCommand('http://x/', 'darwin'), { file: 'open', args: ['http://x/'] });
  assert.deepEqual(openCommand('http://x/', 'linux'), { file: 'xdg-open', args: ['http://x/'] });
});

test('one-click start launches the service and opens the lab page', async () => {
  const calls = [], logs = [];
  const fakeServer = { close() {} };
  const result = await startBodyMate({
    port: 4321,
    startServer: async ({ port }) => { calls.push(['start', port]); return fakeServer; },
    open: async (url) => { calls.push(['open', url]); return true; },
    log: (line) => logs.push(line),
  });
  assert.equal(result.server, fakeServer);
  assert.equal(result.url, labUrl(4321));
  assert.deepEqual(calls, [['start', 4321], ['open', 'http://127.0.0.1:4321/?view=full-body']]);
  assert.ok(logs.at(-1).includes('已打开'));
});

test('one-click start reuses a running service instead of failing on a busy port', async () => {
  const logs = [];
  const busy = Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' });
  const result = await startBodyMate({ port: 4174, startServer: async () => { throw busy; }, open: async () => true, log: (line) => logs.push(line) });
  assert.equal(result.server, null);
  assert.ok(logs[0].includes('已有服务在运行'));
  await assert.rejects(
    () => startBodyMate({ port: 4174, startServer: async () => { throw new Error('boom'); }, open: async () => true, log: () => {} }),
    /boom/,
  );
});
