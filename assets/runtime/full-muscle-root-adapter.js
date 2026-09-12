/* The full-body viewer owns its form and playback; the neck explorer remains available as a separate runtime. */
(() => {
  if (new URLSearchParams(location.search).get('view') === 'neck-lab') return;
  const detail = document.querySelector('#detail-view'), composer = document.querySelector('.composer');
  const runtime = globalThis.BodyMateFullMuscleRuntime;
  if (!detail || !composer || !runtime?.mount) return;
  globalThis.__bodymateStopExerciseDemo?.();
  globalThis.__rootScmDispose?.();
  document.title = 'BodyMate｜人体动作实验室';
  document.body.classList.remove('exercise-demo-active'); document.body.classList.add('full-muscle-demo-active');
  const stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = 'assets/full-muscle.css'; document.head.append(stylesheet);
  if (document.body.classList.contains('visual-lab-active')) { const skin = document.createElement('link'); skin.rel = 'stylesheet'; skin.href = 'assets/visual-full-body.css?v=20260912b'; document.head.append(skin); }
  const canvas = document.createElement('canvas'); canvas.id = 'full-muscle-canvas';
  canvas.setAttribute('aria-label', '全身骨骼与肌肉三维模型，拖动旋转，滚轮缩放'); detail.append(canvas);
  const loading = document.createElement('div'); loading.className = 'anatomy-loading'; loading.textContent = '正在加载完整人体…'; detail.append(loading);
  const toolbar = document.createElement('div'); toolbar.className = 'anatomy-toolbar'; toolbar.setAttribute('aria-label', '模型显示');
  toolbar.innerHTML = '<div class="anatomy-views"><button data-view="muscle" aria-pressed="true">肌肉</button><button data-view="bone" aria-pressed="false">骨骼</button><button data-view="xray" aria-pressed="false">透视</button></div><button id="anatomy-reset" title="停止动作并恢复站立">恢复站立</button>';
  detail.append(toolbar);
  const playback = document.createElement('div'); playback.className = 'anatomy-playback'; playback.hidden = true;
  playback.innerHTML = '<div class="anatomy-motion-line"><strong id="anatomy-motion-name"></strong><span id="anatomy-motion-phase"></span><button id="anatomy-pulse" aria-pressed="true">肌肉闪烁</button></div><div class="anatomy-transport"><button id="anatomy-play" aria-label="暂停动作">暂停</button><input id="anatomy-progress" type="range" min="0" max="1000" value="0" aria-label="动作进度"><label>速度 <select id="anatomy-speed" aria-label="动作速度"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label></div>';
  detail.append(playback);
  const answer = document.createElement('div'); answer.className = 'full-muscle-answer'; answer.setAttribute('aria-live', 'polite'); composer.prepend(answer);
  const examples = document.createElement('div'); examples.className = 'anatomy-examples';
  examples.innerHTML = '<span>试一个动作</span>' + runtime.motionDefinitions.map((motion) => '<button data-motion="' + motion.id + '">' + motion.title + '</button>').join('');
  composer.insertBefore(examples, document.querySelector('#chat-form'));
  const adjustments = document.createElement('details'); adjustments.className = 'anatomy-adjustments'; adjustments.hidden = true;
  adjustments.innerHTML = '<summary>动作调整<span>手距 · 角度</span></summary><div class="anatomy-presets" aria-label="动作姿势预设"></div><div class="anatomy-parameter-fields"></div><p class="anatomy-parameter-help"></p><p class="anatomy-parameter-notice" role="status"></p><p class="anatomy-muscle-note"></p><div class="anatomy-muscle-legend"><span>主要参与</span><span>辅助参与</span><span>稳定参与</span></div>';
  composer.insertBefore(adjustments, document.querySelector('#chat-form'));
  // Keep the question box reachable when the explanatory controls need scrolling.
  const chatContent = document.createElement('div'); chatContent.className = 'anatomy-chat-content';
  composer.insertBefore(chatContent, answer);
  for (const node of [answer, composer.querySelector('.chat-context'), examples, adjustments]) if (node) chatContent.append(node);
  const input = document.querySelector('#chat-input'), context = document.querySelector('#chat-context');
  const heading = document.querySelector('.detail-heading h2'); if (heading) heading.textContent = '人体动作实验室';
  document.querySelector('#detail-panel')?.setAttribute('aria-label', '全身肌肉与骨骼');
  document.querySelector('.current-card')?.setAttribute('aria-label', '动作与肌肉提问');
  document.querySelector('.current-card')?.removeAttribute('aria-labelledby');
  const tagline = document.querySelector('.brand p'); if (tagline) tagline.textContent = '看清每个动作，观察肌肉如何协同。';
  const status = document.querySelector('#engine-status');
  if (status) status.textContent = '准备人体模型…';
  if (input) input.placeholder = '如：窄距俯卧撑，夹角45度';
  const scope = document.querySelector('#chat-scope'); if (scope) scope.textContent = '本地动作与肌肉查询；颈肩关系可切换局部视图。';
  if (context) context.textContent = '全身人体';
  const footer = document.querySelectorAll('.footer>span')[1];
  if (footer) footer.textContent = '教学动作演示 · 颜色为定性参与提示，非实测受力';
  const show = (title, copy) => { answer.replaceChildren(Object.assign(document.createElement('strong'), { textContent: title }), Object.assign(document.createElement('p'), { textContent: copy })); };
  show('输入动作，让人体动起来', '可旋转观察全身，也可以切换骨骼或透视，查看关节与肌肉的连接。');
  const showEntry = (entry) => { if (!entry) return; const alias = entry.canonicalName || entry.structureId; show(alias, '已定位到这个结构。输入肌肉名称可以高亮同组肌肉，输入动作可以开始演示。'); if (context) context.textContent = alias; };
  let ready = false, seeking = false, parameterKey = '';
  const parameterFields = adjustments.querySelector('.anatomy-parameter-fields');
  const parameterNotice = adjustments.querySelector('.anatomy-parameter-notice');
  const updateParameters = (state) => {
    const fields = runtime.parameterDefinitions[state.motion] || [];
    adjustments.hidden = !fields.length;
    const nextKey = JSON.stringify([state.motion, state.parameters]);
    if (nextKey === parameterKey) return;
    const changedMotion = adjustments.dataset.motion !== (state.motion || '');
    parameterKey = nextKey; adjustments.dataset.motion = state.motion || '';
    if (!fields.length) return;
    adjustments.querySelector('summary span').textContent = state.motion === 'push_up' ? '手距 · 肘部夹角' : '站距 · 脚尖 · 幅度';
    if (changedMotion) {
      parameterFields.innerHTML = fields.map(field => '<label class="anatomy-parameter" for="anatomy-' + field.key + '"><span>' + field.label + '</span><output for="anatomy-' + field.key + '"></output><input id="anatomy-' + field.key + '" data-parameter="' + field.key + '" type="range" min="' + field.min + '" max="' + field.max + '" step="' + field.step + '" aria-label="' + field.label + '"></label>').join('');
      adjustments.querySelector('.anatomy-presets').innerHTML = runtime.motionPresets[state.motion].map((preset, index) => '<button type="button" data-preset="' + index + '" aria-pressed="false">' + preset.title + '</button>').join('');
    }
    for (const field of fields) {
      const control = parameterFields.querySelector('[data-parameter="' + field.key + '"]');
      control.value = String(state.parameters[field.key]);
      control.setAttribute('aria-valuetext', state.parameters[field.key] + field.unit);
      control.parentElement.querySelector('output').textContent = state.parameters[field.key] + field.unit;
    }
    adjustments.querySelectorAll('[data-preset]').forEach(button => {
      const preset = runtime.motionPresets[state.motion][Number(button.dataset.preset)];
      button.setAttribute('aria-pressed', String(Object.entries(preset.parameters).every(([key, value]) => state.parameters[key] === value)));
    });
    adjustments.querySelector('.anatomy-parameter-help').textContent = state.motion === 'push_up'
      ? '夹角指动作底部、从背部方向观察的上臂与躯干夹角。松开滑块应用；范围是模型限制，不是训练建议。'
      : '脚尖角从正前方起算；100%为标准演示幅度，不是膝关节角度。松开滑块应用；范围是模型限制。';
    parameterNotice.textContent = state.parameterNotices.join(' ');
    adjustments.querySelector('.anatomy-muscle-note').textContent = state.muscleNote;
  };
  const playButton = playback.querySelector('#anatomy-play'), progress = playback.querySelector('#anatomy-progress');
  const viewer = runtime.mount({
    canvas, onPick: showEntry,
    onReady: ({ count, boneCount }) => {
      ready = true; loading.remove(); if (status) status.textContent = '人体模型已就绪 · ' + count + ' 个肌肉结构 · ' + boneCount + ' 个骨骼及相关结构';
      toolbar.querySelectorAll('button').forEach((button) => { button.disabled = false; });
      examples.querySelectorAll('button').forEach((button) => { button.disabled = false; });
      const ring = document.querySelector('.lab-status-ring'); if (ring) { ring.querySelector('strong').textContent = count; ring.querySelector('span').textContent = '肌肉结构'; }
      const summary = document.querySelector('.lab-status-body p'); if (summary) { summary.replaceChildren(); const title = document.createElement('strong'); title.textContent = '完整人体'; summary.append(title, boneCount + ' 个骨骼及相关结构'); }
    },
    onState: (state) => {
      if (document.body.classList.contains('visual-lab-active')) document.querySelectorAll('[data-lab-mode]').forEach(button=>{const active=button.dataset.labMode===(state.motion?'movement':'structure');button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
      updateParameters(state);
      playback.hidden = !state.motion;
      playback.querySelector('#anatomy-motion-name').textContent = state.title;
      playback.querySelector('#anatomy-motion-phase').textContent = state.paused ? '已暂停' : state.phase < .5 ? (state.motion === 'curl' ? '屈肘' : '下降') : (state.motion === 'curl' ? '伸肘' : '推起');
      playButton.textContent = state.paused ? '播放' : '暂停'; playButton.setAttribute('aria-label', state.paused ? '播放动作' : '暂停动作');
      if (!seeking) progress.value = String(Math.round(state.phase * 1000));
      toolbar.querySelectorAll('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
      playback.querySelector('#anatomy-pulse').setAttribute('aria-pressed', String(state.pulseEnabled));
    },
    onError: (error) => { ready = false; loading.textContent = '模型加载失败，请刷新重试'; show('人体模型未能加载', '请确认本地模型文件完整后刷新页面。'); if (status) status.textContent = '人体模型加载失败'; console.error(error); },
  });
  toolbar.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  examples.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  const describeMotion = (result) => {
    parameterNotice.textContent = result.notices.join(' ');
    show(result.title + ' · 动作演示', result.profile.groups.filter(group => group.role === '主要参与').map(group => group.label).join('、') + '共同参与。展开“动作调整”可切换姿势，暂停后调整可以比较同一阶段。');
    if (context) context.textContent = result.title;
  };
  const start = (id, parameters = {}, notices = []) => {
    const result = viewer.playMotion(id, parameters); if (!result) return;
    describeMotion(result);
    if (notices.length) { adjustments.open = true; parameterNotice.textContent = [...result.notices, ...notices].join(' '); }
  };
  parameterFields.addEventListener('input', (event) => {
    const control = event.target.closest('[data-parameter]'); if (!control) return;
    const field = runtime.parameterDefinitions[viewer.getState().motion].find(candidate => candidate.key === control.dataset.parameter);
    control.parentElement.querySelector('output').textContent = control.value + field.unit;
    control.setAttribute('aria-valuetext', control.value + field.unit);
  });
  parameterFields.addEventListener('change', (event) => {
    const control = event.target.closest('[data-parameter]'); if (!control || !ready) return;
    const result = viewer.setParameters({ [control.dataset.parameter]: Number(control.value) });
    if (result) describeMotion(result);
  });
  adjustments.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]'); if (!button || !ready) return;
    const state = viewer.getState(), preset = runtime.motionPresets[state.motion][Number(button.dataset.preset)];
    const result = viewer.setParameters(preset.parameters); if (result) describeMotion(result);
  });
  examples.addEventListener('click', (event) => { const button = event.target.closest('[data-motion]'); if (button && ready) start(button.dataset.motion); });
  toolbar.addEventListener('click', (event) => {
    const button = event.target.closest('button'); if (!button || !ready) return;
    if (button.dataset.view) viewer.setView(button.dataset.view);
    else { viewer.stopExercise(); show('全身解剖', '拖动旋转，查看完整肌肉与骨骼。输入一个动作继续演示。'); if (context) context.textContent = '全身人体'; }
  });
  playButton.addEventListener('click', () => viewer.setPaused(!viewer.getState().paused));
  playback.querySelector('#anatomy-speed').addEventListener('change', (event) => viewer.setSpeed(event.target.value));
  playback.querySelector('#anatomy-pulse').addEventListener('click', () => viewer.setPulse(!viewer.getState().pulseEnabled));
  progress.addEventListener('input', () => { seeking = true; viewer.setPaused(true); viewer.seek(Number(progress.value) / 1000); });
  progress.addEventListener('change', () => { seeking = false; });
  document.querySelector('#chat-form')?.addEventListener('submit', (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    const query = input?.value?.trim() || ''; if (!query) return;
    if (!ready) { show('模型仍在加载', '加载完成后即可播放动作。'); return; }
    input.value = '';
    if (/^(暂停|停止播放)$/.test(query)) { viewer.setPaused(true); return; }
    if (/^(继续|播放)$/.test(query) && viewer.getState().motion) { viewer.setPaused(false); return; }
    if (/^(重置|恢复站立|站立)$/.test(query)) { viewer.stopExercise(); show('全身解剖', '已恢复站立。'); return; }
    if (/共同|斜角肌|胸锁乳突肌|肩胛提肌|转头|低头|耸肩/.test(query)) { location.href = '?view=neck-lab&q=' + encodeURIComponent(query); return; }
    const action = runtime.motionForQuery(query);
    if (action) {
      const parsed = runtime.parseMotionParameters(action.id, query);
      start(action.id, parsed.parameters, parsed.notices);
      if (parsed.recognized) adjustments.open = true;
      return;
    }
    const current = viewer.getState();
    if (current.motion) {
      const parsed = runtime.parseMotionParameters(current.motion, query, current.parameters);
      if (parsed.recognized) {
        const result = viewer.setParameters(parsed.parameters); if (result) describeMotion(result);
        adjustments.open = true; parameterNotice.textContent = parsed.notices.join(' '); return;
      }
    }
    const matched = viewer.findAll(query);
    if (matched.length) {
      viewer.selectGroup(matched, { notify: false }); show(query, '已高亮 ' + matched.length + ' 个相关肌肉结构，可旋转模型观察。'); if (context) context.textContent = query; return;
    }
    show('暂未找到这个动作或肌肉', '当前支持俯卧撑、深蹲、弯举。也可以输入胸大肌、三角肌、肱二头肌等肌肉名称。');
  }, true);
})();
