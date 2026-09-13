///| One renderer-independent parameter exposed by the complete-body motion model.
pub struct MotionParameterDefinition {
  key : String
  label : String
  unit : String
  minimum : Double
  maximum : Double
  step : Double
  initial : Double
}

///| A named parameter set owned by the motion domain.
pub struct MotionPreset {
  title : String
  values : Array[MotionParameterValue]
}

///| A normalized parameter value.
pub(all) struct MotionParameterValue {
  key : String
  value : Double
}

///| One qualitative participation group. Weight is authored visual emphasis, not EMG.
pub struct MotionParticipationGroup {
  label : String
  structure_pattern : String
  role : String
  weight : Double
}

///| One bundled evidence anchor for a qualitative participation statement.
pub struct MotionEvidence {
  url : String
  scope : String
}

///| Canonical complete-body movement definition.
pub struct MotionDefinition {
  id : String
  title : String
  aliases : Array[String]
  duration : Double
  muscles : Array[String]
  structure_pattern : String
  parameters : Array[MotionParameterDefinition]
  presets : Array[MotionPreset]
}

pub(all) enum MotionError {
  UnknownMotion(String)
  NoActiveMotion
} derive(Eq, Debug)

pub struct NormalizedParameters {
  values : Array[MotionParameterValue]
  notices : Array[String]
}

pub struct ParsedParameters {
  values : Array[MotionParameterValue]
  notices : Array[String]
  recognized : Bool
}

pub struct MotionProfile {
  groups : Array[MotionParticipationGroup]
  note : String
  evidence : Array[MotionEvidence]
}

pub struct PoseIntent {
  depth : Double
  excursion : Double
  root_y : Double
  root_z : Double
  torso_x : Double
  hand_width : Double
  elbow_angle : Double
  wrist_x : Double
  wrist_y : Double
  wrist_z : Double
  stance_width : Double
  toe_angle : Double
  ankle_x : Double
  upper_arm_x : Double
  forearm_x : Double
} derive(Eq, Debug)
