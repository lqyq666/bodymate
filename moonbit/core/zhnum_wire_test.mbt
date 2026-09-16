test "zhnum wires normalize, parse and format" {
  assert_eq(
    zhnum_normalize_v1("手距一点五倍肩宽，夹角六十度，深度百分之八十"),
    "ok|zhnum-normalize-v1|手距1.5倍肩宽，夹角60度，深度80%",
  )
  assert_eq(zhnum_parse_v1("三万五千"), "ok|zhnum-parse-v1|35000")
  assert_eq(zhnum_parse_v1("负零点五"), "ok|zhnum-parse-v1|-0.5")
  assert_eq(zhnum_parse_v1("abc"), "ok|zhnum-parse-v1|")
  assert_eq(zhnum_format_v1("120000000"), "ok|zhnum-format-v1|一亿二千万")
  assert_eq(zhnum_format_v1(" -3 "), "ok|zhnum-format-v1|负三")
  assert_eq(zhnum_format_v1("1.5"), "ok|zhnum-format-v1|")
}
