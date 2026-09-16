test "agent guard wire keeps only allowlisted commands and declared finite fields" {
  let allowlist = "push_up^handWidth:0.8:1.8,elbowAngle:15:70~squat^stanceWidth,toeAngle,squatDepth~curl^"
  assert_eq(
    agent_guard_command_v1("push_up", "handWidth=1.8,invented=7,elbowAngle=NaN", allowlist),
    "ok|agent-guard-v1|command|push_up|handWidth=1.8",
  )
  assert_eq(
    agent_guard_command_v1("push_up", "handWidth=2.5", allowlist),
    "ok|agent-guard-v1|command|push_up|handWidth=1.8",
  )
  assert_eq(
    agent_guard_command_v1("run_marathon", "handWidth=1.8", allowlist),
    "ok|agent-guard-v1|none",
  )
  assert_eq(agent_guard_command_v1("curl", "handWidth=1.8", allowlist), "ok|agent-guard-v1|command|curl|")
  assert_eq(agent_guard_command_v1("push_up", "", ""), "ok|agent-guard-v1|none")
}

test "agent explain wire carries the policy outcome and reasons" {
  let allowlist = "push_up^handWidth:0.8:1.8,elbowAngle:15:70"
  assert_eq(
    agent_explain_command_v1("push_up", "handWidth=2.5,invented=7", allowlist, "clamp"),
    "ok|agent-explain-v1|command|push_up|handWidth=1.8|clamped:handWidth:2.5->1.8;unknown_field:invented",
  )
  assert_eq(
    agent_explain_command_v1("push_up", "handWidth=2.5", allowlist, "reject"),
    "ok|agent-explain-v1|command|push_up||out_of_range:handWidth:2.5",
  )
  assert_eq(
    agent_explain_command_v1("run_marathon", "", allowlist, "clamp"),
    "ok|agent-explain-v1|none|unknown_id:run_marathon",
  )
}

test "agent guard wire bounds lookups" {
  assert_eq(agent_guard_lookup_v1("  胸大肌 ", 80), "ok|agent-guard-v1|lookup|胸大肌")
  assert_eq(agent_guard_lookup_v1("   ", 80), "ok|agent-guard-v1|none")
  assert_eq(agent_guard_lookup_v1("abcdefghij", 4), "ok|agent-guard-v1|lookup|abcd")
}

test "agent guard wire keeps enumerated options and drops unknown ones" {
  let allowlist = "set_light^brightness:0:100,mode?warm?cool"
  assert_eq(
    agent_guard_command_v1("set_light", "brightness=200,mode~disco", allowlist),
    "ok|agent-guard-v1|command|set_light|brightness=100",
  )
  assert_eq(
    agent_guard_command_v1("set_light", "mode~warm", allowlist),
    "ok|agent-guard-v1|command|set_light|mode~warm",
  )
  assert_eq(
    agent_explain_command_v1("set_light", "brightness=200,mode~disco,invented=1", allowlist, "clamp"),
    "ok|agent-explain-v1|command|set_light|brightness=100|clamped:brightness:200->100;unknown_option:mode:disco;unknown_field:invented",
  )
}
