# BodyMate 复现与生成物

## 完整应用

需要 Node.js 24、MoonBit `0.1.20260904`、Python 3 和 Chromium/WebGL。新版本推送后从公开仓库 clone，运行：

```sh
npm ci
npm run build
npm run check
npm run moonbit:examples
npm run moonbit:package-check
npm run moonbit:stats
python -m http.server 4174 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4174/?view=full-body`。普通构建使用已入库资产，不下载上游人体。启动与运行不需要远程 AI、CDN、数据库或账号；依赖安装需要网络。完整页以 localhost HTTP 为标准验收路线。

## 独立库包

`npm run moonbit:package-check` 使用 `moon package` 的实际 ZIP，逐项检查允许路径（四个库、四个示例、接口、测试、README、许可证）与源码体积，然后解压到新建的 `_build/package-audit/run-*`，运行 check、build、库测试（27 项）和四个示例。库执行只需要 MoonBit 与 Node.js；审计解压使用 Python 标准库。没有 npm 安装、DOM、GLB 或应用源代码参与。

`npm run moonbit:install-check [version]` 更进一步：在临时目录 `moon new` 一个消费者模块，从 mooncakes.io 真实 `moon add lqyq666/bodymate@<version>`（默认取 `moon.mod` 里的版本），导入四个包并运行一段程序，断言输出。它需要网络，因此不进入 `npm run check`；0.2.0 与 0.3.0 均已通过。

## 生成物归属

| 源码 | 生成命令 / 输出 |
| --- | --- |
| `moonbit/{motion,anatomy,agent,zhnum}` + `moonbit/core` | `scripts/build-moonbit.mjs` → `assets/runtime/moonbit-core.js` |
| 四个包的公开 API | `moon info moonbit/<pkg> --target js` → `moonbit/<pkg>/pkg.generated.mbti`（`check-generated` 逐包校验） |
| MoonBit 旧 canonical registry | `build-moonbit-registry.mjs` → registry JSON / JS 投影 |
| `src/full-muscle` 及本地人体资源 | `build-full-muscle-runtime.mjs` → 全身 runtime、navigator、offline transport |
| 冻结人体几何及 manifest | committed build 验证；完整 check 验证生成一致性与冻结哈希 |
| 所有手写 MoonBit 包 | `moonbit-stats.mjs` → 分项统计，`--write` 生成基线 |

`npm run check` 重新生成并校验结果；发现过期会失败，可能保留新生成的差异供审查。不要手改生成的 JS 或 `.mbti`。统计清楚排除生成输出和示例，公开函数数量包含方法与兼容包装，不等于功能数量。

## 真实状态

隔离验证覆盖实际库 ZIP；完整应用覆盖当前工作区；`moonbit:install-check` 覆盖已发布的 registry 版本（0.3.0）。受保护 `main` 上每个 PR 由 GitHub Actions 在 clean checkout 中运行同一套 `check`，可在仓库 Actions 页核对对应 SHA。[当前清单](SUBMISSION_CHECKLIST.md)
