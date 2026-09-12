fn lower(text : String) -> String {
  let mut normalized = text.to_lower().trim().to_owned()
  for punctuation in ["!", "！", "?", "？", "。", "、", "；", ";"] { normalized = normalized.replace_all(old=punctuation, new=" ") }
  normalized.trim().to_owned()
}
fn input_side(text : String) -> Side? {
  let value = lower(text)
  let right = value.contains("右") || value.contains("right")
  let left = value.contains("左") || value.contains("left")
  if right == left { None } else if right { Some(Right) } else { Some(Left) }
}

fn family_matches(text : String) -> Array[String] {
  let value = lower(text)
  let families : Array[String] = []
  if value.contains("胸锁乳突肌") || value.contains("sternocleidomastoid") || value.contains("scm") { families.push("scm") }
  if value.contains("斜方肌") || value.contains("trapezius") || value.contains("upper trap") { families.push("trapezius") }
  if value.contains("肩胛提肌") || value.contains("levator scapulae") || value.contains("levator") { families.push("levator") }
  if value.contains("斜角肌") || value.contains("scalene") || value.contains("scalenus") { families.push("scalene") }
  if value.contains("头夹肌") || value.contains("splenius capitis") || value.contains("splenius") { families.push("splenius") }
  families
}

fn has_health_signal(text : String) -> Bool {
  let value = lower(text)
  for hint in ["疼", "痛", "伤", "炎", "病", "麻", "治疗", "康复", "处方", "诊断", "拉伸", "pain", "injury", "diagnose", "diagnosis", "treatment", "rehab", "stretch"] {
    if value.contains(hint) { return true }
  }
  false
}

fn command_for(text : String) -> DomainAction? {
  let value = lower(text)
  if value.contains("只看这块") || value.contains("只显示这块") || value.contains("单独看") || value.contains("isolate") {
    return Some({ kind: IsolateSelected, structure_id: "", region: "", confidence: 1.0 })
  }
  if value.contains("显示周围") || value.contains("恢复周围") || value.contains("全部显示") || value.contains("restore") {
    return Some({ kind: RestoreContext, structure_id: "", region: "", confidence: 1.0 })
  }
  None
}

fn exact_entry(text : String, side : Side?, families : Array[String]) -> Structure? {
  let value = lower(text)
  for entry in canonical_registry {
    if value == lower(entry.structure_id) || value == lower(entry.display_name_zh) || value == lower(entry.canonical_name) { return Some(entry) }
  }
  let mut found : Structure? = None
  let mut count = 0
  for entry in canonical_registry {
    let side_matches = match side {
      Some(expected) => entry.side == expected
      None => true
    }
    if side_matches && families.contains(family_for(entry)) { found = Some(entry); count = count + 1 }
  }
  if count == 1 { found } else { None }
}

fn ranked_candidates(entries : Array[Structure], side : Side?) -> Array[String] {
  let ids : Array[String] = []
  for preferred in [Right, Left] {
    let include_side = match side {
      Some(expected) => expected == preferred
      None => true
    }
    if include_side { for entry in entries { if entry.side == preferred && ids.length() < 6 { ids.push(entry.structure_id) } } }
  }
  ids
}

fn query_result_wire(result : QueryResult) -> String {
  let classification = match result.classification {
    StructureLookup => "STRUCTURE_LOOKUP"
    DomainCommand => "DOMAIN_COMMAND"
    UnsupportedHealthQuery => "UNSUPPORTED_HEALTH_QUERY"
    UnknownQuery => "UNKNOWN"
  }
  let resolution = match result.resolution {
    Exact => "EXACT"
    Ambiguous => "AMBIGUOUS"
    NoMatch => "NO_MATCH"
  }
  let action = match result.action {
    Some(value) => value
    None => { kind: UnknownAction, structure_id: "", region: "", confidence: 0.0 }
  }
  let mut candidates = ""
  for index = 0; index < result.candidate_ids.length(); index = index + 1 {
    if index > 0 { candidates = candidates + "," }
    candidates = candidates + result.candidate_ids[index]
  }
  "ok|query-v1|\{classification}|\{resolution}|\{action_text(action.kind)}|\{action.structure_id}|\{action.region}|\{action.confidence}|\{candidates}|\{result.message_code}"
}

fn resolve_query(text : String) -> QueryResult {
  let input = lower(text)
  if input == "" { return { classification: UnknownQuery, resolution: NoMatch, action: None, candidate_ids: [], message_code: "empty" } }
  if has_health_signal(input) { return { classification: UnsupportedHealthQuery, resolution: NoMatch, action: None, candidate_ids: [], message_code: "health" } }
  match command_for(input) {
    Some(action) => return { classification: DomainCommand, resolution: Exact, action: Some(action), candidate_ids: [], message_code: if action.kind == IsolateSelected { "isolate" } else { "restore" } }
    None => ()
  }
  let side = input_side(input)
  let families = family_matches(input)
  match exact_entry(input, side, families) {
    Some(entry) => return { classification: StructureLookup, resolution: Exact, action: Some({ kind: SelectStructure, structure_id: entry.structure_id, region: "", confidence: 1.0 }), candidate_ids: [entry.structure_id], message_code: "exact" }
    None => ()
  }
  let location = input.contains("颈前外侧") || input.contains("脖子侧面") || input.contains("neck side") || input.contains("颈侧深层") || input.contains("肩颈") || input.contains("肩上") || input.contains("后颈")
  let candidates : Array[Structure] = []
  if families.length() > 0 { for entry in canonical_registry { if families.contains(family_for(entry)) { candidates.push(entry) } } }
  if candidates.length() == 0 && location { for entry in canonical_registry { let family = family_for(entry); if entry.region == "neck" && (family == "scm" || family == "scalene") { candidates.push(entry) } } }
  if candidates.length() == 0 && side is Some(_) && (input.contains("颈") || input.contains("脖") || input.contains("neck")) { for entry in canonical_registry { let family = family_for(entry); if family == "scm" || family == "scalene" { candidates.push(entry) } } }
  let ids = ranked_candidates(candidates, side)
  if ids.length() > 0 { return { classification: StructureLookup, resolution: Ambiguous, action: Some({ kind: FindStructure, structure_id: "", region: "", confidence: 0.72 }), candidate_ids: ids, message_code: "ambiguous" } }
  { classification: StructureLookup, resolution: NoMatch, action: None, candidate_ids: [], message_code: "uncovered" }
}
