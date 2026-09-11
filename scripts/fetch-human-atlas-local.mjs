import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { humanAtlasSource, reassembledPartIds } from '../prototype/human-atlas-local/human-atlas-source.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const destination = join(root, 'prototype', 'human-atlas-local', 'local-assets');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function fetchPinned(path) { const response = await fetch(`${humanAtlasSource.rawBaseUrl}/${path}`); if (!response.ok) throw Error(`Human Atlas download failed: ${path} (${response.status})`); return Buffer.from(await response.arrayBuffer()); }
await mkdir(destination, { recursive: true });
const atlasBytes = await fetchPinned('atlas.json');
const atlas = JSON.parse(atlasBytes.toString('utf8'));
const wanted = new Set(reassembledPartIds);
const parts = atlas.parts.filter((part) => wanted.has(part.id));
if (parts.length !== reassembledPartIds.length || new Set(parts.map((part) => part.id)).size !== reassembledPartIds.length) throw Error('Pinned Human Atlas manifest no longer contains the expected reassembly components.');
const chunkIndexes = [...new Set(parts.map((part) => part.chunk))].sort((a, b) => a - b);
const chunks = [];
for (const index of chunkIndexes) { const source = atlas.chunks[index]; const file = source.url.split('/').pop(); const bytes = await fetchPinned(file); if (bytes.byteLength !== source.bytes) throw Error(`Human Atlas chunk size mismatch: ${file}`); await writeFile(join(destination, file), bytes); chunks.push({ index, file, bytes: bytes.byteLength, sha256: digest(bytes) }); }
await writeFile(join(destination, 'atlas.json'), atlasBytes);
await writeFile(join(destination, 'manifest.json'), JSON.stringify({ source: { ...humanAtlasSource, atlasSha256: digest(atlasBytes) }, parts, chunks }, null, 2));
console.log(JSON.stringify({ destination, source: humanAtlasSource.repository, commit: humanAtlasSource.commit, parts: parts.map((part) => ({ id: part.id, name: part.name, chunk: part.chunk, vertices: part.vertexCount, triangles: part.indexCount / 3 })), chunks }, null, 2));
