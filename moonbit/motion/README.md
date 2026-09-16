# BodyMate MoonBit 库套件

> **English.** Four dependency-free MoonBit packages under `lqyq666/bodymate` (js target): `agent` — guard untrusted LLM proposals down to allowlisted commands with bounded numeric fields or bounded lookups, with explainable reasons; `zhnum` — parse and format Chinese numerals and normalize numbers inside Chinese text; `anatomy` — 376 bilingual Human Atlas / BodyParts3D terms with laterality handling and muscle-first search; `motion` — parameterized teaching-motion sessions with Chinese command parsing and deterministic pose intents. Each section below documents one package in Chinese; the code samples are language-neutral.

`lqyq666/bodymate` 提供四个无依赖、可单独导入的 MoonBit 包（当前支持 JS target）：

| 包 | 一句话 |
| --- | --- |
| `lqyq666/bodymate/agent` | LLM 提议的执行护栏：白名单命令与数值字段，其余一律丢弃 |
| `lqyq666/bodymate/zhnum` | 中文数字与数量表达解析、文本内数字归一化 |
| `lqyq666/bodymate/anatomy` | Human Atlas / BodyParts3D 376 条双语术语、侧别处理与检索 |
| `lqyq666/bodymate/motion` | 三个教学动作的参数规则、中文指令解析、独立播放会话、阶段讲解与确定性姿态标量 |

它们都不依赖 DOM、Three.js、GLB、网络、账号或 npm 包；调用方负责渲染与 I/O。`agent` 与 `zhnum` 与人体领域无关。`motion` 不是通用骨骼求解器，姿态标量使用 BodyMate 的固定教学骨架尺寸；整套库不提供生物力学、肌电、诊断或训练处方。下文先介绍 `motion`，其余三个包在后半部分各有独立章节。

## 本地运行

需要 MoonBit `0.1.20260904` 和 Node.js（用于执行 JS target）。在包含 `moon.mod` 的目录运行：

```sh
moon check --target js
moon test --target js
moon run moonbit/examples/parameters --target js
moon run moonbit/examples/sessions --target js
moon run moonbit/examples/sampling --target js
moon run moonbit/examples/export --target js > frames.csv
```

示例包含断言，错误会以非零退出码失败。参数示例输出规范化结果；会话示例证明两个消费者互不干扰；采样示例不加载渲染器即可输出五个姿态帧；导出示例把四个库串起来——中文指令解析（zhnum）→ 模型提议护栏（agent）→ 双语结构名（anatomy）→ 全部动作的确定性姿态帧 CSV，可直接作为教学卡片数据或回归基线。

## 调用方式

消费者的 `moon.pkg`：

```moonbit
import { "lqyq666/bodymate/motion" }
```

`main.mbt` 中可直接使用类型化 API：

```moonbit
fn main raise {
  let parsed = @motion.parse_query("squat", "宽站距，深度80%", []).unwrap()
  let session = @motion.Session::new()
  ignore(session.play("squat", parsed.values).unwrap())
  let frame = session.tick(2.2)
  let pose = @motion.pose_intent(frame.motion_id, frame.phase, frame.parameters).unwrap()
  assert_eq(pose.excursion, 0.8)
  println(pose.root_y)
}
```

上述 `unwrap()` 只用于输入已知的短示例；交互应用应匹配 `Ok` / `Err`。`MotionError` 区分 `UnknownMotion(id)` 与 `NoActiveMotion`，错误不修改会话。

## 公共契约

| API | 返回与边界 |
| --- | --- |
| `catalog()` / `definition(id)` | 独立数据副本；每个可调动作有且只有一个 `is_baseline` 预设，供观察对比使用 |
| `resolve(query)` | 有界中英文别名匹配，未知返回 `None`；不是开放式自然语言理解 |
| `normalize(id, values)` | 限幅、步进取整、非有限值回默认；规范化后的再次输入不产生调整提示 |
| `parse_query(id, query, base)` | 类型化值、识别标志和提示；保留单位要求，说明未支持参数 |
| `profile(id, values)` | 定性的肌群参与、局限说明和依据链接；权重仅用于视觉强调 |
| `phase_guides(id)` | 四个可暂停比较的关键阶段；说明固定教学姿态，不是训练指令或实测数据 |
| `pose_intent(id, phase, values)` | 同输入同输出；phase 限在 `[0,1]`，非有限值回 `0` |
| `Session::new()` | 创建独立会话，无库级全局单例 |
| `play` / `stop` / `reset` | 切换动作重置相位；同动作可显式保留；stop 保留速度，reset 恢复速度 1 |
| `set_parameters` / `set_paused` / `set_speed` / `seek` | 参数变化保留进度、暂停和速度；速度 `[0.25,2]`；seek `[0,1)` |
| `tick(delta)` / `snapshot()` | 只由调用方提供经过时间；暂停或非法 delta 不推进；返回数组与内部状态分离 |

