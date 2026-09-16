# BodyMate 申报清单

状态更新：2026-09-16。本地完成、远端合入、Mooncakes 发布、报名与正式验收分开记录，不合并勾选。

## 已完成并可在远端核对

- [x] 主体为四个可单独 `moon add` 的 MoonBit 包：`agent`、`zhnum`、`anatomy`、`motion`；参考应用使用同一份实现。
- [x] Mooncakes 发布 `lqyq666/bodymate` 0.2.0、0.3.0（2026-09-16），`npm run moonbit:install-check` 从注册表真实安装并运行通过。
- [x] 公开 GitHub 仓库 `lqyq666/bodymate`，`main` 受保护，PR #27 / #28 / #29 均 CI 通过后合入；真实提交历史保留（首个提交 2026-09-11）。
- [x] `npm run check`：MoonBit 76 项、Node 143 项、生成物新鲜度、冻结人体资产哈希、仓库卫生审计、规模基线。
- [x] 四个含断言的纯 MoonBit 示例；真实发布 ZIP（37 文件约 119 KB）隔离目录 check/build/test/run。
- [x] 每个包的公开接口 `pkg.generated.mbti` 由 `moon info` 生成并纳入过期检查。
- [x] 库优先的 README（中英概述）、库说明、架构、评委路线、讲稿、一页说明、测试矩阵。
- [x] 仓库描述与主题（moonbit、mooncakes、llm-guardrails、chinese-numerals、anatomy、threejs）。

## 待办

- [ ] 2026-09-24 24:00 前用最新申报书重新提交 9 月黑客松表单（上一次意见：教学类、生态意义不明显、复用性不强——本次申报书含逐条回应）。
- [ ] 官方资格审核与最终验收。

不得通过虚构提交、把生成代码计入 MoonBit 或声称不存在的功能来勾选条件。库和网页作为同一个 BodyMate 项目申报。

[大赛官网](https://moonbitlang.github.io/OSC2026/) · [一页说明](ONE_PAGE_PROJECT.md) · [评委快速开始](REVIEWER_QUICKSTART.md)
