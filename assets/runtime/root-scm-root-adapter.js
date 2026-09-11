/* Root bridge only: MoonBit owns product state; BodyMateRootScmRuntime owns rendering/picking. */
(() => {
  const canonicalId = 'bodymate.neck.sternocleidomastoid.right';
  const detail = document.querySelector('#detail-view');
  const legacy = document.querySelector('#detail-canvas');
  const canvas = document.createElement('canvas');
  canvas.id = 'root-scm-canvas'; canvas.hidden = true; canvas.setAttribute('aria-label', '真实右侧胸锁乳突肌，可旋转和点击选择');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '1', background: 'radial-gradient(circle at 45% 32%,#fff,#e9f0f7)' });
  detail.append(canvas);
  const attribution = document.createElement('button');
  attribution.id = 'asset-attribution'; attribution.type = 'button'; attribution.textContent = '资产来源 / License';
  Object.assign(attribution.style, { font: 'inherit', fontSize: '9px', color: '#477eaf', background: 'transparent', textDecoration: 'underline', padding: '4px 0', marginTop: '5px' });
  document.querySelector('.current-summary')?.append(attribution);
  attribution.onclick = () => alert('Open Anatomy / SPL Head and Neck Atlas\nMarianna Jakab · Ron Kikinis\n许可证与通知：assets/anatomy/open-anatomy/NOTICE.md、assets/anatomy/open-anatomy/LICENSE.md');
  const overlays = ['#label-lines', '#anatomy-labels', '#coach-bubble', '.detail-instruction', '.fiber-note'].map((selector) => document.querySelector(selector)).filter(Boolean);
  let viewer; let failed = false;
  const legacyTag = '交互占位 · 非解剖教材';
  const tag = document.querySelector('.data-tag');
  const restoreLegacy = (error) => {
    failed = true; canvas.hidden = true; legacy.hidden = false;
    overlays.forEach((node) => { node.style.visibility = ''; });
    if (tag) tag.textContent = legacyTag;
    document.querySelector('#selection-meta').textContent = '真实 SCM 资源未能初始化，当前显示交互白模。';
    if (error) console.error(error);
  };
  try {
    if (new URLSearchParams(globalThis.location?.search || '').has('root-scm-fail')) throw Error('Test-only real SCM viewer failure.');
    viewer = globalThis.BodyMateRootScmRuntime.mount({ canvas, onPick: () => globalThis.__bodymate?.select('scm_r'), onError: restoreLegacy });
  } catch (error) { restoreLegacy(error); }
  globalThis.__rootScmApply = (snapshot) => {
    const active = !failed && snapshot.selected === canonicalId && !snapshot.whole;
    legacy.hidden = active; canvas.hidden = !active; overlays.forEach((node) => { node.style.visibility = active ? 'hidden' : ''; });
    if (!active) { if (tag) tag.textContent = legacyTag; return; }
    viewer.show(); viewer.applySnapshot(snapshot); viewer.focusSelected();
    document.querySelector('#selection-name').textContent = '右侧胸锁乳突肌';
    document.querySelector('#selection-meta').textContent = '颈肩 · 真实公开解剖网格 · Open Anatomy / SPL Head and Neck Atlas';
    if (tag) tag.textContent = '真实公开解剖资产 · 非医学诊断';
  };
  globalThis.__rootScmApply(globalThis.__bodymate?.state || {});
})();
