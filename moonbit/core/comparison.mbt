///| Pure canonical-ID set algebra, ordered by the left input then unseen right input.
fn unique_ids(ids : Array[String]) -> Array[String] {
  let supplied : Array[String] = []
  for id in ids { if canonical_by_id(id) is Some(_) && !supplied.contains(id) { supplied.push(id) } }
  let output : Array[String] = []
  for entry in canonical_registry { if supplied.contains(entry.structure_id) { output.push(entry.structure_id) } }
  output
}

pub fn set_union(left : Array[String], right : Array[String]) -> Array[String] {
  let combined : Array[String] = []
  for id in left { combined.push(id) }
  for id in right { combined.push(id) }
  unique_ids(combined)
}

pub fn set_intersection(left : Array[String], right : Array[String]) -> Array[String] {
  let output : Array[String] = []
  for id in unique_ids(left) { if unique_ids(right).contains(id) { output.push(id) } }
  output
}

pub fn set_difference(left : Array[String], right : Array[String]) -> Array[String] {
  let output : Array[String] = []
  let right_unique = unique_ids(right)
  for id in unique_ids(left) { if !right_unique.contains(id) { output.push(id) } }
  output
}

fn mapping_item(mapping : MovementMapping, id : String) -> MovementStructureMapping? {
  for item in mapping.mappings { if item.structure_id == id { return Some(item) } }
  None
}

fn mapping_ids(mapping : MovementMapping) -> Array[String] {
  let ids : Array[String] = []
  for item in mapping.mappings { ids.push(item.structure_id) }
  unique_ids(ids)
}

fn compared(mapping_left : MovementMapping, mapping_right : MovementMapping, id : String, bucket : ComparisonBucket) -> ComparedStructure {
  let left = mapping_item(mapping_left, id)
  let right = mapping_item(mapping_right, id)
  { structure_id: id, bucket,
    left_role: match left { Some(value) => Some(value.role); None => None },
    right_role: match right { Some(value) => Some(value.role); None => None },
    left_evidence_ids: match left { Some(value) => value.evidence_ids; None => [] },
    right_evidence_ids: match right { Some(value) => value.evidence_ids; None => [] } }
}

///| Builds a comparison only from validated Stage 5B movement mappings.
pub fn movement_comparison_for(left_id : String, right_id : String) -> MovementComparison? {
  if !valid_movement_catalog() { return None }
  match movement_mapping_by_id(left_id) {
    None => None
    Some(left) => match movement_mapping_by_id(right_id) {
      None => None
      Some(right) => {
        let left_ids = mapping_ids(left)
        let right_ids = mapping_ids(right)
        let overlap : Array[ComparedStructure] = []
        let only_left : Array[ComparedStructure] = []
        let only_right : Array[ComparedStructure] = []
        for id in set_intersection(left_ids, right_ids) { overlap.push(compared(left, right, id, Overlap)) }
        for id in set_difference(left_ids, right_ids) { only_left.push(compared(left, right, id, OnlyLeft)) }
        for id in set_difference(right_ids, left_ids) { only_right.push(compared(left, right, id, OnlyRight)) }
        Some({ left_movement_id: left_id, right_movement_id: right_id, overlap, only_left, only_right, union_structure_ids: set_union(left_ids, right_ids) })
      }
    }
  }
}
