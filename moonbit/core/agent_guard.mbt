///| Wire: guard a model-proposed command. `fields` is `key=value,...`, `allowlist`
///| is `id^key,key~id^key`. Returns `ok|agent-guard-v1|none`, `...|command|id|k=v,...`
///| or `...|lookup|text`; only allowlisted ids and their finite declared fields survive.
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
      @agent.parse_fields(fields),
      @agent.parse_allowlist(allowlist),
    ),
  )
}

///| Wire: guard a model-proposed free-text lookup, trimmed and capped at `max_chars`.
#export_name("bodymate_agent_guard_lookup_v1")
pub fn agent_guard_lookup_v1(query : String, max_chars : Int) -> String {
  "ok|agent-guard-v1|" + @agent.action_wire(@agent.guard_lookup(query, max_chars))
}
