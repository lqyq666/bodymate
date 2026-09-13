///|
test "environment normalizes camera samples and identifies four sectors" {
  ignore(environment_reset_v1())
  assert_true(
    environment_sample_v1(
      @double.infinity, @double.neg_infinity, @double.infinity,
    ).contains("azimuth=0,elevation=0.25,radius=3,sector=front"),
  )
  assert_true(environment_sample_v1(0.0, 0.2, 3.0).contains("sector=front"))
  assert_true(
    environment_sample_v1(@math.PI / 2.0, 0.2, 3.0).contains("sector=right"),
  )
  assert_true(environment_sample_v1(@math.PI, 0.2, 3.0).contains("sector=back"))
  assert_true(
    environment_sample_v1(@math.PI * 1.5, 0.2, 3.0).contains("sector=left"),
  )
  assert_true(
    environment_sample_v1(@math.PI / 4.0, 0.2, 3.0).contains("sectorBlend=0"),
  )
}

///|
test "environment range hysteresis prevents threshold chatter" {
  ignore(environment_reset_v1())
  assert_true(environment_sample_v1(0.0, 0.2, 3.7).contains("range=far"))
  assert_true(environment_sample_v1(0.0, 0.2, 3.5).contains("range=far"))
  assert_true(environment_sample_v1(0.0, 0.2, 3.3).contains("range=mid"))
  assert_true(environment_sample_v1(0.0, 0.2, 2.0).contains("range=near"))
  assert_true(environment_sample_v1(0.0, 0.2, 2.2).contains("range=near"))
  assert_true(environment_sample_v1(0.0, 0.2, 2.4).contains("range=mid"))
}

///|
test "reduced motion freezes phase while quality flags stay deterministic" {
  ignore(environment_reset_v1())
  let moving = environment_tick_v1(0.3, 0.2, 3.0, 0.1)
  assert_true(!moving.contains("phase=0,"))
  ignore(environment_reset_v1())
  ignore(environment_set_reduced_motion_v1(true))
  let before = environment_tick_v1(0.3, 0.2, 3.0, 0.1)
  let after = environment_tick_v1(0.8, 0.4, 1.8, 0.1)
  assert_true(before.contains("phase=0,"))
  assert_true(after.contains("phase=0,"))
  assert_true(after.contains("sector=right") || after.contains("sector=front"))
  assert_true(environment_set_quality_v1("low").contains("quality=low"))
  assert_true(
    environment_sample_v1(0.0, 0.2, 1.8).contains(
      "showCloseDetail=false,showTransmission=false,enableBloom=false",
    ),
  )
  assert_true(environment_set_quality_v1("high").contains("quality=high"))
  assert_true(environment_sample_v1(0.0, 0.2, 4.0).contains("enableBloom=true"))
  assert_true(
    environment_sample_v1(0.0, 0.2, 1.8).contains(
      "showCloseDetail=true,showTransmission=true,enableBloom=true",
    ),
  )
}

///|
test "identical samples produce identical frames when phase is frozen" {
  ignore(environment_reset_v1())
  ignore(environment_set_reduced_motion_v1(true))
  assert_eq(
    environment_sample_v1(1.2, 0.4, 2.8),
    environment_sample_v1(1.2, 0.4, 2.8),
  )
}
