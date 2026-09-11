import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url))); const port = Number(process.env.PORT ?? 4177); const types = { '.bin': 'application/octet-stream', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };
createServer(async (request, response) => { const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname); const entry = pathname === '/' || pathname === '/prototype/human-atlas-local/' ? '/prototype/human-atlas-local/index.html' : pathname; const file = resolve(root, `.${entry}`); if (!file.startsWith(`${root}${sep}`)) { response.writeHead(403).end(); return; } try { const info = await stat(file); if (!info.isFile()) throw Error('not file'); response.writeHead(200, { 'Content-Type': types[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); createReadStream(file).pipe(response); } catch { response.writeHead(404).end('Not found'); } }).listen(port, () => console.log(`BodyMate Human Atlas local: http://127.0.0.1:${port}/prototype/human-atlas-local/`));
