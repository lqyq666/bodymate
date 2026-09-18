# BodyMate 评委快速开始

先验证四个可复用 MoonBit 库能脱离本仓库安装运行，再看同一份库驱动的完整人体页面。当前唯一产品入口是 `/?view=full-body`。

## 1. 五分钟路线（不 clone 也能做）

```sh
moon new demo && cd demo
moon add lqyq666/bodymate            # mooncakes.io 上的 0.3.0
```

在 `cmd/main/moon.pkg` 导入 `"lqyq666/bodymate/agent"`、`"lqyq666/bodymate/zhnum"`、`"lqyq666/bodymate/anatomy"`、`"lqyq666/bodymate/motion"`，然后：

```moonbit
fn main {
  let allowed = @agent.parse_allowlist("push_up^handWidth:0.8:1.8")
  println(@agent.action_wire(@agent.guard_command("push_up", [("handWidth", 2.5)], allowed)))
  // command|push_up|handWidth=1.8  —— 模型给的 2.5 被截断到边界
  println(@zhnum.normalize_numerals("手距一点五倍肩宽，夹角六十度"))   // 手距1.5倍肩宽，夹角60度
  println(@anatomy.structure_name_zh("Left femur", @anatomy.kind_from_string("bone"))) // 左侧股骨
  println(@motion.pose_intent("squat", 0.5, []).unwrap().depth)             // 1
}
```

`moon run cmd/main --target js`。仓库里的 `npm run moonbit:install-check` 自动做同样的事并断言输出。

## 2. 完整复现

需要 Node.js 24、MoonBit `0.1.20260904`、Python 3、Chromium/WebGL。

```sh
git clone https://github.com/lqyq666/bodymate.git && cd bodymate
npm ci
npm run build
npm run check                 # MoonBit 76 项 + Node 143 项 + 生成物/资产/卫生/规模检查
npm run moonbit:examples      # 四个纯 MoonBit 示例，均输出 PASS
npm run moonbit:package-check # 真实发布 ZIP 在隔离目录 check/build/test/run
npm run moonbit:install-check # 从 mooncakes.io 真实 moon add 并运行（需网络）
```

`main` 分支受保护，每个 PR 都由 GitHub Actions 跑同一套 `check`；当前 `main` 的 CI 记录可在仓库 Actions 页核对。

## 3. 四个纯 MoonBit 示例

| 场景 | 输入与预期 | 文件 |
| --- | --- | --- |
| 参数与约束 | 深蹲“宽站距，脚尖外展25度，深度80%”→ 1.8 / 25 / 80；俯卧撑手距 9 → 1.8 并给出范围提示 | `moonbit/examples/parameters/main.mbt` |
| 双消费者会话 | 深蹲经过 2.2 秒相位 0.5；暂停和 reset 不影响独立弯举会话 | `moonbit/examples/sessions/main.mbt` |
| 确定性采样 | 深蹲深度 80%，相位 0.5 的 excursion 为 0.8；同输入两次输出相等 | `moonbit/examples/sampling/main.mbt` |
| 四库串联导出 | 中文指令（zhnum）→ 护栏（agent）→ 双语命名（anatomy）→ 全部动作 15 行确定性姿态帧 CSV | `moonbit/examples/export/main.mbt` |

## 4. 页面路线

不装任何东西：打开在线演示 **https://lqyq666.github.io/bodymate/?view=full-body**（GitHub Pages 静态托管；没有 AI 代理，对话框走内置 MoonBit 动作引擎）。本地运行：

```sh
npm start        # 启动本地服务并打开页面；或 python -m http.server 4174 --bind 127.0.0.1
```

1. 点击“动作”→ 俯卧撑播放；暂停后展开“动作调整”切到宽距：手距 1.8、肘角 60°，进度与暂停状态保留。
2. 在对话框输入“手距一点五倍肩宽，夹角六十度”——中文数字由 `zhnum` 归一化后被 `motion` 识别。
3. 切到“骨骼”并点击任意结构：全部 697 个结构显示中文（`anatomy`）；输入“骶骨”“腰大肌”检索。
4. 若配置了本地 AI（见 [AI 对话接入说明](AI_CHAT_SETUP.md)），让模型“演示宽距俯卧撑”：模型提议在服务端与浏览器各经过一次 `agent` 护栏，越界参数会被截断并在服务端日志写明原因。

## 5. 看代码

按包从公开接口进入：`moonbit/<pkg>/pkg.generated.mbti` → [库说明](../moonbit/motion/README.md) → `<pkg>/*_test.mbt`。然后看 `moonbit/core/{agent_guard,anatomy_names,full_body_motion,motion_session}.mbt`（无状态 wire 导出）→ `src/ai/agent-guard.mjs`、`src/full-muscle/anatomy-name-zh.mjs`、`src/full-muscle/motion-domain.mjs`（只编解码字符串）。前者证明可复用，后者证明产品用的是同一份规则。

[技术审查路线](MOONBIT_REVIEW_GUIDE.md)解释单一事实来源、错误原子性与生成物门禁；[测试矩阵](TEST_MATRIX.md)列出每个包与每层的自动测试。
