///| Wire: guard a model-proposed command. `fields` is `key=value,...`, `allowlist`
///| is `id^key:min:max,key~id^key`. Returns `ok|agent-guard-v1|none`,
///| `...|command|id|k=v,...` or `...|lookup|text`; only allowlisted ids and their
///| declared finite fields survive, out-of-range values are clamped into their bounds.
#export_name("bodymate_agent_guard_command_v1")
pub fn agent_guard_command_v1(
  candidate_id : String,
  fields : String,
  allowlist : String,
) -> String {
  "ok|agent-guard-v1|" +
  @agent.action_wire(
    @agent.guard_command(
      candidate_id,
      @agent.parse_candidates(fields),
      @agent.parse_allowlist(allowlist),
    ),
  )
}

///| Wire: like `bodymate_agent_guard_command_v1` but with an explicit range policy
///| ("clamp" | "reject") and a reason list. Returns
///| `ok|agent-explain-v1|<action wire>|reason;reason` where the action wire is the
///| same shape as the guard export and reasons are `unknown_id:..`, `unknown_field:..`,
///| `non_finite:..`, `clamped:key:from->to` or `out_of_range:key:value`.
#export_name("bodymate_agent_explain_command_v1")
pub fn agent_explain_command_v1(
  candidate_id : String,
  fields : String,
  allowlist : String,
  policy : String,
) -> String {
  let report = @agent.explain_command(
    candidate_id,
    @agent.parse_candidates(fields),
    @agent.parse_allowlist(allowlist),
    @agent.policy_from_string(policy),
  )
  "ok|agent-explain-v1|" +
  @agent.action_wire(report.action) +
  "|" +
  report.reasons.join(";")
}

///| Wire: guard a model-proposed free-text lookup, trimmed and capped at `max_chars`.
#export_name("bodymate_agent_guard_lookup_v1")
pub fn agent_guard_lookup_v1(query : String, max_chars : Int) -> String {
  "ok|agent-guard-v1|" + @agent.action_wire(@agent.guard_lookup(query, max_chars))
}
