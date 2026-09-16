# MoonBit 技术审查路线

本项目需要证明的不是 MoonBit 能调用一个网页，而是护栏规则、中文数字语义、术语与检索、参数含义与姿态输出都由同一份可复用 MoonBit 代码决定，浏览器、本地代理与纯 MoonBit 使用者都依赖它。

## 建议检查的五件事

1. **独立消费。** `npm run moonbit:install-check` 在临时模块中从 mooncakes.io `moon add lqyq666/bodymate` 并运行四个包；`npm run moonbit:package-check` 从实际 ZIP 解压后重新 check/build/test/run；四个 `moonbit/examples/*` 均不依赖 Three.js、GLB 或 JS 全局函数。
2. **规则只有一份。** `agent/guard.mbt` 决定哪些模型提议可执行；`zhnum/numerals.mbt` 决定中文数字如何变成数值；`anatomy/{terms,names,search}.mbt` 决定结构叫什么、怎么搜；`motion/{catalog,parameters,query,profile,pose}.mbt` 决定动作、范围、解析、提示与姿态。`moonbit/core/*.mbt` 只做无状态 wire 序列化；`src/ai/agent-guard.mjs`、`src/full-muscle/anatomy-name-zh.mjs`、`src/full-muscle/motion-domain.mjs` 只编解码字符串——JS 里没有第二份术语表、校验逻辑或动作目录。
3. **不信任输入。** `agent` 只接受白名单 id 与声明字段中的有限数值，越界按 `Clamp`/`Reject` 处理并给出原因；`zhnum` 对畸形数字返回 `None` 而不猜测；`motion` 的 `UnknownMotion(id)` / `NoActiveMotion` 在修改状态之前返回，非法时间不推进。
4. **状态可隔离。** `motion.Session` 字段私有，每个消费者单独创建，`snapshot` 返回副本；`agent`、`zhnum`、`anatomy` 全部无状态；浏览器适配器自己持有唯一会话实例。
5. **可以持续维护。** 四个包的 `pkg.generated.mbti` 由 `moon info` 生成并纳入 `check-generated` 过期检查；`moonbit-stats` 按库、策略、适配器、兼容代码分项；受保护 `main` 上每个 PR 由 CI 跑完整 `check`（含隔离 ZIP 测试）。

## 对应证据

| 内容 | 证据 |
| --- | --- |
| 公开类型与方法 | `moonbit/{agent,zhnum,anatomy,motion}/pkg.generated.mbti` |
| 护栏黑盒（边界、策略、原因） | `moonbit/agent/agent_test.mbt`、`moonbit/core/agent_guard_test.mbt` |
| 中文数字往返一致 | `moonbit/zhnum/zhnum_test.mbt`（0–10999 全量） |
| 术语覆盖与检索 | `moonbit/anatomy/anatomy_test.mbt`、`test/full-muscle-localization.test.mjs`（697 结构） |
| 动作黑盒、数组隔离、错误原子性 | `moonbit/motion/motion_test.mbt` |
| 页面兼容接口 | `moonbit/core/{full_body_motion,motion_session,anatomy_names}_test.mbt` |
| 双端共用护栏 | `test/ai-chat-protocol.test.mjs`（服务端）、`test/visual-lab.test.mjs`（浏览器接入断言） |
| JS 消费边界 | `test/motion-domain-boundary.test.mjs`、`test/motion-parameters.test.mjs` |
| 源码与运行时一致 | `scripts/check-generated.mjs` |
| 无渲染依赖的实际 ZIP / 注册表安装 | `scripts/verify-moonbit-package.mjs`、`scripts/verify-mooncakes-install.mjs` |

## 范围说明

可复用不等于任意骨架通用：`motion` 的姿态数学绑定参照骨架尺寸。`anatomy` 是展示用译名，不是临床术语标准。Three.js 负责 IK、向量/四元数、绘制和交互适配。旧的 14 结构颈肩 registry、resolver、comparison 等保留为兼容与单独回归，不在当前演示路线内，也不进入 Mooncakes 包。

[完整架构](MOONBIT_ARCHITECTURE.md) · [评委快速开始](REVIEWER_QUICKSTART.md) · [库 API 文档](../moonbit/motion/README.md)
