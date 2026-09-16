///| A field value an untrusted proposal may carry: a finite number or a short text.
pub(all) enum FieldValue {
  Num(Double)
  Str(String)
} derive(Eq, Debug)

///| The only shapes an untrusted (for example LLM-produced) proposal may resolve to.
///| Hosts map `Command` to something they execute and `Lookup` to a bounded search;
///| everything else collapses to `None`, so model text is never an execution grant.
pub(all) enum GuardedAction {
  None
  Command(String, Array[(String, FieldValue)])
  Lookup(String)
} derive(Eq, Debug)

///| One field a command accepts: a number with optional inclusive bounds, or one of
///| a fixed set of text options (an enumeration).
pub(all) struct FieldSpec {
  key : String
  min : Double?
  max : Double?
  options : Array[String]?
} derive(Eq, Debug)

///| A numeric field that accepts any finite number.
pub fn FieldSpec::unbounded(key : String) -> FieldSpec {
  { key, min: None, max: None, options: None }
}

///| A numeric field limited to `[min, max]`.
pub fn FieldSpec::bounded(key : String, min : Double, max : Double) -> FieldSpec {
  { key, min: Some(min), max: Some(max), options: None }
}

///| A text field limited to exactly the listed options.
pub fn FieldSpec::one_of(key : String, values : Array[String]) -> FieldSpec {
  { key, min: None, max: None, options: Some(values.copy()) }
}

///| One command the host permits: a stable id plus the fields it accepts.
pub(all) struct AllowedCommand {
  id : String
  fields : Array[FieldSpec]
} derive(Eq, Debug)

///| What to do with a declared numeric field whose value falls outside its bounds.
///| Enum fields have nothing to clamp: an option that is not listed is always dropped.
pub(all) enum RangePolicy {
  Clamp
  Reject
} derive(Eq, Debug)

///| A guarded action together with machine-readable reasons for every value that
///| was dropped or adjusted, so hosts can log or surface why a proposal changed.
///| Reason codes: `unknown_id:<id>`, `unknown_field:<key>`, `non_finite:<key>`,
///| `non_number:<key>`, `non_text:<key>`, `unknown_option:<key>:<value>`,
///| `clamped:<key>:<from>-><to>`, `out_of_range:<key>:<value>`, `empty_lookup`.
pub(all) struct GuardReport {
  action : GuardedAction
  reasons : Array[String]
} derive(Eq, Debug)

const MAX_IDENTIFIER_CHARS = 64

fn is_lower(ch : Char) -> Bool {
  ch >= 'a' && ch <= 'z'
}

fn is_alpha(ch : Char) -> Bool {
  is_lower(ch) || (ch >= 'A' && ch <= 'Z')
}

fn is_digit(ch : Char) -> Bool {
  ch >= '0' && ch <= '9'
}

fn identifier_like(
  text : String,
  first : (Char) -> Bool,
  rest : (Char) -> Bool,
) -> Bool {
  let mut count = 0
  for ch in text.iter() {
    count += 1
    if count > MAX_IDENTIFIER_CHARS {
      return false
    }
    if count == 1 {
      if !first(ch) {
        return false
      }
    } else if !rest(ch) {
      return false
    }
  }
  count > 0
}

///| Command ids are `^[a-z][a-z0-9_]*$` with at most 64 characters.
pub fn is_valid_command_id(id : String) -> Bool {
  identifier_like(id, is_lower, fn(ch) { is_lower(ch) || is_digit(ch) || ch == '_' })
}

///| Field keys are `^[A-Za-z][A-Za-z0-9_]*$` with at most 64 characters.
pub fn is_valid_field_key(key : String) -> Bool {
  identifier_like(key, is_alpha, fn(ch) { is_alpha(ch) || is_digit(ch) || ch == '_' })
}

///| Trims surrounding whitespace and keeps at most `max_chars` characters.
///| A non-positive limit always yields "".
pub fn bound_text(text : String, max_chars : Int) -> String {
  if max_chars <= 0 {
    return ""
  }
  let builder = StringBuilder()
  let mut count = 0
  for ch in text.trim().to_owned().iter() {
    if count >= max_chars {
      break
    }
    builder.write_char(ch)
    count += 1
  }
  builder.to_string().trim().to_owned()
}

fn parse_finite(value : StringView) -> Double? {
  let parsed : Double? = try Some(@string.parse_double(value)) catch {
    _ => None
  }
  match parsed {
    Some(number) => if number.is_nan() || number.is_inf() { None } else { Some(number) }
    None => None
  }
}

