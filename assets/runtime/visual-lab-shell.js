/* Presentation adapter only. All selections/queries go through the existing controller. */
(() => {
  if (new URLSearchParams(location.search).get('view') === 'motion-lab') return;
  const $ = selector => document.querySelector(selector);
  const registry = globalThis.BodyMateAnatomyRegistry || [];
  const controller = globalThis.__bodymate;
  if (!controller || !registry.length) return;
  document.body.classList.add('visual-lab-active');
  document.title = 'BodyMate｜身体研究所';
  const neckView = new URLSearchParams(location.search).get('view') === 'neck-lab';
  const viewSwitch = document.createElement('nav'); viewSwitch.className = 'lab-model-switch'; viewSwitch.setAttribute('aria-label', '解剖视图');
  viewSwitch.innerHTML = '<a href="?view=full-body"' + (!neckView ? ' aria-current="page"' : '') + '>完整人体</a><a href="?view=neck-lab"' + (neckView ? ' aria-current="page"' : '') + '>颈肩放大</a>';
  $('.detail-heading').append(viewSwitch);
  $('.brand p').textContent = '你的 3D 解剖与动作探索助手';
  $('.detail-heading .eyebrow').textContent = 'HUMAN ATLAS · 颈肩探索';
  const header = $('.header-right'), search = document.createElement('form'); search.className = 'lab-search'; search.setAttribute('role', 'search');
  search.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg><input aria-label="搜索肌肉、动作或问题" placeholder="搜索肌肉、动作或问题…" autocomplete="off">';
  header.prepend(search);
  const submitQuery = text => { const input = $('#chat-input'); input.value = text; $('#chat-form').requestSubmit(); };
  search.addEventListener('submit', event => { event.preventDefault(); const input = search.querySelector('input'); if (input.value.trim()) { submitQuery(input.value.trim()); input.value = ''; } });
  const modes = [
    { id: 'structure', label: '结构', query: '右侧胸锁乳突肌', icon: '<circle cx="16" cy="6" r="3"/><path d="m7 14 6-3h6l6 3M13 11l-1 9-3 10m10-19 1 9 3 10m-11-10h8"/>' },
    { id: 'movement', label: '动作', query: '耸肩涉及哪些肌肉', icon: '<circle cx="18" cy="5" r="3"/><path d="m8 13 7-4 7 5 6-2M15 9l-2 10 8 4 3 7M13 19l-6 10"/>' },
    { id: 'comparison', label: '比较', query: '低头和向右转头有哪些共同结构', icon: '<circle cx="9" cy="16" r="7"/><circle cx="23" cy="16" r="7"/><path d="M16 9v14"/>' },
  ];
  const rail = $('.rail');
  rail.querySelectorAll('.rail-button').forEach((button, index) => {
    const mode = modes[index]; button.removeAttribute('data-panel'); button.dataset.labMode = mode.id;
    button.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true">' + mode.icon + '</svg><span>' + mode.label + '</span>';
    button.onclick = () => submitQuery(mode.query);
  });
  $('.rail-caption').innerHTML = '探索结构<br>理解动作';
  $('.panel-heading h2').textContent = '全身定位';
  $('.nav-tip').textContent = '位置参照 · 颈肩可选';
  $('.progress-mini').setAttribute('aria-label', '当前模型状态');
  const status = document.createElement('div'); status.className = 'lab-model-status';
  status.innerHTML = '<h2 class="lab-status-title">探索状态</h2><div class="lab-status-body"><div class="lab-status-ring"><strong>' + registry.length + '</strong><span>真实结构</span></div><p><strong>颈肩区域</strong>Human Atlas<br>真实公开解剖网格</p></div>';
  $('.progress-mini').append(status);
  const card = $('.current-card'), summary = $('.current-summary'), composer = $('.composer');
  const tabs = document.createElement('div'); tabs.className = 'lab-domain-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '探索模式');
  for (const mode of modes) {
    const button = document.createElement('button'); button.type = 'button'; button.role = 'tab'; button.textContent = mode.label; button.dataset.labMode = mode.id; button.id = 'lab-tab-' + mode.id; button.setAttribute('aria-controls', 'lab-context-content'); button.onclick = () => submitQuery(mode.query); tabs.append(button);
  }
  tabs.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const buttons = [...tabs.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); buttons[next].click();
  });
  card.prepend(tabs); summary.id = 'lab-context-content'; summary.setAttribute('role', 'tabpanel');
  const copy = document.createElement('p'); copy.className = 'lab-structure-copy'; copy.textContent = '已载入真实颈肩网格。点选肌肉或悬浮标签，观察它与周围结构的位置关系。'; summary.append(copy);
  const actions = document.createElement('div'); actions.className = 'lab-context-actions'; card.insertBefore(actions, $('#isolate')); actions.append($('#isolate'));
  const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'lab-restore'; restore.textContent = '显示周围结构'; restore.onclick = () => submitQuery('显示周围结构'); actions.append(restore);
  $('#nearby summary span').textContent = '浏览当前模型结构';
  const queryTitle = document.createElement('h2'); queryTitle.className = 'lab-query-title'; queryTitle.textContent = '问 Coach C'; composer.prepend(queryTitle);
  $('#chat-input').placeholder = '例如：耸肩涉及哪些肌肉？';
  $('#chat-scope').textContent = '可查询当前模型中的结构、动作和比较关系。';
  const motionLink = document.createElement('a'); motionLink.className = 'lab-motion-link'; motionLink.href = neckView ? '?view=full-body' : '?view=neck-lab'; motionLink.textContent = neckView ? '返回完整人体与动作 ↗' : '颈肩结构、动作映射与比较 ↗'; composer.append(motionLink);
  const counts = document.createElement('div'); counts.className = 'lab-comparison-counts'; $('#movement-comparison-summary').append(counts);
  const movementCoverage = document.createElement('p'); movementCoverage.className = 'lab-movement-coverage'; $('#movement-summary>strong').after(movementCoverage);
  const comparisonEvidence = document.createElement('button'); comparisonEvidence.type = 'button'; comparisonEvidence.textContent = '查看依据'; $('#movement-comparison-summary').append(comparisonEvidence);
  comparisonEvidence.onclick = () => $('#movement-summary button').click();
  const sync = snapshot => {
    const mode = snapshot.comparison ? 'comparison' : snapshot.activeMovementId ? 'movement' : 'structure'; card.dataset.mode = mode;
    summary.setAttribute('aria-labelledby', 'lab-tab-' + mode);
    card.setAttribute('aria-label', mode === 'movement' ? snapshot.movementLabel : mode === 'comparison' ? '动作比较' : $('#selection-name').textContent);
    card.removeAttribute('aria-labelledby');
    if (mode === 'movement') {
      $('#movement-summary>strong').textContent = snapshot.movementLabel;
      movementCoverage.textContent = '当前模型覆盖 ' + snapshot.movementMappings.length + ' 个参与结构';
      const members = $('#movement-summary').querySelectorAll('small')[1];
      members.textContent = snapshot.movementMappings.map(item => (item.role === 'main_contributor' ? '主要参与：' : '参与：') + registry.find(entry => entry.structureId === item.structureId)?.displayNameZh).join('\n');
    }
    for (const button of document.querySelectorAll('[data-lab-mode]')) {
      const active = button.dataset.labMode === mode; button.classList.toggle('active', active);
      if (button.role === 'tab') { button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; }
      else button.setAttribute('aria-pressed', String(active));
    }
    if (snapshot.comparison) {
      const buckets = snapshot.comparison.members.reduce((result, member) => { result[member.bucket] = (result[member.bucket] || 0) + 1; return result; }, {});
      counts.replaceChildren(...[['overlap', '共同参与'], ['only_left', '仅动作 A'], ['only_right', '仅动作 B']].map(([bucket, label]) => {
        const span = document.createElement('span'), number = document.createElement('strong'), dot = document.createElement('i'); number.textContent = String(buckets[bucket] || 0); span.append(number, dot, label); return span;
      }));
    }
    // Reuse the original isolate action, while keeping its visual label stable.
    $('#isolate span').textContent = snapshot.isolated ? '已单独查看' : '只看这块';
    $('#engine-status').textContent = 'Human Atlas · ' + registry.length + ' 个真实颈肩结构 · 本地运行';
  };
  const apply = globalThis.__rootScmApply;
  globalThis.__rootScmApply = snapshot => { apply?.(snapshot); sync(snapshot); };
  sync(controller.state);
  if (!neckView) {
    tabs.setAttribute('role','group'); tabs.setAttribute('aria-label','人体视图与动作');
    const modesFull = [{label:'全身',action:()=>$('#anatomy-reset')?.click()},{label:'动作',action:()=>$('.anatomy-examples button')?.focus()},{label:'颈肩',action:()=>{location.href='?view=neck-lab';}}];
    for (const parent of [rail,tabs]) [...parent.querySelectorAll('button')].forEach((button,index)=>{ const mode=modesFull[index]; if(button.querySelector('span')) button.querySelector('span').textContent=mode.label; else button.textContent=mode.label; button.onclick=mode.action; button.removeAttribute('aria-controls'); button.removeAttribute('aria-selected'); button.removeAttribute('role'); button.tabIndex=0; });
    $('.lab-status-ring strong').textContent = '…'; $('.lab-status-body p strong').textContent = '完整人体加载中';
  } else {
    const initialQuery = new URLSearchParams(location.search).get('q'); if (initialQuery) submitQuery(initialQuery);
  }
  const footer = document.querySelectorAll('.footer>span')[1]; footer.textContent = 'MoonBit 驱动 · 结构与动作探索 · 非医学诊断';
  const help = $('#help-dialog');
  help.querySelectorAll('p').forEach((p, index) => { p.textContent = [
    '左侧：全身人形用于位置参考；颈肩区域可选。前视、后视和侧视只改变左侧相机。',
    '中央：14 个真实颈肩结构。点选网格或标签，拖动旋转，滚轮缩放；Coach C 指向当前结构。',
    '右侧：可查询结构、动作映射和比较关系，也可单独查看或恢复周围结构。',
    '本地查询由 MoonBit 处理，未连接远程 AI。此页面不提供训练追踪、诊断或治疗建议。',
  ][index] || ''; });
})();
