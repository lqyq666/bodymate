///|
test "selection synchronizes region layer and revision" {
  ignore(clear())
  assert_eq(register("scm_r", "右侧胸锁乳突肌", "neck", "muscle", true), "ok|registered")
  assert_eq(register("fascia_neck", "颈肩筋膜", "neck", "fascia", false), "ok|registered")
  assert_eq(select_region("neck"), "ok|neck|scm_r|muscle|false|false|1")
  assert_eq(isolate_selected(), "ok|neck|scm_r|muscle|true|false|2")
  assert_eq(restore_context(), "ok|neck|scm_r|muscle|false|false|3")
  assert_eq(set_layer("fascia"), "ok|neck|fascia_neck|fascia|false|false|4")
}

///|
test "invalid commands keep the old snapshot" {
  ignore(clear())
  assert_eq(register("pec_r", "右侧胸大肌", "chest", "muscle", true), "ok|registered")
  let before = select_region("chest")
  assert_eq(select_structure("missing"), "error|unknown_structure")
  assert_eq(set_layer("region"), "error|unknown_layer")
  assert_eq(snapshot(), before)
  assert_eq(register("pec_r", "重复", "chest", "muscle", false), "error|duplicate_id")
}
