/// Detached value snapshot: changing its arrays never changes a running session.
pub struct SessionSnapshot {
  motion_id : String
  phase : Double
  paused : Bool
  speed : Double
  parameters : Array[MotionParameterValue]
  notices : Array[String]
  revision : Int
}

/// Independent playback state. Construct one per consumer or view.
pub struct Session {
  priv mut motion_id : String
  priv mut phase : Double
  priv mut paused : Bool
  priv mut speed : Double
  priv mut parameters : Array[MotionParameterValue]
  priv mut notices : Array[String]
  priv mut revision : Int
}

pub fn Session::new() -> Session {
  { motion_id: "", phase: 0.0, paused: false, speed: 1.0,
    parameters: [], notices: [], revision: 0 }
}

pub fn Session::snapshot(self : Session) -> SessionSnapshot {
  { motion_id: self.motion_id, phase: self.phase, paused: self.paused, speed: self.speed,
    parameters: self.parameters.copy(), notices: self.notices.copy(), revision: self.revision }
}

pub fn Session::reset(self : Session) -> SessionSnapshot {
  self.motion_id = ""
  self.phase = 0.0
  self.paused = false
  self.speed = 1.0
  self.parameters = []
  self.notices = []
  self.revision = self.revision + 1
  self.snapshot()
}

pub fn Session::play(self : Session, id : String, input : Array[MotionParameterValue], preserve_phase? : Bool = false, initially_paused? : Bool = false) -> Result[SessionSnapshot, MotionError] {
  guard normalize(id, input) is Ok(normalized) else { return Err(UnknownMotion(id)) }
  if !preserve_phase || self.motion_id != id { self.phase = 0.0 }
  self.motion_id = id
  self.parameters = normalized.values
  self.notices = normalized.notices
  self.paused = initially_paused
  self.revision = self.revision + 1
  Ok(self.snapshot())
}

pub fn Session::stop(self : Session) -> SessionSnapshot {
  self.motion_id = ""
  self.phase = 0.0
  self.paused = false
  self.parameters = []
  self.notices = []
  self.revision = self.revision + 1
  self.snapshot()
}

pub fn Session::set_parameters(self : Session, input : Array[MotionParameterValue]) -> Result[SessionSnapshot, MotionError] {
  if self.motion_id == "" { return Err(NoActiveMotion) }
  guard normalize(self.motion_id, input) is Ok(normalized) else { return Err(UnknownMotion(self.motion_id)) }
  self.parameters = normalized.values
  self.notices = normalized.notices
  self.revision = self.revision + 1
  Ok(self.snapshot())
}

pub fn Session::set_paused(self : Session, paused : Bool) -> SessionSnapshot {
  self.paused = paused
  self.revision = self.revision + 1
  self.snapshot()
}

pub fn Session::set_speed(self : Session, speed : Double) -> SessionSnapshot {
  let finite = if finite_double(speed) { speed } else { 1.0 }
  self.speed = if finite < 0.25 { 0.25 } else if finite > 2.0 { 2.0 } else { finite }
  self.revision = self.revision + 1
  self.snapshot()
}

pub fn Session::seek(self : Session, phase : Double) -> SessionSnapshot {
  let finite = if finite_double(phase) { phase } else { 0.0 }
  self.phase = if finite < 0.0 { 0.0 } else if finite >= 1.0 { 0.99999 } else { finite }
  self.revision = self.revision + 1
  self.snapshot()
}

pub fn Session::tick(self : Session, delta : Double) -> SessionSnapshot {
  if self.motion_id != "" && !self.paused && delta > 0.0 && finite_double(delta) {
    let duration = match definition(self.motion_id) { Some(motion) => motion.duration; None => 1.0 }
    let cycle = duration / self.speed
    self.phase = (self.phase + (delta % cycle) / cycle) % 1.0
  }
  self.snapshot()
}
