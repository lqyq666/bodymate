///|
/// Renderer-independent quality tiers for the complete-body laboratory.
pub enum EnvironmentQuality {
  QualityLow
  QualityMedium
  QualityHigh
}

///|
/// Camera ranges use hysteresis so small wheel deltas do not flicker LOD.
pub enum CameraRange {
  RangeNear
  RangeMid
  RangeFar
}

///|
/// The four authored landmarks around the circular room.
pub enum LabSector {
  SectorFront
  SectorRight
  SectorBack
  SectorLeft
}

///|
/// The complete environment state. It contains no Three.js types.
pub struct EnvironmentState {
  mut phase : Double
  mut quality : EnvironmentQuality
  mut range : CameraRange
  mut sector : LabSector
  mut reduced_motion : Bool
}

///|
let environment_state : EnvironmentState = {
  phase: 0.0,
  quality: QualityHigh,
  range: RangeMid,
  sector: SectorFront,
  reduced_motion: false,
}

///|
fn environment_finite(value : Double, fallback : Double) -> Double {
  if !value.is_nan() &&
    value != @double.infinity &&
    value != @double.neg_infinity {
    value
  } else {
    fallback
  }
}

///|
fn clamp_environment(
  value : Double,
  minimum : Double,
  maximum : Double,
) -> Double {
  if value < minimum {
    minimum
  } else if value > maximum {
    maximum
  } else {
    value
  }
}

///|
fn normalize_azimuth(value : Double) -> Double {
  let two_pi = @math.PI * 2.0
  let finite = environment_finite(value, 0.0)
  let wrapped = finite % two_pi
  if wrapped < 0.0 {
    wrapped + two_pi
  } else {
    wrapped
  }
}

///|
fn environment_sector(angle : Double) -> LabSector {
  let quarter = @math.PI / 2.0
  let eighth = @math.PI / 4.0
  if angle < eighth || angle >= @math.PI * 2.0 - eighth {
    SectorFront
  } else if angle < quarter + eighth {
    SectorRight
  } else if angle < @math.PI + eighth {
    SectorBack
  } else {
    SectorLeft
  }
}

///|
fn sector_center(sector : LabSector) -> Double {
  match sector {
    SectorFront => 0.0
    SectorRight => @math.PI / 2.0
    SectorBack => @math.PI
    SectorLeft => @math.PI * 1.5
  }
}

///|
fn sector_name(sector : LabSector) -> String {
  match sector {
    SectorFront => "front"
    SectorRight => "right"
    SectorBack => "back"
    SectorLeft => "left"
  }
}

///|
fn range_name(range : CameraRange) -> String {
  match range {
    RangeNear => "near"
    RangeMid => "mid"
    RangeFar => "far"
  }
}

///|
fn quality_name(quality : EnvironmentQuality) -> String {
  match quality {
    QualityLow => "low"
    QualityMedium => "medium"
    QualityHigh => "high"
  }
}

///|
fn next_environment_range(
  current : CameraRange,
  radius : Double,
) -> CameraRange {
  match current {
    RangeNear => if radius > 2.35 { RangeMid } else { RangeNear }
    RangeMid =>
      if radius < 2.05 {
        RangeNear
      } else if radius > 3.65 {
        RangeFar
      } else {
        RangeMid
      }
    RangeFar => if radius < 3.35 { RangeMid } else { RangeFar }
  }
}

