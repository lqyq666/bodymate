fn has_ascii_letter(text : String) -> Bool {
  for ch in text.iter() {
    if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') {
      return true
    }
  }
  false
}

test "normalize drops laterality words and lowercases" {
  assert_eq(normalize_name("Left inferior oblique"), "inferior oblique")
  assert_eq(
    normalize_name("Distal phalanx of left big toe"),
    "distal phalanx of big toe",
  )
  assert_eq(normalize_name("  Femur "), "femur")
  assert_eq(laterality_prefix("Navicular bone of left foot"), "左侧")
  assert_eq(laterality_prefix("Sacrum"), "")
}

test "muscle labels carry laterality and fall back to a generic label" {
  assert_eq(muscle_name_zh("Right sternocleidomastoid"), "右侧胸锁乳突肌")
  assert_eq(muscle_name_zh("Left gluteus maximus"), "左侧臀大肌")
  assert_eq(muscle_name_zh("Long head of right biceps brachii"), "右侧肱二头肌长头")
  assert_eq(muscle_name_zh("Diaphragm"), "膈肌")
  assert_eq(muscle_name_zh("Left mystery muscle"), "左侧肌肉结构")
  assert_true(has_chinese_muscle_name("Left inferior oblique"))
  assert_false(has_chinese_muscle_name("Left mystery muscle"))
}

test "bones, teeth, cartilage and fascia resolve to concise Chinese" {
  assert_eq(structure_name_zh("Left femur", Bone), "左侧股骨")
  assert_eq(structure_name_zh("Gingiva of upper jaw", Bone), "上颌牙龈")
  assert_eq(structure_name_zh("Distal phalanx of right thumb", Bone), "右侧拇指远节指骨")
  assert_eq(
    structure_name_zh("Intervertebral disk of fifth lumbar vertebra", Bone),
    "第五腰椎椎间盘",
  )
  assert_eq(structure_name_zh("lower first secondary molar tooth", Bone), "下颌第一磨牙")
  assert_eq(structure_name_zh("Right iliotibial tract", Connective), "右侧髂胫束")
  assert_eq(structure_name_zh("Unmapped future bone", Bone), "骨骼结构")
  assert_eq(structure_name_zh("Unmapped future part", Connective), "结缔结构")
  assert_eq(structure_name_zh("Unmapped thing", Other), "人体结构")
  assert_eq(
    structure_name_zh("Left gluteus maximus", Muscle),
    muscle_name_zh("Left gluteus maximus"),
  )
  assert_true(has_chinese_structure_name("Sacrum", Bone))
  assert_false(has_chinese_structure_name("Unmapped future bone", Bone))
  assert_eq(kind_from_string(" Bone "), Bone)
  assert_eq(kind_from_string("connective"), Connective)
  assert_eq(kind_from_string("tendon"), Other)
}

test "search matches Chinese or Latin names and ranks muscles first" {
  let entries : Array[StructureEntry] = [
    { structure_id: "sacrum", canonical_name: "Sacrum", kind: Bone },
    { structure_id: "psoas-l", canonical_name: "Left psoas major", kind: Muscle },
    { structure_id: "sternum", canonical_name: "Body of sternum", kind: Bone },
    { structure_id: "psoas-r", canonical_name: "Right psoas major", kind: Muscle },
    {
      structure_id: "pec",
      canonical_name: "Left clavicular part of pectoralis major",
      kind: Muscle,
    },
  ]
  let psoas = search_structures(entries, "腰大肌")
  assert_eq(psoas.length(), 2)
  assert_eq(psoas[0].structure_id, "psoas-l")
  assert_eq(psoas[1].display_name_zh(), "右侧腰大肌")
  let sacrum = search_structures(entries, "骶骨")
  assert_eq(sacrum.length(), 1)
  assert_eq(sacrum[0].display_name_zh(), "骶骨")
  let chest = search_structures(entries, "胸")
  assert_eq(chest.length(), 2)
  assert_eq(chest[0].structure_id, "pec")
  assert_eq(chest[1].structure_id, "sternum")
  assert_eq(search_structures(entries, "PSOAS").length(), 2)
  assert_eq(search_structures(entries, "   ").length(), 0)
}

test "term tables are pure Chinese with unique keys" {
  let (muscles, structures) = term_counts()
  assert_true(muscles >= 200)
  assert_true(structures >= 170)
  let seen : Array[String] = []
  for term in muscle_terms() {
    assert_false(seen.contains(term.0), msg="duplicate muscle key " + term.0)
    seen.push(term.0)
    assert_false(has_ascii_letter(term.1), msg="latin residue in " + term.1)
    assert_eq(term.0, normalize_name(term.0))
  }
  let seen_structures : Array[String] = []
  for term in structure_terms() {
    assert_false(seen_structures.contains(term.0), msg="duplicate structure key " + term.0)
    seen_structures.push(term.0)
    assert_false(has_ascii_letter(term.1), msg="latin residue in " + term.1)
    assert_eq(term.0, normalize_name(term.0))
  }
}
