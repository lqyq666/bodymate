import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),port=Number(process.env.PORT??4175),types={'.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.glb':'model/gltf-binary'};
createServer(async(request,response)=>{const pathname=decodeURIComponent(new URL(request.url,`http://${request.headers.host}`).pathname),entry=pathname==='/'||pathname==='/prototype/public-scm/'?'/prototype/public-scm/index.html':pathname,file=resolve(root,`.${entry}`);if(!file.startsWith(`${root}${sep}`)){response.writeHead(403).end();return}try{const info=await stat(file);if(!info.isFile())throw Error('not file');response.writeHead(200,{'Content-Type':types[file.slice(file.lastIndexOf('.'))]??'application/octet-stream','Cache-Control':'no-store'});createReadStream(file).pipe(response)}catch{response.writeHead(404).end('Not found')}}).listen(port,()=>console.log(`BodyMate public SCM: http://127.0.0.1:${port}/prototype/public-scm/`));
