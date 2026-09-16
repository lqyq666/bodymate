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

test "allowlist parsing drops malformed, invalid and duplicate entries" {
  let allowed = parse_allowlist(
    "push_up^handWidth,elbowAngle~squat^stanceWidth,toeAngle,stanceWidth~Bad-Id^x~push_up^dup~~curl",
  )
  assert_eq(allowed.length(), 3)
  assert_eq(allowed[0].id, "push_up")
  assert_eq(allowed[0].fields, ["handWidth", "elbowAngle"])
  assert_eq(allowed[1].id, "squat")
  assert_eq(allowed[1].fields, ["stanceWidth", "toeAngle"])
  assert_eq(allowed[2].id, "curl")
  assert_eq(allowed[2].fields.length(), 0)
  assert_eq(allowlist_wire(allowed), "push_up^handWidth,elbowAngle~squat^stanceWidth,toeAngle~curl^")
}

test "candidate fields keep only finite numbers with identifier keys" {
  let fields = parse_fields("handWidth=1.8,invented=7,nope=Infinity,bad key=1,elbowAngle=NaN,handWidth=9,depth=")
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

test "guard_lookup requires bounded non-empty text" {
  assert_eq(guard_lookup("  胸大肌 ", 80), Lookup("胸大肌"))
  assert_eq(guard_lookup("   ", 80), None)
  assert_eq(guard_lookup("abcdefghij", 4), Lookup("abcd"))
}

test "action wire is stable and parseable by the host" {
  assert_eq(action_wire(None), "none")
  assert_eq(action_wire(Command("push_up", [("handWidth", 1.8), ("elbowAngle", 60.0)])), "command|push_up|handWidth=1.8,elbowAngle=60")
  assert_eq(action_wire(Lookup("胸大肌")), "lookup|胸大肌")
}