`revision` 记录接受的控制命令，不随每帧 `tick` 增加。`set_parameters` 输入是完整参数集合，省略字段回到默认值；需要部分修改时，从快照合并后再调用。浏览器适配器继续暴露既有 V1 wire 接口，库使用者不需要解析这些字符串。

## 解剖术语包 `lqyq666/bodymate/anatomy`

同一模块还发布一个无依赖的双语解剖术语库：376 条归一化拉丁名 → 中文术语，覆盖 Human Atlas / BodyParts3D 人体集的 415 条肌肉与 282 个骨、椎间盘、肋、牙、软骨、筋膜结构。

```moonbit
// moon.pkg: import { "lqyq666/bodymate/anatomy" }
@anatomy.structure_name_zh("Left femur", Bone)              // "左侧股骨"
@anatomy.muscle_name_zh("Long head of right biceps brachii") // "右侧肱二头肌长头"
@anatomy.normalize_name("Distal phalanx of left big toe")    // "distal phalanx of big toe"
let hits = @anatomy.search_structures(entries, "腰大肌")      // 肌肉排在其他结构之前
```

| API | 返回与边界 |
| --- | --- |
| `normalize_name(name)` | 小写、去掉 left/right 词、折叠空白；镜像结构共用一个术语 |
| `laterality_prefix(name)` | `"左侧"` / `"右侧"` / `""`，只看独立的 left/right 单词 |
| `muscle_name_zh(name)` / `has_chinese_muscle_name(name)` | 未收录肌肉回退 `"肌肉结构"`（仍带侧别） |
| `structure_name_zh(name, kind)` / `has_chinese_structure_name(name, kind)` | `Muscle` 委托肌肉表；`Bone` / `Connective` / `Other` 分别回退 `"骨骼结构"` / `"结缔结构"` / `"人体结构"` |
| `kind_from_string(text)` | `"muscle"` / `"bone"` / `"connective"`（忽略大小写与空白），其余为 `Other` |
| `search_structures(entries, query)` | 同时匹配中文显示名与拉丁名，大小写不敏感，空查询返回空；肌肉优先、组内保持输入顺序 |
| `muscle_terms()` / `structure_terms()` / `term_counts()` | 词典副本与规模，供审计或二次加工 |

术语采用通用解剖学中文命名（如筛骨、大多角骨、环杓后肌），是展示用译名，不是医学诊断或临床术语标准的替代。

## AI 动作护栏包 `lqyq666/bodymate/agent`

与领域无关的 LLM 输出约束：宿主声明允许的命令与字段，模型提议只能收敛为 `None`、`Command` 或 `Lookup`，任何未声明的 id、字段或非有限数值都被丢弃。BodyMate 的本地代理与浏览器都用它，同一份规则在两端生效。

```moonbit
// moon.pkg: import { "lqyq666/bodymate/agent" }
let allowed = @agent.parse_allowlist("push_up^handWidth:0.8:1.8,elbowAngle:15:70~squat^stanceWidth")
@agent.guard_command("push_up", [("handWidth", 2.5), ("invented", 7.0)], allowed)
// Command("push_up", [("handWidth", 1.8)])   —— 越界值默认截断到边界，未声明字段丢弃
@agent.guard_command_with("push_up", [("handWidth", 2.5)], allowed, Reject)
// Command("push_up", [])                      —— 严格策略：越界值直接丢弃
@agent.explain_command("push_up", [("handWidth", 2.5), ("invented", 7.0)], allowed, Clamp).reasons
// ["clamped:handWidth:2.5->1.8", "unknown_field:invented"]
@agent.guard_command("run_marathon", [], allowed)   // None
@agent.guard_lookup("  胸大肌 ", 80)                 // Lookup("胸大肌")
@agent.action_wire(...)                              // "command|push_up|handWidth=1.8"
```

