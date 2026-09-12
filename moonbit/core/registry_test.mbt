///|
test "canonical registry export is the frozen fourteen-entry source of truth" {
  let wire = domain_registry_v1()
  assert_true(wire.contains("ok|registry-v1|"))
  assert_true(wire.contains("scm_r^bodymate.neck.sternocleidomastoid.right"))
  assert_true(wire.contains("FJ1595^FMA13408^body-5.bin^true"))
  let mut records = 0
  for _ in wire.split("~") { records = records + 1 }
  assert_eq(records, 14)
}

///|
test "registry export retains source identity and paired stable IDs" {
  let wire = domain_registry_v1()
  for required in ["FJ1570", "FJ1571", "FJ1572", "FJ1592", "FJ1593", "FJ1594", "FJ1545", "FJ1545M"] { assert_true(wire.contains(required)) }
  assert_true(wire.contains("bodymate.neck.scalene.anterior.left"))
  assert_true(wire.contains("bodymate.neck.scalene.anterior.right"))
  assert_true(!wire.contains("bodymate.unknown"))
}
