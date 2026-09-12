/* Root bridge only: MoonBit owns product state; BodyMateRootScmRuntime owns rendering/picking. */
(() => {
  const anatomyRegistry = globalThis.BodyMateAnatomyRegistry || [];
  const anatomyEntryFor = (id) => anatomyRegistry.find((entry) => entry.structureId === id) || null;
  const detail = document.querySelector('#detail-view');
  const legacy = document.querySelector('#detail-canvas');
  const canvas = document.createElement('canvas');
  canvas.id = 'root-scm-canvas'; canvas.hidden = true; canvas.setAttribute('aria-label', 'Human Atlas 真实颈肩肌肉，可旋转和点击选择');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '1', background: 'radial-gradient(circle at 45% 32%,#fff,#e9f0f7)' });
  detail.append(canvas);
  const attribution = document.createElement('button');
  attribution.id = 'asset-attribution'; attribution.type = 'button'; attribution.textContent = '资产来源 / License';
  Object.assign(attribution.style, { font: 'inherit', fontSize: '9px', color: '#477eaf', background: 'transparent', textDecoration: 'underline', padding: '4px 0', marginTop: '5px' });
  document.querySelector('.current-summary')?.append(attribution);
  attribution.onclick = () => alert(`${anatomyRegistry[0]?.sourceProvider || 'Human Atlas / BodyParts3D 4.0'}\nBodyParts3D, © The Database Center for Life Science\nCC BY 4.0；署名：assets/anatomy/human-atlas/ATTRIBUTION.md`);
  const overlays = ['#label-lines', '#anatomy-labels', '#coach-bubble', '.detail-instruction', '.fiber-note'].map((selector) => document.querySelector(selector)).filter(Boolean);
  let viewer; let failed = false;
  const legacyTag = '交互占位 · 非解剖教材';
  const tag = document.querySelector('.data-tag');
  const summary = document.querySelector('.current-summary');
  const registryEnglish = document.createElement('small');
  registryEnglish.id = 'selection-english';
  Object.assign(registryEnglish.style, { display: 'block', marginTop: '5px', color: '#52779e', fontSize: '10px', letterSpacing: '.6px' });
  const registrySource = document.createElement('small');
  registrySource.id = 'selection-source';
  Object.assign(registrySource.style, { display: 'block', marginTop: '4px', color: '#718aa4', fontSize: '10px', lineHeight: '1.5' });
  summary?.append(registryEnglish, registrySource);
  const structureSet = document.createElement('section');
  structureSet.id = 'structure-set-summary';
  Object.assign(structureSet.style, { display: 'none', marginTop: '7px', paddingTop: '6px', borderTop: '1px solid #dce8f2', color: '#52779e', font: '600 10px/1.45 system-ui,sans-serif' });
  const structureSetTitle = document.createElement('strong'), structureSetMembers = document.createElement('small');
  Object.assign(structureSetMembers.style, { display: 'block', marginTop: '3px', color: '#718aa4', fontSize: '9px', fontWeight: '500' });
  structureSet.append(structureSetTitle, structureSetMembers); summary?.append(structureSet);
  const movementCard = document.createElement('section'); movementCard.id = 'movement-summary';
  Object.assign(movementCard.style, { display: 'none', marginTop: '8px', paddingTop: '7px', borderTop: '1px solid #dce8f2', color: '#365b80', font: '600 10px/1.45 system-ui,sans-serif' });
  const movementTitle = document.createElement('strong'), movementCanonical = document.createElement('small'), movementMembers = document.createElement('small'), evidenceButton = document.createElement('button');
  Object.assign(movementCanonical.style, { display: 'block', marginTop: '2px', color: '#6d88a3', fontSize: '8px', letterSpacing: '.45px' }); Object.assign(movementMembers.style, { display: 'block', marginTop: '4px', color: '#52779e', fontSize: '9px', fontWeight: '500' });
  evidenceButton.type = 'button'; evidenceButton.textContent = '查看依据'; Object.assign(evidenceButton.style, { marginTop: '6px', padding: '4px 7px', border: '1px solid #c9ddf3', borderRadius: '7px', background: '#f5faff', color: '#2875ba', font: '600 9px system-ui,sans-serif' });
  movementCard.append(movementTitle, movementCanonical, movementMembers, evidenceButton); summary?.append(movementCard);
  const evidenceDialog = document.createElement('dialog'); evidenceDialog.id = 'movement-evidence-dialog'; Object.assign(evidenceDialog.style, { width: 'min(430px,calc(100vw - 28px))', maxHeight: '80dvh', border: '1px solid #d9e7f4', borderRadius: '16px', padding: '18px', color: '#274966', boxShadow: '0 20px 70px #214a7833' }); (document.body || detail)?.append(evidenceDialog);
  const evidenceById = () => { const wire = globalThis.bodymate_domain_evidence_v1?.(); const fields = String(wire || '').split('|'); if (fields.length !== 3 || fields[0] !== 'ok' || fields[1] !== 'evidence-v1') return new Map(); return new Map((fields[2] ? fields[2].split('~') : []).map((item) => { const [id, title, url, note] = item.split('^'); return id && title && url && note ? [id, { id, title, url, note }] : null; }).filter(Boolean)); };
  evidenceButton.onclick = () => { const snapshot = globalThis.__bodymate?.state || {}, evidence = evidenceById(), ids = [...new Set((snapshot.movementMappings || []).flatMap((item) => item.evidenceIds || []))]; evidenceDialog.replaceChildren(); const heading = document.createElement('h2'); heading.textContent = snapshot.movementLabel || '结构依据'; heading.style.margin = '0 0 8px'; const coverage = document.createElement('p'); coverage.textContent = snapshot.coverageNote || '当前模型覆盖范围内的参与结构。'; coverage.style.cssText = 'font:12px/1.65 system-ui,sans-serif;color:#607b96;margin:0 0 12px'; evidenceDialog.append(heading, coverage); for (const id of ids) { const source = evidence.get(id); if (!source) continue; const article = document.createElement('article'); article.style.cssText = 'border-top:1px solid #e3edf6;padding:10px 0;font:12px/1.6 system-ui,sans-serif'; const title = document.createElement('strong'); title.textContent = source.title; const note = document.createElement('p'); note.textContent = source.note; note.style.margin = '5px 0'; const link = document.createElement('a'); link.href = source.url; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = source.url; link.style.cssText = 'display:block;overflow-wrap:anywhere;color:#2875ba;font-size:10px'; article.append(title, note, link); evidenceDialog.append(article); } const close = document.createElement('button'); close.type = 'button'; close.textContent = '关闭'; close.onclick = () => evidenceDialog.close(); close.style.cssText = 'margin-top:10px;padding:7px 10px;border:0;border-radius:8px;background:#edf5ff;color:#2875ba'; evidenceDialog.append(close); evidenceDialog.showModal(); };
  const groupName = (group) => group === 'shoulder' ? '肩带' : '颈部';
  const sideName = (side) => side === 'left' ? '左侧' : '右侧';
  const restoreLegacy = (error) => {
    failed = true; canvas.hidden = true; legacy.hidden = false;
    overlays.forEach((node) => { node.style.visibility = ''; });
    if (tag) tag.textContent = legacyTag;
    document.querySelector('#selection-meta').textContent = '真实 SCM 资源未能初始化，当前显示交互白模。';
    if (error) console.error(error);
  };
  try {
    if (new URLSearchParams(globalThis.location?.search || '').has('root-scm-fail')) throw Error('Test-only Human Atlas viewer failure.');
    viewer = globalThis.BodyMateRootScmRuntime.mount({ canvas, onPick: (structureId) => globalThis.__bodymate?.select(structureId), onError: restoreLegacy });
  } catch (error) { restoreLegacy(error); }
  globalThis.__rootScmApply = (snapshot) => {
    const entry = anatomyEntryFor(snapshot.selected);
    const active = !failed && entry && !snapshot.whole;
    legacy.hidden = active; canvas.hidden = !active; overlays.forEach((node) => { node.style.visibility = active ? 'hidden' : ''; });
    attribution.hidden = !active;
    if (!active) {
      if (tag) tag.textContent = legacyTag;
      registryEnglish.hidden = true; registrySource.hidden = true; structureSet.style.display = 'none'; movementCard.style.display = 'none';
      if (failed && entry && !snapshot.whole) document.querySelector('#selection-meta').textContent = '真实 SCM 资源未能初始化，当前显示交互白模。';
      return;
    }
    viewer.show(); viewer.applySnapshot(snapshot);
    document.querySelector('#selection-name').textContent = entry.displayNameZh;
    document.querySelector('#selection-meta').textContent = `${groupName(entry.uiGroup)} · ${sideName(entry.side)}`;
    registryEnglish.hidden = false; registryEnglish.textContent = entry.canonicalName.toUpperCase();
    registrySource.hidden = false; registrySource.textContent = `${entry.sourceProvider} · 真实公开解剖网格，用于结构位置与形态认知。`;
    const members = snapshot.highlightMode === 'structure_set' ? (snapshot.highlighted || []).map((item) => anatomyEntryFor(item.structureId)).filter(Boolean) : [];
    structureSet.style.display = members.length ? 'block' : 'none';
    if (members.length) { structureSetTitle.textContent = `高亮集合 · ${snapshot.highlightSetLabel}（${members.length}）`; structureSetMembers.textContent = members.map((member) => member.displayNameZh).join(' · '); }
    const mapped = (snapshot.movementMappings || []).map((item) => ({ ...item, entry: anatomyEntryFor(item.structureId) })).filter((item) => item.entry);
    movementCard.style.display = snapshot.activeMovementId && mapped.length ? 'block' : 'none';
    if (snapshot.activeMovementId && mapped.length) { movementTitle.textContent = `${snapshot.movementLabel} · 当前模型覆盖 ${mapped.length} 个参与结构`; movementCanonical.textContent = snapshot.movementCanonicalName || ''; movementMembers.textContent = mapped.map((item) => `${item.role === 'main_contributor' ? '主要参与' : '参与'}：${item.entry.displayNameZh}`).join(' · '); }
    if (tag) tag.textContent = '真实公开解剖资产 · CC BY 4.0 · 非医学诊断';
  };
  globalThis.__rootScmQueryFeedback = (feedback) => viewer?.setQueryFeedback?.(feedback);
  globalThis.__rootScmApply(globalThis.__bodymate?.state || {});
})();