| API | 返回与边界 |
| --- | --- |
| `parse_allowlist(wire)` / `allowlist_wire(allowed)` | `id^key,key:min:max,key:min:,key::max~id^key`；边界可选、可单侧；非法 id/键、上下界倒置、重复项与畸形记录直接丢弃 |
| `FieldSpec::unbounded(key)` / `FieldSpec::bounded(key, min, max)` | 程序化构造允许字段 |
| `parse_fields(wire)` | `key=value,...`；只保留标识符键与有限数值，重复键取首个 |
| `guard_command(id, fields, allowed)` | id 不在白名单 → `None`；否则按白名单字段顺序保留候选中的有限数值，越界值截断到边界 |
| `guard_command_with(..., policy)` | `Clamp`（默认）或 `Reject`（越界字段丢弃） |
| `explain_command(...) -> GuardReport` / `explain_lookup(...)` | 同上并附机器可读原因：`unknown_id:`、`unknown_field:`、`non_finite:`、`clamped:key:from->to`、`out_of_range:key:value`、`empty_lookup` |
| `guard_lookup(text, max_chars)` | 修剪并按字符截断；为空 → `None` |
| `is_valid_command_id` / `is_valid_field_key` / `bound_text` / `policy_from_string` | 无正则依赖的标识符与文本约束，可单独复用 |
| `action_wire(action)` | `none` / `command\|id\|k=v,...` / `lookup\|text`，宿主按此解码 |

它不解析 JSON，也不生成提示词：宿主负责把不可信文本解成候选值再交给护栏，护栏负责决定什么可以执行。

## 中文数量解析包 `lqyq666/bodymate/zhnum`

无依赖的中文数字与数量表达处理，让任何只认 ASCII 数字的解析器直接支持中文输入。`motion` 的 `parse_query` 在匹配前调用它，因此“手距一点五倍肩宽，夹角六十度，深度百分之八十”与“手距1.5倍肩宽…”等价。

```moonbit
// moon.pkg: import { "lqyq666/bodymate/zhnum" }
@zhnum.parse_numeral("三万五千")                          // Some(35000.0)
@zhnum.parse_numeral("负零点五")                          // Some(-0.5)
@zhnum.format_numeral(120000000L)                        // "一亿二千万"
@zhnum.normalize_numerals("夹角六十度，深度百分之八十")   // "夹角60度，深度80%"
@zhnum.quantity_before_unit("夹角六十度", ["度", "°"])   // Some(60.0)
```

| API | 返回与边界 |
| --- | --- |
| `parse_numeral(text)` | 零〇一…九、壹…玖、两，十百千万亿（含繁体/大写、`一万亿` 复合单位），`点` 小数，`半`=0.5，`负` 前缀；空串、非数字字符、`点五`/`一点`/`万` 等畸形输入返回 `None`，不猜测 |
| `format_numeral(value)` | 整数的标准中文读法：15→十五、110→一百一十、1005→一千零五、10500→一万零五百、-3→负三，支持到万亿；**0–10999 全部整数与多组大数经 `parse_numeral` 往返一致**（测试覆盖） |
| `normalize_numerals(text)` | 逐段改写中文数字（含 `负`）、全角数字（`１２．５`→`12.5`、`％`→`%`）和 `百分之X`→`X%`；不含数字的文本原样返回。所有数字段都会被改写（含“十分”这类惯用语），语义应由调用方结合单位判断 |
| `quantity_before_unit(text, units)` | 先归一化，再返回第一个紧跟（可隔空白）给定单位之一的数字；无则 `None` |

它只做数字层面的规范化，不理解量词语义、不做区间校验；范围与单位约束仍由调用方（如 `motion.normalize`）负责。

## 发布边界

发布配置只打包 motion、anatomy、agent、zhnum 四个库、测试、四个示例和 MIT 许可证。`moon package --list` 可查看准确清单；人体及环境资产、浏览器 JS、旧颈肩兼容模块不进入 Mooncakes 包。

仓库地址：https://github.com/lqyq666/bodymate 。本地打包或通过测试不代表已经发布；发布状态应以 Mooncakes 的实际版本记录为准。
