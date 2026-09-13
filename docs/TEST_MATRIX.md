# BodyMate 测试矩阵

`npm run check` 是完整项目检查；`npm run moonbit:package-check` 是发布包隔离验收。两者互补，不能用 HTTP 200 或单个示例替代。

| 范围 | 证据 | 检测问题 |
| --- | --- | --- |
| 可复用库黑盒 | `moonbit/motion/motion_test.mbt` | 参数边界/幂等、双会话隔离、拒绝不变、数组隔离、暂停与参数保持、极值时间、确定性姿态、中文单位 |
| 浏览器 V1 兼容 | `moonbit/core/full_body_motion_test.mbt`、`motion_session_test.mbt` | 抽库后原浏览器线协议及动作状态不兼容 |
| 跨语言与参数 | `test/motion-domain-boundary.test.mjs`、`motion-parameters.test.mjs` | JS 复制规则、线协议错误、参数只改标签而未改变骨架 |
| 全身几何 | `test/full-body-rig.test.mjs` | 人体漂移、支撑接触、参数极值及骨架稳定性 |
| 环境 / UI 策略 | MoonBit 环境与 ui_feedback 测试及对应 Node 测试 | reduced-motion、方位/质量/距离、指针非法值和策略重复 |
| 中文与页面 | 全身本地化、visual-lab 与 head-surface 测试 | 中文覆盖、旧入口复活、材质/布局结构回退 |
| 人体与来源 | anatomy、full-muscle、rig tests | 冻结 GLB 哈希、mesh 和 source identity 错误 |
| 旧领域回归 | core registry/resolver/set/movement/comparison/action/state/events tests | 保留兼容 API 的回归；不作为当前全身 UI 端到端证明 |
| 生成物与规模 | `check-generated.mjs`、`moonbit-stats.mjs --check` | JS/注册表/公开接口与源码不一致、文档规模过期 |
| 实际发布包 | `verify-moonbit-package.mjs` | 错误打入 GLB/JS/杂项、缺示例、从 ZIP 解压后无法独立运行 |
| 浏览器回归 | localhost 全身页真实操作与截图 | 控件、参数更新、播放、模型与渲染错误；独立于自动测试记录 |
| 仓库卫生 | `audit-repository-hygiene.mjs` | 已跟踪文本中的疑似凭据和机器路径；未跟踪的新材料仍需提交前检查 |

示例中的断言不计为额外 `test` 数量。库包的 8 个黑盒测试属于项目 MoonBit 总测试数的一部分。测试未证明医学有效性、任意 rig 兼容或官方参赛资格。
