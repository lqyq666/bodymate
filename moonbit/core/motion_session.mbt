/// Single browser viewer adapter. The reusable library itself has no global session.
let motion_session : @motion.Session = @motion.Session::new()

fn session_wire(value : @motion.SessionSnapshot) -> String {
  "ok|motion-session-v1|" + value.motion_id + "|" + value.phase.to_string() + "|" + value.paused.to_string() + "|" + value.speed.to_string() + "|" + parameter_wire(value.parameters) + "|" + notices_wire(value.notices) + "|" + value.revision.to_string()
}

fn session_result_wire(value : Result[@motion.SessionSnapshot, @motion.MotionError]) -> String {
  match value { Ok(snapshot) => session_wire(snapshot); Err(error) => motion_error_wire(error) }
}

#export_name("bodymate_motion_session_reset")
pub fn motion_session_reset() -> String {
  session_wire(motion_session.reset())
}

#export_name("bodymate_motion_session_play_v1")
pub fn motion_session_play_v1(id : String, input : String, preserve_phase : Bool, initially_paused : Bool) -> String {
  session_result_wire(motion_session.play(id, parse_parameter_wire(input), preserve_phase~, initially_paused~))
}

#export_name("bodymate_motion_session_stop_v1")
pub fn motion_session_stop_v1() -> String {
  session_wire(motion_session.stop())
}

#export_name("bodymate_motion_session_set_parameters_v1")
pub fn motion_session_set_parameters_v1(input : String) -> String {
  session_result_wire(motion_session.set_parameters(parse_parameter_wire(input)))
}

#export_name("bodymate_motion_session_set_paused_v1")
pub fn motion_session_set_paused_v1(paused : Bool) -> String {
  session_wire(motion_session.set_paused(paused))
}

#export_name("bodymate_motion_session_set_speed_v1")
pub fn motion_session_set_speed_v1(speed : Double) -> String {
  session_wire(motion_session.set_speed(speed))
}

#export_name("bodymate_motion_session_seek_v1")
pub fn motion_session_seek_v1(phase : Double) -> String {
  session_wire(motion_session.seek(phase))
}

#export_name("bodymate_motion_session_tick_v1")
pub fn motion_session_tick_v1(delta : Double) -> String {
  session_wire(motion_session.tick(delta))
}

#export_name("bodymate_motion_session_snapshot_v1")
pub fn motion_session_snapshot_v1() -> String {
  session_wire(motion_session.snapshot())
}
