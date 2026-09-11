/* Optional enhancement: the browser sends only query text and selected stable ID to a configured bridge. */
(() => {
  const ai = globalThis.BodyMateCoachAi, localHandle = globalThis.__coachQueryHandle, controller = globalThis.__bodymate;
  if (!ai || !localHandle || !controller) return;
  const params = new URLSearchParams(globalThis.location?.search || '');
  const rawUrl = globalThis.location?.protocol === 'file:' ? null : params.get('coach-ai-bridge');
  let bridgeUrl = null;
  try { const parsed = rawUrl && new URL(rawUrl); if (parsed && /^https?:$/.test(parsed.protocol) && !parsed.username && !parsed.password) bridgeUrl = parsed.toString().replace(/\/$/, ''); } catch { /* Local fallback is intentional. */ }
  const input = document.querySelector('#chat-input');
  const status = document.createElement('small'); status.id = 'coach-ai-status'; status.setAttribute('aria-live', 'polite');
  Object.assign(status.style, { display: 'block', minHeight: '14px', marginTop: '5px', color: '#718aa4', fontSize: '9px' });
  input?.closest('.composer')?.querySelector('.composer-bottom')?.before(status);
  const setStatus = (next) => { status.textContent = next === 'loading' ? 'C 正在匹配结构…' : next === 'fallback' ? 'C 的智能匹配暂时不可用，已切回本地结构查找。' : next === 'ready' ? 'C 已完成结构匹配。' : ''; };
  const request = async (url, body, upstream) => {
    const deadline = new AbortController(), timer = setTimeout(() => deadline.abort(), 11000);
    const abort = () => deadline.abort(); upstream?.addEventListener('abort', abort, { once: true });
    try { const response = await fetch(url, { method: 'POST', credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: deadline.signal }); if (!response.ok) throw Error(`bridge_${response.status}`); return response.json(); }
    finally { clearTimeout(timer); upstream?.removeEventListener('abort', abort); }
  };
  const router = ai.createLatestAiRouter({ bridgeUrl, request, applyLocal: localHandle, applyAi: localHandle, onStatus: setStatus });
  globalThis.__coachQueryHandle = (local, text) => router.resolve({ text, local, selectedStructureId: controller.state?.selected || null });
})();
