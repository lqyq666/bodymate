import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const start = '<!-- MOONBIT_CORE_START -->';
const end = '<!-- MOONBIT_CORE_END -->';
const embedded = html.slice(html.indexOf(start) + start.length, html.indexOf(end));
const bundle = await readFile(new URL('../assets/runtime/moonbit-core.js', import.meta.url), 'utf8');

function loadCore() {
  assert.equal(embedded.trim(), '<script src="assets/runtime/moonbit-core.js"></script>');
  const context = vm.createContext({});
  context.globalThis = context;
  new vm.Script(bundle, { filename: 'moonbit-core.js' }).runInContext(context);
  return context;
}

test('external MoonBit IIFE exports and executes the interaction contract', () => {
  const core = loadCore();
  for (const name of ['bodymate_core_clear', 'bodymate_core_register', 'bodymate_core_select_region', 'bodymate_core_select_region_layer', 'bodymate_core_select_structure', 'bodymate_core_set_layer', 'bodymate_core_isolate_selected', 'bodymate_core_restore_context', 'bodymate_core_reset_overview', 'bodymate_core_snapshot']) {
    assert.equal(typeof core[name], 'function', `missing ${name}`);
  }
  assert.match(core.bodymate_core_clear(), /^ok\|/);
  assert.equal(core.bodymate_core_register('scm_r', '右侧胸锁乳突肌', 'neck', 'muscle', true), 'ok|registered');
  assert.equal(core.bodymate_core_register('fascia_neck', '颈肩筋膜', 'neck', 'fascia', true), 'ok|registered');
  assert.equal(core.bodymate_core_register('pec_r', '右侧胸大肌', 'chest', 'muscle', true), 'ok|registered');
  assert.equal(core.bodymate_core_select_region('neck'), 'ok|neck|scm_r|muscle|false|false|1');
  assert.equal(core.bodymate_core_set_layer('fascia'), 'ok|neck|fascia_neck|fascia|false|false|2');
  const before = core.bodymate_core_snapshot();
  assert.equal(core.bodymate_core_select_region_layer('chest', 'fascia'), 'error|uncovered_region_or_layer');
  assert.equal(core.bodymate_core_snapshot(), before, 'failed atomic selection must preserve the snapshot');
  assert.equal(core.bodymate_core_select_region_layer('chest', 'muscle'), 'ok|chest|pec_r|muscle|false|false|3');
  assert.equal(core.bodymate_core_isolate_selected(), 'ok|chest|pec_r|muscle|true|false|4');
  assert.equal(core.bodymate_core_restore_context(), 'ok|chest|pec_r|muscle|false|false|5');
  assert.equal(core.bodymate_core_select_structure('missing'), 'error|unknown_structure');
  assert.equal(core.bodymate_core_snapshot(), 'ok|chest|pec_r|muscle|false|false|5');
});

test('MoonBit owns the canonical neck registry, structure sets, resolver, action transitions, and bounded event wire', () => {
  const core = loadCore();
  for (const name of ['bodymate_domain_registry_v1', 'bodymate_domain_reset', 'bodymate_domain_snapshot_v2', 'bodymate_domain_snapshot_v3', 'bodymate_domain_snapshot_v4', 'bodymate_domain_events_v1', 'bodymate_domain_events_v2', 'bodymate_domain_evidence_v1', 'bodymate_domain_resolve_query_v1', 'bodymate_domain_resolve_query_v2', 'bodymate_domain_resolve_query_v3', 'bodymate_domain_execute_action_v1']) {
    assert.equal(typeof core[name], 'function', `missing ${name}`);
  }
  assert.match(core.bodymate_domain_reset(), /^ok\|/);
  const registry = core.bodymate_domain_registry_v1();
  assert.equal(registry.slice('ok|registry-v1|'.length).split('~').length, 14);
  const exact = core.bodymate_domain_resolve_query_v1('right sternocleidomastoid');
  assert.match(exact, /^ok\|query-v1\|STRUCTURE_LOOKUP\|EXACT\|SELECT_STRUCTURE\|bodymate\.neck\.sternocleidomastoid\.right\|/);
  assert.match(core.bodymate_domain_execute_action_v1('SELECT_STRUCTURE', 'bodymate.neck.sternocleidomastoid.right', ''), /^ok\|neck\|bodymate\.neck\.sternocleidomastoid\.right\|/);
  assert.match(core.bodymate_domain_execute_action_v1('ISOLATE_SELECTED', '', ''), /\|true\|false\|/);
  const snapshot = core.bodymate_domain_snapshot_v2();
  assert.match(snapshot, /^ok\|snapshot-v2\|2\|neck\|bodymate\.neck\.sternocleidomastoid\.right\|muscle\|true\|false\|/);
  assert.match(core.bodymate_domain_events_v1(), /^ok\|events-v1\|/);
  const setQuery = core.bodymate_domain_resolve_query_v2('右侧斜角肌');
  assert.match(setQuery, /^ok\|query-v2\|STRUCTURE_LOOKUP\|EXACT\|HIGHLIGHT_STRUCTURE_SET\|bodymate\.neck\.set\.scalene\.right/);
  assert.match(core.bodymate_domain_execute_action_v1('HIGHLIGHT_STRUCTURE_SET', 'bodymate.neck.set.scalene.right', ''), /^ok\|neck\|bodymate\.neck\.scalene\.anterior\.right\|/);
  assert.match(core.bodymate_domain_snapshot_v3(), /^ok\|snapshot-v3\|3\|neck\|bodymate\.neck\.scalene\.anterior\.right\|muscle\|false\|false\|/);
  assert.match(core.bodymate_domain_events_v1(), /StructureSetHighlighted\^HIGHLIGHT_STRUCTURE_SET/);
});

