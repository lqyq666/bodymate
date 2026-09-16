///| Structure categories carried by the pinned Human Atlas rig manifest.
pub(all) enum StructureKind {
  Muscle
  Bone
  Connective
  Other
} derive(Eq, Debug)

///| Parses the manifest `kind` field; unknown values map to `Other`.
pub fn kind_from_string(kind : String) -> StructureKind {
  match kind.to_lower().trim().to_owned() {
    "muscle" => Muscle
    "bone" => Bone
    "connective" => Connective
    _ => Other
  }
}

///| Lowercases the canonical name, drops the words "left"/"right" and collapses
///| whitespace so mirrored structures resolve to one term.
pub fn normalize_name(canonical : String) -> String {
  let words : Array[String] = []
  for part in canonical.to_lower().split(" ") {
    let word = part.to_owned()
    if word == "" || word == "left" || word == "right" {
      continue
    }
    words.push(word)
  }
  words.join(" ")
}

///| "左侧"/"右侧" when the canonical name carries a laterality word, otherwise "".
pub fn laterality_prefix(canonical : String) -> String {
  for part in canonical.to_lower().split(" ") {
    let word = part.to_owned()
    if word == "left" {
      return "左侧"
    }
    if word == "right" {
      return "右侧"
    }
  }
  ""
}

fn lookup(terms : Array[(String, String)], key : String) -> String? {
  for term in terms {
    if term.0 == key {
      return Some(term.1)
    }
  }
  None
}

///| True when the muscle term table covers this canonical muscle name.
pub fn has_chinese_muscle_name(canonical : String) -> Bool {
  lookup(muscle_term_table, normalize_name(canonical)) is Some(_)
}

///| Chinese muscle label with laterality; unknown muscles fall back to a generic label.
pub fn muscle_name_zh(canonical : String) -> String {
  let term = match lookup(muscle_term_table, normalize_name(canonical)) {
    Some(term) => term
    None => "肌肉结构"
  }
  laterality_prefix(canonical) + term
}

///| True when the matching term table covers this canonical name for its kind.
pub fn has_chinese_structure_name(canonical : String, kind : StructureKind) -> Bool {
  match kind {
    Muscle => has_chinese_muscle_name(canonical)
    _ => lookup(structure_term_table, normalize_name(canonical)) is Some(_)
  }
}

///| Chinese label for any pinned structure. Muscles use the muscle table; other
///| kinds use the structure table; unmapped names fall back to a kind-specific label.
pub fn structure_name_zh(canonical : String, kind : StructureKind) -> String {
  match kind {
    Muscle => muscle_name_zh(canonical)
    _ => {
      let term = match lookup(structure_term_table, normalize_name(canonical)) {
        Some(term) => term
        None =>
          match kind {
            Connective => "结缔结构"
            Bone => "骨骼结构"
            _ => "人体结构"
          }
      }
      laterality_prefix(canonical) + term
    }
  }
}

///| Copy of the normalized-Latin → Chinese muscle dictionary.
pub fn muscle_terms() -> Array[(String, String)] {
  muscle_term_table.copy()
}

///| Copy of the normalized-Latin → Chinese dictionary for bones, teeth, cartilage and fascia.
pub fn structure_terms() -> Array[(String, String)] {
  structure_term_table.copy()
}

///| Number of authored muscle and structure terms, for audits and baselines.
pub fn term_counts() -> (Int, Int) {
  (muscle_term_table.length(), structure_term_table.length())
}
