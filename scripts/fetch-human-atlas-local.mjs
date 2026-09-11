import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { humanAtlasSource, reassembledPartIds } from '../prototype/human-atlas-local/human-atlas-source.mjs';
import { fetchPinnedBytes } from '../prototype/human-atlas-local/download.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const destination = join(root, 'prototype', 'human-atlas-local', 'local-assets');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sleep = (attempt) => new Promise((resolve) => setTimeout(resolve, attempt * 400));
async function fetchPinned(path, expectedBytes) { return fetchPinnedBytes(`${humanAtlasSource.rawBaseUrl}/${path}`, { expectedBytes, wait: sleep }); }
async function reuseOrFetch(file, expectedBytes) { try { if ((await stat(join(destination, file))).size === expectedBytes) return readFile(join(destination, file)); } catch {} const bytes = await fetchPinned(file, expectedBytes); await writeFile(join(destination, file), bytes); return bytes; }
await mkdir(destination, { recursive: true });
const atlasBytes = await fetchPinned('atlas.json');
const atlas = JSON.parse(atlasBytes.toString('utf8'));
const fullAtlas = process.argv.includes('--full');
const wanted = new Set(reassembledPartIds);
const parts = fullAtlas ? atlas.parts : atlas.parts.filter((part) => wanted.has(part.id));
if (!fullAtlas && (parts.length !== reassembledPartIds.length || new Set(parts.map((part) => part.id)).size !== reassembledPartIds.length)) throw Error('Pinned Human Atlas manifest no longer contains the expected reassembly components.');
const chunkIndexes = [...new Set(parts.map((part) => part.chunk))].sort((a, b) => a - b);
const chunks = [];
for (const index of chunkIndexes) { const source = atlas.chunks[index]; const file = source.url.split('/').pop(); const bytes = await reuseOrFetch(file, source.bytes); chunks.push({ index, file, bytes: bytes.byteLength, sha256: digest(bytes) }); }
await writeFile(join(destination, 'atlas.json'), atlasBytes);
await writeFile(join(destination, 'manifest.json'), JSON.stringify({ scope: fullAtlas ? 'full-atlas' : 'neck-context', source: { ...humanAtlasSource, atlasSha256: digest(atlasBytes) }, parts, chunks }, null, 2));
console.log(JSON.stringify({ destination, scope: fullAtlas ? 'full-atlas' : 'neck-context', source: humanAtlasSource.repository, commit: humanAtlasSource.commit, partCount: parts.length, chunks }, null, 2));
