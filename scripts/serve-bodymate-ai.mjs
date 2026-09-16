import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChatMessages, normalizeAssistantResponse, normalizeChatRequest } from '../src/ai/bodymate-chat-protocol.mjs';
import { loadMoonBitCore } from './load-moonbit-core.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dpapiScript = fileURLToPath(new URL('./bodymate-ai-dpapi.ps1', import.meta.url));
const DPAPI_CONFIG_FORMAT = 'bodymate-ai-dpapi-v1';
const PROVIDER_KEYS = Object.freeze(['BODYMATE_AI_API_KEY', 'BODYMATE_AI_BASE_URL', 'BODYMATE_AI_MODEL']);
const MIME = Object.freeze({
  '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
});
const MAX_BODY_BYTES = 64 * 1024;

export class AiServerError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function parseLocalEnv(source) {
  const values = {};
  for (const line of String(source || '').split(/\r?\n/)) {
    const match = line.match(/^\s*(BODYMATE_AI_[A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    values[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

export function encryptedProviderPath(environment = process.env) {
  const localAppData = String(environment.LOCALAPPDATA || '').trim();
  return localAppData ? resolve(localAppData, 'BodyMate', 'ai-provider.dpapi.json') : '';
}

export function parseEncryptedProviderFile(source) {
  try {
    const value = JSON.parse(String(source || ''));
    const ciphertext = typeof value?.ciphertext === 'string' ? value.ciphertext.trim() : '';
    if (value?.format !== DPAPI_CONFIG_FORMAT || !/^[A-Za-z0-9+/]+={0,2}$/.test(ciphertext)) return null;
    return Object.freeze({ ciphertext });
  } catch { return null; }
}

function runDpapi(mode, value, { spawnImpl = spawn, scriptPath = dpapiScript } = {}) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const fail = () => {
      if (finished) return;
      finished = true;
      reject(new AiServerError(500, '无法读取本机加密 AI 配置。'));
    };
    let child;
    try {
      child = spawnImpl('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', scriptPath, '-Mode', mode], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch { fail(); return; }
    let output = '';
    child.once('error', fail);
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => { output += chunk; });
    child.stdin?.once('error', fail);
    child.once('close', (code) => {
      if (finished) return;
      if (code !== 0 || !output.trim()) { fail(); return; }
      finished = true;
      resolve(output.trim());
    });
    child.stdin?.end(value, 'utf8');
  });
}

function providerEnvironment(value) {
  const environment = {};
  for (const key of PROVIDER_KEYS) if (typeof value?.[key] === 'string') environment[key] = value[key].trim();
  return environment;
}

export async function readEncryptedProviderEnvironment({
  environment = process.env,
  filePath = encryptedProviderPath(environment),
  platform = process.platform,
  readFileImpl = readFile,
  unprotect = (ciphertext) => runDpapi('unprotect', ciphertext),
} = {}) {
  if (platform !== 'win32' || !filePath) return {};
  let source;
  try { source = await readFileImpl(filePath, 'utf8'); } catch (error) { if (error?.code === 'ENOENT') return {}; throw error; }
  const protectedFile = parseEncryptedProviderFile(source);
  if (!protectedFile) throw new AiServerError(500, '本机加密 AI 配置格式无效。');
  let plaintext;
  try { plaintext = await unprotect(protectedFile.ciphertext); } catch { throw new AiServerError(500, '无法读取本机加密 AI 配置。'); }
  try { return providerEnvironment(JSON.parse(plaintext)); } catch { throw new AiServerError(500, '本机加密 AI 配置格式无效。'); }
}

export function aiConfig(environment = {}) {
  const apiKey = String(environment.BODYMATE_AI_API_KEY || '').trim();
  const baseUrl = String(environment.BODYMATE_AI_BASE_URL || '').trim();
  const model = String(environment.BODYMATE_AI_MODEL || '').trim();
  if (!apiKey || !baseUrl || !model) return null;
  let endpoint;
  try {
    const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    if (!['http:', 'https:'].includes(base.protocol)) return null;
    endpoint = new URL('chat/completions', base).toString();
  } catch { return null; }
  return Object.freeze({ apiKey, endpoint, model });
}

function modelContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => typeof part?.text === 'string' ? part.text : '').join('');
  return '';
}

const UPSTREAM_ERROR_TEXT_LIMIT = 4096;
const UPSTREAM_BALANCE_ERROR_CODE = '1113';
const UPSTREAM_MODEL_BUSY_ERROR_CODE = '1305';

export function parseUpstreamErrorDetail(source) {
  const text = String(source || '').trim();
  if (!text.startsWith('{')) return null;
  let value;
  try { value = JSON.parse(text.slice(0, UPSTREAM_ERROR_TEXT_LIMIT)); } catch { return null; }
  const error = value?.error && typeof value.error === 'object' ? value.error : value;
  const rawCode = typeof error?.code === 'number' || typeof error?.code === 'string' ? String(error.code) : '';
  const code = rawCode.replace(/[^0-9A-Za-z_-]/g, '').slice(0, 32);
  const message = typeof error?.message === 'string' ? error.message.trim().slice(0, 200) : '';
  return code || message ? { code, message } : null;
}

async function readUpstreamErrorDetail(upstream) {
  if (typeof upstream?.text !== 'function') return null;
  try { return parseUpstreamErrorDetail(await upstream.text()); } catch { return null; }
}

export async function completeAiChat(payload, { config, fetchImpl = globalThis.fetch, log = (line) => console.warn(line) } = {}) {
  const request = normalizeChatRequest(payload);
  if (!config) throw new AiServerError(503, 'AI 服务尚未配置。请运行 npm run ai:configure-glm，或在本机 .env.local 中填写 BODYMATE_AI_API_KEY、BODYMATE_AI_BASE_URL 和 BODYMATE_AI_MODEL。');
  if (typeof fetchImpl !== 'function') throw new AiServerError(500, '当前 Node 运行环境不支持 AI 网络请求。');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 30_000);
  let upstream;
  try {
    upstream = await fetchImpl(config.endpoint, {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, temperature: 0.2, messages: buildChatMessages(request) }),
    });
  } catch {
    throw new AiServerError(502, 'AI 服务暂时无法连接，请稍后重试。');
  } finally { clearTimeout(timeout); }
  if (!upstream.ok) {
    const detail = await readUpstreamErrorDetail(upstream);
    if (detail && typeof log === 'function') log(`[bodymate-ai] 上游请求失败 status=${upstream.status} code=${detail.code || '未知'} message=${detail.message || '无'}`);
    if (upstream.status === 429) {
      if (detail?.code === UPSTREAM_BALANCE_ERROR_CODE) throw new AiServerError(429, 'AI 账户余额或资源包不足（上游错误码 1113）：包月套餐额度不能抵扣通用端点调用，请充值、核对端点配置或更换服务后重试。');
      if (detail?.code === UPSTREAM_MODEL_BUSY_ERROR_CODE) throw new AiServerError(429, 'AI 模型当前访问量过大（上游错误码 1305），请稍后再试；若持续出现，请改用当前在售的模型。');
      throw new AiServerError(429, 'AI 服务当前限流或额度不足，请稍后再试。');
    }
    throw new AiServerError(502, 'AI 服务没有返回可用答复，请检查本机模型配置后重试。');
  }
  let upstreamPayload;
  try { upstreamPayload = await upstream.json(); } catch { throw new AiServerError(502, 'AI 服务返回的数据无法读取。'); }
  await loadMoonBitCore({ probe: 'bodymate_agent_guard_command_v1' });
  return normalizeAssistantResponse(modelContent(upstreamPayload), request.catalog, { log });
}

