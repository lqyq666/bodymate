# BodyMate｜MoonBit 基础库套件与全身参考应用

`lqyq666/bodymate` 是一组无依赖、可单独 `moon add` 的 MoonBit 库，外加一个使用它们的离线全身三维参考应用。库是主体，应用是证明：同一份 MoonBit 代码同时驱动浏览器页面、本地 AI 代理和纯命令行示例。

```sh
moon add lqyq666/bodymate
```

| 包 | 解决的问题 | 谁会用 |
| --- | --- | --- |
| `lqyq666/bodymate/agent` | **LLM 输出的执行护栏**：宿主声明允许的命令与数值字段，模型提议只能收敛为 `None` / `Command` / `Lookup`，未声明的 id、字段、非有限数值一律丢弃 | 任何用 MoonBit 写 Agent / 工具调用 / 对话式控制的项目 |
| `lqyq666/bodymate/zhnum` | **中文数字与数量表达**：`三万五千`、`三点一四`、`半`、全角数字、`百分之八十` → ASCII 数字；单位前取数 | 中文 UI 指令、语音/聊天输入、配置与表单解析 |
| `lqyq666/bodymate/anatomy` | **Human Atlas / BodyParts3D 双语术语库**：376 条归一化拉丁名 → 中文，覆盖 415 肌肉与 282 骨/椎间盘/肋/牙/软骨/筋膜，含侧别与检索 | 医学、体育、康复教育与可视化项目 |
| `lqyq666/bodymate/motion` | **参数化动作会话引擎**：类型化参数与限幅、中文指令解析、独立 `Session`、相位讲解、确定性姿态意图 | 动作教学、动画/仿真状态机、需要可复现姿态帧的工具 |

四个包都不依赖 DOM、Three.js、GLB、网络或 npm；`agent` 与 `zhnum` 与人体领域无关，`anatomy` 与 `motion` 是领域库但同样脱离页面可用。

## 各库三行上手

```moonbit
// agent：模型提议 → 受控动作
let allowed = @agent.parse_allowlist("push_up^handWidth,elbowAngle~squat^stanceWidth")
@agent.guard_command("push_up", [("handWidth", 1.8), ("invented", 7.0)], allowed) // Command("push_up", [("handWidth", 1.8)])
@agent.guard_command("run_marathon", [], allowed)                                  // None

// zhnum：中文数字 → 数字
@zhnum.normalize_numerals("手距一点五倍肩宽，夹角六十度，深度百分之八十") // "手距1.5倍肩宽，夹角60度，深度80%"
@zhnum.quantity_before_unit("夹角六十度", ["度", "°"])                  // Some(60.0)

// anatomy：拉丁名 → 中文，含侧别与检索
@anatomy.structure_name_zh("Left femur", @anatomy.kind_from_string("bone")) // "左侧股骨"
@anatomy.search_structures(entries, "腰大肌")                               // 肌肉优先的匹配列表

// motion：中文指令 → 类型化参数 → 确定性姿态
let parsed = @motion.parse_query("push_up", "手距一点五倍肩宽，夹角六十度", []).unwrap()
@motion.pose_intent("push_up", 0.5, parsed.values)                          // 同输入同输出
```

完整 API、边界与错误语义见 [库说明](moonbit/motion/README.md)（Mooncakes 同步展示）。

## 四个不依赖网页的可运行示例

需要 MoonBit `0.1.20260904` 和 Node.js：

```sh
moon run moonbit/examples/parameters --target js   # 中文参数解析与越界调整
moon run moonbit/examples/sessions --target js     # 两个会话独立播放与暂停
moon run moonbit/examples/sampling --target js     # 五个相位的确定性姿态采样
moon run moonbit/examples/export --target js       # 四库串联：指令 → 护栏 → 命名 → 姿态帧 CSV
```

每个示例含断言，成功输出 `PASS`；`export` 的 CSV 可直接落盘作为教学卡片数据或回归基线。工具链不在 PATH 时用 `npm run moonbit:examples`。

## 生态贡献与边界

