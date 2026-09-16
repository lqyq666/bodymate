/* MoonRig Console workbench. Every result comes from the MoonBit exports in moonbit-core.js;
   this file only builds wire strings, decodes replies and renders them. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const trace = $('#trace');
  const log = (line) => { trace.textContent = (line + '\n' + trace.textContent).split('\n').slice(0, 60).join('\n'); };
  const call = (name, ...args) => {
    const fn = globalThis[name];
    if (typeof fn !== 'function') throw Error('MoonBit core 未加载：' + name);
    const reply = fn(...args);
    log(name + '(' + args.map((arg) => JSON.stringify(arg)).join(', ') + ')\n  → ' + reply);
    return reply;
  };
  const payload = (wire, tag) => {
    const parts = String(wire).split('|');
    if (parts[0] !== 'ok' || parts[1] !== tag) throw Error('意外的 wire 响应：' + wire);
    return parts.slice(2).join('|');
  };
  const valuesFromWire = (wire) => Object.fromEntries((wire || '').split(',').filter(Boolean).map((pair) => { const index = pair.indexOf('='); return [pair.slice(0, index), Number(pair.slice(index + 1))]; }));
  const WIRE_UNSAFE = /[|^~,=:]/;

  const registry = payload(call('bodymate_motion_registry_v1'), 'motion-registry-v1').split('~').filter(Boolean).map((record) => {
    const [id, title, , , , , fields, presets] = record.split('^');
    return {
      id, title,
      parameters: fields ? fields.split(';').map((field) => { const [key, label, unit, min, max, step, initial] = field.split('@'); return { key, label, unit, min: Number(min), max: Number(max), step: Number(step), initial: Number(initial) }; }) : [],
      presets: presets ? presets.split(';').map((preset) => { const [ptitle, baseline, ...values] = preset.split('@'); return { title: ptitle, isBaseline: baseline === 'true', values: valuesFromWire(values.join('@')) }; }) : [],
    };
  });
  const allowlistWire = () => registry.map((motion) => motion.id + '^' + motion.parameters.map((field) => `${field.key}:${field.min}:${field.max}`).join(',')).join('~');

  // agent · guard
  $('#guard-allowlist').value = allowlistWire();
  const runGuard = () => {
    const verdict = $('#guard-verdict'), reasons = $('#guard-reasons');
    let proposal;
    try { proposal = JSON.parse($('#guard-proposal').value); } catch (error) { verdict.textContent = 'JSON 无法解析：' + error.message; reasons.textContent = '—'; return; }
    if (proposal?.kind === 'muscle') {
      const body = payload(call('bodymate_agent_guard_lookup_v1', String(proposal.query ?? ''), 80), 'agent-guard-v1');
      verdict.textContent = body; reasons.textContent = body === 'none' ? 'empty_lookup' : '—'; return;
    }
    if (proposal?.kind !== 'motion') { verdict.textContent = 'none'; reasons.textContent = 'unknown_kind:' + String(proposal?.kind ?? ''); return; }
    const id = String(proposal.id ?? '');
    if (!id || WIRE_UNSAFE.test(id)) { verdict.textContent = 'none'; reasons.textContent = 'unknown_id:' + id; return; }
    const fields = Object.entries(proposal.parameters || {}).filter(([key, value]) => typeof value === 'number' && !WIRE_UNSAFE.test(key)).map(([key, value]) => `${key}=${value}`).join(',');
    const body = payload(call('bodymate_agent_explain_command_v1', id, fields, $('#guard-allowlist').value.trim(), $('#guard-policy').value), 'agent-explain-v1');
    const separator = body.lastIndexOf('|');
    verdict.textContent = body.slice(0, separator);
    reasons.textContent = body.slice(separator + 1) || '（无调整）';
  };
  $('#guard-run').addEventListener('click', runGuard);

  // zhnum
  const runZhnum = () => {
    const text = $('#zhnum-input').value;
    $('#zhnum-normalized').textContent = payload(call('bodymate_zhnum_normalize_v1', text), 'zhnum-normalize-v1') || '（空）';
    const parsed = payload(call('bodymate_zhnum_parse_v1', text), 'zhnum-parse-v1');
    $('#zhnum-parsed').textContent = parsed || '不是独立数字（整段含单位或其他文字）';
    const [values, notices = '', recognized = 'false'] = payload(call('bodymate_motion_parse_query_v1', 'push_up', text.normalize('NFKC'), ''), 'motion-parse-v1').split('|');
    $('#zhnum-motion').textContent = (recognized === 'true' ? '识别：' : '未识别参数，回退默认：') + values + (notices ? '　提示：' + notices.split('~').join(' ') : '');
  };
  const runFormat = () => {
    const value = $('#zhnum-format-input').value.trim();
    $('#zhnum-formatted').textContent = payload(call('bodymate_zhnum_format_v1', value), 'zhnum-format-v1') || '需要整数';
  };
  $('#zhnum-input').addEventListener('input', runZhnum);
  $('#zhnum-format-input').addEventListener('input', runFormat);

  // motion · frames
  const phases = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const columns = ['depth', 'excursion', 'rootY', 'rootZ', 'torsoX', 'handWidth', 'elbowAngle', 'wristX', 'wristY', 'wristZ', 'stanceWidth', 'toeAngle'];
  const motionSelect = $('#frames-motion'), parameterBox = $('#frames-parameters'), table = $('#frames-table'), open = $('#frames-open');
  motionSelect.innerHTML = registry.map((motion) => `<option value="${motion.id}">${motion.id} · ${motion.title}</option>`).join('');
  const currentMotion = () => registry.find((motion) => motion.id === motionSelect.value) || registry[0];
  const renderParameterInputs = () => {
    const motion = currentMotion();
    parameterBox.innerHTML = motion.parameters.map((field) => `<label>${field.key} <small>[${field.min}, ${field.max}] ${field.unit}</small><input data-key="${field.key}" type="number" min="${field.min}" max="${field.max}" step="${field.step}" value="${field.initial}"></label>`).join('');
  };
  const currentParameters = () => Object.fromEntries([...parameterBox.querySelectorAll('input[data-key]')].map((input) => [input.dataset.key, Number(input.value)]).filter(([, value]) => Number.isFinite(value)));
  const parametersWire = (parameters) => Object.entries(parameters).map(([key, value]) => `${key}=${value}`).join(',');
  let lastRows = [];
  const renderFrames = () => {
    const motion = currentMotion(), parameters = currentParameters();
    const normalized = valuesFromWire(payload(call('bodymate_motion_parameters_v1', motion.id, parametersWire(parameters)), 'motion-parameters-v1').split('|')[0]);
    lastRows = phases.map((phase) => ({ phase, ...valuesFromWire(payload(call('bodymate_motion_pose_intent_v1', motion.id, phase, parametersWire(normalized)), 'pose-intent-v1')) }));
    table.querySelector('thead').innerHTML = '<tr><th>phase</th>' + columns.map((column) => `<th>${column}</th>`).join('') + '<th></th></tr>';
    table.querySelector('tbody').innerHTML = lastRows.map((row) => `<tr><td>${row.phase}</td>${columns.map((column) => `<td>${Number.isFinite(row[column]) ? Number(row[column].toFixed(4)) : '—'}</td>`).join('')}<td><a href="index.html?view=full-body&motion=${motion.id}&params=${encodeURIComponent(parametersWire(normalized))}&phase=${row.phase}">回放此帧</a></td></tr>`).join('');
    open.href = `index.html?view=full-body&motion=${motion.id}&params=${encodeURIComponent(parametersWire(normalized))}&phase=0.5`;
  };
  motionSelect.addEventListener('change', () => { renderParameterInputs(); renderFrames(); });
  parameterBox.addEventListener('change', renderFrames);
  $('#frames-csv').addEventListener('click', () => {
    const motion = currentMotion();
    const header = ['motion', 'phase', ...columns].join(',');
    const lines = lastRows.map((row) => [motion.id, row.phase, ...columns.map((column) => row[column] ?? '')].join(','));
    const blob = new Blob([header + '\n' + lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${motion.id}-pose-frames.csv` });
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
  });

  renderParameterInputs(); renderFrames(); runGuard(); runZhnum(); runFormat();
})();
