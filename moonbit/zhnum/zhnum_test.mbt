test "standalone numerals parse across digits, place values and decimals" {
  assert_eq(parse_numeral("零"), Some(0.0))
  assert_eq(parse_numeral("十"), Some(10.0))
  assert_eq(parse_numeral("十五"), Some(15.0))
  assert_eq(parse_numeral("二十"), Some(20.0))
  assert_eq(parse_numeral("两百零五"), Some(205.0))
  assert_eq(parse_numeral("一千零五"), Some(1005.0))
  assert_eq(parse_numeral("三万五千"), Some(35000.0))
  assert_eq(parse_numeral("十万"), Some(100000.0))
  assert_eq(parse_numeral("三十亿"), Some(3000000000.0))
  assert_eq(parse_numeral("一点五"), Some(1.5))
  assert_eq(parse_numeral("零点五"), Some(0.5))
  assert_eq(parse_numeral("三点一四"), Some(3.14))
  assert_eq(parse_numeral("半"), Some(0.5))
  assert_eq(parse_numeral(" 壹佰贰拾 "), Some(120.0))
}

test "malformed numerals are rejected instead of guessed" {
  assert_eq(parse_numeral(""), None)
  assert_eq(parse_numeral("abc"), None)
  assert_eq(parse_numeral("点五"), None)
  assert_eq(parse_numeral("一点"), None)
  assert_eq(parse_numeral("一点五点五"), None)
  assert_eq(parse_numeral("一点十"), None)
  assert_eq(parse_numeral("1.5"), None)
}

test "normalize_numerals rewrites Chinese and fullwidth numbers inside text" {
  assert_eq(
    normalize_numerals("手距一点五倍肩宽，夹角六十度，深度百分之八十"),
    "手距1.5倍肩宽，夹角60度，深度80%",
  )
  assert_eq(normalize_numerals("站距１．２倍髋宽 外撇２０度 幅度８０％"), "站距1.2倍髋宽 外撇20度 幅度80%")
  assert_eq(normalize_numerals("百分之12.5"), "12.5%")
  assert_eq(normalize_numerals("重点观察胸大肌"), "重点观察胸大肌")
  assert_eq(normalize_numerals("请演示宽距俯卧撑"), "请演示宽距俯卧撑")
  assert_eq(normalize_numerals("十分标准"), "10分标准")
  assert_eq(normalize_numerals("手距1.8倍肩宽"), "手距1.8倍肩宽")
  assert_eq(normalize_numerals("百分之"), "百分之")
  assert_eq(normalize_numerals(""), "")
}

test "quantity_before_unit finds the first unit-tagged number" {
  assert_eq(quantity_before_unit("夹角六十度", ["度", "°"]), Some(60.0))
  assert_eq(quantity_before_unit("手距 1.8 倍肩宽", ["倍"]), Some(1.8))
  assert_eq(quantity_before_unit("深度百分之八十，夹角45°", ["°"]), Some(45.0))
  assert_eq(quantity_before_unit("夹角六十", ["度"]), None)
  assert_eq(quantity_before_unit("没有数字", ["度"]), None)
  assert_eq(quantity_before_unit("夹角六十度", []), None)
}
