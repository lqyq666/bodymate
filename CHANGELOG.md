# Changelog

`lqyq666/bodymate` 的发布记录。版本号遵循 SemVer；0.x 期间次版本号变化可能包含 API 调整，均在此说明。

## 0.3.0 — 2026-09-16

- **agent**：`AllowedCommand.fields` 由 `Array[String]` 改为 `Array[FieldSpec]`，字段可带可选上下界（wire `key:min:max`，允许单侧）；新增 `RangePolicy`（`Clamp` 默认 / `Reject`）、`guard_command_with`、`explain_command` / `explain_lookup` 与 `GuardReport`（原因码 `unknown_id`、`unknown_field`、`non_finite`、`clamped`、`out_of_range`、`empty_lookup`）、`FieldSpec::bounded/unbounded`、`policy_from_string`。浏览器 wire 新增 `bodymate_agent_explain_command_v1`。
- **zhnum**：新增 `format_numeral`（整数的标准中文读法，支持到万亿）；`parse_numeral` 支持 `负` 前缀与 `一万亿` 复合单位；`normalize_numerals` 归一化负数。新增 0–10999 全量 format→parse 往返测试。
- **验证**：`npm run moonbit:install-check` 从 mooncakes.io 真实 `moon add` 并运行四个包。
- **文档**：根 README 与库 README 增加英文概述。

## 0.2.0 — 2026-09-16

- 新增三个可单独导入的包：`agent`（LLM 提议护栏：白名单命令与有限数值字段、有界文本检索）、`zhnum`（中文数字解析、文本内数字归一化、单位前取数）、`anatomy`（376 条 Human Atlas / BodyParts3D 双语术语、侧别处理、肌肉优先检索）。
- `motion.parse_query` 在匹配前调用 `zhnum.normalize_numerals`，中文数字指令与阿拉伯数字指令等价。
- 新增 `examples/export`：四库串联输出确定性姿态帧 CSV。
- 浏览器 wire 新增 `bodymate_anatomy_{name,has_name,search}_v1`、`bodymate_agent_guard_{command,lookup}_v1`；JavaScript 侧不再保存术语表或校验逻辑的副本。
- 模块描述与 README 改为库优先。

## 0.1.0 — 2026-09-13

- 首个版本：`motion` 包（三个教学动作的参数契约、中文指令解析、独立 `Session`、定性参与提示、关键阶段讲解、确定性姿态意图）与三个可执行示例（`parameters`、`sessions`、`sampling`）。
