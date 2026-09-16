# BodyMate 测试矩阵

`npm run check` 是完整项目检查；`npm run moonbit:package-check` 是发布包隔离验收；`npm run moonbit:install-check` 是从 mooncakes.io 真实安装的验收（需网络）。三者互补，不能用 HTTP 200 或单个示例替代。

| 范围 | 证据 | 检测问题 |
| --- | --- | --- |
| `agent` 库黑盒 | `moonbit/agent/agent_test.mbt` | 标识符契约、白名单解析（含边界、单侧边界、倒置边界丢弃）、候选字段有限性、未知 id/字段丢弃、Clamp/Reject 策略、原因报告、文本截断 |
| `zhnum` 库黑盒 | `moonbit/zhnum/zhnum_test.mbt` | 中文数字解析（大写、两、负、一万亿）、畸形输入拒绝、文本归一化（全角、百分之）、单位前取数、**0–10999 全量与大数/负数 format→parse 往返** |
| `anatomy` 库黑盒 | `moonbit/anatomy/anatomy_test.mbt` | 归一化与侧别、肌肉/骨骼/结缔回退、检索排序、术语表唯一且纯中文 |
| `motion` 库黑盒 | `moonbit/motion/motion_test.mbt` | 参数边界/幂等、双会话隔离、拒绝不变、暂停与参数保持、极值时间、确定性姿态、中文单位、**中文数字指令** |
| 浏览器 wire 导出 | `moonbit/core/{agent_guard,anatomy_names,full_body_motion,motion_session}_test.mbt` | 抽库后线协议不兼容、护栏/命名/检索的 wire 编码错误 |
| 跨语言边界 | `test/motion-domain-boundary.test.mjs`、`motion-parameters.test.mjs`、`full-muscle-localization.test.mjs` | JS 复制规则、线协议错误；**全部 697 个清单结构经 MoonBit 得到纯中文带侧别名称**；中英文检索 |
| AI 协议与护栏 | `test/ai-chat-protocol.test.mjs` | 请求裁剪、未知动作/字段/非有限值丢弃、越界截断并记录原因、429/1113/1305/502 文案、配置热重载、health 不泄露密钥 |
| 本地服务 | `test/server-smoke.test.mjs`、`test/start-bodymate.test.mjs` | 首页与全部引用资源、清单、HEAD、未配置态、点文件 403、404/405、一键启动与端口复用 |
| 全身几何 | `test/full-body-rig.test.mjs` | 人体漂移、支撑接触、参数极值及骨架稳定性 |
| 环境 / UI 策略 | MoonBit 环境与 ui_feedback 测试及对应 Node 测试 | reduced-motion、方位/质量/距离、指针非法值 |
| 页面结构 | `test/visual-lab.test.mjs`、head-surface 测试 | 旧入口复活、护栏接入、面板展开规则、材质/布局结构回退 |
| 人体与来源 | anatomy、full-muscle、rig 测试 | 冻结 GLB 哈希、mesh 与 source identity、注册表与清单名称一致 |
| 旧领域回归 | core registry/resolver/set/movement/comparison/action/state/events 测试 | 保留兼容 API 的回归；不作为当前全身 UI 端到端证明 |
| 生成物与规模 | `check-generated.mjs`（四个包的 `pkg.generated.mbti`、bundle、注册表）、`moonbit-stats.mjs --check` | 接口/生成物与源码不一致、文档规模过期 |
| 实际发布包 | `verify-moonbit-package.mjs` | 错误打入 GLB/JS/杂项、缺包或示例、从 ZIP 解压后无法独立 check/build/test/run |
| 注册表安装 | `verify-mooncakes-install.mjs` | 已发布版本无法 `moon add`、四个包无法在消费者模块中导入运行 |
| 浏览器回归 | localhost 全身页真实操作与截图（手动） | 控件、参数更新、播放、模型与渲染错误；独立于自动测试记录 |
| 仓库卫生 | `audit-repository-hygiene.mjs` | 已跟踪文本中的疑似凭据和机器路径 |

当前计数：MoonBit 76 项（`npm run moonbit:stats`）、Node 143 项（`npm run verify`）；示例中的断言不计入。测试未证明医学有效性、任意 rig 兼容或官方参赛资格。
