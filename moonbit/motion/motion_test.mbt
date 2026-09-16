// Black-box tests exercise only the public package contract.
test "public API normalizes bounds and is idempotent" {
  for definition in @motion.catalog() {
    for field in definition.parameters {
      for requested in [-999.0, 0.0, 1.13, 999.0, @double.infinity, @double.not_a_number] {
        let normalized = @motion.normalize(definition.id, [{ key: field.key, value: requested }]).unwrap()
        let repeated = @motion.normalize(definition.id, normalized.values).unwrap()
        for i in 0..<normalized.values.length() {
          assert_eq(normalized.values[i].value, repeated.values[i].value)
          let value = normalized.values[i].value
          let spec = definition.parameters[i]
          assert_true(value >= spec.minimum && value <= spec.maximum)
        }
        assert_eq(repeated.notices.length(), 0)
      }
    }
  }
}

test "two consumers own independent sessions" {
  let a = @motion.Session::new()
  let b = @motion.Session::new()
  ignore(a.play("squat", []).unwrap())
  ignore(b.play("curl", []).unwrap())
  assert_eq(a.tick(2.2).phase, 0.5)
  assert_eq(b.snapshot().phase, 0.0)
  ignore(a.set_paused(true))
  assert_eq(b.tick(1.8).phase, 0.5)
  assert_eq(b.snapshot().paused, false)
  ignore(a.reset())
  assert_eq(b.snapshot().motion_id, "curl")
}

test "unknown motion and idle parameters are rejected without mutation" {
  let session = @motion.Session::new()
  assert_true(session.set_parameters([]) is Err(@motion.NoActiveMotion))
  ignore(session.play("squat", []).unwrap())
  let before = session.tick(1.1)
  assert_true(session.play("invented", []) is Err(@motion.UnknownMotion("invented")))
  let after = session.snapshot()
  assert_eq(after.motion_id, before.motion_id)
  assert_eq(after.phase, before.phase)
  assert_eq(after.revision, before.revision)
  assert_true(@motion.pose_intent("invented", 0.5, []) is Err(_))
}

test "returned arrays cannot mutate the catalog or a running session" {
  let catalog = @motion.catalog()
  catalog[0].aliases.clear()
  catalog[0].parameters.clear()
  catalog[0].presets[0].values.clear()
  assert_eq(@motion.resolve("俯卧撑"), Some("push_up"))
  assert_eq(@motion.definition("push_up").unwrap().parameters.length(), 2)
  assert_eq(@motion.definition("push_up").unwrap().presets[0].values.length(), 2)
  let session = @motion.Session::new()
  let snapshot = session.play("squat", [{ key: "stanceWidth", value: 9.0 }]).unwrap()
  snapshot.parameters.clear()
  snapshot.notices.clear()
  assert_eq(session.snapshot().parameters.length(), 3)
  assert_eq(session.snapshot().notices.length(), 1)
}

test "parameterized motions expose one observation baseline" {
  for definition in @motion.catalog() {
    let mut baselines = 0
    for preset in definition.presets { if preset.is_baseline { baselines = baselines + 1 } }
    if definition.parameters.length() == 0 {
      assert_eq(baselines, 0)
    } else {
      assert_eq(baselines, 1)
    }
  }
}

test "parameter changes preserve paused position and speed" {
  let session = @motion.Session::new()
  ignore(session.play("push_up", []).unwrap())
  ignore(session.seek(0.4))
  ignore(session.set_speed(1.5))
  ignore(session.set_paused(true))
  let updated = session.set_parameters([{ key: "handWidth", value: 1.8 }]).unwrap()
  assert_eq(updated.phase, 0.4)
  assert_eq(updated.paused, true)
  assert_eq(updated.speed, 1.5)
  assert_eq(session.tick(100.0).phase, 0.4)
  let switched = session.play("curl", [], preserve_phase=true).unwrap()
  assert_eq(switched.phase, 0.0)
}