fn parse_field_spec(raw : StringView) -> FieldSpec? {
  let trimmed = raw.trim().to_owned()
  // Enumerated field: `key?opt1?opt2` — a '?' right after the key starts the options.
  if trimmed.contains("?") {
    let pieces = trimmed.split("?").to_array()
    if pieces.length() < 2 {
      return None
    }
    let key = pieces[0].to_owned().trim().to_owned()
    if !is_valid_field_key(key) || key == "" {
      return None
    }
    let values : Array[String] = []
    for piece in pieces[1:] {
      let value = piece.to_owned().trim().to_owned()
      if value != "" && !values.contains(value) {
        values.push(value)
      }
    }
    if values.length() == 0 {
      return None
    }
    return Some(FieldSpec::one_of(key, values))
  }
  let parts = trimmed.split(":").to_array()
  if parts.length() == 0 || parts.length() > 3 {
    return None
  }
  let key = parts[0].to_owned().trim().to_owned()
  if !is_valid_field_key(key) {
    return None
  }
  let min = if parts.length() >= 2 && parts[1].trim().length() > 0 {
    match parse_finite(parts[1].trim()) {
      Some(value) => Some(value)
      None => return None
    }
  } else {
    None
  }
  let max = if parts.length() == 3 && parts[2].trim().length() > 0 {
    match parse_finite(parts[2].trim()) {
      Some(value) => Some(value)
      None => return None
    }
  } else {
    None
  }
  match (min, max) {
    (Some(lower), Some(upper)) => if lower > upper { return None }
    _ => ()
  }
  Some({ key, min, max, options: None })
}

///| Parses `id^key,key:min:max,key?opt1?opt2~id^key` into an allowlist. Numeric bounds
///| are optional and may be one-sided (`key:min:` or `key::max`); a `?`-segment declares
///| enumerated options. Malformed records, invalid identifiers, inverted bounds,
///| duplicate ids and duplicate keys are dropped rather than trusted.
pub fn parse_allowlist(wire : String) -> Array[AllowedCommand] {
  let allowed : Array[AllowedCommand] = []
  let seen_ids : Array[String] = []
  for record in wire.split("~") {
    let parts = record.split("^").to_array()
    if parts.length() == 0 {
      continue
    }
    let id = parts[0].to_owned().trim().to_owned()
    if !is_valid_command_id(id) || seen_ids.contains(id) {
      continue
    }
    seen_ids.push(id)
    let fields : Array[FieldSpec] = []
    let seen_keys : Array[String] = []
    if parts.length() >= 2 {
      for raw in parts[1].split(",") {
        match parse_field_spec(raw) {
          Some(spec) =>
            if !seen_keys.contains(spec.key) {
              seen_keys.push(spec.key)
              fields.push(spec)
            }
          None => ()
        }
      }
    }
    allowed.push({ id, fields })
  }
  allowed
}

fn spec_wire(spec : FieldSpec) -> String {
  match spec.options {
    Some(values) => {
      let parts : Array[String] = [spec.key]
      for value in values {
        parts.push(value)
      }
      parts.join("?")
    }
    None =>
      match (spec.min, spec.max) {
        (None, None) => spec.key
        (Some(lower), None) => spec.key + ":" + lower.to_string() + ":"
        (None, Some(upper)) => spec.key + "::" + upper.to_string()
        (Some(lower), Some(upper)) =>
          spec.key + ":" + lower.to_string() + ":" + upper.to_string()
      }
  }
}

///| Encodes an allowlist as `id^key,key:min:max,key?opt1~id^key`.
pub fn allowlist_wire(allowed : Array[AllowedCommand]) -> String {
  let records : Array[String] = []
  for command in allowed {
    let specs : Array[String] = []
    for spec in command.fields {
      specs.push(spec_wire(spec))
    }
    records.push(command.id + "^" + specs.join(","))
  }
  records.join("~")
}

///| Parses candidate fields `key=value,key~text`: a number, or a text option (the
///| literal must not contain `~`). Values that are not finite numbers, keys that are
///| not identifiers and repeated keys are dropped.
pub fn parse_candidates(wire : String) -> Array[(String, FieldValue)] {
  let fields : Array[(String, FieldValue)] = []
  let seen : Array[String] = []
  for pair in wire.split(",") {
    let numeric = pair.split("=").to_array()
    if numeric.length() == 2 {
      let key = numeric[0].to_owned().trim().to_owned()
      if !is_valid_field_key(key) || seen.contains(key) {
        continue
      }
      match parse_finite(numeric[1].trim()) {
        Some(value) => {
          seen.push(key)
          fields.push((key, Num(value)))
        }
        None => ()
      }
      continue
    }
    let textual = pair.split("~").to_array()
    if textual.length() == 2 && textual[1].length() > 0 {
      let key = textual[0].to_owned().trim().to_owned()
      if !is_valid_field_key(key) || seen.contains(key) {
        continue
      }
      seen.push(key)
      fields.push((key, Str(textual[1].to_owned().trim().to_owned())))
    }
  }
  fields
}

