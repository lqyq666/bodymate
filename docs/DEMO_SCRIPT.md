# BodyMate 演示讲稿

## 60 秒

"BodyMate 是 MoonBit 上第一个 LLM 工具调用护栏。任何用大模型做 function calling 的应用都怕模型幻觉一个工具名、给一个越界参数或一个非法枚举值。我们的 `agent` 库把模型提议收敛成白名单命令——模型说 brightness 200，护栏截到 100 并告诉你为什么；模型说 mode disco，护栏丢弃它因为不在枚举里；模型幻觉了 delete_database，护栏直接拒绝。

应用怎么接入？改一行 base_url。我们的 OpenAI 兼容网关拦截每个 tool_calls 响应，逐条过 MoonBit 护栏再把清洁的参数还给应用。

这不是假设——Python 生态 Guardrails AI 的工具调用校验还是开放 issue，NeMo 需要整个框架；MoonBit 上我们是唯一的。`moon add lqyq666/bodymate` 就能用。"

## 三分钟

1. 0:00–0:30：终端运行 `node scripts/demo-guard-interception.mjs --mock`。指着输出讲："模型提议 brightness 200、mode disco、外加幻觉 delete_database。应用收到 brightness 100、mode 被丢弃、delete_database 被拒绝。每一步都有原因码。"
2. 0:30–1:00：打开 `moonbit/agent/guard.mbt` 的 `explain_command`——指着代码讲类型安全：`FieldValue::Num | Str`、`FieldSpec::one_of`、`RangePolicy::Clamp`。MoonBit 拥有全部规则，没有正则。
3. 1:00–1:40：`npm run guard:serve`（或 `GUARD_UPSTREAM_URL=…coding/paas/v4`）。"任何 OpenAI SDK 只改 base_url，就这么一行。"指着 `x-guard-verdicts` 响应头讲可审计性。
4. 1:40–2:20：打开 [在线库工作台](https://lqyq666.github.io/bodymate/console.html)。agent 面板粘贴模型 JSON、改白名单和策略，实时看到裁决与原因码。zhnum 面板输入"手距一点五倍肩宽"，看归一化和 `motion.parse_query` 联动。
5. 2:20–3:00：`npm run moonbit:install-check`——从 mooncakes.io 真实 `moon add` 并运行。"Python 有 NeMo 和 Guardrails AI，但 Guardrails AI 的工具调用校验还是开放 issue，NeMo 需要整个 Colang 框架。MoonBit 上我们是唯一的。"

## 技术追问准备

- 为什么用 MoonBit？工具调用护栏是确定性逻辑：白名单、数值边界、枚举匹配、策略裁决。类型系统和 `Result` 让这些规则可审查，wire 导出让 JS 只做编解码。
- Python 已经有了，你做 MoonBit 版的意义？这是 MoonBit 生态大赛——mooncakes.io 上没有这个原语，但需求已被 Python 生态验证（Guardrails AI issue #1601、NeMo 的 tool calling rail）。"被验证的需求 + 空白的生态"。
- 真实模型会自我纠正，护栏有用吗？glm-5.3-flash 确实会自我纠正——但这是"希望"不是"保证"。不同模型、多轮对话、prompt injection、更小的模型不一定纠正。护栏是确定性保证：无论模型多聪明，白名单外的命令不会到达你的应用。
- 怎么证明真复用？`npm run moonbit:install-check` 从注册表真实安装并运行四个包；隔离 ZIP 构建；网关和浏览器用同一个 wire 导出。
- 代码多少？`npm run moonbit:stats`：agent 382 行 + zhnum 338 行 + anatomy 501 行 + motion 422 行，全部可复用库。
