# BodyMate → Zcode 续开发交接

更新：2026-09-15（Asia/Shanghai）  
工作目录：本仓库根目录（`README.md` 所在目录）  
当前分支：`main`  
当前 HEAD：`a018933c6d78509c347dfa2ddf203c21191411ba`（`2026-09-13T17:01:08+08:00`）

## 先读这里

这是当前唯一用于续开发的交接入口。它覆盖旧的 `docs/BODYMATE_STAGE5B_UI_REPAIR_HANDOFF.md`：后者记录的是已经退役的颈肩页面诊断，不能作为当前完整人体页面或 AI 对话工作的范围依据。

本工作区已有大量**未提交**的实现、生成物、测试和文档。它们是待保留的当前成果，不是可以清理的临时文件。先读取本文件、执行工作区检查，再开始修改。不要执行：

```powershell
git reset --hard
git clean -fd
git clean -fdx
git add .
git add -A
```

只按明确路径暂存。不要重新引入 AgentLoop / AGENTLOOP 相关文件、运行器或治理流程；本项目用 Codex/Zcode 直接开发。

## 产品当前状态

BodyMate 是一个 MoonBit 动作领域库及其完整人体 Three.js 实验室示例。当前主页面只有：

```text
http://127.0.0.1:4174/?view=full-body
```

已实现并应继续保留的能力：

- 415 条肌肉、282 个骨骼及相关结构、21 关节教学骨架；真实人体资产来自 Human Atlas / BodyParts3D。
- 三种已支持的教学动作：俯卧撑（`push_up`）、深蹲（`squat`）、弯举（`curl`）。
- 动作播放、暂停、速度、进度、参数预设、中文动作与肌肉查询、阶段讲解、基线参数比较、定性参与肌群高亮。
- MoonBit 导出的动作目录、参数范围、中文解析、播放会话、相位与姿态意图；JavaScript/Three.js 只解析线协议、驱动固定骨架、渲染与页面交互。
- 本地 AI 对话：模型只能建议播放现有动作或检索现有肌肉；浏览器再次以本地目录验证动作和参数后才会执行。

当前不支持且不可擅自扩展：拉伸、放松、腿部新动作、任意新动作、医疗诊断、疼痛/受伤判断、训练处方、实测发力/肌电/力矩结论、通用动作捕捉、任意 rig 重定向或软组织模拟。

颜色、闪烁和参与 profile 都是定性教学提示，不是实测受力或医疗证据。

## 关键架构边界

```text
用户输入 / AI 建议 / 参数控件
  -> MoonBit motion：目录、中文解析、范围校验、Session、相位、PoseIntent
  -> moonbit/core：浏览器兼容 wire 接口
  -> src/full-muscle/motion-domain.mjs：解码与薄适配
  -> Three.js：固定骨架 IK、动画、材质、相机、DOM 展示
```

- `moonbit/motion/` 是可复用库，不能引入 DOM、Three.js、GLB、npm 或网络依赖。
- `moonbit/core/` 持有浏览器所用的单一动作 Session 和兼容导出；不要让 JS 保存第二套播放状态、动作目录、参数规则或阶段解释。
- `src/full-muscle/motion-domain.mjs` 只能消费 MoonBit wire 契约。
- `assets/runtime/moonbit-core.js`、`assets/runtime/full-muscle-runtime.js`、`moonbit/motion/pkg.generated.mbti` 是生成物。修改 MoonBit 源码后通过现有构建流程生成，不要手改。
- AI 输出不是执行权限。客户端和协议层必须丢弃未知动作、未知参数、非有限数值及任何非 `motion` / `muscle` / `none` 指令。

详细架构见 `docs/MOONBIT_ARCHITECTURE.md`，测试责任分布见 `docs/TEST_MATRIX.md`。

## 冻结资产与许可边界

非资产任务不要修改以下文件；修改前必须有明确用户目标、可追溯来源、再生成路径和完整验证：

| 资产 | SHA-256 |
| --- | --- |
| `assets/anatomy/human-atlas/neck-muscles.glb` | `FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065` |
| `assets/anatomy/human-atlas/rigged-body.glb` | `CD2E2108F7551B87928989C445C78E8BB35D867C89D90CD766623CB4CF7E1522` |
| `assets/anatomy/human-atlas/full-muscles.glb` | `03F01F82188C4849BA1A2B270CACD5737629E7AB4CB4B06BFF1BB3E57AF59BAE` |

