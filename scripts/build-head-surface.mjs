import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { humanAtlasCommit, sourceFiles, fullMuscleSourceFiles, sha256 } from './human-atlas-source.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('assets/presentation/head-surface.json', root);
const atlasPath = new URL('prototype/human-atlas-local/local-assets/atlas.json', root);
// This is a display surface, not an additional structure or a change to the anatomical rig.
const ids = ['FJ2810','FJ2811','FJ2814','FJ1289','FJ1317','FJ1340','FJ1368'];
const clipDistance = point => point[1] + point[2] * .25 - 1.512;
const encode = array => Buffer.from(array.buffer,array.byteOffset,array.byteLength).toString('base64');
if (!existsSync(atlasPath)) {
  const existing = JSON.parse(await readFile(output,'utf8'));
  if (existing.sourceCommit !== humanAtlasCommit || existing.parts.map(part=>part.sourceMeshId).join() !== ids.join()) throw Error('Head display surface provenance mismatch');
  console.log('Using committed head display surface; source cache not required.');
} else {
  const atlasBytes = await readFile(atlasPath);
  if (sha256(atlasBytes) !== sourceFiles['atlas.json']) throw Error('Head source atlas mismatch');
  const atlas = JSON.parse(atlasBytes), files = new Map(), parts = [];
  for (const id of ids) {
    const source = atlas.parts.find(part=>part.id===id); if(!source) throw Error('Missing head source '+id);
    const name = `body-${source.chunk}.bin`;
    if(!files.has(name)){const bytes=await readFile(new URL('prototype/human-atlas-local/local-assets/'+name,root));if(sha256(bytes)!==fullMuscleSourceFiles[name])throw Error('Unverified head source chunk '+name);files.set(name,bytes);}
    const bytes=files.get(name), vertices=new Float32Array(bytes.buffer,bytes.byteOffset+source.positions,source.vertexCount*3), normals=new Int16Array(bytes.buffer,bytes.byteOffset+source.normals,source.vertexCount*3), indices=new Uint32Array(bytes.buffer,bytes.byteOffset+source.indices,source.indexCount);
    const positions=[], normalOutput=[];
    for(let index=0;index<indices.length;index+=3){
      let polygon=[...indices.subarray(index,index+3)].map(i=>({p:[...vertices.subarray(i*3,i*3+3)],n:[...normals.subarray(i*3,i*3+3)].map(v=>v/32767)}));
      if(id==='FJ2810'){
        const clipped=[];
        for(let edge=0;edge<polygon.length;edge++){
          const one=polygon[edge],two=polygon[(edge+1)%polygon.length],a=clipDistance(one.p),b=clipDistance(two.p);
          if(a>=0)clipped.push(one);
          if((a>=0)!==(b>=0)){const t=a/(a-b);clipped.push({p:one.p.map((v,i)=>v+(two.p[i]-v)*t),n:one.n.map((v,i)=>v+(two.n[i]-v)*t)});}
        }
        polygon=clipped;
      }
      for(let triangle=1;triangle<polygon.length-1;triangle++) for(const point of [polygon[0],polygon[triangle],polygon[triangle+1]]){positions.push(...point.p);const length=Math.hypot(...point.n)||1;normalOutput.push(...point.n.map(v=>v/length));}
    }
    const positionBytes=new Float32Array(positions), normalBytes=new Float32Array(normalOutput);
    parts.push({sourceMeshId:id,canonicalName:source.name,triangles:positions.length/9,positions:encode(positionBytes),normals:encode(normalBytes),sha256:sha256(Buffer.concat([Buffer.from(positionBytes.buffer),Buffer.from(normalBytes.buffer)]))});
  }
  const data={schemaVersion:1,sourceCommit:humanAtlasCommit,license:'CC BY 4.0',attribution:'BodyParts3D, © The Database Center for Life Science',role:'head display surface; excluded from domain structure counts',cutPlane:[0,1,.25,-1.512],parts};
  await mkdir(new URL('assets/presentation/',root),{recursive:true});await writeFile(output,JSON.stringify(data)+'\n');
  console.log(`Built real head surface (${parts.reduce((n,p)=>n+p.triangles,0)} triangles; frozen anatomy untouched).`);
}
