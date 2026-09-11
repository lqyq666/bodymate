///|
priv struct Entry {
  id : String
  label : String
  region : String
  layer : String
  is_default : Bool
}

///|
priv struct CoreState {
  mut entries : Array[Entry]
  mut region : String
  mut selected : String
  mut layer : String
  mut isolated : Bool
  mut overview : Bool
  mut revision : Int
}

///|
let state : CoreState = {
  entries: [],
  region: "",
  selected: "",
  layer: "muscle",
  isolated: false,
  overview: true,
  revision: 0,
}

///|
fn fail(code : String) -> String {
  "error|\{code}"
}

///|
fn bump() -> Unit {
  state.revision = state.revision + 1
}

///|
fn find(id : String) -> Entry? {
  for entry in state.entries {
    if entry.id == id {
      return Some(entry)
    }
  }
  None
}

///|
fn first_in(region : String, layer : String) -> Entry? {
  let mut fallback : Entry? = None
  for entry in state.entries {
    if entry.region == region && entry.layer == layer {
      if entry.is_default {
        return Some(entry)
      }
      if fallback is None {
        fallback = Some(entry)
      }
    }
  }
  fallback
}

///|
fn select(entry : Entry) -> String {
  state.region = entry.region
  state.selected = entry.id
  state.layer = entry.layer
  state.isolated = false
  state.overview = false
  bump()
  snapshot()
}

///|
#export_name("bodymate_core_clear")
pub fn clear() -> String {
  state.entries = []
  state.region = ""
  state.selected = ""
  state.layer = "muscle"
  state.isolated = false
  state.overview = true
  state.revision = 0
  snapshot()
}

///|
#export_name("bodymate_core_register")
pub fn register(
  id : String,
  label : String,
  region : String,
  layer : String,
  is_default : Bool,
) -> String {
  if id == "" || label == "" || region == "" || (layer != "muscle" && layer != "fascia") {
    return fail("invalid_registration")
  }
  if find(id) is Some(_) {
    return fail("duplicate_id")
  }
  state.entries.push({ id, label, region, layer, is_default })
  "ok|registered"
}

///|
#export_name("bodymate_core_select_region")
pub fn select_region(region : String) -> String {
  match first_in(region, state.layer) {
    Some(entry) => select(entry)
    None => fail("uncovered_region_or_layer")
  }
}

///| Select a region in a requested layer without exposing an intermediate state.
#export_name("bodymate_core_select_region_layer")
pub fn select_region_layer(region : String, layer : String) -> String {
  if layer != "muscle" && layer != "fascia" {
    return fail("unknown_layer")
  }
  match first_in(region, layer) {
    Some(entry) => select(entry)
    None => fail("uncovered_region_or_layer")
  }
}

///|
#export_name("bodymate_core_select_structure")
pub fn select_structure(id : String) -> String {
  match find(id) {
    Some(entry) => select(entry)
    None => fail("unknown_structure")
  }
}

///|
#export_name("bodymate_core_set_layer")
pub fn set_layer(layer : String) -> String {
  if layer != "muscle" && layer != "fascia" {
    return fail("unknown_layer")
  }
  let region = if state.overview { "" } else { state.region }
  if region == "" {
    state.layer = layer
    return snapshot()
  }
  match first_in(region, layer) {
    Some(entry) => select(entry)
    None => fail("uncovered_layer")
  }
}

///|
#export_name("bodymate_core_isolate_selected")
pub fn isolate_selected() -> String {
  if state.overview || state.selected == "" {
    return fail("nothing_visible_to_isolate")
  }
  state.isolated = true
  bump()
  snapshot()
}

///|
#export_name("bodymate_core_restore_context")
pub fn restore_context() -> String {
  if state.overview {
    return fail("overview_has_no_context")
  }
  state.isolated = false
  bump()
  snapshot()
}

///|
#export_name("bodymate_core_reset_overview")
pub fn reset_overview() -> String {
  state.isolated = false
  state.overview = true
  bump()
  snapshot()
}

///|
#export_name("bodymate_core_snapshot")
pub fn snapshot() -> String {
  "ok|\{state.region}|\{state.selected}|\{state.layer}|\{state.isolated}|\{state.overview}|\{state.revision}"
}
