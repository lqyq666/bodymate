import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startBodyMateAiServer } from './serve-bodymate-ai.mjs';

export const labUrl = (port) => `http://127.0.0.1:${port}/?view=full-body`;

export function openCommand(url, platform = process.platform) {
  if (platform === 'win32') return { file: 'cmd.exe', args: ['/c', 'start', '', url] };
  if (platform === 'darwin') return { file: 'open', args: [url] };
  return { file: 'xdg-open', args: [url] };
}

function openInBrowser(url) {
  const { file, args } = openCommand(url);
  return new Promise((resolve) => {
    let child;
    try { child = spawn(file, args, { stdio: 'ignore', detached: true }); } catch { resolve(false); return; }
    child.once('error', () => resolve(false));
    child.once('spawn', () => { child.unref(); resolve(true); });
  });
}

export async function startBodyMate({
  port = Number(process.env.BODYMATE_AI_PORT || 4174),
  startServer = startBodyMateAiServer,
  open = openInBrowser,
  log = (line) => console.log(line),
} = {}) {
  let server = null;
  try {
    server = await startServer({ port });
  } catch (error) {
    if (error?.code !== 'EADDRINUSE') throw error;
    log(`端口 ${port} 已有服务在运行，直接打开页面。`);
  }
  const url = labUrl(port);
  const opened = await open(url);
  log(opened ? `已打开 ${url}` : `请手动打开 ${url}`);
  return { server, url, opened };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startBodyMate().catch((error) => { console.error(error.message); process.exitCode = 1; });
