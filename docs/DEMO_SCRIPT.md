# BodyMate 演示讲稿

## 60 秒

“BodyMate 是四个可以单独 `moon add` 的 MoonBit 库，加一个用它们做出来的MoonRig Console。`agent` 把大模型的提议约束成白名单里的命令——模型说手距 2.5 倍肩宽，护栏截到 1.8 并告诉你为什么；`zhnum` 让‘一点五倍’‘六十度’‘百分之八十’这样的中文数字直接可用；`anatomy` 给 697 个人体结构提供中英文名称与检索；`motion` 管动作参数、独立播放会话和确定性姿态。

同一份 MoonBit 代码驱动浏览器、本地 AI 代理和纯命令行示例；发布包里没有 Three.js、人体模型或 npm 依赖，`moon add lqyq666/bodymate` 就能装。页面上的颜色只是定性提示，不是肌电或受力测量。”

## 三分钟

1. 0:00–0:35：终端 `moon add lqyq666/bodymate`，运行评委快速开始里的 7 行程序：护栏截断、中文数字归一化、左侧股骨、姿态深度——四个包，没有浏览器。
2. 0:35–1:10：`npm run moonbit:examples`，重点看 `export`：15 行确定性姿态帧 CSV，四库串联，PASS。
3. 1:10–2:00：打开 `/?view=full-body`。对话框输入“手距一点五倍肩宽，夹角六十度”→ 参数面板显示 1.5 / 60°；切“骨骼”点一颗牙，标签“左侧下颌中切牙”；输入“骶骨”检索到骨骼。
4. 2:00–2:35：若本地 AI 已配置，让模型“演示宽距俯卧撑”；同时展示服务端日志里护栏的原因行（如 `clamped:handWidth:...`）。解释：服务端与浏览器调用的是同一个 MoonBit 导出。
5. 2:35–3:00：打开 `moonbit/agent/pkg.generated.mbti` 与 `moonbit/zhnum/zhnum_test.mbt` 的往返测试；说明固定参照骨架、三种动作、定性颜色与 AI 辅助开发边界。

## 技术追问准备

- 为什么用 MoonBit？护栏、数字解析、术语与动作规则都是确定性、需要多消费者共用且必须可审查的逻辑；类型、`Result` 与黑盒测试让它们可验证，wire 导出让 JS 只剩编解码。
- 生态意义在哪？`agent`、`zhnum` 与人体无关，任何 MoonBit Agent 或中文应用可直接用；`anatomy` 是该数据集唯一的中文术语字典；每个包有独立测试、接口文件与文档，`moon add` 后即可使用。
- 怎样证明真复用？看 `npm run moonbit:install-check`（从 mooncakes 真实安装并运行）、隔离 ZIP 构建、四个示例，再追到浏览器与代理导入同一导出。
- JS 还有什么？GLB/Three.js、几何 IK、DOM、相机、材质，以及三份只做字符串编解码的适配器。没有把整页伪装成纯 MoonBit。
- 为什么不是任意骨架引擎？`motion` 的姿态尺寸来自固定参照 rig，通用重定向尚未实现，文档已说明。
- 代码多少？现场 `npm run moonbit:stats`：库、策略、适配器、保留兼容代码分项显示，不靠手填数字。