// The DPAPI file is re-read whenever its size or mtime changes, so reconfiguring or deleting it
// is reflected without a server restart and health never reports a stale in-memory config.
export function configuredEnvironment(rootPath, processEnvironment, {
  encryptedEnvironmentLoader = readEncryptedProviderEnvironment,
  statImpl = stat,
  readFileImpl = readFile,
} = {}) {
  let cachedSignature = null, cachedEnvironment = {};
  return async () => {
    const filePath = encryptedProviderPath(processEnvironment);
    let signature = '';
    if (filePath) {
      try { const info = await statImpl(filePath); signature = `${info.mtimeMs}:${info.size}`; } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    }
    if (signature !== cachedSignature) {
      cachedSignature = null;
      cachedEnvironment = signature ? await encryptedEnvironmentLoader({ environment: processEnvironment, filePath }) : {};
      cachedSignature = signature;
    }
    let local = {};
    try { local = parseLocalEnv(await readFileImpl(resolve(rootPath, '.env.local'), 'utf8')); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    return { ...cachedEnvironment, ...local, ...processEnvironment };
  };
}

export function healthPayload(config) {
  return config ? { configured: true, model: config.model, endpoint: config.endpoint } : { configured: false, model: null, endpoint: null };
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new AiServerError(413, '请求内容过大。');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AiServerError(400, '请求不是有效 JSON。'); }
}

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

async function staticFile(rootPath, path) {
  const requested = path === '/' ? '/index.html' : decodeURIComponent(path);
  if (requested.split('/').some((segment) => segment.startsWith('.'))) throw new AiServerError(403, '不允许访问该文件。');
  const file = resolve(rootPath, `.${requested}`);
  const traversal = relative(rootPath, file);
  if (traversal.startsWith('..') || isAbsolute(traversal)) throw new AiServerError(403, '不允许访问该文件。');
  const info = await stat(file);
  if (!info.isFile()) throw new AiServerError(404, '文件不存在。');
  return { bytes: await readFile(file), contentType: MIME[extname(file)] || 'application/octet-stream' };
}

export function createBodyMateAiServer({ rootPath = root, processEnvironment = process.env, fetchImpl = globalThis.fetch, environmentLoader = configuredEnvironment(rootPath, processEnvironment) } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      if (url.pathname === '/api/ai/health' && request.method === 'GET') return json(response, 200, healthPayload(aiConfig(await environmentLoader())));
      if (url.pathname === '/api/ai/chat') {
        if (request.method !== 'POST') return json(response, 405, { message: '只支持 POST 请求。' });
        const answer = await completeAiChat(await readJson(request), { config: aiConfig(await environmentLoader()), fetchImpl });
        return json(response, 200, answer);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { message: '不支持该请求方法。' });
      const asset = await staticFile(rootPath, url.pathname);
      response.writeHead(200, { 'Content-Type': asset.contentType, 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : asset.bytes);
    } catch (error) {
      const status = error instanceof AiServerError ? error.status : error?.code === 'ENOENT' ? 404 : 500;
      const message = error instanceof AiServerError ? error.message : status === 404 ? '文件不存在。' : '本地服务发生错误。';
      json(response, status, { message });
    }
  });
}

export async function startBodyMateAiServer({ port = Number(process.env.BODYMATE_AI_PORT || 4174), host = '127.0.0.1' } = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw Error('BODYMATE_AI_PORT 必须是有效端口。');
  const server = createBodyMateAiServer();
  await new Promise((resolveServer, reject) => { server.once('error', reject); server.listen(port, host, resolveServer); });
  console.log(`BodyMate AI 本地服务已启动：http://${host}:${port}/?view=full-body`);
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startBodyMateAiServer().catch((error) => { console.error(error.message); process.exitCode = 1; });
