# BodyMate 参考 UI 优化记录

日期：2026-09-13（Asia/Shanghai）

本轮在已有未提交成果上继续修改，未提交 Git，未改动人体资产。前置约束见 `CODEX_UI_OPTIMIZATION_HANDOFF_2026-09-13.md`；本文记录这次参考网页优化的增量。

## 参考与实现

实际查看了 [中隐会参考网页](https://ai.zhongyinedu.com/enterprise) 及其公开样式和交互脚本。提取淡紫灰底色、近黑文字、亮蓝色主操作、悬浮反色、箭头旋转和指针倾斜反馈；没有引入参考站的图片、文案、营销内容或网络依赖。

- 全局颜色收敛为 `#EEEFF9 / #16171E / #606371 / #3144FF`。
- 主场景横跨左侧与中央列，参照人体缩为独立小视角。主相机取景倍率从 1.8 调为 1.48，模型、平台位置与动作接触算法未改变。
- 右侧合并为一个连续面板；真实结构计数占一行，动作行有明确选中状态，查询输入固定在面板底部。
- 指针反馈来自 MoonBit `bodymate_ui_feedback_v1`：横移上限 1.5px、上浮 2px、倾斜上限 2°、200ms 复位。DOM 适配器只归一化坐标、节流到动画帧、应用返回值。
- 减弱动态和粗指针关闭空间反馈；CSS 同时关闭箭头变换和过渡。键盘保留蓝色 2px 焦点环。
- 900px 以下采用上下布局，520px 以下搜索独占一行。移动端动作状态为左右画布预留互不重叠的区域。

主要改动：`index.html`、两份 `visual-*.css`、`visual-lab-shell.js`、`full-muscle-root-adapter.js`、新增 `ui_feedback.mbt` 及测试、`moon.pkg` 导出与 `package.json` 检查入口。Three.js 源码增量仅涉及取景倍率与场景背景色；运行时生成物已重建。设计规范和 MoonBit 架构文档同步更新。

## 验收

| 检查 | 结果 |
| --- | --- |
| `npm run build` | 通过 |
| `npm run check` | MoonBit 39/39、Node 120/120；生成物与仓库卫生检查通过 |
| `npm run moonbit:stats` | 13 个生产文件、2054 有效行、51 个导出、39 个测试 |
| `git diff --check` | 通过；已有文件的换行提示不构成错误 |
| 视口 | 1920×1080、1440×900、1024×768、853×900、390×844 均检查，无横向溢出 |
| 动作 | 全身切换动作会启动俯卧撑；深蹲、弯举、暂停、进度、速度、闪烁切换及恢复站立已操作 |
| 参数 | 俯卧撑手距/肘角、深蹲站距/脚尖/幅度两端均经浏览器操作；几何、支撑接触与中心稳定性测试通过 |
| 视图与参照 | 肌肉/骨骼/透视切换正常，左侧前/后/侧视独立，主动作不传播到参照骨架 |
| 中文 | 点选得到“右侧腹外斜肌”“左侧股直肌”；搜索“胸大肌”高亮 6 个结构；415 条中文覆盖门禁通过 |
| 动效 | 指针悬浮时出现真实 matrix3d；离开后四个空间变量归零；减弱动态为 transform:none、transition:0s |
| 浏览器错误 | 本轮最终记录中 console error 为 0 |
| 环境请求 | 四份环境 GLB 从本地 4174 服务加载；小平台另有一次独立加载 |
| 文字对比度 | 主文字/底色 15.61:1，次文字/底色 5.21:1，白字/主蓝 6.17:1 |

桌面低高度下说明与参数区可滚动；手机需要纵向滚动到操作面板。当前保留银白材质和已有环境预算，没有增加后处理或重做环境资产。技能附带视觉扫描器因缺少其内部 `impeccable-config.mjs` 未运行成功，已执行浏览器检查、对比度计算与增量代码 Review，未改动技能安装。

## 证据文件

- [1440 桌面](visual-reference/ui-20260913/desktop-1440.png)
- [1920 宽屏](visual-reference/ui-20260913/desktop-1920.png)
- [按钮悬浮](visual-reference/ui-20260913/button-hover-1440.png)
- [853 平板](visual-reference/ui-20260913/tablet-853.png)
- [390 手机](visual-reference/ui-20260913/mobile-390.png)
- [390 手机动作](visual-reference/ui-20260913/mobile-movement-390.png)
- [浏览器机器证据](visual-reference/ui-20260913/browser-evidence.json)

三个冻结 GLB 的 SHA-256 与接手时一致：

```text
neck-muscles.glb FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065
rigged-body.glb  CD2E2108F7551B87928989C445C78E8BB35D867C89D90CD766623CB4CF7E1522
full-muscles.glb 03F01F82188C4849BA1A2B270CACD5737629E7AB4CB4B06BFF1BB3E57AF59BAE
```

状态：`MODIFIED`、`TESTED`、`BUILT`、`ONLINE_VERIFIED`（仅本地）已具备证据；没有远端部署，`ACCEPTED` 尚待用户视觉确认。
