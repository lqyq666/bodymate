///| Value of a single Chinese digit character (simplified, traditional/financial and 两).
fn digit_value(ch : Char) -> Int? {
  match ch {
    '零' | '〇' => Some(0)
    '一' | '壹' => Some(1)
    '二' | '贰' | '两' => Some(2)
    '三' | '叁' => Some(3)
    '四' | '肆' => Some(4)
    '五' | '伍' => Some(5)
    '六' | '陆' => Some(6)
    '七' | '柒' => Some(7)
    '八' | '捌' => Some(8)
    '九' | '玖' => Some(9)
    _ => None
  }
}

///| Multiplier of a Chinese place-value character.
fn unit_value(ch : Char) -> Int64? {
  match ch {
    '十' | '拾' => Some(10L)
    '百' | '佰' => Some(100L)
    '千' | '仟' => Some(1000L)
    '万' | '萬' => Some(10000L)
    '亿' | '億' => Some(100000000L)
    _ => None
  }
}

fn is_numeral_char(ch : Char) -> Bool {
  digit_value(ch) is Some(_) || unit_value(ch) is Some(_)
}

fn is_ascii_digit(ch : Char) -> Bool {
  ch >= '0' && ch <= '9'
}

///| Parses the integer part of a numeral run. Returns None on anything that is
///| not a digit or place-value character.
fn parse_integer(chars : Array[Char]) -> Int64? {
  if chars.length() == 0 {
    return None
  }
  let mut total = 0L
  let mut section = 0L
  let mut current = 0L
  for ch in chars {
    match digit_value(ch) {
      Some(digit) => current = digit.to_int64()
      None =>
        match unit_value(ch) {
          None => return None
          Some(unit) =>
            if unit >= 10000L {
              if section + current == 0L {
                return None
              }
              total += (section + current) * unit
              section = 0L
              current = 0L
            } else {
              if current == 0L && section == 0L {
                if unit == 10L {
                  current = 1L
                } else {
                  return None
                }
              }
              section += current * unit
              current = 0L
            }
        }
    }
  }
  Some(total + section + current)
}

///| Splits a numeral run into (integer text, fraction digits) in ASCII, or None
///| when the run is not a well-formed Chinese number.
fn numeral_parts(run : Array[Char]) -> (String, String)? {
  if run.length() == 1 && run[0] == '半' {
    return Some(("0", "5"))
  }
  let mut point = -1
  for index, ch in run {
    if ch == '点' {
      if point >= 0 {
        return None
      }
      point = index
    }
  }
  let integer_chars = if point >= 0 { run[0:point].to_owned() } else { run }
  let fraction_chars = if point >= 0 { run[point + 1:].to_owned() } else { [] }
  if point >= 0 && (integer_chars.length() == 0 || fraction_chars.length() == 0) {
    return None
  }
  let integer = match parse_integer(integer_chars) {
    Some(value) => value
    None => return None
  }
  let fraction = StringBuilder()
  for ch in fraction_chars {
    match digit_value(ch) {
      Some(digit) => fraction.write_string(digit.to_string())
      None => return None
    }
  }
  Some((integer.to_string(), fraction.to_string()))
}

///| Parses a standalone Chinese numeral such as "二十", "一千零五", "三点一四" or "半".
///| Returns None for empty input or any non-numeral character.
pub fn parse_numeral(text : String) -> Double? {
  let run = text.trim().to_owned().iter().to_array()
  match numeral_parts(run) {
    None => None
    Some((integer, fraction)) => {
      let literal = if fraction == "" { integer } else { integer + "." + fraction }
      try Some(@string.parse_double(literal)) catch {
        _ => None
      }
    }
  }
}

fn ascii_digit_of_fullwidth(ch : Char) -> Char? {
  if ch >= '０' && ch <= '９' {
    Some((ch.to_int() - '０'.to_int() + '0'.to_int()).unsafe_to_char())
  } else {
    None
  }
}

fn starts_with_at(chars : Array[Char], index : Int, prefix : Array[Char]) -> Bool {
  if index + prefix.length() > chars.length() {
    return false
  }
  for offset, ch in prefix {
    if chars[index + offset] != ch {
      return false
    }
  }
  true
}