fn find_candidate(
  candidate_fields : Array[(String, FieldValue)],
  key : String,
) -> FieldValue? {
  for field in candidate_fields {
    if field.0 == key {
      return Some(field.1)
    }
  }
  None
}

///| Guards a proposal and explains every change. Only an allowlisted id survives; only
///| its declared fields are kept, in declaration order. Numeric fields clamp or reject
///| out-of-range values; enumerated fields keep only listed options. Non-finite numbers
///| and mismatched value types are dropped.
pub fn explain_command(
  candidate_id : String,
  candidate_fields : Array[(String, FieldValue)],
  allowed : Array[AllowedCommand],
  policy : RangePolicy,
) -> GuardReport {
  let reasons : Array[String] = []
  let id = candidate_id.trim().to_owned()
  for command in allowed {
    if command.id != id {
      continue
    }
    let kept : Array[(String, FieldValue)] = []
    for spec in command.fields {
      match find_candidate(candidate_fields, spec.key) {
        None => ()
        Some(Num(value)) =>
          if value.is_nan() || value.is_inf() {
            reasons.push("non_finite:" + spec.key)
          } else {
            match spec.options {
              Some(_) => reasons.push("non_text:" + spec.key)
              None => {
                let lower = match spec.min {
                  Some(bound) => bound
                  None => value
                }
                let upper = match spec.max {
                  Some(bound) => bound
                  None => value
                }
                if value < lower || value > upper {
                  match policy {
                    Clamp => {
                      let adjusted = if value < lower { lower } else { upper }
                      reasons.push(
                        "clamped:" + spec.key + ":" + value.to_string() + "->" + adjusted.to_string(),
                      )
                      kept.push((spec.key, Num(adjusted)))
                    }
                    Reject => reasons.push("out_of_range:" + spec.key + ":" + value.to_string())
                  }
                } else {
                  kept.push((spec.key, Num(value)))
                }
              }
            }
          }
        Some(Str(value)) =>
          match spec.options {
            Some(values) =>
              if values.contains(value) {
                kept.push((spec.key, Str(value)))
              } else {
                reasons.push("unknown_option:" + spec.key + ":" + value)
              }
            None => reasons.push("non_number:" + spec.key)
          }
      }
    }
    for field in candidate_fields {
      let mut declared = false
      for spec in command.fields {
        if spec.key == field.0 {
          declared = true
          break
        }
      }
      if !declared {
        reasons.push("unknown_field:" + field.0)
      }
    }
    return { action: Command(id, kept), reasons }
  }
  reasons.push("unknown_id:" + id)
  { action: None, reasons }
}

///| Keeps a proposal only when its id is allowlisted, keeping declared fields with
///| in-range numbers (clamped) and listed enum options.
pub fn guard_command(
  candidate_id : String,
  candidate_fields : Array[(String, FieldValue)],
  allowed : Array[AllowedCommand],
) -> GuardedAction {
  explain_command(candidate_id, candidate_fields, allowed, Clamp).action
}

///| Like `guard_command` but with an explicit out-of-range policy.
pub fn guard_command_with(
  candidate_id : String,
  candidate_fields : Array[(String, FieldValue)],
  allowed : Array[AllowedCommand],
  policy : RangePolicy,
) -> GuardedAction {
  explain_command(candidate_id, candidate_fields, allowed, policy).action
}

///| Accepts a free-text lookup only when something remains after trimming and capping.
pub fn guard_lookup(query : String, max_chars : Int) -> GuardedAction {
  let text = bound_text(query, max_chars)
  if text == "" {
    None
  } else {
    Lookup(text)
  }
}

///| `guard_lookup` with a report; an empty result carries the reason `empty_lookup`.
pub fn explain_lookup(query : String, max_chars : Int) -> GuardReport {
  match guard_lookup(query, max_chars) {
    None => { action: None, reasons: ["empty_lookup"] }
    action => { action, reasons: [] }
  }
}

///| Parses a policy name; anything other than "reject" means Clamp.
pub fn policy_from_string(text : String) -> RangePolicy {
  if text.to_lower().trim().to_owned() == "reject" {
    Reject
  } else {
    Clamp
  }
}

///| Wire form of a decision: `none` | `command|id|key=value,key~text` | `lookup|text`.
pub fn action_wire(action : GuardedAction) -> String {
  match action {
    None => "none"
    Command(id, fields) => {
      let pairs : Array[String] = []
      for field in fields {
        match field.1 {
          Num(value) => pairs.push(field.0 + "=" + value.to_string())
          Str(value) => pairs.push(field.0 + "~" + value)
        }
      }
      "command|" + id + "|" + pairs.join(",")
    }
    Lookup(text) => "lookup|" + text
  }
}
