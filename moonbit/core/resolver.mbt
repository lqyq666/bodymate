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
    StructureSetLookup => "STRUCTURE_SET_LOOKUP"
    MovementLookup => "MOVEMENT_LOOKUP"
    MovementComparison => "MOVEMENT_COMPARISON"
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

fn classification_text(classification : QueryClassification) -> String {
  match classification { StructureLookup => "STRUCTURE_LOOKUP"; StructureSetLookup => "STRUCTURE_SET_LOOKUP"; MovementLookup => "MOVEMENT_LOOKUP"; MovementComparison => "MOVEMENT_COMPARISON"; DomainCommand => "DOMAIN_COMMAND"; UnsupportedHealthQuery => "UNSUPPORTED_HEALTH_QUERY"; UnknownQuery => "UNKNOWN" }
}

fn resolution_text(resolution : Resolution) -> String {
  match resolution { Exact => "EXACT"; Ambiguous => "AMBIGUOUS"; NoMatch => "NO_MATCH" }
}

fn ids_wire(ids : Array[String]) -> String {
  let mut output = ""
  for index = 0; index < ids.length(); index = index + 1 {
    if index > 0 { output = output + "," }
    output = output + ids[index]
  }
  output
}

fn structure_set_wire(structure_set : StructureSet) -> String {
  let ids : Array[String] = []
  for item in structure_set.members { ids.push(item.structure_id) }
  ids_wire(ids)
}

