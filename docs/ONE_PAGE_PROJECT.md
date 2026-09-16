# BodyMate｜一页说明

**项目名称：** BodyMate MoonBit 基础库套件：LLM 动作护栏、中文数量解析、双语解剖术语、参数化动作会话（附全身参考应用）。Mooncakes 模块 `lqyq666/bodymate`，当前 0.3.0。

**方向与使用者：** 开源生态库。`agent` 面向任何用 MoonBit 写 Agent / 工具调用 / 对话式控制的开发者；`zhnum` 面向中文 UI 指令、语音或聊天输入、配置与表单解析；`anatomy` 面向医学、体育、康复教育与可视化项目；`motion` 面向动作回放工具、动画/仿真状态机与需要可复现姿态帧的工具。

**填补的空缺：** 截至 2026-09-16，mooncakes.io 上没有把 LLM 提议约束为白名单命令的护栏原语，中文数字方向只有“数字→中文大写金额”的格式化包而没有反向解析库，也没有解剖学术语字典。四个包都无 DOM、Three.js、GLB、网络或 npm 依赖，可单独 `moon add`。

**每个包做什么：**
- `agent`：宿主声明允许的命令与带上下界的数值字段；模型提议只能收敛为 `None` / `Command` / `Lookup`，越界值按 `Clamp` / `Reject` 处理，`explain_command` 给出机器可读原因。
- `zhnum`：`parse_numeral`（含 负、两、大写、一万亿）、`format_numeral`（标准读法到万亿）、`normalize_numerals`（文本内中文/全角数字与“百分之X”归一化）、`quantity_before_unit`；0–10999 全量往返一致。
- `anatomy`：Human Atlas / BodyParts3D 376 条归一化拉丁名→中文，覆盖 415 肌肉与 282 骨/椎间盘/肋/牙/软骨/筋膜，侧别处理与肌肉优先检索。
- `motion`：三条样例动作的参数契约、中文指令解析（经 zhnum）、独立 `Session`、四阶段讲解、确定性姿态意图。

**复用的证据：** 本地 AI 代理（Node）与浏览器调用同一份 `agent` 规则；四个纯 MoonBit 示例（`export` 串联全部四库输出姿态帧 CSV）；`npm run moonbit:install-check` 在临时模块里从 mooncakes.io 真实 `moon add` 并运行；真实发布 ZIP（37 文件约 119 KB）在隔离目录 check/build/test/run。

**参考应用：** MoonRig Console——离线三维参照骨架回放视图（415 肌肉、282 骨骼及相关结构、21 关节参照骨架），俯卧撑/深蹲/弯举的回放、参数比较、关键帧标注、697 个结构的中文点击与中英文检索，可选本地 AI 对话。页面上的每一条规则都来自上述 MoonBit 包，JavaScript 只编解码字符串。

**验证：** `npm run check`（MoonBit 76 项、Node 143 项、生成物新鲜度、冻结资产哈希、仓库卫生、规模基线）、`moonbit:examples`、`moonbit:package-check`、`moonbit:install-check`；受保护 `main` 上每个 PR 由 GitHub Actions 跑同一套检查。规模：MoonBit 生产 3429 行，其中可复用库 1573 行；测试 927 行。

**来源与限制：** 自有代码 MIT；人体几何保留 Human Atlas / BodyParts3D 的 CC BY 4.0 归属，不进入库包；Tripo 环境导出留在应用侧。AI 辅助开发如实披露。`motion` 姿态绑定固定参照骨架，`anatomy` 是展示译名；整套不提供医疗诊断、训练处方或实测发力结论。

**状态：** 首个提交 2026-09-11，82+ 次可追溯提交，无 4 月 29 日前旧工作量；0.2.0 与 0.3.0 已于 2026-09-16 发布。资格与验收以赛事审核为准。
