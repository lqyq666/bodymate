/* Shared chrome for the complete-body laboratory; retired views resolve here. */
(() => {
  const url = new URL(location.href);
  if (url.searchParams.has('view') && url.searchParams.get('view') !== 'full-body') {
    url.searchParams.set('view', 'full-body');
    url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }
  const search = document.createElement('form'); search.className = 'lab-search'; search.setAttribute('role', 'search');
  search.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input aria-label="搜索结构或动作" placeholder="搜索结构、动作样例…">';
  document.querySelector('.header-right').prepend(search);
  search.addEventListener('submit', event => {
    event.preventDefault();
    const input = search.querySelector('input'), question = document.querySelector('#chat-input');
    question.value = input.value; document.querySelector('#chat-form').requestSubmit(); input.value = '';
  });
  const status = document.querySelector('.progress-mini');
  status.innerHTML = '<div class="lab-model-status"><h2 class="lab-status-title">参照骨架</h2><div class="lab-status-body"><div class="lab-status-ring"><strong>—</strong><span>正在加载</span></div><p><strong>完整人体</strong>参照骨架加载中</p></div></div>';
  const tabs = document.createElement('div'); tabs.className = 'lab-domain-tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', '工作模式');
  tabs.innerHTML = '<button data-lab-mode="structure" class="active" aria-pressed="true">骨架</button><button data-lab-mode="movement" aria-pressed="false">回放</button>';
  document.querySelector('.current-card').prepend(tabs);
  tabs.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.labMode === 'structure') document.querySelector('#anatomy-reset')?.click();
    else if (button.dataset.labMode === 'movement') document.querySelector('.anatomy-examples button')?.click();
  });
  const title = document.createElement('h2'); title.className = 'lab-query-title'; title.textContent = '指令与检索';
  document.querySelector('.composer').prepend(title);
  const help = document.querySelector('#help-dialog');
  document.querySelector('#help').onclick = () => help.showModal();
  document.querySelector('#close-help').onclick = () => help.close();

  // DOM coordinates in, MoonBit feedback out. CSS renders the returned values.
  const feedback = globalThis.bodymate_ui_feedback_v1;
  if (typeof feedback !== 'function') return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = '.anatomy-examples button, #chat-form button, #anatomy-reset, #help, #close-help';
  const properties = { x: ['--feedback-x', 'px'], y: ['--feedback-y', 'px'], rx: ['--feedback-rx', 'deg'], ry: ['--feedback-ry', 'deg'], duration: ['--feedback-duration', 'ms'] };
  let active = null, bounds = null, frame = 0, point = [0, 0];
  const renderFeedback = (button, hovered) => {
    const [, version, payload] = feedback(...point, hovered, reduced.matches, fine.matches).split('|');
    if (version !== 'ui-feedback-v1') return;
    for (const field of payload.split(',')) {
      const [key, value] = field.split('='), property = properties[key];
      if (property) button.style.setProperty(property[0], value + property[1]);
    }
  };
  const clearFeedback = () => {
    cancelAnimationFrame(frame); frame = 0;
    if (active) renderFeedback(active, false);
    active = null; bounds = null;
  };
  document.addEventListener('pointermove', event => {
    const button = event.target.closest?.(targets);
    if (!fine.matches || reduced.matches || !button || button.disabled) { clearFeedback(); return; }
    if (button !== active) {
      clearFeedback(); active = button; bounds = button.getBoundingClientRect();
      button.classList.add('lab-tactile');
    }
    point = [(event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1];
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (active) renderFeedback(active, true); });
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (active && !active.contains(event.relatedTarget)) clearFeedback(); });
  document.addEventListener('pointercancel', clearFeedback);
  document.addEventListener('scroll', clearFeedback, { capture: true, passive: true });
  window.addEventListener('blur', clearFeedback);
  window.addEventListener('resize', clearFeedback);
  fine.addEventListener('change', clearFeedback);
  reduced.addEventListener('change', clearFeedback);
})();
