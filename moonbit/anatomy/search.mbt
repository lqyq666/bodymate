///| One clickable or searchable structure from the rig manifest.
pub(all) struct StructureEntry {
  structure_id : String
  canonical_name : String
  kind : StructureKind
} derive(Eq, Debug)

///| Display name derived from the canonical name and kind, so callers never
///| need to store a second copy of the Chinese label.
pub fn StructureEntry::display_name_zh(self : StructureEntry) -> String {
  structure_name_zh(self.canonical_name, self.kind)
}

///| Case-insensitive search over the Chinese display name and the Latin
///| canonical name. Muscles are returned before other structures; input order
///| is preserved within each group. Blank queries match nothing.
pub fn search_structures(
  entries : Array[StructureEntry],
  query : String,
) -> Array[StructureEntry] {
  let normalized = query.to_lower().trim().to_owned()
  if normalized == "" {
    return []
  }
  let muscles : Array[StructureEntry] = []
  let others : Array[StructureEntry] = []
  for entry in entries {
    let canonical = entry.canonical_name.to_lower()
    if canonical.contains(normalized) ||
      entry.display_name_zh().contains(normalized) {
      if entry.kind == Muscle {
        muscles.push(entry)
      } else {
        others.push(entry)
      }
    }
  }
  for entry in others {
    muscles.push(entry)
  }
  muscles
}