test "elapsed time composes and remains finite at extreme inputs" {
  let a = @motion.Session::new()
  let b = @motion.Session::new()
  ignore(a.play("push_up", []).unwrap())
  ignore(b.play("push_up", []).unwrap())
  ignore(a.tick(0.25))
  assert_eq(a.tick(0.75).phase, b.tick(1.0).phase)
  for delta in [-1.0, @double.not_a_number, @double.infinity] {
    assert_eq(a.tick(delta).phase, 0.25)
  }
  ignore(a.set_speed(2.0))
  let phase = a.tick(1.7976931348623157e308).phase
  assert_true(!phase.is_nan() && phase >= 0.0 && phase < 1.0)
  assert_eq(a.set_speed(@double.not_a_number).speed, 1.0)
  assert_eq(a.seek(@double.infinity).phase, 0.0)
}

test "pose sampler is deterministic and bounds non-finite phase" {
  for definition in @motion.catalog() {
    let top = @motion.pose_intent(definition.id, 0.0, []).unwrap()
    assert_eq(top, @motion.pose_intent(definition.id, @double.not_a_number, []).unwrap())
    assert_eq(top, @motion.pose_intent(definition.id, @double.infinity, []).unwrap())
    for i in 0..=100 {
      let phase = i.to_double() / 100.0
      let pose = @motion.pose_intent(definition.id, phase, []).unwrap()
      assert_eq(pose, @motion.pose_intent(definition.id, phase, []).unwrap())
      assert_true(pose.depth >= 0.0 && pose.depth <= 1.0)
      assert_true(!pose.root_y.is_nan() && !pose.root_z.is_nan())
    }
  }
}

test "phase guides describe four stable teaching checkpoints" {
  for definition in @motion.catalog() {
    let guides = @motion.phase_guides(definition.id).unwrap()
    assert_eq(guides.length(), 4)
    assert_eq(guides[0].phase, 0.0)
    assert_eq(guides[2].phase, 0.5)
    assert_true(guides[0].start > guides[0].end)
  }
  let bottom = @motion.phase_guides("push_up").unwrap()[2]
  assert_eq(bottom.id, "push_up_bottom")
  assert_eq(bottom.title, "最低点")
  assert_true(@motion.phase_guides("invented") is Err(@motion.UnknownMotion("invented")))
}

test "typed query parser preserves units and unsupported instructions" {
  let parsed = @motion.parse_query("squat", "宽站距，脚尖外展25度，深度80%", []).unwrap()
  assert_true(parsed.recognized)
  assert_eq(parsed.values[0].value, 1.8)
  assert_eq(parsed.values[1].value, 25.0)
  assert_eq(parsed.values[2].value, 80.0)
  let wrong_unit = @motion.parse_query("squat", "站距1.5倍肩宽，单腿", []).unwrap()
  assert_eq(wrong_unit.recognized, false)
  assert_eq(wrong_unit.values[0].value, 1.2)
  assert_true(wrong_unit.notices.length() > 0)
}

test "chinese numerals in commands are normalized before matching" {
  let push = @motion.parse_query("push_up", "手距一点五倍肩宽，夹角六十度", []).unwrap()
  assert_true(push.recognized)
  assert_eq(push.values[0].value, 1.5)
  assert_eq(push.values[1].value, 60.0)
  let squat = @motion.parse_query("squat", "站距一点二倍髋宽，脚尖外展二十度，深度百分之八十", []).unwrap()
  assert_true(squat.recognized)
  assert_eq(squat.values[0].value, 1.2)
  assert_eq(squat.values[1].value, 20.0)
  assert_eq(squat.values[2].value, 80.0)
  let fullwidth = @motion.parse_query("push_up", "手距１．８倍肩宽", []).unwrap()
  assert_true(fullwidth.recognized)
  assert_eq(fullwidth.values[0].value, 1.8)
}
