# BodyMate｜一页说明

**项目名称：** BodyMate — MoonBit LLM 工具调用护栏（附 OpenAI 兼容网关与三个配套库）。Mooncakes 模块 `lqyq666/bodymate@0.4.0`。

**一句话定位：** 大模型返回的工具调用不可直接执行——可能带幻觉工具名、越界数值或非法枚举。BodyMate 的 `agent` 包把模型提议收敛为白名单命令 + 带约束的字段值，其余丢弃并给出机器可读原因码；外加 OpenAI 兼容网关，改一行 `base_url` 接入。

**生态空缺：** Python 有 NeMo Guardrails（需整个 Colang 框架）和 Guardrails AI（工具调用校验仍是开放 issue #1601）；JavaScript 无专门方案；**MoonBit 全注册表扫描无任何同类包**。`moon_zod` / `moonschema` 是通用 schema 校验器，不含动作语义、策略或原因码。

**核心能力：** `FieldValue::Num | Str`（真实工具参数形状）；`FieldSpec::bounded / one_of`（数值边界 + 枚举选项）；`Clamp` / `Reject` 策略；9 种原因码（`clamped:brightness:200->100`、`unknown_option:mode:disco`、`unknown_id:delete_database`…）。网关从请求的 `tools` JSON Schema 自动生成白名单，拦截 `tool_calls` 逐条校验后改写参数。

**配套库：** `zhnum`（中文数字解析与格式化，0–10999 全量往返一致）；`anatomy`（Human Atlas / BodyParts3D 376 条双语术语）；`motion`（参数化动作会话与确定性姿态意图）。四个包均无依赖，可单独 `moon add`。

**参考应用：** MoonRig Console（在线 [库工作台](https://lqyq666.github.io/bodymate/console.html) + [3D 回放视图](https://lqyq666.github.io/bodymate/?view=full-body)），证明同一份 MoonBit 代码驱动浏览器、本地代理和命令行。

**验证：** MoonBit 79 项 + Node 151 项测试全绿；真实发布 ZIP 隔离 check/build/test/run；从 mooncakes.io 真实 `moon add` 安装验证；8 项网关确定性测试；受保护 `main` 上 30 笔 PR 全部 CI 通过；`GUARD_UPSTREAM_URL` 接 Coding Plan 免费额度端到端 200。

**规模：** MoonBit 生产 3522 行（可复用库 1623 行）、测试 1144 行。首提交 2026-09-11，无旧工作量。

**边界：** 不解析 JSON（宿主负责）；不替代通用 schema 校验（互补）；不提供医疗、训练或实测发力结论。

**状态：** 0.4.0 已发布于 Mooncakes；GitHub Release v0.4.0 已建。资格与验收以赛事审核为准。

**来源与限制：** 自有代码 MIT；人体几何保留 Human Atlas / BodyParts3D CC BY 4.0 归属，不进入库包。AI 辅助开发如实披露。
