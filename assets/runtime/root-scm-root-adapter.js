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
      registryEnglish.hidden = true; registrySource.hidden = true;
      if (failed && entry && !snapshot.whole) document.querySelector('#selection-meta').textContent = '真实 SCM 资源未能初始化，当前显示交互白模。';
      return;
    }
    viewer.show(); viewer.applySnapshot(snapshot);
    document.querySelector('#selection-name').textContent = entry.displayNameZh;
    document.querySelector('#selection-meta').textContent = `${groupName(entry.uiGroup)} · ${sideName(entry.side)}`;
    registryEnglish.hidden = false; registryEnglish.textContent = entry.canonicalName.toUpperCase();
    registrySource.hidden = false; registrySource.textContent = `${entry.sourceProvider} · 真实公开解剖网格，用于结构位置与形态认知。`;
    if (tag) tag.textContent = '真实公开解剖资产 · CC BY 4.0 · 非医学诊断';
  };
  globalThis.__rootScmQueryFeedback = (feedback) => viewer?.setQueryFeedback?.(feedback);
  globalThis.__rootScmApply(globalThis.__bodymate?.state || {});
})();