人体几何保留 Human Atlas / BodyParts3D 的 CC BY 4.0 归属。环境的原始 Tripo 导出位于本机忽略路径 `assets/environment/source/`，不进入 Mooncakes 库包。不要改动或清理 `prototype/human-atlas-local/`。

## 本轮未提交工作概览

接手时先执行 `git status --short`，不要以本表替代实时状态。当前待保留变更可按以下模块理解：

| 模块 | 主要文件 | 已完成内容 |
| --- | --- | --- |
| MoonBit 动作域 | `moonbit/motion/{catalog,types,phase}.mbt`，`moonbit/core/full_body_motion.mbt` | 三种动作的参数、预设基线、阶段教学文本、会话与 wire 输出。 |
| 浏览器动作桥 | `src/full-muscle/motion-domain.mjs`，`src/full-muscle/motion-parameters.mjs`，`src/full-muscle/runtime-entry.mjs` | MoonBit wire 解码、参数比较、相位指南和固定骨架绑定。 |
| 页面与呈现 | `assets/runtime/full-muscle-root-adapter.js`，`assets/full-muscle.css`，`assets/visual-full-body.css` | 对话记录、动作阶段导航、参数差异说明、动作/肌肉展示与回退状态。 |
| 本地 AI 代理 | `src/ai/bodymate-chat-protocol.mjs`，`scripts/serve-bodymate-ai.mjs`，`scripts/bodymate-ai-dpapi.ps1`，`scripts/save-bodymate-glm-from-clipboard.ps1` | 有界提示词/响应协议、localhost 代理、Windows DPAPI 配置与安全错误处理。 |
| 文档与配置 | `README.md`，`.env.example`，`docs/AI_CHAT_SETUP.md` | 本地启动和密钥边界说明。 |
| 回归测试 | `test/ai-chat-protocol.test.mjs`，`test/visual-lab.test.mjs`，`test/motion-domain-boundary.test.mjs`，`test/full-body-rig.test.mjs` | AI 协议、429 透传、单次历史发送、MoonBit 边界、参数/相位与真实骨架约束。 |
| 其他待保留材料 | 两份 `docs/BodyMate_项目申报书*.md`、`docs/MOONBIT_ENGINE_BASELINE.md` 等 | 申报、规模与交付材料；提交前单独核对。 |

不要删除旧的 `docs/BODYMATE_STAGE5B_UI_REPAIR_HANDOFF.md`；它是历史记录，但不要再按其“仅颈肩模型”的范围继续实现。

## AI 对话：实现、密钥与实时状态

### 已实现的数据流

```text
页面 chat form
  -> POST /api/ai/chat（仅 localhost）
  -> scripts/serve-bodymate-ai.mjs
  -> Chat Completions 兼容服务
  -> 结构化 { reply, action }
  -> 客户端二次验证 action
  -> MoonBit 动作 Session / 本地肌肉检索 / Three.js 呈现
```

每次上游请求最多包含：当前用户消息（最多 800 字符）、最近 6 条本次页面对话、当前动作与参数、以及最多 12 个本地目录动作的有限参数信息。它不会发送人体 GLB、文件系统内容、浏览历史或 API Key。

### 凭据规则

- Windows 上当前用户的 GLM 配置已通过 DPAPI 存在 `%LOCALAPPDATA%\BodyMate\ai-provider.dpapi.json`；文件只含 `format` 与 `ciphertext` 字段。
- 密钥不会进入仓库、浏览器代码、`.env.local`、Git、测试输出或本交接文档。
- 不要读取、打印、复制、提交或要求在聊天中粘贴密钥。
- 同一 Windows 用户、同一机器上可直接运行 `npm run ai:serve`。不同账户/机器上需要用户把新密钥放到 Windows 剪贴板，然后由本机运行 `npm run ai:configure-glm`。
- `.env.local` 是可选的通用本机覆盖方式，受 `.gitignore` 保护；不要创建含真实密钥的示例或测试 fixture。

### 已验证的真实状态

| 项目 | 结果 |
| --- | --- |
| DPAPI 配置文件 | 已存在，只有密文字段；明文未写入仓库。 |
| `GET /api/ai/health` | HTTP 200，`configured: true`。 |
| 真实 GLM 基础对话 | 曾返回 HTTP 200，证明新密钥、端点、DPAPI 解密和本地代理链路可用。 |
| 随后真实页面动作请求与复测 | 上游返回 HTTP 429，页面不再伪装成模型回复，而显示“AI 暂不可用：本地动作引擎已接管”。 |
| 本地动作回退 | 宽距俯卧撑可启动，宽距参数、动画阶段与定性肌群提示可见。 |

