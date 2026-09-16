test "agent guard wire keeps only allowlisted commands and declared finite fields" {
  let allowlist = "push_up^handWidth,elbowAngle~squat^stanceWidth,toeAngle,squatDepth~curl^"
  assert_eq(
    agent_guard_command_v1("push_up", "handWidth=1.8,invented=7,elbowAngle=NaN", allowlist),
    "ok|agent-guard-v1|command|push_up|handWidth=1.8",
  )
  assert_eq(
    agent_guard_command_v1("run_marathon", "handWidth=1.8", allowlist),
    "ok|agent-guard-v1|none",
  )
  assert_eq(agent_guard_command_v1("curl", "handWidth=1.8", allowlist), "ok|agent-guard-v1|command|curl|")
  assert_eq(agent_guard_command_v1("push_up", "", ""), "ok|agent-guard-v1|none")
}

test "agent guard wire bounds lookups" {
  assert_eq(agent_guard_lookup_v1("  胸大肌 ", 80), "ok|agent-guard-v1|lookup|胸大肌")
  assert_eq(agent_guard_lookup_v1("   ", 80), "ok|agent-guard-v1|none")
  assert_eq(agent_guard_lookup_v1("abcdefghij", 4), "ok|agent-guard-v1|lookup|abcd")
}