///|
fn environment_frame(
  azimuth : Double,
  elevation : Double,
  radius : Double,
) -> String {
  let angle = normalize_azimuth(azimuth)
  let pitch = clamp_environment(
    environment_finite(elevation, 0.25),
    -0.15,
    1.35,
  )
  let distance = clamp_environment(environment_finite(radius, 3.0), 0.7, 5.5)
  let sector = environment_sector(angle)
  environment_state.sector = sector
  environment_state.range = next_environment_range(
    environment_state.range,
    distance,
  )
  let center = sector_center(sector)
  let is_front = match sector {
    SectorFront => true
    _ => false
  }
  let raw_delta = if is_front && angle > @math.PI {
    angle - @math.PI * 2.0
  } else {
    angle - center
  }
  let delta = if raw_delta < 0.0 { -raw_delta } else { raw_delta }
  let sector_blend = clamp_environment(1.0 - delta / (@math.PI / 4.0), 0.0, 1.0)
  let range_factor = match environment_state.range {
    RangeNear => 1.0
    RangeMid => 0.58
    RangeFar => 0.22
  }
  let quality_factor = match environment_state.quality {
    QualityLow => 0.72
    QualityMedium => 0.88
    QualityHigh => 1.0
  }
  let near_parallax = 0.055 * range_factor
  let mid_parallax = 0.022 * range_factor
  let far_parallax = 0.006 * range_factor
  let parallax_x = @math.sin(angle) * range_factor
  let parallax_z = @math.cos(angle) * range_factor
  let rim_azimuth = normalize_azimuth(5.25 + angle * 0.32)
  let rim_intensity = (1.15 + sector_blend * 0.18) * quality_factor
  let platform_emissive = (0.42 + 0.08 * @math.sin(environment_state.phase)) *
    quality_factor
  let show_close_detail = match
    (environment_state.range, environment_state.quality) {
    (RangeNear, QualityMedium) | (RangeNear, QualityHigh) => true
    _ => false
  }
  let show_transmission = match
    (environment_state.quality, environment_state.range) {
    (QualityHigh, RangeNear) | (QualityHigh, RangeMid) => true
    _ => false
  }
  let enable_bloom = match environment_state.quality {
    QualityHigh => true
    _ => false
  }
  let detail_opacity = match environment_state.range {
    RangeNear => 1.0
    RangeMid => 0.52
    RangeFar => 0.0
  }
  "ok|environment-frame-v1|" +
  "phase=" +
  environment_state.phase.to_string() +
  ",azimuth=" +
  angle.to_string() +
  ",elevation=" +
  pitch.to_string() +
  ",radius=" +
  distance.to_string() +
  ",sector=" +
  sector_name(sector) +
  ",range=" +
  range_name(environment_state.range) +
  ",quality=" +
  quality_name(environment_state.quality) +
  ",sectorBlend=" +
  sector_blend.to_string() +
  ",nearParallax=" +
  near_parallax.to_string() +
  ",midParallax=" +
  mid_parallax.to_string() +
  ",farParallax=" +
  far_parallax.to_string() +
  ",parallaxX=" +
  parallax_x.to_string() +
  ",parallaxZ=" +
  parallax_z.to_string() +
  ",keyIntensity=" +
  (2.35 * quality_factor).to_string() +
  ",fillIntensity=" +
  (0.92 * quality_factor).to_string() +
  ",rimAzimuth=" +
  rim_azimuth.to_string() +
  ",rimIntensity=" +
  rim_intensity.to_string() +
  ",platformEmissive=" +
  platform_emissive.to_string() +
  ",detailOpacity=" +
  detail_opacity.to_string() +
  ",showCloseDetail=" +
  show_close_detail.to_string() +
  ",showTransmission=" +
  show_transmission.to_string() +
  ",enableBloom=" +
  enable_bloom.to_string() +
  ",reducedMotion=" +
  environment_state.reduced_motion.to_string()
}

///|
#export_name("bodymate_environment_reset_v1")
pub fn environment_reset_v1() -> String {
  environment_state.phase = 0.0
  environment_state.quality = QualityHigh
  environment_state.range = RangeMid
  environment_state.sector = SectorFront
  environment_state.reduced_motion = false
  environment_frame(0.0, 0.25, 3.0)
}

///|
#export_name("bodymate_environment_set_quality_v1")
pub fn environment_set_quality_v1(quality : String) -> String {
  environment_state.quality = match quality {
    "low" => QualityLow
    "medium" => QualityMedium
    _ => QualityHigh
  }
  environment_frame(
    0.0,
    0.25,
    match environment_state.range {
      RangeNear => 1.8
      RangeMid => 3.0
      RangeFar => 4.2
    },
  )
}

///|
#export_name("bodymate_environment_set_reduced_motion_v1")
pub fn environment_set_reduced_motion_v1(reduced : Bool) -> String {
  environment_state.reduced_motion = reduced
  environment_frame(
    0.0,
    0.25,
    match environment_state.range {
      RangeNear => 1.8
      RangeMid => 3.0
      RangeFar => 4.2
    },
  )
}

///|
#export_name("bodymate_environment_sample_v1")
pub fn environment_sample_v1(
  azimuth : Double,
  elevation : Double,
  radius : Double,
) -> String {
  environment_frame(azimuth, elevation, radius)
}

///|
#export_name("bodymate_environment_tick_v1")
pub fn environment_tick_v1(
  azimuth : Double,
  elevation : Double,
  radius : Double,
  delta : Double,
) -> String {
  let elapsed = clamp_environment(environment_finite(delta, 0.0), 0.0, 0.1)
  if !environment_state.reduced_motion {
    environment_state.phase = (environment_state.phase + elapsed * 0.72) %
      (@math.PI * 2.0)
  }
  environment_frame(azimuth, elevation, radius)
}

///|
#export_name("bodymate_environment_frame_v1")
pub fn environment_frame_v1() -> String {
  environment_frame(
    0.0,
    0.25,
    match environment_state.range {
      RangeNear => 1.8
      RangeMid => 3.0
      RangeFar => 4.2
    },
  )
}
