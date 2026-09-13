# BodyMate｜MoonBit 全身动作实验室

BodyMate 是一个以 MoonBit 动作领域库为核心的离线人体教学项目。可复用库负责动作参数、中文指令解析、播放状态和确定性姿态目标；完整人体网页是它的实际使用示例。两者属于同一个新项目。

当前网页只有 `/?view=full-body`：415 条肌肉、282 个骨骼及相关结构、21 关节教学骨架，支持俯卧撑、深蹲、弯举，以及暂停、进度、速度、姿势参数、中文选肌和独立站立参照。

## MoonBit 的实际作用

```text
用户选择 / 参数输入 / 每帧经过时间
  → MoonBit motion 库：识别 → 参数校验 → 会话状态 → 姿态标量
  → MoonBit core：保持既有 V1 浏览器接口
  → JavaScript 解析 → Three.js 骨架 / 材质 / DOM
```

`moonbit/motion` 无 DOM、Three.js、GLB、npm 或网络依赖，可直接被其他 MoonBit 项目导入。每个 `Session` 独立拥有状态；参数变化保留暂停位置与速度，拒绝未知动作时不改变状态；同一输入可重复采样得到相同姿态。环境方位、距离滞回、质量策略及指针反馈策略也由 MoonBit 管理。

Three.js 仍负责资产加载、几何 IK、向量/四元数应用、相机、材质和绘制；中文肌肉检索与 DOM 适配留在 JS。库的姿态模型绑定当前教学骨架尺寸，不能宣称任意模型通用或全部应用代码均为 MoonBit。旧颈肩领域模块保留为兼容与回归代码，旧页面已经退役，不列为当前演示能力。

## 三个不依赖网页的可运行场景

需要 MoonBit `0.1.20260904` 和 Node.js：

```sh
moon run moonbit/examples/parameters --target js
moon run moonbit/examples/sessions --target js
moon run moonbit/examples/sampling --target js
```

依次验证：中文参数解析与越界调整；两个会话独立播放与暂停；五个相位的确定性姿态采样。每个示例含断言，成功输出 `PASS`。本地安装工具链不在 PATH 时可运行 `npm run moonbit:examples`。完整 API 与消费示例见 [动作库说明](moonbit/motion/README.md)。

## 完整页面与验证

环境：Node.js 24、MoonBit `0.1.20260904`、Python 3（本地服务与包审计）、支持 WebGL 的 Chromium 浏览器。

```sh
npm ci
npm run build
npm run check
npm run moonbit:examples
npm run moonbit:package-check
npm run moonbit:stats
python -m http.server 4174 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4174/?view=full-body`。正常运行不请求 CDN、远程 AI、模型服务或后台；首次安装工具链和 npm 依赖需要网络。

`moonbit:package-check` 检查实际发布 ZIP、排除应用资产并在隔离目录重新 check/build/test/run；只执行本地验证。Mooncakes 发布状态与正式申报状态见 [申报清单](docs/SUBMISSION_CHECKLIST.md)，本地成功不代表已发布或已获资格。

## 评审入口

- [新项目申报说明（可填写内容、三个场景、差异与边界）](docs/NEW_PROJECT_PROPOSAL_2026-09-13.md)
- [评委快速开始](docs/REVIEWER_QUICKSTART.md) · [MoonBit 技术审查](docs/MOONBIT_REVIEW_GUIDE.md)
- [演示讲稿](docs/DEMO_SCRIPT.md) · [一页项目说明](docs/ONE_PAGE_PROJECT.md)
- [架构](docs/MOONBIT_ARCHITECTURE.md) · [测试矩阵](docs/TEST_MATRIX.md) · [实时规模基线](docs/MOONBIT_ENGINE_BASELINE.md)

## 来源、AI 辅助与限制

自有代码为 MIT；Human Atlas / BodyParts3D 几何及相关衍生表面保留各自 CC BY 4.0 归属，见 [人体来源](assets/anatomy/human-atlas/RIGGED_BODY_ATTRIBUTION.md)。环境为用户提供的 Tripo 导出，哈希与处理过程见 [环境清单](assets/environment/ASSET_MANIFEST.md)。环境资产不进入 Mooncakes 库包。

ChatGPT / Codex 参与设计、实现、测试与文档，见 [开发复盘](docs/DEVELOPMENT_RETROSPECTIVE.md)。参赛者需要理解并解释最终实现。

当前是三种预设教学动作，不模拟软组织或独立手指脚趾；颜色与 profile 权重只用于定性视觉强调，不是实测肌电、受力、诊断或训练处方。
