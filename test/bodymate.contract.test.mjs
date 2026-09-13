import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const source = await read('index.html');
const adapter = await read('assets/runtime/full-muscle-root-adapter.js');
const shell = await read('assets/runtime/visual-lab-shell.js');

test('root page keeps only complete-body reference, main stage and question panel', () => {
  for (const id of ['nav-view', 'detail-view', 'chat-form', 'chat-input', 'help-dialog']) {
    assert.match(source, new RegExp('id="' + id + '"'));
  }
  assert.doesNotMatch(source, /class="rail"|data-panel|region-choices|detail-canvas|orb-canvas|progress-dialog|neck-lab|class="footer"|engine-status|教学动作演示/);
  assert.match(source, /data-nav="front"/);
  assert.match(source, /data-nav="back"/);
  assert.match(source, /data-nav="side"/);
});

test('root mounts only the full-body runtime after the local MoonBit core', () => {
  const scripts = [...source.matchAll(/<script src="([^"]+)"/g)].map(match => match[1].split('?')[0]);
  assert.deepEqual(scripts, [
    'assets/runtime/moonbit-core.js', 'assets/runtime/visual-lab-shell.js',
    'assets/runtime/full-muscle-runtime.js', 'assets/runtime/full-muscle-root-adapter.js',
    'assets/runtime/real-body-navigator.js',
  ]);
  assert.doesNotMatch(source, /<script[^>]+src=["']https?:\/\//i);
  assert.match(source, /不提供医学或拉伸建议/);
  assert.match(source, /Human Atlas（CC BY 4.0）/);
});

test('full-body motion and muscle queries stay in the same page without neck redirects', () => {
  assert.match(adapter, /runtime.motionForQuery\(query\)/);
  assert.match(adapter, /viewer.findAll\(query\)/);
  assert.match(adapter, /viewer.playMotion\(id, parameters\)/);
  assert.doesNotMatch(adapter, /location.href|neck-lab|__rootScm/);
  assert.doesNotMatch(shell, /comparison|颈肩|结构<\/button>/);
});

test('clicking the movement mode starts a real motion instead of only moving focus', () => {
  assert.match(shell, /button\.dataset\.labMode === 'movement'[\s\S]*?anatomy-examples button'\)\?\.click\(\)/);
  assert.doesNotMatch(shell, /anatomy-examples button'\)\?\.focus\(\)/);
});

test('old view URLs migrate in place while normal full-body URLs remain intact', () => {
  for (const [query, expected] of [
    ['?view=neck-lab&q=old&glb-only=1', '?view=full-body&glb-only=1'],
    ['?view=motion-lab', '?view=full-body'],
    ['?view=full-body&glb-only=1', null],
    ['', null],
  ]) {
    let replaced = null;
    const node = () => ({ setAttribute() {}, prepend() {}, addEventListener() {} });
    const context = vm.createContext({
      URL, location: { href: 'http://localhost:4174/' + query },
      history: { replaceState(_state, _title, url) { replaced = url.search; } },
      document: { createElement: node, querySelector: node },
    });
    new vm.Script(shell).runInContext(context);
    assert.equal(replaced, expected);
  }
});
