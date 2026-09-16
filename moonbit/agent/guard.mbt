///| The only shapes an untrusted (for example LLM-produced) proposal may resolve to.
///| Hosts map `Command` to something they execute and `Lookup` to a bounded search;
///| everything else collapses to `None`, so model text is never an execution grant.
pub(all) enum GuardedAction {
  None
  Command(String, Array[(String, Double)])
  Lookup(String)
} derive(Eq, Debug)

///| One command the host permits: a stable id plus the numeric fields it accepts.
pub(all) struct AllowedCommand {
  id : String
  fields : Array[String]
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

///| Parses `id^key,key~id^key` into an allowlist. Malformed records, invalid
///| identifiers, duplicate ids and duplicate keys are dropped rather than trusted.
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
    let fields : Array[String] = []
    if parts.length() >= 2 {
      for raw in parts[1].to_owned().split(",") {
        let key = raw.to_owned().trim().to_owned()
        if is_valid_field_key(key) && !fields.contains(key) {
          fields.push(key)
        }
      }
    }
    allowed.push({ id, fields })
  }
  allowed
}

///| Encodes an allowlist as `id^key,key~id^key`.
pub fn allowlist_wire(allowed : Array[AllowedCommand]) -> String {
  let records : Array[String] = []
  for command in allowed {
    records.push(command.id + "^" + command.fields.join(","))
  }
  records.join("~")
}

///| Parses candidate fields `key=value,key=value`. Values that are not finite
///| numbers, keys that are not identifiers and repeated keys are dropped.
pub fn parse_fields(wire : String) -> Array[(String, Double)] {
  let fields : Array[(String, Double)] = []
  let seen : Array[String] = []
  for pair in wire.split(",") {
    let parts = pair.split("=").to_array()
    if parts.length() != 2 {
      continue
    }
    let key = parts[0].to_owned().trim().to_owned()
    if !is_valid_field_key(key) || seen.contains(key) {
      continue
    }
    match parse_finite(parts[1].trim()) {
      Some(value) => {
        seen.push(key)
        fields.push((key, value))
      }
      None => ()
    }
  }
  fields
}

///| Keeps a proposal only when its id is allowlisted, and keeps only the finite
///| numeric fields that command declares, in the allowlist's field order.
pub fn guard_command(
  candidate_id : String,
  candidate_fields : Array[(String, Double)],
  allowed : Array[AllowedCommand],
) -> GuardedAction {
  let id = candidate_id.trim().to_owned()
  for command in allowed {
    if command.id != id {
      continue
    }
    let kept : Array[(String, Double)] = []
    for key in command.fields {
      for field in candidate_fields {
        if field.0 == key && !field.1.is_nan() && !field.1.is_inf() {
          kept.push((key, field.1))
          break
        }
      }
    }
    return Command(id, kept)
  }
  None
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

///| Wire form of a decision: `none` | `command|id|key=value,key=value` | `lookup|text`.
pub fn action_wire(action : GuardedAction) -> String {
  match action {
    None => "none"
    Command(id, fields) => {
      let pairs : Array[String] = []
      for field in fields {
        pairs.push(field.0 + "=" + field.1.to_string())
      }
      "command|" + id + "|" + pairs.join(",")
    }
    Lookup(text) => "lookup|" + text
  }
}
