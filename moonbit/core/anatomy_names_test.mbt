test "anatomy name wire carries laterality and kind fallbacks" {
  assert_eq(anatomy_name_v1("Left femur", "bone"), "ok|anatomy-name-v1|左侧股骨")
  assert_eq(
    anatomy_name_v1("Right sternocleidomastoid", "muscle"),
    "ok|anatomy-name-v1|右侧胸锁乳突肌",
  )
  assert_eq(
    anatomy_name_v1("Right iliotibial tract", "connective"),
    "ok|anatomy-name-v1|右侧髂胫束",
  )
  assert_eq(anatomy_name_v1("Unmapped future bone", "bone"), "ok|anatomy-name-v1|骨骼结构")
  assert_eq(anatomy_has_name_v1("Sacrum", "bone"), "ok|anatomy-has-name-v1|true")
  assert_eq(
    anatomy_has_name_v1("Unmapped future bone", "bone"),
    "ok|anatomy-has-name-v1|false",
  )
}

test "anatomy search wire returns ids with muscles first and ignores malformed records" {
  let entries = "sacrum^bone^Sacrum~psoas-l^muscle^Left psoas major~broken~sternum^bone^Body of sternum~pec^muscle^Left clavicular part of pectoralis major"
  assert_eq(anatomy_search_v1(entries, "腰大肌"), "ok|anatomy-search-v1|psoas-l")
  assert_eq(anatomy_search_v1(entries, "胸"), "ok|anatomy-search-v1|pec~sternum")
  assert_eq(anatomy_search_v1(entries, "sacrum"), "ok|anatomy-search-v1|sacrum")
  assert_eq(anatomy_search_v1(entries, "   "), "ok|anatomy-search-v1|")
  assert_eq(anatomy_search_v1("", "骶骨"), "ok|anatomy-search-v1|")
}
