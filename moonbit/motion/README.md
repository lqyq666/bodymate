# BodyMate Motion

BodyMate 的 MoonBit 动作领域库，包路径 `lqyq666/bodymate/motion`，当前支持 JS target。提供三个有边界的教学动作（俯卧撑、深蹲、弯举）的参数规则、中文指令解析、独立播放会话、参与提示、关键阶段讲解及确定性姿态标量。

这是 BodyMate 新项目的一部分：完整人体页面和纯 MoonBit 示例使用同一份库。库不依赖 DOM、Three.js、GLB、网络、账号或 npm 包；调用方负责渲染。它不是通用骨骼求解器，姿态标量使用 BodyMate 的固定教学骨架尺寸，也不提供生物力学、肌电、诊断或训练处方。

## 本地运行

需要 MoonBit `0.1.20260904` 和 Node.js（用于执行 JS target）。在包含 `moon.mod` 的目录运行：

```sh
moon check --target js
moon test --target js
moon run moonbit/examples/parameters --target js
moon run moonbit/examples/sessions --target js
moon run moonbit/examples/sampling --target js
```

示例包含断言，错误会以非零退出码失败。参数示例输出规范化结果；会话示例证明两个消费者互不干扰；采样示例不加载渲染器即可输出五个姿态帧。

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

## 发布边界

发布配置只打包 motion 与 anatomy 两个库、测试、三个示例和 MIT 许可证。`moon package --list` 可查看准确清单；人体及环境资产、浏览器 JS、旧颈肩兼容模块不进入 Mooncakes 包。

仓库地址：https://github.com/lqyq666/bodymate 。本地打包或通过测试不代表已经发布；发布状态应以 Mooncakes 的实际版本记录为准。
