///| Wire: rewrite Chinese numerals, fullwidth digits and 百分之X inside text as ASCII numbers.
#export_name("bodymate_zhnum_normalize_v1")
pub fn zhnum_normalize_v1(text : String) -> String {
  "ok|zhnum-normalize-v1|" + @zhnum.normalize_numerals(text)
}

///| Wire: parse a standalone Chinese numeral; the payload is the number or empty when
///| the text is not a well-formed numeral.
#export_name("bodymate_zhnum_parse_v1")
pub fn zhnum_parse_v1(text : String) -> String {
  "ok|zhnum-parse-v1|" +
  (match @zhnum.parse_numeral(text) {
    Some(value) => value.to_string()
    None => ""
  })
}

///| Wire: standard Chinese reading of an integer given as decimal text; empty payload
///| when the input is not an integer.
#export_name("bodymate_zhnum_format_v1")
pub fn zhnum_format_v1(value : String) -> String {
  let parsed : Int64? = try Some(@string.parse_int64(value.trim())) catch {
    _ => None
  }
  "ok|zhnum-format-v1|" +
  (match parsed {
    Some(number) => @zhnum.format_numeral(number)
    None => ""
  })
}
