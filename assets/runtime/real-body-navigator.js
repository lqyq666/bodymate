/* Replaces only the old positioning whitebox, without touching domain state. */
(() => {
  if (!document.body.classList.contains('visual-lab-active')) return;
  const host = document.querySelector('#nav-view'), runtime = globalThis.BodyMateFullMuscleRuntime;
  if (!host || !runtime?.mountNavigator) return;
  const canvas = document.createElement('canvas'); canvas.id = 'real-nav-canvas'; canvas.setAttribute('aria-label','真实全身模型缩略导航，独立旋转'); host.append(canvas);
  document.querySelector('.navigator').classList.add('real-navigator-active');
  const message = document.createElement('p'); message.className = 'real-nav-loading'; message.textContent = '加载真实人体…'; host.append(message);
  const buttons = [...document.querySelectorAll('[data-nav]')]; buttons.forEach(button=>{button.disabled=true;});
  runtime.mountNavigator({canvas,onNeckFocus:()=>{location.href='?view=neck-lab';}}).then(viewer=>{
    message.remove(); buttons.forEach(button=>{button.disabled=false;button.onclick=()=>{viewer.setView(button.dataset.nav);buttons.forEach(other=>{const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active));});};}); buttons[0].click();
    document.querySelector('.nav-tip').textContent='真实人体 · 颈肩定位';
    document.querySelector('#region-choices button').onclick=()=>{location.href='?view=neck-lab';};
  }).catch(error=>{message.textContent='真实导航模型加载失败';console.error(error);});
})();
