/* Root query bridge: local resolver -> validated action -> MoonBit-backed controller. */
(() => {
  const query = globalThis.BodyMateCoachQuery;
  const controller = globalThis.__bodymate;
  const form = document.querySelector('#chat-form');
  const input = document.querySelector('#chat-input');
  const card = form?.closest('.composer');
  if (!query || !controller || !form || !input || !card) return;

  const result = document.createElement('div');
  result.id = 'coach-query-candidates'; result.setAttribute('aria-live', 'polite');
  Object.assign(result.style, { display: 'none', gap: '5px', margin: '8px 0', maxHeight: '142px', overflow: 'auto' });
  form.after(result);
  const feedback = (message, title = 'Coach C') => globalThis.__rootScmQueryFeedback?.({ title, message });
  const clear = () => { result.replaceChildren(); result.style.display = 'none'; };
  const record = (text, message, structureId) => controller.recordCoachQuery?.({ text, message, structureId });
  const execute = (next) => query.isValidCoachActionContract(next) && Boolean(controller.executeCoachAction?.(next));
  const showCandidates = (resolution, text) => {
    clear(); result.style.display = 'grid';
    for (const candidate of resolution.candidates.slice(0, 6)) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.structureId = candidate.structureId;
      Object.assign(button.style, { display: 'grid', textAlign: 'left', gap: '1px', padding: '7px 8px', border: '1px solid #d7e7f6', borderRadius: '9px', background: '#f8fbff', color: '#356286', font: '600 10px/1.25 system-ui,sans-serif' });
      const zh = document.createElement('span'); zh.textContent = candidate.displayNameZh;
      const en = document.createElement('small'); en.textContent = candidate.canonicalName.toUpperCase(); Object.assign(en.style, { color: '#7891aa', fontSize: '8px', fontWeight: '500' });
      button.append(zh, en);
      button.onclick = () => {
        const select = { schemaVersion: 1, action: 'SELECT_STRUCTURE', structureId: candidate.structureId, confidence: 1, source: 'local-resolver' };
        if (query.isValidCoachActionContract(select) && execute(select)) { clear(); feedback(null); record(text, `已选中：${candidate.displayNameZh}。`, candidate.structureId); }
      };
      result.append(button);
    }
  };
  globalThis.__coachQueryHandle = (resolution, text) => {
    if (!resolution || !query.isValidCoachActionContract(resolution.action) && resolution.action) return;
    if (resolution.classification === 'STRUCTURE_LOOKUP' && resolution.resolution === 'EXACT') {
      if (execute(resolution.action)) { clear(); feedback(resolution.message, 'Coach C'); record(text, resolution.message, resolution.action.structureId); }
      return;
    }
    if (resolution.classification === 'STRUCTURE_LOOKUP' && resolution.resolution === 'AMBIGUOUS') { feedback(resolution.message, 'Coach C'); record(text, resolution.message); showCandidates(resolution, text); return; }
    if (resolution.classification === 'DOMAIN_COMMAND') {
      if (execute(resolution.action)) { clear(); feedback(resolution.message, 'Coach C'); record(text, resolution.message); }
      else { clear(); feedback('当前没有可执行的结构操作；请先选中一块真实颈肩肌肉。', 'Coach C'); }
      return;
    }
    clear(); feedback(resolution.message, 'Coach C'); record(text, resolution.message);
  };
})();