///| Length of the Chinese numeral run starting at `index` (digits, place values,
///| a single 点 between numerals, or a lone 半). Zero when none starts here.
fn numeral_run_length(chars : Array[Char], index : Int) -> Int {
  if index < chars.length() && chars[index] == '半' {
    return 1
  }
  let mut end = index
  while end < chars.length() {
    let ch = chars[end]
    if is_numeral_char(ch) {
      end += 1
    } else if ch == '点' &&
      end > index &&
      end + 1 < chars.length() &&
      digit_value(chars[end + 1]) is Some(_) {
      end += 1
    } else {
      break
    }
  }
  end - index
}

fn ascii_number_run_length(chars : Array[Char], index : Int) -> Int {
  let mut end = index
  let mut seen_point = false
  while end < chars.length() {
    let ch = chars[end]
    if is_ascii_digit(ch) {
      end += 1
    } else if ch == '.' && !seen_point && end > index && end + 1 < chars.length() && is_ascii_digit(chars[end + 1]) {
      seen_point = true
      end += 1
    } else {
      break
    }
  }
  end - index
}

///| Rewrites Chinese numerals, fullwidth digits and "百分之X" inside free text as
///| ASCII numbers so ordinary numeric parsers can consume it:
///| "手距一点五倍肩宽，夹角六十度，深度百分之八十" → "手距1.5倍肩宽，夹角60度，深度80%".
///| Every numeral run is converted, including idiomatic ones such as 十分; callers that
///| need semantics should validate the surrounding unit.
pub fn normalize_numerals(text : String) -> String {
  let chars : Array[Char] = []
  for ch in text.iter() {
    match ascii_digit_of_fullwidth(ch) {
      Some(digit) => chars.push(digit)
      None =>
        if ch == '．' {
          chars.push('.')
        } else if ch == '％' {
          chars.push('%')
        } else {
          chars.push(ch)
        }
    }
  }
  let percent_prefix : Array[Char] = ['百', '分', '之']
  let output = StringBuilder()
  let mut index = 0
  while index < chars.length() {
    if starts_with_at(chars, index, percent_prefix) {
      let start = index + percent_prefix.length()
      let chinese = numeral_run_length(chars, start)
      if chinese > 0 {
        match numeral_parts(chars[start:start + chinese].to_owned()) {
          Some((integer, fraction)) => {
            output.write_string(if fraction == "" { integer } else { integer + "." + fraction })
            output.write_char('%')
            index = start + chinese
            continue
          }
          None => ()
        }
      }
      let ascii = ascii_number_run_length(chars, start)
      if ascii > 0 {
        for ch in chars[start:start + ascii] {
          output.write_char(ch)
        }
        output.write_char('%')
        index = start + ascii
        continue
      }
    }
    let run = numeral_run_length(chars, index)
    if run > 0 {
      match numeral_parts(chars[index:index + run].to_owned()) {
        Some((integer, fraction)) => {
          output.write_string(if fraction == "" { integer } else { integer + "." + fraction })
          index += run
          continue
        }
        None => ()
      }
    }
    output.write_char(chars[index])
    index += 1
  }
  output.to_string()
}

///| First number (ASCII or Chinese) that is directly followed—optionally after
///| whitespace—by one of `units`, e.g. `quantity_before_unit("夹角六十度", ["度", "°"])`
///| gives 60. Returns None when no unit-tagged number exists.
pub fn quantity_before_unit(text : String, units : Array[String]) -> Double? {
  let chars = normalize_numerals(text).iter().to_array()
  let unit_chars : Array[Array[Char]] = []
  for unit in units {
    let unit_run = unit.iter().to_array()
    if unit_run.length() > 0 {
      unit_chars.push(unit_run)
    }
  }
  let mut index = 0
  while index < chars.length() {
    let length = ascii_number_run_length(chars, index)
    if length == 0 {
      index += 1
      continue
    }
    let mut after = index + length
    while after < chars.length() && (chars[after] == ' ' || chars[after] == '\t') {
      after += 1
    }
    for unit_run in unit_chars {
      if starts_with_at(chars, after, unit_run) {
        let literal = StringBuilder()
        for ch in chars[index:index + length] {
          literal.write_char(ch)
        }
        return try Some(@string.parse_double(literal.to_string())) catch {
          _ => None
        }
      }
    }
    index += length
  }
  None
}
