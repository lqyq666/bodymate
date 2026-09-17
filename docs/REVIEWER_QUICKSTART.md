# BodyMate 评委快速开始

先验证护栏能拦截幻觉工具调用，再看它如何一行接入任何 OpenAI 应用，最后看同一份 MoonBit 代码驱动的参考应用。

## 1. 五分钟路线（不 clone 也能做）

```sh
moon new demo && cd demo
moon add lqyq666/bodymate            # mooncakes.io 上的 0.4.0
```

在 `cmd/main/moon.pkg` 导入 `"lqyq666/bodymate/agent"`，然后：

```moonbit
fn main {
  let allowed = @agent.parse_allowlist("set_light^brightness:0:100,mode?warm?cool?auto")
  // 模型返回 set_light({brightness: 200, mode: "disco"}) — 全部越界
  let report = @agent.explain_command("set_light",
    [("brightness", @agent.FieldValue::Num(200.0)),
     ("mode", @agent.FieldValue::Str("disco"))], allowed, Clamp)
  println(@agent.action_wire(report.action))   // command|set_light|brightness=100
  println(report.reasons.join("; "))            // clamped:brightness:200->100;unknown_option:mode:disco

  // 模型幻觉了 delete_database
  let rejected = @agent.explain_command("delete_database", [], allowed, Clamp)
  println(@agent.action_wire(rejected.action))  // none
}
```

`moon run cmd/main --target js`。

## 2. 网关：改一行 base_url

```sh
git clone https://github.com/lqyq666/bodymate && cd bodymate
npm ci && npm run build
GUARD_UPSTREAM_URL='https://open.bigmodel.cn/api/coding/paas/v4' npm run guard:serve
# 或 node scripts/demo-guard-interception.mjs --mock（无需 API Key）
```

任何 OpenAI SDK 把 `base_url` 指向 `http://127.0.0.1:4175/v1` — 发出的每个 `tool_calls` 响应先过 MoonBit 护栏再回到应用。拦截输出：

```text
模型提议: set_light(200, "disco") + delete_database()
应用收到: set_light(100)  +  guard_rejected(delete_database)
原因码:   clamped:brightness:200->100; unknown_option:mode:disco; unknown_id:delete_database
```

## 3. 完整复现

```sh
npm run check                 # MoonBit 79 项 + Node 151 项 + 生成物/资产/卫生/规模检查
npm run moonbit:examples      # 四个纯 MoonBit 示例，均输出 PASS
npm run moonbit:package-check # 真实发布 ZIP 在隔离目录 check/build/test/run
npm run moonbit:install-check # 从 mooncakes.io 真实 moon add 并运行（需网络）
npm run test -- test/tool-guard.test.mjs  # 8 项网关确定性测试
```

`main` 受保护，每个 PR 由 GitHub Actions 跑同一套 `check`；30 笔 PR 全部通过后合入。

## 4. 在线参考应用

- [库工作台](https://lqyq666.github.io/bodymate/console.html)：agent 面板做白名单裁决并显示原因码；zhnum 面板做中文数量归一化；motion 面板按参数契约重算姿态帧并导出 CSV。
- [3D 回放视图](https://lqyq666.github.io/bodymate/?view=full-body)：415 肌肉 / 282 骨骼的参照骨架；参数契约、关键帧标注、定性参与映射全部由 MoonBit 计算。

## 5. 看代码

按包从公开接口进入：`moonbit/<pkg>/pkg.generated.mbti` → [库说明](../moonbit/motion/README.md) → `<pkg>/*_test.mbt`。网关核心在 `scripts/serve-tool-guard.mjs`（`allowlistFromTools`：JSON Schema → 护栏 wire；`guardToolCalls`：逐条校验与改写）；JS 侧只编解码字符串（`src/ai/agent-guard.mjs`）。

[技术审查路线](MOONBIT_REVIEW_GUIDE.md) · [测试矩阵](TEST_MATRIX.md) · [竞品对比](../README.md#生态空缺与竞品)
