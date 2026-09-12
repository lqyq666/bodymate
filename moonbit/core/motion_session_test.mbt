test "motion session owns playback transitions" {
  ignore(motion_session_reset())
  let played = motion_session_play_v1("squat", "stanceWidth=1.5", false, false)
  assert_true(played.contains("|squat|0|false|1|stanceWidth=1.5"))
  let ticked = motion_session_tick_v1(2.2)
  assert_true(ticked.contains("|squat|0.5|false|1|"))
  assert_true(motion_session_set_paused_v1(true).contains("|squat|0.5|true|"))
  assert_true(motion_session_tick_v1(2.2).contains("|squat|0.5|true|"))
  assert_true(motion_session_set_speed_v1(8.0).contains("|true|2|"))
  assert_true(motion_session_seek_v1(-1.0).contains("|squat|0|true|2|"))
  assert_true(motion_session_stop_v1().contains("motion-session-v1||0|false|2||"))
}
