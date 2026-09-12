///| Stable source identity for every public Human Atlas neck/shoulder mesh.
let canonical_registry : Array[Structure] = [
  { presentation_id: "scm_r", structure_id: "bodymate.neck.sternocleidomastoid.right", display_name_zh: "右侧胸锁乳突肌", canonical_name: "right sternocleidomastoid", region: "neck", layer: Muscle, side: Right, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1595", source_concept_id: "FMA13408", source_chunk: "body-5.bin", is_default: true },
  { presentation_id: "scm_l", structure_id: "bodymate.neck.sternocleidomastoid.left", display_name_zh: "左侧胸锁乳突肌", canonical_name: "left sternocleidomastoid", region: "neck", layer: Muscle, side: Left, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1573", source_concept_id: "FMA13409", source_chunk: "body-5.bin", is_default: false },
  { presentation_id: "trapezius_r", structure_id: "bodymate.neck.trapezius.upper.right", display_name_zh: "右侧斜方肌上部", canonical_name: "descending part of right trapezius", region: "neck", layer: Muscle, side: Right, group: Shoulder, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1521", source_concept_id: "FMA33586", source_chunk: "body-4.bin", is_default: false },
  { presentation_id: "trapezius_l", structure_id: "bodymate.neck.trapezius.upper.left", display_name_zh: "左侧斜方肌上部", canonical_name: "descending part of left trapezius", region: "neck", layer: Muscle, side: Left, group: Shoulder, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1521M", source_concept_id: "FMA33587", source_chunk: "body-4.bin", is_default: false },
  { presentation_id: "levator_r", structure_id: "bodymate.neck.levator-scapulae.right", display_name_zh: "右侧肩胛提肌", canonical_name: "right levator scapulae", region: "neck", layer: Muscle, side: Right, group: Shoulder, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1532", source_concept_id: "FMA32540", source_chunk: "body-4.bin", is_default: false },
  { presentation_id: "levator_l", structure_id: "bodymate.neck.levator-scapulae.left", display_name_zh: "左侧肩胛提肌", canonical_name: "left levator scapulae", region: "neck", layer: Muscle, side: Left, group: Shoulder, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1532M", source_concept_id: "FMA32541", source_chunk: "body-4.bin", is_default: false },
  { presentation_id: "scalene_anterior_r", structure_id: "bodymate.neck.scalene.anterior.right", display_name_zh: "右侧前斜角肌", canonical_name: "right scalenus anterior", region: "neck", layer: Muscle, side: Right, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1592", source_concept_id: "FMA13392", source_chunk: "body-5.bin", is_default: false },
  { presentation_id: "scalene_anterior_l", structure_id: "bodymate.neck.scalene.anterior.left", display_name_zh: "左侧前斜角肌", canonical_name: "left scalenus anterior", region: "neck", layer: Muscle, side: Left, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1570", source_concept_id: "FMA13393", source_chunk: "body-5.bin", is_default: false },
  { presentation_id: "scalene_medius_r", structure_id: "bodymate.neck.scalene.medius.right", display_name_zh: "右侧中斜角肌", canonical_name: "right scalenus medius", region: "neck", layer: Muscle, side: Right, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1593", source_concept_id: "FMA13390", source_chunk: "body-5.bin", is_default: false },
  { presentation_id: "scalene_medius_l", structure_id: "bodymate.neck.scalene.medius.left", display_name_zh: "左侧中斜角肌", canonical_name: "left scalenus medius", region: "neck", layer: Muscle, side: Left, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1571", source_concept_id: "FMA13391", source_chunk: "body-5.bin", is_default: false },
  { presentation_id: "scalene_posterior_r", structure_id: "bodymate.neck.scalene.posterior.right", display_name_zh: "右侧后斜角肌", canonical_name: "right scalenus posterior", region: "neck", layer: Muscle, side: Right, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1594", source_concept_id: "FMA13388", source_chunk: "body-5.bin", is_default: false },
  { presentation_id: "scalene_posterior_l", structure_id: "bodymate.neck.scalene.posterior.left", display_name_zh: "左侧后斜角肌", canonical_name: "left scalenus posterior", region: "neck", layer: Muscle, side: Left, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1572", source_concept_id: "FMA13389", source_chunk: "body-5.bin", is_default: false },
  { presentation_id: "splenius_capitis_r", structure_id: "bodymate.neck.splenius.capitis.right", display_name_zh: "右侧头夹肌", canonical_name: "right splenius capitis", region: "neck", layer: Muscle, side: Right, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1545", source_concept_id: "FMA22728", source_chunk: "body-4.bin", is_default: false },
  { presentation_id: "splenius_capitis_l", structure_id: "bodymate.neck.splenius.capitis.left", display_name_zh: "左侧头夹肌", canonical_name: "left splenius capitis", region: "neck", layer: Muscle, side: Left, group: Neck, source_provider: "Human Atlas / BodyParts3D 4.0", source_mesh_id: "FJ1545M", source_concept_id: "FMA22729", source_chunk: "body-4.bin", is_default: false },
]

///| A copy prevents compatibility registrations from mutating canonical metadata.
fn canonical_entries() -> Array[Structure] {
  let copied : Array[Structure] = []
  for entry in canonical_registry { copied.push(entry) }
  copied
}

fn canonical_by_id(id : String) -> Structure? {
  for entry in canonical_registry { if entry.structure_id == id { return Some(entry) } }
  None
}

fn family_for(entry : Structure) -> String {
  if entry.structure_id.contains(".sternocleidomastoid.") { "scm" }
  else if entry.structure_id.contains(".trapezius.") { "trapezius" }
  else if entry.structure_id.contains(".levator-scapulae.") { "levator" }
  else if entry.structure_id.contains(".scalene.") { "scalene" }
  else if entry.structure_id.contains(".splenius.") { "splenius" }
  else { "other" }
}

fn side_suffix(side : Side?) -> String {
  match side {
    Some(Left) => ".left"
    Some(Right) => ".right"
    None => ""
  }
}

fn family_label(family : String, side : Side?) -> String {
  let prefix = match side { Some(Left) => "左侧"; Some(Right) => "右侧"; None => "双侧" }
  let name = if family == "scm" { "胸锁乳突肌" }
    else if family == "trapezius" { "斜方肌上部" }
    else if family == "levator" { "肩胛提肌" }
    else if family == "scalene" { "斜角肌群" }
    else if family == "splenius" { "头夹肌" }
    else { "结构" }
  prefix + name
}

///| Derives all product structure-set members from the frozen canonical registry.
fn structure_set_for(family : String, side : Side?) -> StructureSet? {
  let members : Array[HighlightedStructure] = []
  for entry in canonical_registry {
    let side_matches = match side { Some(expected) => entry.side == expected; None => true }
    if family_for(entry) == family && side_matches {
      let role = if members.length() == 0 { Focus } else if members.length() == 1 { Primary } else { Secondary }
      members.push({ structure_id: entry.structure_id, role, weight: 100 - members.length() * 10 })
    }
  }
  if members.length() == 0 { None }
  else { Some({ id: "bodymate.neck.set." + family + side_suffix(side), label: family_label(family, side), members }) }
}

fn structure_set_by_id(id : String) -> StructureSet? {
  for family in ["scm", "trapezius", "levator", "scalene", "splenius"] {
    for side in [None, Some(Right), Some(Left)] {
      match structure_set_for(family, side) {
        Some(value) => if value.id == id { return Some(value) }
        None => ()
      }
    }
  }
  None
}
