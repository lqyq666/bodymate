///| Bundled evidence references for the production movement catalog.
let evidence_catalog : Array[EvidenceRef] = [
  { id: "ev.scapula.elevation", source_title: "NCBI Bookshelf / StatPearls: Anatomy, Thorax, Scapula", source_url: "https://www.ncbi.nlm.nih.gov/books/NBK538319/", note: "Identifies upper trapezius and levator scapulae for scapular elevation." },
  { id: "ev.neck.rotation-flexion", source_title: "OpenStax Anatomy and Physiology 2e: 11.3 Axial Muscles of the Head, Neck, and Back", source_url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back", note: "Describes opposite-side SCM rotation, bilateral SCM flexion, and same-side splenius capitis rotation." },
]

///| MoonBit is the only canonical catalog owner for supported movements.
let movement_catalog : Array[Movement] = [
  { id: "shoulder_girdle_elevation", display_name_zh: "肩胛带上提 / 耸肩", canonical_name: "Shoulder Girdle Elevation", aliases: ["耸肩", "shrug", "肩膀往上提"], movement_group: ShoulderGirdle, coverage_note: "当前模型覆盖上斜方肌与肩胛提肌；不代表全部参与结构。" },
  { id: "cervical_rotation_right", display_name_zh: "颈部向右旋转", canonical_name: "Right Cervical Rotation", aliases: ["向右转头", "头转右边", "rotate neck right"], movement_group: NeckMovement, coverage_note: "当前模型仅覆盖有证据支持的胸锁乳突肌与头夹肌；不代表完整旋转肌群。" },
  { id: "cervical_rotation_left", display_name_zh: "颈部向左旋转", canonical_name: "Left Cervical Rotation", aliases: ["向左转头", "头转左边", "rotate neck left"], movement_group: NeckMovement, coverage_note: "当前模型仅覆盖有证据支持的胸锁乳突肌与头夹肌；不代表完整旋转肌群。" },
  { id: "cervical_flexion", display_name_zh: "颈部屈曲 / 低头", canonical_name: "Cervical Flexion", aliases: ["低头", "neck flexion"], movement_group: NeckMovement, coverage_note: "当前模型仅覆盖双侧胸锁乳突肌；不代表全部颈部屈肌。" },
]

let movement_mappings : Array[MovementMapping] = [
  { movement_id: "shoulder_girdle_elevation", mappings: [
    { structure_id: "bodymate.neck.trapezius.upper.right", role: MainContributor, evidence_ids: ["ev.scapula.elevation"] },
    { structure_id: "bodymate.neck.trapezius.upper.left", role: MainContributor, evidence_ids: ["ev.scapula.elevation"] },
    { structure_id: "bodymate.neck.levator-scapulae.right", role: Contributor, evidence_ids: ["ev.scapula.elevation"] },
    { structure_id: "bodymate.neck.levator-scapulae.left", role: Contributor, evidence_ids: ["ev.scapula.elevation"] },
  ] },
  { movement_id: "cervical_rotation_right", mappings: [
    { structure_id: "bodymate.neck.sternocleidomastoid.left", role: MainContributor, evidence_ids: ["ev.neck.rotation-flexion"] },
    { structure_id: "bodymate.neck.splenius.capitis.right", role: Contributor, evidence_ids: ["ev.neck.rotation-flexion"] },
  ] },
  { movement_id: "cervical_rotation_left", mappings: [
    { structure_id: "bodymate.neck.sternocleidomastoid.right", role: MainContributor, evidence_ids: ["ev.neck.rotation-flexion"] },
    { structure_id: "bodymate.neck.splenius.capitis.left", role: Contributor, evidence_ids: ["ev.neck.rotation-flexion"] },
  ] },
  { movement_id: "cervical_flexion", mappings: [
    { structure_id: "bodymate.neck.sternocleidomastoid.right", role: MainContributor, evidence_ids: ["ev.neck.rotation-flexion"] },
    { structure_id: "bodymate.neck.sternocleidomastoid.left", role: MainContributor, evidence_ids: ["ev.neck.rotation-flexion"] },
  ] },
]

fn evidence_by_id(id : String) -> EvidenceRef? {
  for evidence in evidence_catalog { if evidence.id == id { return Some(evidence) } }
  None
}

fn movement_by_id(id : String) -> Movement? {
  for movement in movement_catalog { if movement.id == id { return Some(movement) } }
  None
}

fn movement_mapping_by_id(id : String) -> MovementMapping? {
  for mapping in movement_mappings { if mapping.movement_id == id { return Some(mapping) } }
  None
}

fn movement_for_query(text : String) -> Movement? {
  let input = text.to_lower().trim()
  for movement in movement_catalog {
    for query_alias in movement.aliases {
      if input.contains(query_alias.to_lower()) { return Some(movement) }
    }
  }
  None
}

fn participation_role_text(role : ParticipationRole) -> String {
  match role { MainContributor => "main_contributor"; Contributor => "contributor" }
}

///| Validates an individual evidence-backed movement mapping before it can drive state.
fn valid_movement_mapping(mapping : MovementMapping) -> Bool {
  if mapping.mappings.length() == 0 || movement_by_id(mapping.movement_id) is None { return false }
  let ids : Array[String] = []
  for item in mapping.mappings {
    if item.structure_id == "" || ids.contains(item.structure_id) || canonical_by_id(item.structure_id) is None || item.evidence_ids.length() == 0 { return false }
    for evidence_id in item.evidence_ids { if evidence_by_id(evidence_id) is None { return false } }
    ids.push(item.structure_id)
  }
  true
}

///| Checks candidate mapping members against the same canonical catalog rules.
pub fn movement_mapping_members_are_valid(movement_id : String, structure_ids : Array[String], evidence_ids : Array[String]) -> Bool {
  let mappings : Array[MovementStructureMapping] = []
  for structure_id in structure_ids {
    mappings.push({ structure_id, role: MainContributor, evidence_ids })
  }
  valid_movement_mapping({ movement_id, mappings })
}

///| Validates unique movement IDs and aliases plus all mapping/evidence links.
fn valid_movement_catalog() -> Bool {
  let movement_ids : Array[String] = []
  let aliases : Array[String] = []
  for movement in movement_catalog {
    if movement.id == "" || movement_ids.contains(movement.id) || movement.aliases.length() == 0 { return false }
    movement_ids.push(movement.id)
    for query_alias in movement.aliases {
      let normalized = query_alias.to_lower().trim().to_owned()
      if normalized == "" || aliases.contains(normalized) { return false }
      aliases.push(normalized)
    }
  }
  if movement_mappings.length() != movement_catalog.length() { return false }
  let mapping_ids : Array[String] = []
  for mapping in movement_mappings {
    if mapping_ids.contains(mapping.movement_id) || !valid_movement_mapping(mapping) { return false }
    mapping_ids.push(mapping.movement_id)
  }
  true
}

fn movement_focus_id(mapping : MovementMapping, current_selected : String) -> String? {
  for item in mapping.mappings { if item.structure_id == current_selected { return Some(item.structure_id) } }
  for item in mapping.mappings { if item.role == MainContributor { return Some(item.structure_id) } }
  match mapping.mappings[0] { value => Some(value.structure_id) }
}

///| Derives the existing StructureSet primitive from an evidence-backed movement map.
fn movement_structure_set_for(id : String, current_selected : String) -> StructureSet? {
  match movement_by_id(id) {
    None => None
    Some(movement) => match movement_mapping_by_id(id) {
      None => None
      Some(mapping) => if !valid_movement_mapping(mapping) { None } else {
        match movement_focus_id(mapping, current_selected) {
          None => None
          Some(focus_id) => {
            let members : Array[HighlightedStructure] = []
            for item in mapping.mappings {
              if item.structure_id == focus_id { members.push({ structure_id: item.structure_id, role: Focus, weight: 100 }) }
            }
            for item in mapping.mappings {
              if item.structure_id != focus_id {
                let role = match item.role { MainContributor => Primary; Contributor => Secondary }
                let weight = match item.role { MainContributor => 80; Contributor => 60 }
                members.push({ structure_id: item.structure_id, role, weight })
              }
            }
            Some({ id: "bodymate.movement.set." + movement.id, label: movement.display_name_zh, members })
          }
        }
      }
    }
  }
}