fn query_result_wire_v2(result : QueryResult, structure_set : StructureSet?) -> String {
  let action = match result.action { Some(value) => value; None => { kind: UnknownAction, structure_id: "", region: "", confidence: 0.0 } }
  let set_id = match structure_set { Some(value) => value.id; None => "" }
  let set_label = match structure_set { Some(value) => value.label; None => "" }
  let members = match structure_set { Some(value) => structure_set_wire(value); None => ids_wire(result.candidate_ids) }
  "ok|query-v2|\{classification_text(result.classification)}|\{resolution_text(result.resolution)}|\{action_text(action.kind)}|\{action.structure_id}|\{set_id}|\{set_label}|\{action.region}|\{action.confidence}|\{members}|\{result.message_code}"
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

///| V2 resolves family-level anatomy language to a domain-derived structure set.
fn resolve_query_v2(text : String) -> String {
  let input = lower(text)
  if input == "" { return query_result_wire_v2({ classification: UnknownQuery, resolution: NoMatch, action: None, candidate_ids: [], message_code: "empty" }, None) }
  if has_health_signal(input) { return query_result_wire_v2({ classification: UnsupportedHealthQuery, resolution: NoMatch, action: None, candidate_ids: [], message_code: "health" }, None) }
  match command_for(input) {
    Some(action) => return query_result_wire_v2({ classification: DomainCommand, resolution: Exact, action: Some(action), candidate_ids: [], message_code: if action.kind == IsolateSelected { "isolate" } else { "restore" } }, None)
    None => ()
  }
  let side = input_side(input)
  let families = family_matches(input)
  match exact_entry(input, side, families) {
    Some(entry) => return query_result_wire_v2({ classification: StructureLookup, resolution: Exact, action: Some({ kind: SelectStructure, structure_id: entry.structure_id, region: "", confidence: 1.0 }), candidate_ids: [entry.structure_id], message_code: "exact" }, None)
    None => ()
  }
  if families.length() == 1 {
    match structure_set_for(families[0], side) {
      Some(set) => return query_result_wire_v2({ classification: StructureLookup, resolution: Exact, action: Some({ kind: HighlightStructureSet, structure_id: set.id, region: "", confidence: 1.0 }), candidate_ids: [], message_code: "structure_set" }, Some(set))
      None => ()
    }
  }
  query_result_wire_v2(resolve_query(input), None)
}

fn action_for_wire(result : QueryResult) -> DomainAction {
  match result.action { Some(value) => value; None => { kind: UnknownAction, structure_id: "", region: "", confidence: 0.0 } }
}

fn highlighted_members_wire(set : StructureSet?) -> String {
  match set {
    None => ""
    Some(value) => {
      let mut output = ""
      for index = 0; index < value.members.length(); index = index + 1 {
        let item = value.members[index]
        let role = match item.role { Focus => "focus"; Primary => "primary"; Secondary => "secondary"; Context => "context" }
        if index > 0 { output = output + "~" }
        output = output + "\{item.structure_id}^\{role}^\{item.weight}"
      }
      output
    }
  }
}

fn mapped_members_wire(mapping : MovementMapping) -> String {
  let mut output = ""
  for index = 0; index < mapping.mappings.length(); index = index + 1 {
    let item = mapping.mappings[index]
    let mut evidence_ids = ""
    for evidence_index = 0; evidence_index < item.evidence_ids.length(); evidence_index = evidence_index + 1 {
      if evidence_index > 0 { evidence_ids = evidence_ids + "," }
      evidence_ids = evidence_ids + item.evidence_ids[evidence_index]
    }
    if index > 0 { output = output + "~" }
    output = output + "\{item.structure_id}^\{participation_role_text(item.role)}^\{evidence_ids}"
  }
  output
}

fn comparison_movements_for_query(input : String) -> Array[Movement] {
  let found : Array[Movement] = []
  let found_ids : Array[String] = []
  for movement in movement_catalog {
    for query_alias in movement.aliases {
      if input.contains(query_alias.to_lower()) && !found_ids.contains(movement.id) { found.push(movement); found_ids.push(movement.id) }
    }
  }
  found
}

fn comparison_ids_for_query(input : String) -> Array[String] {
  for separator in ["和", "与", " and "] {
    let parts : Array[String] = []
    for part in input.split(separator) { parts.push(part.trim().to_owned()) }
    if parts.length() >= 2 {
      match movement_for_query(parts[0]) {
        Some(left) => match movement_for_query(parts[1]) { Some(right) => if left.id != right.id { return [left.id, right.id] }; None => () }
        None => ()
      }
    }
  }
  let movements = comparison_movements_for_query(input)
  if movements.length() == 2 { [movements[0].id, movements[1].id] } else { [] }
}

fn comparison_intent(input : String) -> Bool {
  input.contains("比较") || input.contains("共同") || input.contains("区别") || input.contains("差异") || input.contains("compare") || input.contains("common") || input.contains("difference")
}

///| V3 wire carries either a structure result or a movement mapping without JS inference.
fn query_result_wire_v3(result : QueryResult, label : String, canonical_name : String, coverage_note : String, members : String) -> String {
  let action = action_for_wire(result)
  "ok|query-v3|\{classification_text(result.classification)}|\{resolution_text(result.resolution)}|\{action_text(action.kind)}|\{action.structure_id}|\{label}|\{action.region}|\{action.confidence}|\{result.message_code}|\{canonical_name}|\{coverage_note}|\{members}"
}

///| V3 extends the resolver with evidence-backed movement lookup and preserves health priority.
fn resolve_query_v3(text : String) -> String {
  let input = lower(text)
  if input == "" { return query_result_wire_v3({ classification: UnknownQuery, resolution: NoMatch, action: None, candidate_ids: [], message_code: "empty" }, "", "", "", "") }
  if has_health_signal(input) { return query_result_wire_v3({ classification: UnsupportedHealthQuery, resolution: NoMatch, action: None, candidate_ids: [], message_code: "health" }, "", "", "", "") }
  match command_for(input) {
    Some(action) => return query_result_wire_v3({ classification: DomainCommand, resolution: Exact, action: Some(action), candidate_ids: [], message_code: if action.kind == IsolateSelected { "isolate" } else { "restore" } }, "", "", "", "")
    None => ()
  }
  let comparison_ids = comparison_ids_for_query(input)
  if comparison_intent(input) && comparison_ids.length() == 2 {
    match movement_by_id(comparison_ids[0]) {
      Some(left) => match movement_by_id(comparison_ids[1]) {
        Some(right) => {
          let pair = left.id + "," + right.id
          return query_result_wire_v3({ classification: MovementComparison, resolution: Exact, action: Some({ kind: ShowMovementComparison, structure_id: pair, region: "", confidence: 1.0 }), candidate_ids: [], message_code: "comparison" }, left.display_name_zh + " vs " + right.display_name_zh, "", "当前模型覆盖范围内的比较结果，不代表完整人体肌群。", "")
        }
        None => ()
      }
      None => ()
    }
  }
  if valid_movement_catalog() {
    match movement_for_query(input) {
      Some(movement) => match movement_mapping_by_id(movement.id) {
        Some(mapping) => return query_result_wire_v3({ classification: MovementLookup, resolution: Exact, action: Some({ kind: ShowMovementMapping, structure_id: movement.id, region: "", confidence: 1.0 }), candidate_ids: [], message_code: "movement" }, movement.display_name_zh, movement.canonical_name, movement.coverage_note, mapped_members_wire(mapping))
        None => ()
      }
      None => ()
    }
  }
  let side = input_side(input)
  let families = family_matches(input)
  match exact_entry(input, side, families) {
    Some(entry) => return query_result_wire_v3({ classification: StructureLookup, resolution: Exact, action: Some({ kind: SelectStructure, structure_id: entry.structure_id, region: "", confidence: 1.0 }), candidate_ids: [entry.structure_id], message_code: "exact" }, "", "", "", "\{entry.structure_id}^^")
    None => ()
  }
  if families.length() == 1 {
    match structure_set_for(families[0], side) {
      Some(set) => return query_result_wire_v3({ classification: StructureSetLookup, resolution: Exact, action: Some({ kind: HighlightStructureSet, structure_id: set.id, region: "", confidence: 1.0 }), candidate_ids: [], message_code: "structure_set" }, set.label, "", "", highlighted_members_wire(Some(set)))
      None => ()
    }
  }
  let fallback = resolve_query(input)
  let members = ids_wire(fallback.candidate_ids)
  query_result_wire_v3(fallback, "", "", "", members)
}
