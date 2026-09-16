test "identifiers follow the host contract" {
  assert_true(is_valid_command_id("push_up"))
  assert_true(is_valid_command_id("a1"))
  assert_false(is_valid_command_id("PushUp"))
  assert_false(is_valid_command_id("1push"))
  assert_false(is_valid_command_id(""))
  assert_false(is_valid_command_id("push-up"))
  assert_true(is_valid_field_key("handWidth"))
  assert_true(is_valid_field_key("Depth_2"))
  assert_false(is_valid_field_key("2depth"))
  assert_false(is_valid_field_key("hand width"))
}

test "bound_text trims and caps by characters" {
  assert_eq(bound_text("  胸大肌  ", 80), "胸大肌")
  assert_eq(bound_text("abcdef", 3), "abc")
  assert_eq(bound_text("   ", 80), "")
  assert_eq(bound_text("胸大肌", 0), "")
  assert_eq(bound_text("ab   ", 4), "ab")
}

test "allowlist parsing accepts optional bounds and drops malformed entries" {
  let allowed = parse_allowlist(
    "push_up^handWidth:0.8:1.8,elbowAngle:15:70~squat^stanceWidth,toeAngle:0:,squatDepth::100,stanceWidth~Bad-Id^x~push_up^dup~~curl~lift^bad:9:1,ok",
  )
  assert_eq(allowed.length(), 4)
  assert_eq(allowed[0].id, "push_up")
  assert_eq(allowed[0].fields, [
    FieldSpec::bounded("handWidth", 0.8, 1.8),
    FieldSpec::bounded("elbowAngle", 15.0, 70.0),
  ])
  assert_eq(allowed[1].fields, [
    FieldSpec::unbounded("stanceWidth"),
    { key: "toeAngle", min: Some(0.0), max: None },
    { key: "squatDepth", min: None, max: Some(100.0) },
  ])
  assert_eq(allowed[2].id, "curl")
  assert_eq(allowed[2].fields.length(), 0)
  assert_eq(allowed[3].fields, [FieldSpec::unbounded("ok")])
  assert_eq(
    allowlist_wire(allowed),
    "push_up^handWidth:0.8:1.8,elbowAngle:15:70~squat^stanceWidth,toeAngle:0:,squatDepth::100~curl^~lift^ok",
  )
}

test "candidate fields keep only finite numbers with identifier keys" {
  let fields = parse_fields(
    "handWidth=1.8,invented=7,nope=Infinity,bad key=1,elbowAngle=NaN,handWidth=9,depth=",
  )
  assert_eq(fields, [("handWidth", 1.8), ("invented", 7.0)])
}

test "guard_command keeps allowlisted ids and declared fields only" {
  let allowed = parse_allowlist("push_up^handWidth,elbowAngle~curl^")
  let kept = guard_command("push_up", [("invented", 7.0), ("handWidth", 1.8)], allowed)
  assert_eq(kept, Command("push_up", [("handWidth", 1.8)]))
  assert_eq(guard_command(" push_up ", [], allowed), Command("push_up", []))
  assert_eq(guard_command("run_marathon", [("handWidth", 1.8)], allowed), None)
  assert_eq(guard_command("curl", [("handWidth", 1.8)], allowed), Command("curl", []))
  assert_eq(guard_command("push_up", [], []), None)
}

test "bounded fields are clamped by default and rejected on request" {
  let allowed = parse_allowlist("push_up^handWidth:0.8:1.8,elbowAngle:15:70")
  let proposal = [("handWidth", 2.5), ("elbowAngle", 60.0)]
  assert_eq(
    guard_command("push_up", proposal, allowed),
    Command("push_up", [("handWidth", 1.8), ("elbowAngle", 60.0)]),
  )
  assert_eq(
    guard_command_with("push_up", proposal, allowed, Reject),
    Command("push_up", [("elbowAngle", 60.0)]),
  )
  assert_eq(
    guard_command("push_up", [("handWidth", 0.1)], allowed),
    Command("push_up", [("handWidth", 0.8)]),
  )
  let one_sided = parse_allowlist("squat^toeAngle:0:")
  assert_eq(guard_command("squat", [("toeAngle", -5.0)], one_sided), Command("squat", [("toeAngle", 0.0)]))
  assert_eq(guard_command("squat", [("toeAngle", 500.0)], one_sided), Command("squat", [("toeAngle", 500.0)]))
}

test "explain_command reports every dropped or adjusted value" {
  let allowed = parse_allowlist("push_up^handWidth:0.8:1.8,elbowAngle:15:70")
  let report = explain_command(
    "push_up",
    [("handWidth", 2.5), ("invented", 7.0), ("elbowAngle", 60.0)],
    allowed,
    Clamp,
  )
  assert_eq(report.action, Command("push_up", [("handWidth", 1.8), ("elbowAngle", 60.0)]))
  assert_eq(report.reasons, ["clamped:handWidth:2.5->1.8", "unknown_field:invented"])
  let rejected = explain_command("push_up", [("handWidth", 2.5)], allowed, Reject)
  assert_eq(rejected.action, Command("push_up", []))
  assert_eq(rejected.reasons, ["out_of_range:handWidth:2.5"])
  let unknown = explain_command("run_marathon", [("handWidth", 1.0)], allowed, Clamp)
  assert_eq(unknown.action, None)
  assert_eq(unknown.reasons, ["unknown_id:run_marathon"])
  assert_eq(explain_lookup("   ", 80).reasons, ["empty_lookup"])
  assert_eq(explain_lookup(" 胸大肌 ", 80), { action: Lookup("胸大肌"), reasons: [] })
  assert_eq(policy_from_string(" Reject "), Reject)
  assert_eq(policy_from_string("anything"), Clamp)
}

test "guard_lookup requires bounded non-empty text" {
  assert_eq(guard_lookup("  胸大肌 ", 80), Lookup("胸大肌"))
  assert_eq(guard_lookup("   ", 80), None)
  assert_eq(guard_lookup("abcdefghij", 4), Lookup("abcd"))
}

test "action wire is stable and parseable by the host" {
  assert_eq(action_wire(None), "none")
  assert_eq(
    action_wire(Command("push_up", [("handWidth", 1.8), ("elbowAngle", 60.0)])),
    "command|push_up|handWidth=1.8,elbowAngle=60",
  )
  assert_eq(action_wire(Lookup("胸大肌")), "lookup|胸大肌")
}