- **补空缺，不重复**：MoonBit 生态此前没有面向 LLM 应用的动作白名单原语、没有中文数字处理库、没有解剖学术语字典；这三项都是从真实应用需求中抽出的、边界清晰的独立包。
- **单一事实来源**：术语表、护栏规则、动作目录只存在于 MoonBit；浏览器与 Node 侧的 JavaScript 只做字符串编解码（见 [架构](docs/MOONBIT_ARCHITECTURE.md)）。
- **可验证**：MoonBit 70 项测试、Node 142 项测试、生成物新鲜度检查、冻结人体资产哈希、仓库卫生审计、真实发布 ZIP 的隔离 check/build/test/run；规模基线见 [实时基线](docs/MOONBIT_ENGINE_BASELINE.md)。
- **诚实边界**：`motion` 的姿态标量绑定当前教学骨架尺寸，不是通用骨骼求解器；`anatomy` 是展示用译名，不是临床术语标准；整套项目不提供医疗诊断、疼痛判断、训练处方或实测发力结论。

## 参考应用：全身动作实验室

`/?view=full-body`：415 条肌肉、282 个骨骼及相关结构、21 关节教学骨架；俯卧撑、深蹲、弯举的播放、暂停、进度、速度、姿势预设与参数比较、四阶段讲解、中英文结构检索与点选、定性参与肌群高亮；可选的本地 AI 对话。

```text
用户输入 / 模型提议 / 参数控件 / 每帧经过时间
  → MoonBit zhnum：中文数字归一化
  → MoonBit motion：识别 → 参数校验 → 会话状态 → 姿态意图
  → MoonBit agent：模型提议护栏（服务端与浏览器同一份规则）
  → MoonBit anatomy：结构中文名与检索
  → MoonBit core：wire 导出
  → JavaScript 编解码 → Three.js 骨架 / 材质 / DOM
```

Three.js 负责资产加载、几何 IK、相机、材质和绘制；DOM 与事件适配留在 JavaScript。旧颈肩领域模块保留为兼容与回归代码，旧页面已退役。

### 运行

环境：Node.js 24、MoonBit `0.1.20260904`、Python 3（包审计）、支持 WebGL 的 Chromium 浏览器。

```sh
npm ci
npm run build
npm run check
npm start                      # 启动本地服务并打开页面；端口占用时只打开页面
```

也可以 `python -m http.server 4174 --bind 127.0.0.1` 后打开 `http://127.0.0.1:4174/?view=full-body`：离线动作与检索全部可用，只是没有 AI 代理。正常运行不请求 CDN、远程模型或后台；首次安装工具链与 npm 依赖需要网络。

### 可选：本地 AI 对话

按 [AI 对话接入说明](docs/AI_CHAT_SETUP.md) 在本机配置一个 Chat Completions 兼容服务。Windows 上 GLM Key 已在剪贴板时：

```sh
npm run ai:configure-glm
npm run ai:serve
```

浏览器只调用回环地址上的本地代理；代理只发送当前对话、当前动作状态和受限动作目录。模型提议在服务端与浏览器各经过一次 `agent` 护栏，再由 `motion` 目录校验后播放。

## 评审入口

- [库说明（四个包的 API、边界、示例）](moonbit/motion/README.md)
- [评委快速开始](docs/REVIEWER_QUICKSTART.md) · [MoonBit 技术审查](docs/MOONBIT_REVIEW_GUIDE.md)
- [架构](docs/MOONBIT_ARCHITECTURE.md) · [测试矩阵](docs/TEST_MATRIX.md) · [实时规模基线](docs/MOONBIT_ENGINE_BASELINE.md)
- [演示讲稿](docs/DEMO_SCRIPT.md) · [一页项目说明](docs/ONE_PAGE_PROJECT.md) · [申报清单](docs/SUBMISSION_CHECKLIST.md)

`npm run moonbit:package-check` 检查实际发布 ZIP、排除应用资产并在隔离目录重新 check/build/test/run；只执行本地验证，本地成功不代表已发布或已获资格。

## 来源、AI 辅助与限制

自有代码为 MIT；Human Atlas / BodyParts3D 几何及相关衍生表面保留各自 CC BY 4.0 归属，见 [人体来源](assets/anatomy/human-atlas/RIGGED_BODY_ATTRIBUTION.md)。环境为用户提供的 Tripo 导出，哈希与处理过程见 [环境清单](assets/environment/ASSET_MANIFEST.md)。环境资产与应用代码不进入 Mooncakes 库包。

ChatGPT / Codex / ZCode 参与设计、实现、测试与文档，见 [开发复盘](docs/DEVELOPMENT_RETROSPECTIVE.md)。参赛者理解并解释最终实现、数据来源、技术边界与验证结果。

当前是三种预设教学动作，不模拟软组织或独立手指脚趾；颜色与参与 profile 只用于定性视觉强调，不是实测肌电、受力、诊断或训练处方。
