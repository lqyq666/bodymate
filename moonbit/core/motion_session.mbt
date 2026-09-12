///| The sole playback state for the complete-body motion experience.
pub struct MotionSession {
  mut motion_id : String
  mut phase : Double
  mut paused : Bool
  mut speed : Double
  mut parameters : Array[MotionParameterValue]
  mut notices : Array[String]
  mut revision : Int
}

let motion_session : MotionSession = {
  motion_id: "", phase: 0.0, paused: false, speed: 1.0,
  parameters: [], notices: [], revision: 0,
}

fn session_snapshot() -> String {
  "ok|motion-session-v1|" + motion_session.motion_id + "|" + motion_session.phase.to_string() + "|" + motion_session.paused.to_string() + "|" + motion_session.speed.to_string() + "|" + parameter_wire(motion_session.parameters) + "|" + notices_wire(motion_session.notices) + "|" + motion_session.revision.to_string()
}

#export_name("bodymate_motion_session_reset")
pub fn motion_session_reset() -> String {
  motion_session.motion_id = ""
  motion_session.phase = 0.0
  motion_session.paused = false
  motion_session.speed = 1.0
  motion_session.parameters = []
  motion_session.notices = []
  motion_session.revision = motion_session.revision + 1
  session_snapshot()
}

#export_name("bodymate_motion_session_play_v1")
pub fn motion_session_play_v1(id : String, input : String, preserve_phase : Bool, initially_paused : Bool) -> String {
  guard normalize_parameters(id, input) is Some((values, notices)) else { return "error|unknown_motion" }
  if !preserve_phase || motion_session.motion_id != id { motion_session.phase = 0.0 }
  motion_session.motion_id = id
  motion_session.parameters = values
  motion_session.notices = notices
  motion_session.paused = initially_paused
  motion_session.revision = motion_session.revision + 1
  session_snapshot()
}

#export_name("bodymate_motion_session_stop_v1")
pub fn motion_session_stop_v1() -> String {
  motion_session.motion_id = ""
  motion_session.phase = 0.0
  motion_session.paused = false
  motion_session.parameters = []
  motion_session.notices = []
  motion_session.revision = motion_session.revision + 1
  session_snapshot()
}

#export_name("bodymate_motion_session_set_parameters_v1")
pub fn motion_session_set_parameters_v1(input : String) -> String {
  if motion_session.motion_id == "" { return "error|no_active_motion" }
  guard normalize_parameters(motion_session.motion_id, input) is Some((values, notices)) else { return "error|unknown_motion" }
  motion_session.parameters = values
  motion_session.notices = notices
  motion_session.revision = motion_session.revision + 1
  session_snapshot()
}

#export_name("bodymate_motion_session_set_paused_v1")
pub fn motion_session_set_paused_v1(paused : Bool) -> String {
  motion_session.paused = paused
  motion_session.revision = motion_session.revision + 1
  session_snapshot()
}

#export_name("bodymate_motion_session_set_speed_v1")
pub fn motion_session_set_speed_v1(speed : Double) -> String {
  let finite = if finite_double(speed) { speed } else { 1.0 }
  motion_session.speed = if finite < 0.25 { 0.25 } else if finite > 2.0 { 2.0 } else { finite }
  motion_session.revision = motion_session.revision + 1
  session_snapshot()
}

#export_name("bodymate_motion_session_seek_v1")
pub fn motion_session_seek_v1(phase : Double) -> String {
  let finite = if finite_double(phase) { phase } else { 0.0 }
  motion_session.phase = if finite < 0.0 { 0.0 } else if finite >= 1.0 { 0.99999 } else { finite }
  motion_session.revision = motion_session.revision + 1
  session_snapshot()
}

#export_name("bodymate_motion_session_tick_v1")
pub fn motion_session_tick_v1(delta : Double) -> String {
  if motion_session.motion_id != "" && !motion_session.paused && delta > 0.0 && finite_double(delta) {
    let duration = match motion_by_id(motion_session.motion_id) { Some(motion) => motion.duration; None => 1.0 }
    motion_session.phase = (motion_session.phase + delta * motion_session.speed / duration) % 1.0
  }
  session_snapshot()
}

#export_name("bodymate_motion_session_snapshot_v1")
pub fn motion_session_snapshot_v1() -> String { session_snapshot() }