因此：**在线模型驱动动作的端到端验收尚未完成。** 当前阻碍是上游限流或额度，不是代码、密钥保存或浏览器重复提交问题。此前自动化中看到的输入重复已用浏览器 `fill` 验证为自动化输入工件：页面输入会原样保留一次。

不要通过反复请求上游来“刷”429。等限流窗口或额度恢复后，只进行一次受控验收：

1. 启动/复用本地服务。
2. 打开完整人体页，输入“请演示宽距俯卧撑，并显示参与肌群。”。
3. 预期对话标题为 `BodyMate AI`，不是“本地动作引擎已接管”。
4. 验证模型建议经本地校验后使 `push_up` 播放、宽距预设生效、阶段条出现、参与肌群闪烁。
5. 再测试一个纯问答和一个肌肉定位；未知动作、医疗/训练请求必须不执行未知行为。

若 429 持续存在，记录时间和 HTTP 状态即可；是否充值、换 Key 或调整服务额度由用户决定。

### 2026-09-15 傍晚更新：Coding Plan 诊断、错误码可见性与 DPAPI 文件缺失

- **17:57 页面复测**：受控验收再次遇到上游 429；本地回退完整（`push_up` 播放、宽距预设 1.8 倍肩宽、四阶段条、肌群闪烁、诚实“本地动作引擎已接管”文案）。全量验收 `npm run check`、`moonbit:examples`、`moonbit:package-check` 均通过（MoonBit 49 / Node 128）。
- **用户确认购买的是 GLM Coding Plan**。智谱有两个互不抵扣的端点：通用 `https://open.bigmodel.cn/api/paas/v4`（扣余额/资源包）与 Coding 专属 `https://open.bigmodel.cn/api/coding/paas/v4`（扣套餐积分，且官方声明“仅限在官方支持的指定工具与产品环境中使用”）。本代理默认写入通用端点，因此套餐额度从未被使用，429 疑为错误码 1113（账户欠费/无资源包，官方映射为 HTTP 429）。决策留给用户：通用端点充值、改配 Coding 端点+`glm-5.3-flash`（超出套餐指定工具范围）、或更换其他 Chat Completions 兼容服务。改端点只需 `.env.local` 写 `BODYMATE_AI_BASE_URL`/`BODYMATE_AI_MODEL` 两行覆盖，密钥仍留 DPAPI。
- **新增错误码可见性**（`scripts/serve-bodymate-ai.mjs`）：上游失败且正文为 JSON 错误对象时，服务端控制台打印 `status`、`code`、`message`（不含密钥/请求头）；429 且 `code=1113` 时页面文案改为明确提示账户余额/资源包问题，其余 429 文案不变。新增 `parseUpstreamErrorDetail` 与两组确定性测试（`test/ai-chat-protocol.test.mjs` 共 9 项通过）。真实上游的 1113 确认尚未取得——见下一条。
- **DPAPI 配置文件已缺失**：`%LOCALAPPDATA%\BodyMate\` 目录在 17:34 检查时不存在；新启动的 `ai:serve` 报 `configured:false`。仍在运行的 4174 服务依靠内存缓存维持已配置状态，**不要随手重启它**：需先把 API Key 放回 Windows 剪贴板并运行 `npm run ai:configure-glm` 重建文件，再重启服务。重建后的第一次页面对话即可在控制台看到真实错误码。
- **密钥自动恢复路线已全部排除**（18:15 前后，均只读/结构化探测，未暴露密钥）：回收站无 `BodyMate`/`ai-provider` 条目；当前剪贴板非密钥（3905 字符多行文本）；剪贴板历史库 `ActivitiesCache.db` 不存在（功能未开启）；卷影副本不可用。4174 旧服务进程为 PID 22684（`node scripts/serve-bodymate-ai.mjs`，15:58:32 +08:00 由 cmd/npm 启动），其内存缓存是本机唯一仍可用的密钥载体。恢复配置只剩用户动作：从智谱控制台把 API Key 复制到剪贴板后由助手运行 `npm run ai:configure-glm`。
- 本轮修改文件：`scripts/serve-bodymate-ai.mjs`、`test/ai-chat-protocol.test.mjs`、`docs/AI_CHAT_SETUP.md`、本文件。未提交。

### 2026-09-15 晚间更新：根因确认，在线 AI 端到端验收通过

- **根因不是余额，是模型退役。** 用户新 Key 复制到剪贴板后，助手运行 `npm run ai:configure-glm` 重建 DPAPI（剪贴板自动恢复路线均无果后由用户一步完成）。真实错误码日志显示：`status=429 code=1305 message=该模型当前访问量过大`。`/api/paas/v4/models` 列表（Key 有效，HTTP 200）中**没有** `glm-4.7-flash`——默认模型已不在通用端点在售阵容，换成 `glm-5.3-flash` 后最小请求立即返回 200。此前所有“限流或额度”429 均由此产生，Coding Plan 端点差异是背景事实但不是本次阻塞。
- **配置已切换**：DPAPI 以 `-Model glm-5.3-flash` 重建；`scripts/save-bodymate-glm-from-clipboard.ps1` 默认模型同步改为 `glm-5.3-flash`；`docs/AI_CHAT_SETUP.md` 更新模型与错误码说明。4174 服务由助手以分离进程重启（stdout/stderr 重定向到 `%TEMP%\bm-ai-4174-out.log` / `bm-ai-4174-err.log`，机器重启后用户需自行 `npm run ai:serve`）。
- **在线验收全部通过**（2026-09-15 19:49–20:02 +08:00，`glm-5.3-flash`）：
  1. 宽距俯卧撑请求：对话标题 `BodyMate AI`（非回退横幅），约 6 秒真实模型回复；`push_up` 播放中（进度推进 532→958）；宽距参数生效（手距 1.8 倍肩宽、底部肘部外展 60°、状态行“当前：宽距 · 相较标准：手距 +0.3倍肩宽，底部肘部外展 +15°”，预设按钮“宽距”按下；该面板在 ARIA 快照中偶有省略，DOM 检查确认在且可见）；四阶段讲解条在；肌肉闪烁激活。
  2. 肌肉定位（“胸大肌在哪里”）：模型回复并定位 6 个相关肌肉结构，画面切至胸大肌视图。
  3. 医疗拒绝（“膝盖疼帮我诊断”）：模型明确拒绝诊断/治疗建议并指引就医；请求前后画面状态（视图、播放态）完全一致，未执行任何未知行为。
- 遗留观察（非缺陷）：动作播放中 ARIA 快照偶尔省略参数面板子树，DOM 状态正常；进度滑块在阶段回绕时数值先升后归零属循环播放语义。

### 2026-09-15 深夜更新：点击任何结构都显示中文名

用户报告部分结构点击后仍显示英文。排查确认：415 条肌肉本就全部有中文映射；缺中文的是 282 条非肌肉结构（骨、牙、牙龈、软骨、髂胫束）——它们没有 `displayNameZh`，点击回退到英文 `canonicalName`（如 "Gingiva of upper jaw"）。修复：

- `src/full-muscle/anatomy-name-zh.mjs` 新增 `structureTerms`（170 个归一化术语，覆盖椎骨/椎间盘/肋骨/肋软骨/胸骨/颅骨/四肢骨/腕骨/跗骨/掌骨/跖骨/指趾骨/恒牙/喉软骨/鼻软骨/牙龈/髂胫束）与 `structureNameZh(canonicalName, kind)`；肌肉委托 `muscleNameZh`，未映射时按 kind 兜底为中文泛称。
- `src/full-muscle/runtime-entry.mjs` 把 `displayNameZh` 重写从"仅肌肉"扩展为所有结构。
- `assets/runtime/full-muscle-root-adapter.js` 点击文案改为结构中性（"已定位到这个结构"）。
- 重建生成物 `assets/runtime/full-muscle-runtime.js`（冻结 GLB 未动）。
- `test/full-muscle-localization.test.mjs` 新增两条测试：全部 697 个清单条目的点击标签均为纯中文且带左右侧别；常见骨骼/牙齿/软骨译名抽查（含兜底路径）。`npm run check` 全绿（Node 132 / MoonBit 49）。
- 页面实测（骨骼模式点击）：下颌中切牙→“左侧下颌中切牙”、T10→“第十胸椎”、骶骨→“骶骨”。

### 2026-09-15 深夜更新 2：中文搜索覆盖全部结构

原搜索 `findAll` 只匹配肌肉的英文 `canonicalName`，中文查询依赖 21 条手写别名（“腰大肌”等大量中文名搜不到），骨骼/牙齿等结构完全不可搜。修复：

- `src/full-muscle/anatomy-name-zh.mjs` 新增纯函数 `searchStructures(entries, query)`：同时匹配 `displayNameZh`（中文）与 `canonicalName`（拉丁名），肌肉条目排在其他结构之前。
- `src/full-muscle/runtime-entry.mjs` 的 `findAll` 改为“别名组词（股四头肌/腘绳肌等组合词仍有效）∪ searchStructures”，去重后肌肉优先。
- `assets/runtime/full-muscle-root-adapter.js` 文案“相关肌肉结构”→“相关结构”（AI 定位与本地查询两处）。横幅搜索框提交即进入同一条链路，自动受益。
- 重建生成物 `assets/runtime/full-muscle-runtime.js`；`test/full-muscle-localization.test.mjs` 新增搜索确定性测试（腰大肌=2、骶骨=1、椎间盘≥20、拉丁名 pectoralis major=6、肌肉优先排序、空查询）。`npm run check` 全绿（Node 133 / MoonBit 49）。
- 页面实测（真实 AI 链路）：“请定位骶骨”→“已定位 1 个相关结构”；“请高亮腰大肌”→“已定位 2 个相关结构”。

### 2026-09-15 深夜更新 3：AI 配置漂移可见、1305 文案细分

- `scripts/serve-bodymate-ai.mjs`：`configuredEnvironment` 改为按加密文件的 mtime+size 签名缓存——文件变化即重新解密（重配后无需重启），文件消失即报未配置（修复下午“文件已删仍 configured:true”的问题）；导出 `configuredEnvironment`/`healthPayload` 供测试。`/api/ai/health` 现返回 `{ configured, model, endpoint }`（无密钥）。429 新增 `1305` 专属文案（“模型当前访问量过大……请改用当前在售的模型”）。
- `test/ai-chat-protocol.test.mjs` 新增 4 条：1305/500/401 分流与日志、配置文件变化/消失时的加载行为、`.env.local` 局部覆盖保留密钥、health 载荷不泄露密钥。共 13 条通过。
- 文档 `docs/AI_CHAT_SETUP.md` 同步。

### 2026-09-16 更新：AI 驱动动作时自动展开“动作调整”面板

此前 `start()` 只在有参数提示或本地中文解析出参数时展开 `<details>动作调整`，模型建议的宽距俯卧撑不满足两者，面板保持折叠——用户看不到预设已生效，这也是此前“参数面板从 ARIA 快照消失、DOM 却在”的真正原因。修复：`start()` 改为“有提示 或 `motionParameterComparison(...).isBaseline === false`”即展开（`assets/runtime/full-muscle-root-adapter.js`），`test/visual-lab.test.mjs` 增加源级断言。页面实测：发送前 `open=false`，AI 播放宽距俯卧撑后 `open=true`、“宽距”预设按下、比较状态行可见。已提交范围之外的新改动，未提交。

### 2026-09-16 更新：生成注册表改为完整中文名

`scripts/build-human-atlas-full.mjs` 原 `localizedName` 只翻左右侧别，`src/anatomy/full-muscle-registry.mjs` 与 `assets/anatomy/human-atlas/full-muscles.manifest.json` 里 401 条 `displayNameZh` 是“左侧 inferior oblique”式半英文。改为 `structureNameZh(part.name, 'muscle')` 后用系统临时目录里的 Human Atlas 源缓存离线完整重建：冻结 `full-muscles.glb` 字节不变（SHA-256 仍为 `03F01F82…`），清单差异恰好 802 行且全部是 `displayNameZh`，`--from-committed` 校验通过；`test/full-muscle-atlas.test.mjs` 新增“注册表与清单名称纯中文、带侧别、二者一致”断言。

### 2026-09-16 更新：一键启动

新增 `npm start`（`scripts/start-bodymate.mjs`）：启动本地 AI 服务并用系统默认浏览器打开完整人体页；端口已被占用（`EADDRINUSE`）时视为服务已在运行，只打开页面；其他启动错误照常抛出。`scripts/start-bodymate.cmd` 供 Windows 双击。`test/start-bodymate.test.mjs` 三条测试覆盖平台打开命令、正常启动、端口复用与错误透传；已加入 `verify` 列表。README 同步。

### 2026-09-16 更新：本地服务烟测与点文件防护

新增 `test/server-smoke.test.mjs`（已入 `verify`）：起真实回环服务，断言首页与 `index.html` 引用的每个资源都能 200 返回且 MIME 正确、人体清单可读（415 肌肉 / 697 条目）、HEAD 无正文、未配置 AI 时 health 与 chat 均如实报告、缺失文件 404、非法方法 405。顺带修复：静态服务此前会返回 `/.gitignore`、`/.git/HEAD` 等点文件（回环内暴露 `.git/` 与可能存在的 `.env.local`），现在任何以点开头的路径段一律 403。浏览器级端到端仍是手动（引入 Playwright 需下载浏览器，留给用户决定）。

### 2026-09-16 更新：窄屏验证与自动化点击超时根因

- **窄屏验证通过，无需 CSS 修正。** 390×844：无横向溢出、无元素越出右边界，纵向堆叠（画布 → 状态卡 → 动作按钮 → 对话框，页高 1427）；启动宽距俯卧撑后阶段条呈 2×2 网格、`动作调整` 自动展开、两条滑块全宽、暂停态“已暂停 · 准备姿势”正确。768：左侧缩略参照 + 右侧主画布两栏，播放条与状态卡完整，深蹲股四头肌高亮可见。
- **自动化点击超时的根因已定位（不是应用缺陷）**：对照实验中 Playwright `click()` 对所有控件都报超时，`force:true` 同样超时，但“俯卧撑”点击报超时后动作状态已是“动作中”——点击已派发，超时发生在内置浏览器后端点击后的“页面稳定”等待；页面 WebGL 画布持续 `requestAnimationFrame` 渲染使其永不收敛。CSS 无无限动画（只有 200ms 过渡），排除。真实用户不受影响。自动化验收统一用 `evaluate` 直接触发 + 轮询预期效果。若将来要做按需渲染（空闲时停帧）可同时改善此问题与功耗，但属于 Three.js 渲染循环重构，需单独评估。

### 2026-09-16 更新：参赛策略与 MoonBit 占比（OSC2026 9 月黑客松）

赛事为 **MoonBit 国产基础软件生态开源大赛（OSC2026）9 月黑客松**，评优四维度：完成度、MoonBit 生态贡献、工程质量、展示表现；验收要求 MoonBit 为主要实现语言 + 公开仓库 + README/示例/CI/测试 + mooncakes 发布；报名截止 2026-09-24。调研前 BodyMate 手写 JS 3607 行 > MoonBit 2208 行，可复用库仅 422 行，是最大短板。按优先级推进：

- **第 1 步（本条）：解剖术语库迁入 MoonBit。** 新包 `moonbit/anatomy`（`terms.mbt` 376 条数据 + `names.mbt` + `search.mbt`，501 有效行，5 条测试）；`moonbit/core/anatomy_names.mbt` 三个无状态 wire 导出（name / has_name / search，`id^kind^canonical` 记录以 `~` 相连）；`src/full-muscle/anatomy-name-zh.mjs` 退化为 58 行编解码适配器；`scripts/load-moonbit-core.mjs` 让 Node 侧（测试、注册表生成）加载同一 bundle。`.moonignore`、包审计白名单、`check-generated` 的 `pkg.generated.mbti` 新鲜度检查均已纳入 anatomy；`moonbit-stats` 新增“Reusable anatomy terminology library”分组。结果：MoonBit 生产代码 2208 → 2742 行，MoonBit 测试 49 → 56，Node 142 全过，包审计 27 文件 73KB 通过，浏览器实测点击标签与检索经 MoonBit 正常。
- 后续步骤：AI 动作协议校验迁 MoonBit → GitHub Pages 静态部署工作流 → 申报书更新 → MoonBit 原生导出示例。

### 2026-09-16 更新：申报被驳回（“教学类、生态意义不明显、复用性不强”）→ 转向“通用库套件 + 参考应用”

- **第 2 步：AI 动作护栏库 `moonbit/agent`**（领域无关，169 有效行，7 条测试）：`GuardedAction = None | Command(id, 有限数值字段) | Lookup(有界文本)`，白名单 wire `id^key,key~…`，标识符校验无正则依赖。`moonbit/core/agent_guard.mbt` 两个导出；`src/ai/agent-guard.mjs` 唯一 JS 编解码器；本地代理（`completeAiChat` 内经 `load-moonbit-core.mjs` 加载后调用）与浏览器适配器（`applyAiAction` 用 `runtime.guardAiCommand/guardAiLookup`）同用一份规则，JS 中不再保留第二份校验逻辑。已入 `.moonignore`、包审计、`check-generated`、stats 分组。结果：MoonBit 生产 2742 → 2930 行，MoonBit 测试 56 → 65，Node 142 全过，包审计 31 文件 85KB 通过；页面实测：浏览器内 `run_marathon` → none、`push_up` 只保留 `handWidth`；真实模型“请定位胸大肌”经两端护栏后定位 6 个结构。
- 后续：`moonbit/zhnum` 中文数量解析 → MoonBit 原生 CLI 导出示例 → README/moon.mod 库优先改写 → 申报书重写。
- **第 3 步：中文数量解析库 `moonbit/zhnum`**（259 有效行，4 条测试）：`parse_numeral` / `normalize_numerals` / `quantity_before_unit`；`motion.parse_query` 在匹配前归一化数字，因此“手距一点五倍肩宽，夹角六十度，深度百分之八十”“手距１．８倍肩宽”现在都能识别（motion 新增 1 条测试）。已入 `.moonignore`、包审计、`check-generated`、stats 分组。结果：MoonBit 生产 2930 → 3189 行，MoonBit 测试 65 → 70，Node 142 全过，包审计 35 文件 99KB。页面内 `bodymate_motion_parse_query_v1("push_up","手距一点五倍肩宽，夹角六十度","")` → `handWidth=1.5,elbowAngle=60`。
- **第 4 步：`export` 示例**（`b365328`）：四库串联输出 15 行确定性姿态帧 CSV，作为库的第二消费方；已入示例运行器与包审计。
- **第 5 步：库优先改写**（`e361432`）：根 README / 库 README / 架构文档以四个包开篇，写明各补什么生态空缺、谁复用；参考应用退居证明位置；`moon.mod` 升到 0.2.0 并改描述。
- **第 6 步：申报书重写**（本地 `docs/BodyMate_项目申报书.md`，gitignore）：新增“针对上一次申报意见的调整”一节，逐条回应“教学类 / 生态意义 / 复用性”，数字以当前基线为准（MoonBit 生产 3189 行、可复用库 1351 行、70 项测试；Node 142；包审计 37 文件）。
- **仍需用户动作**：① `moon publish` 发布 0.2.0 到 Mooncakes（需登录）；② 推送本地提交到 GitHub；③ 在 9 月 24 日前用新申报书重新提交飞书表单；④ 可选 GitHub Pages 静态部署（工作流未加，需推送权限）。

### 2026-09-16 更新：推送、发布与第二轮加固（0.3.0）

- **推送流程**：`main` 受保护（必须 PR + CI `check`）。PR #27（库套件转向，18 提交）与 PR #28（0.3.0，4 提交）均 CI 通过后以合并提交合入；`origin/main = 3831e3c`。GitHub 仓库描述与主题（moonbit、mooncakes、llm-guardrails、chinese-numerals、anatomy、threejs）已更新。
- **发布**：用户 `moon login` 后自行发布了 0.2.0；助手随后发布 0.3.0（服务器 200）。`npm run moonbit:install-check`（新脚本 `scripts/verify-mooncakes-install.mjs`）在临时模块中从 mooncakes.io 真实 `moon add lqyq666/bodymate@0.3.0` 并运行四个包，通过。
- **agent 0.3.0**：`FieldSpec` 带可选上下界（wire `key:min:max`，可单侧）、`Clamp`/`Reject` 策略、`explain_command`/`explain_lookup` 机器可读原因；新导出 `bodymate_agent_explain_command_v1`；代理与浏览器传入真实参数范围，代理日志记录调整原因。
- **zhnum 0.3.0**：`format_numeral`（标准读法到万亿）、`负` 前缀、`一万亿` 复合单位；0–10999 全量往返测试。
- **基线**：MoonBit 生产 3429 行（可复用库 1573 行）、测试 927 行、76 项；Node 143；包审计 37 文件约 119 KB。README/库 README 增加英文概述。申报书（本地）已同步为 0.3.0 数字。
- **仍需用户动作**：仅剩在 9 月 24 日 24:00 前用新申报书重新提交飞书表单。

### 2026-09-16 更新：评委文档重写与 GitHub Pages 在线演示

- PR #30（`main = 3353a57`）：评委快速开始（`moon add` 路线优先）、一页说明、申报清单、测试矩阵（逐包行 + AI/服务/安装检查）、讲稿、技术审查路线、复现说明全部改为四包库套件叙事；2026-09-13 申报稿保留为历史并加指向说明。
- 新增 `.github/workflows/pages.yml`：每次推送 `main` 把 `index.html` + 已提交资产（143 MB，排除 `assets/environment/source/`）发布到 GitHub Pages；仓库 Pages 已用 API 启用（build type: workflow）。首次部署成功，**在线演示 https://lqyq666.github.io/bodymate/?view=full-body** 实测：模型加载、MoonBit 导出可调、中文数字指令解析正常；无 AI 代理时对话框显示“本地动作引擎已接管”并正常播放宽距俯卧撑（与文档一致）。`ci.yml` 推送触发增加 `zcode/**`。
- README、评委快速开始、申报书（本地）已加在线演示链接。本机到 github.com/github.io 的连接偶发 TLS 超时，重试即可。

## 本地启动与验收命令

先检查而不改动工作区：

```powershell
Set-Location '<仓库根目录>'
git status --short
git diff --check
node --version
moon version
```

完整静态/构建验收：

```powershell
npm ci
npm run check
npm run moonbit:examples
npm run moonbit:package-check
```

本轮已执行的证据：

```text
npm run check
MoonBit: 49 passed, 0 failed
Node:    128 passed, 0 failed
生成物、仓库卫生、冻结人体资产和 MoonBit 规模基线均通过
```

最终仅改动 AI 回退提示文字后，还执行了：

```powershell
node --check assets/runtime/full-muscle-root-adapter.js
node --test test/visual-lab.test.mjs
git diff --check
```

三项均通过。不要把上述测试结果写成医疗有效性、在线服务可用性或正式发布状态。

AI 本地服务只监听回环地址：

```powershell
# 端口没有被占用时启动
npm run ai:serve

# 若 4174 已有服务，先读取健康状态；不要为重启而擅自结束未知进程
Invoke-RestMethod http://127.0.0.1:4174/api/ai/health
```

页面调试应使用本地服务地址；仅使用 `python -m http.server` 时页面仍有离线动作/肌肉功能，但没有 `/api/ai/chat` 代理。

## 优先级与下一步

1. **先保全当前成果。** 阅读差异、运行检查，不要重置、清理或把生成物回退到 `HEAD`。
2. **等待上游可用后完成一次在线 AI 动作验收。** 429 是当前唯一外部阻塞；不要通过修改本地协议来掩盖它。
3. **若继续优化 AI 交互，只做已有能力的可靠性与可见性。** 可增加针对成功动作、模型非 JSON、429、502 和本地回退文案的确定性测试；不得扩展动作范围或授予模型任意浏览器操作权限。
4. **若继续优化现有 UI，只保持已实现的完整人体实验室。** 验证桌面与窄屏的对话区、阶段导航、参数基线和暂停状态；不重新启用退役的颈肩页面或白盒导航。
5. **所有有效修改都遵循“修改 → 针对性测试 → `npm run check` → 审查 diff”。** 只有用户明确要求时才提交、推送或发布。

## Zcode 开场提示词

```text
继续开发本仓库的 BodyMate。先完整阅读 docs/ZCODE_CONTINUATION_HANDOFF_2026-09-15.md，再执行 git status --short、git diff --check 和相关测试。保留所有未提交工作，不要 reset、clean、add . 或 add -A，也不要重新引入 AgentLoop 文件。

当前主页面是完整人体实验室；MoonBit 必须继续拥有动作目录、中文解析、参数校验、Session、相位和 PoseIntent，JS/Three.js 只能呈现。已支持动作仅限俯卧撑、深蹲、弯举；不添加拉伸、放松、新动作、医疗、训练或实测发力功能。

本机 AI 使用 localhost 代理和 DPAPI 配置。不要读取、打印或索取密钥。真实 GLM 基础请求曾成功，但随后的页面动作请求收到上游 429；先把这个外部限制如实保留，等待可用后仅做一次模型驱动宽距俯卧撑的端到端验收。AI 不可用时，页面应明确显示本地动作引擎接管，而不是伪装为模型回答。

完成任何修改后运行适当测试，最后运行 npm run check，报告修改、测试、在线验证和未解决限制的真实状态。
```
