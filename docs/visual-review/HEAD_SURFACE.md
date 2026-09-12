# 完整五官头部外观调整

日期：2026-09-12。范围：完整人体及左侧真实缩略模型的 presentation 层。

## 结果

默认肌肉视图使用同源 Human Atlas 皮肤、外耳、嘴唇、眼球表层，补出完整五官和灰白头部；颈部肌肉继续外露。表层接到现有 head 骨骼的静止坐标系上，跟随既有动作。骨骼、透视模式隐藏表层并保留原头骨。主模型与缩略模型使用相同表层，摄像机及姿势仍独立。

这不是参考图的二维贴图或逐像素复刻：实际脸型来自项目已有公开解剖源，参考图的理想化雕塑面部、纤维细节仍有差异。不新增医学级生物力学声明。

## 本次文件

- `scripts/build-head-surface.mjs`：校验本地来源并裁出头部皮肤，保留 7 个源部件，共 27,659 个三角形。
- `assets/presentation/head-surface.json`、`ATTRIBUTION.md`：可重复生成的展示数据及来源。
- `src/full-muscle/head-surface.mjs`：表层创建、头骨挂接、显示模式。
- `src/full-muscle/runtime-entry.mjs`、`navigator.mjs`：主模型与小模型接入。
- `scripts/build-full-muscle-runtime.mjs`、`scripts/check-generated.mjs`：构建与生成一致性检查。
- `assets/runtime/full-muscle-runtime.js`：重建后的本地运行包。
- `test/head-surface.test.mjs`、`package.json`：新增 5 项回归测试。
- `index.html`：运行包缓存版本更新。

## 验证

- `npm run check`：退出码 0；MoonBit 30/30；Node 96/96；生成一致性、仓库检查通过。
- 骨骼及透视 UI 实测恢复原头骨，肌肉模式恢复完整脸部。
- UI 实测俯卧撑播放、暂停，头部随动作移动；全部 3 个既有动作的多个阶段通过绑定测试。
- UI 实测恢复站立；页面仍显示 415 肌肉与 282 骨骼及相关结构。
- 当前浏览器控制台 error 记录为空，当前页面资源记录无外部 HTTP(S) 请求。
- 本次开始时对 MoonBit 与 anatomy 目录的 34 个文件取哈希；结束复查无变更、无删除。
- 颈肩 GLB：`FA6A0CFDDF1DA59367EA8EB72DB77770A08A2F53D01097C2873ECFFD692F7065`。
- 绑定全身 GLB：`CD2E2108F7551B87928989C445C78E8BB35D867C89D90CD766623CB4CF7E1522`。
- [1440×900 页面截图](head-surface-desktop.jpg)。临时浏览器尺寸与缓存调试设置已复原。

状态：MODIFIED / TESTED / BUILT / 本地页面 ONLINE_VERIFIED。未作发布或用户正式验收声明。
