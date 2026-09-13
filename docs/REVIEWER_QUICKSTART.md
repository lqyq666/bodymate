# BodyMate 评委快速开始

先验证可复用 MoonBit 核心，再看同一核心驱动的完整人体页面。当前唯一产品入口是 `/?view=full-body`，旧颈肩 URL 不作为演示入口。

## 1. 准备与自动验收

需要 Node.js 24、MoonBit `0.1.20260904`、Python 3、Chromium/WebGL。

```sh
git clone https://github.com/lqyq666/bodymate.git
cd bodymate
npm ci
npm run build
npm run check
npm run moonbit:examples
npm run moonbit:package-check
npm run moonbit:stats
```

以上是提交后的复现方法；本轮本地改动在推送前不会出现在远端 clone 中。当前交付状态请查看 [申报清单](SUBMISSION_CHECKLIST.md)。

## 2. 三个纯 MoonBit 场景

| 场景 | 输入与预期 | 文件 |
| --- | --- | --- |
| 参数与约束 | 深蹲“宽站距，脚尖外展25度，深度80%”→ 1.8 / 25 / 80；俯卧撑手距 9 → 1.8，并给出范围提示 | `moonbit/examples/parameters/main.mbt` |
| 双消费者会话 | 深蹲经过 2.2 秒相位 0.5；暂停和 reset 不影响独立弯举会话 | `moonbit/examples/sessions/main.mbt` |
| 确定性采样 | 深蹲深度 80%，相位 0.5 的 excursion 为 0.8；同输入两次输出相等 | `moonbit/examples/sampling/main.mbt` |

`npm run moonbit:examples` 顺序运行三者。包审计还会从实际 ZIP 解压后的代码重新执行三者，此时没有浏览器、GLB 或 npm 依赖。

## 3. 页面路线

```sh
python -m http.server 4174 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4174/?view=full-body`，等人体及控件加载完成。

1. 点击“动作”，应实际播放俯卧撑。暂停后展开“动作调整”，切到宽距：手距 1.8、肘角 60°，进度和暂停状态保留。
2. 选择深蹲，调整站距、脚尖角、下蹲深度；改变播放速度与进度；切换骨骼/透视，观察支撑与中心。
3. 选择弯举，再恢复站立；左侧参照始终独立站立。查询胸大肌并点选肌肉，标签保持中文。

## 4. 看代码

从 [公开 API](../moonbit/motion/pkg.generated.mbti) → [库说明](../moonbit/motion/README.md) → `motion_test.mbt` → `moonbit/core/full_body_motion.mbt` / `motion_session.mbt` → `src/full-muscle/motion-domain.mjs` 顺序检查。前三者证明可复用，后两层证明产品实际使用同一份规则。

[技术审查路线](MOONBIT_REVIEW_GUIDE.md)解释错误原子性、独立会话和生成物门禁；[测试矩阵](TEST_MATRIX.md)列出自动测试与浏览器验收的不同边界。