test('MoonBit resolves evidence-backed movements into a V4 StructureSet without JavaScript mappings', () => {
  const core = loadCore();
  core.bodymate_domain_reset();
  const query = core.bodymate_domain_resolve_query_v3('耸肩涉及哪些肌肉');
  assert.match(query, /^ok\|query-v3\|MOVEMENT_LOOKUP\|EXACT\|SHOW_MOVEMENT_MAPPING\|shoulder_girdle_elevation\|/);
  assert.match(query, /bodymate\.neck\.trapezius\.upper\.right\^main_contributor\^ev\.scapula\.elevation/);
  const before = core.bodymate_domain_snapshot_v4();
  assert.equal(core.bodymate_domain_execute_action_v1('SHOW_MOVEMENT_MAPPING', 'not-a-movement', ''), 'error|unknown_movement');
  assert.equal(core.bodymate_domain_snapshot_v4(), before);
  assert.match(core.bodymate_domain_execute_action_v1('SHOW_MOVEMENT_MAPPING', 'shoulder_girdle_elevation', ''), /^ok\|neck\|bodymate\.neck\.trapezius\.upper\.right\|/);
  const snapshot = core.bodymate_domain_snapshot_v4();
  assert.match(snapshot, /^ok\|snapshot-v4\|4\|neck\|bodymate\.neck\.trapezius\.upper\.right\|muscle\|false\|false\|1\|structure_set\|bodymate\.movement\.set\.shoulder_girdle_elevation\|/);
  assert.match(snapshot, /shoulder_girdle_elevation\|肩胛带上提 \/ 耸肩\|Shoulder Girdle Elevation\|/);
  assert.match(snapshot, /bodymate\.neck\.levator-scapulae\.left\^contributor\^ev\.scapula\.elevation/);
  assert.match(core.bodymate_domain_events_v2(), /MovementMappingShown\^SHOW_MOVEMENT_MAPPING/);
});

test('MoonBit owns the complete-body registry, parameter policy, pose intent, and playback state', () => {
  const core = loadCore();
  for (const name of [
    'bodymate_motion_registry_v1', 'bodymate_motion_resolve_v1', 'bodymate_motion_parameters_v1',
    'bodymate_motion_parse_query_v1', 'bodymate_motion_profile_v1', 'bodymate_motion_pose_intent_v1',
    'bodymate_motion_session_reset', 'bodymate_motion_session_play_v1', 'bodymate_motion_session_stop_v1',
    'bodymate_motion_session_set_parameters_v1', 'bodymate_motion_session_set_paused_v1',
    'bodymate_motion_session_set_speed_v1', 'bodymate_motion_session_seek_v1',
    'bodymate_motion_session_tick_v1', 'bodymate_motion_session_snapshot_v1',
  ]) assert.equal(typeof core[name], 'function', `missing ${name}`);
  const registry = core.bodymate_motion_registry_v1();
  assert.equal(registry.slice('ok|motion-registry-v1|'.length).split('~').length, 3);
  assert.match(registry, /push_up\^俯卧撑\^4\^俯卧撑;卧撑;push-up;push up/);
  assert.match(core.bodymate_motion_parse_query_v1('squat', '站距1.5倍髋宽，深度80%', ''), /stanceWidth=1.5,toeAngle=20,squatDepth=80.*\|true$/);
  assert.match(core.bodymate_motion_pose_intent_v1('squat', .5, 'squatDepth=80'), /depth=1,excursion=0.8/);
  core.bodymate_motion_session_reset();
  assert.match(core.bodymate_motion_session_play_v1('push_up', 'handWidth=1.2', false, false), /\|push_up\|0\|false\|1\|handWidth=1.2,elbowAngle=45\|/);
  assert.match(core.bodymate_motion_session_tick_v1(1), /\|push_up\|0.25\|false\|1\|/);
  assert.match(core.bodymate_motion_session_set_paused_v1(true), /\|push_up\|0.25\|true\|/);
  assert.match(core.bodymate_motion_session_tick_v1(1), /\|push_up\|0.25\|true\|/);
});
