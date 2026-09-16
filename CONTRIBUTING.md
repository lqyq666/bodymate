# 参与开发

欢迎提交问题与 PR。本项目的原则：规则只写一份且写在 MoonBit 里；JavaScript 只做渲染、I/O 与字符串编解码；每个改动都要有测试，并通过完整检查。

## 环境

- Node.js 24、MoonBit `0.1.20260904`（`scripts/moon-toolchain.mjs` 会拒绝其他版本；不在 PATH 时设置环境变量 `MOON` 指向 `moon` 可执行文件）、Python 3（包审计）。
- `npm ci` 安装 JS 依赖；`npm run build` 重建生成物；`npm run check` 是合入门槛。

## 日常命令

| 命令 | 作用 |
| --- | --- |
| `npm run check` | MoonBit + Node 测试、生成物新鲜度、冻结资产哈希、仓库卫生、规模基线 |
| `npm run moonbit:examples` | 运行四个纯 MoonBit 示例 |
| `npm run moonbit:package-check` | 对真实发布 ZIP 做隔离 check/build/test/run |
| `npm run moonbit:install-check [version]` | 从 mooncakes.io 真实 `moon add` 并运行（需网络） |
| `npm run moonbit:stats -- --write docs/MOONBIT_ENGINE_BASELINE.md` | 刷新规模基线（`check` 会校验它是否过期） |
| `npm start` | 启动本地服务并打开完整人体页 |

## 新增一个 MoonBit 包的清单

以 `moonbit/<pkg>/` 为例，缺任何一项 `npm run check` 或包审计都会失败：

1. `moonbit/<pkg>/moon.pkg`（只依赖 `moonbitlang/core`，`supported_targets = "js"`）、源码与 `<pkg>_test.mbt` 黑盒测试。
2. `.moonignore` 加 `!/moonbit/<pkg>/`，让它进入 Mooncakes 包。
3. `scripts/verify-moonbit-package.mjs`：把 `<pkg>` 加进允许路径正则与 `required` 列表。
4. `scripts/check-generated.mjs`：把 `moonbit/<pkg>` 加进接口新鲜度循环；运行 `moon info moonbit/<pkg> --target js` 生成 `pkg.generated.mbti` 并提交。
5. `scripts/moonbit-stats.mjs`：加一个分组，然后刷新基线文档。
6. 若浏览器需要用它：在 `moonbit/core/` 写无状态 wire 导出（`ok|<tag>-v1|...` 字符串），在 `moonbit/core/moon.pkg` 加 import 与 `exports`，`node scripts/build-moonbit.mjs` 重建 `assets/runtime/moonbit-core.js`；JS 侧只写编解码适配器，Node 侧用 `scripts/load-moonbit-core.mjs` 加载同一份 bundle。
7. 在 `moonbit/motion/README.md`（Mooncakes 展示的库说明）增加该包的章节，更新 `CHANGELOG.md`。

## 提交与合入

- `main` 受保护：推特性分支，开 PR，等 GitHub Actions 的 `check` 通过后合并；不直接推 `main`。
- 提交信息用 Conventional Commits（`feat(zhnum): …`、`fix(lab): …`、`docs: …`）。
- 生成物（`assets/runtime/moonbit-core.js`、`*/pkg.generated.mbti`、注册表与运行时 bundle）通过脚本重建后一起提交，不要手改。
- 冻结的人体资产（`assets/anatomy/human-atlas/*.glb`）不得修改；来源与许可见 `assets/anatomy/human-atlas/*ATTRIBUTION.md`。

## 边界

不接受的方向：医疗诊断、疼痛/受伤判断、训练处方、实测发力/肌电结论、通用动作捕捉或任意 rig 重定向、把 AI 输出直接当作执行权限。新动作或新领域数据需要先讨论来源、许可证与验证方式。
