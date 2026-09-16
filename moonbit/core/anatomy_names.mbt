///| Wire: Chinese display name for a pinned structure. `kind` is
///| "muscle" | "bone" | "connective"; anything else falls back to the generic label.
#export_name("bodymate_anatomy_name_v1")
pub fn anatomy_name_v1(canonical : String, kind : String) -> String {
  "ok|anatomy-name-v1|" +
  @anatomy.structure_name_zh(canonical, @anatomy.kind_from_string(kind))
}

///| Wire: whether the authored term tables cover this structure ("true" | "false").
#export_name("bodymate_anatomy_has_name_v1")
pub fn anatomy_has_name_v1(canonical : String, kind : String) -> String {
  let covered = @anatomy.has_chinese_structure_name(
    canonical,
    @anatomy.kind_from_string(kind),
  )
  "ok|anatomy-has-name-v1|" + (if covered { "true" } else { "false" })
}

///| Wire: stateless search. `entries` encodes `id^kind^canonical` records joined
///| by `~`; the response lists matching ids joined by `~`, muscles first. Display
///| names are derived inside MoonBit so callers never ship a second copy.
#export_name("bodymate_anatomy_search_v1")
pub fn anatomy_search_v1(entries : String, query : String) -> String {
  let parsed : Array[@anatomy.StructureEntry] = []
  for record in entries.split("~") {
    let fields = record.split("^").to_array()
    if fields.length() < 3 {
      continue
    }
    parsed.push({
      structure_id: fields[0].to_owned(),
      canonical_name: fields[2].to_owned(),
      kind: @anatomy.kind_from_string(fields[1].to_owned()),
    })
  }
  let ids : Array[String] = []
  for entry in @anatomy.search_structures(parsed, query) {
    ids.push(entry.structure_id)
  }
  "ok|anatomy-search-v1|" + ids.join("~")
}
