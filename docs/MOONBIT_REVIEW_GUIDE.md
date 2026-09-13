# MoonBit 技术审查路线

本项目需要证明的不是 MoonBit 能调用一个网页，而是参数含义、允许的状态变化和姿态输出由同一份可复用 MoonBit 代码决定，网页与纯 MoonBit 使用者都依赖它。

## 建议检查的五件事

1. **独立消费。** 运行三个 `moonbit/examples/*` 包，以及 `npm run moonbit:package-check`。后者从实际 ZIP 解压后运行库与示例，不能依赖仓库中的 Three.js、GLB 或 JS 全局函数。
2. **规则只有一份。** `moonbit/motion/catalog.mbt` 定义动作、范围与预设；`parameters.mbt` 规范化；`query.mbt` 识别有单位的中文参数；`profile.mbt` 输出定性提示与依据；`pose.mbt` 输出姿态目标。`moonbit/core/full_body_motion.mbt` 仅做 V1 序列化。
3. **状态可隔离。** `Session` 字段私有，每个消费者单独创建。`snapshot` 数组复制，外部清空返回数组也不影响会话。不存在库级全局状态；浏览器单视图适配器自己持有一个实例。
4. **失败不会半更新。** `UnknownMotion(id)` / `NoActiveMotion` 在修改状态之前返回。参数变化保留相位、暂停与速度。非法时间不推进，极大有限 delta 先取周期余数以避免溢出；非有限 pose phase 归零。
5. **可以持续维护。** 公开 `pkg.generated.mbti` 由 `moon info` 生成并校验；统计覆盖所有包并分离示例、兼容代码；CI 覆盖 build/check/test、三个场景、实际发布包独立复现。

## 对应证据

| 内容 | 证据 |
| --- | --- |
| 公开类型与方法 | `moonbit/motion/pkg.generated.mbti` |
| 黑盒调用、数组隔离、错误原子性、边界输入 | `moonbit/motion/motion_test.mbt` |
| 页面兼容接口 | `moonbit/core/full_body_motion_test.mbt`、`motion_session_test.mbt` |
| JS 消费边界 | `test/motion-domain-boundary.test.mjs`、`test/motion-parameters.test.mjs` |
| 人体中心、支撑接触、参数极值 | `test/full-body-rig.test.mjs` |
| 源码与运行时一致 | `scripts/check-generated.mjs` |
| 无渲染依赖的实际 ZIP | `scripts/verify-moonbit-package.mjs` |

## 范围说明

可复用不等于任意骨架通用：当前姿态数学绑定教学骨架尺寸。Three.js 负责 IK、向量/四元数、绘制和交互适配。旧的 14 结构颈肩 registry、resolver、comparison 等保留为兼容与单独回归，不在当前全身页演示路线内，也不进入 Mooncakes 包。

[完整架构](MOONBIT_ARCHITECTURE.md) · [三个验收场景](REVIEWER_QUICKSTART.md) · [库 API 文档](../moonbit/motion/README.md)
