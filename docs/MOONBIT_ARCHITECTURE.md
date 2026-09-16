# BodyMate MoonBit 架构

## 当前产品与复用边界

当前只有完整人体实验室 `/?view=full-body`。核心可复用包为 `lqyq666/bodymate/motion`，产品用这个包计算动作；三个纯 MoonBit 可执行示例也是它的消费者。它们属于同一个 BodyMate 项目。

```text
                    moonbit/motion
          目录 / 参数 / 中文解析 / 定性参与
            独立 Session / 确定性 PoseIntent
                       ↑         ↑
       MoonBit 示例直接导入       moonbit/core 的 V1 wire 适配器
                                 ↓
                        编译后的 moonbit-core.js
                                 ↓
                  src/full-muscle/motion-domain.mjs
                                 ↓
                    Three.js 人体与网页交互
```

## 动作库职责

- `types.mbt`：公开结果类型、输入参数与错误枚举。
- `catalog.mbt`：三种动作的标识、别名、参数范围、预设及明确的观察基线；对外返回独立数据副本。
- `parameters.mbt`：有限值处理、限幅与步进取整；重复规范化幂等。
- `query.mbt`：有界中英文动作别名、中文参数和单位识别、未支持语义提示。
- `profile.mbt`：作者定义的定性肌群参与及参考依据，权重只用于视觉强调。
- `phase.mbt`：当前三种动作的四个关键阶段、暂停目标和教学说明；浏览器不自行推断阶段语义。
- `pose.mbt`：固定教学骨架的姿态目标标量，同输入同输出。
- `session.mbt`：私有实例状态、typed Result、暂停/速度/相位/参数；快照与内部数组隔离。

`Session` 没有库级单例，支持多个独立消费者。浏览器 `moonbit/core/motion_session.mbt` 为当前主视图持有一个实例，保留原有 `bodymate_motion_session_*` 接口，现有页面无需自行维护第二套状态。

参数修改不重置进度、暂停或速度；切动作归零；stop 保留速度，reset 恢复速度 1；未知动作不会修改状态。revision 计控制命令，不计每帧 tick。pose 的非有限相位归零；tick 拒绝非法 delta，并在乘算前对周期取余防止有限极值溢出。

## 全身页的其他 MoonBit 策略

`moonbit/anatomy` 是第二个可复用库：376 条归一化拉丁名 → 中文术语（206 条肌肉、170 条骨/椎间盘/肋/牙/软骨/筋膜），`normalize_name` 去除左右侧别词，`structure_name_zh(name, kind)` 按结构类别回退，`search_structures` 同时匹配中文与拉丁名并把肌肉排在前面；词典本身通过 `muscle_terms()` / `structure_terms()` 公开。`moonbit/core/anatomy_names.mbt` 以 `bodymate_anatomy_name_v1` / `bodymate_anatomy_has_name_v1` / `bodymate_anatomy_search_v1` 三个无状态 wire 导出给浏览器；`src/full-muscle/anatomy-name-zh.mjs` 只编解码字符串，Node 侧（测试、注册表生成）通过 `scripts/load-moonbit-core.mjs` 加载同一份生成 bundle，因此 JS 中不再保存第二份术语表。

`moonbit/agent` 是第三个可复用库，也是“AI 输出不是执行权限”这条规则的唯一实现：`GuardedAction` 只能是 `None`、`Command(id, 有限数值字段)` 或 `Lookup(有界文本)`；`parse_allowlist` 校验命令 id（`^[a-z][a-z0-9_]*$`）与字段键（`^[A-Za-z][A-Za-z0-9_]*$`），`guard_command` 只保留白名单内的 id 及其声明字段中的有限数值，`guard_lookup` 只接受修剪、截断后仍非空的文本。`moonbit/core/agent_guard.mbt` 以 `bodymate_agent_guard_command_v1` / `bodymate_agent_guard_lookup_v1` 导出；`src/ai/agent-guard.mjs` 是唯一的 JS 编解码器，被本地代理（服务端，经 `load-moonbit-core.mjs`）和浏览器适配器（`applyAiAction`）共同调用，因此模型建议在服务端和页面端接受的是同一份 MoonBit 规则。库本身与动作、肌肉无关，任何 MoonBit Agent 应用都可以用它约束 LLM 提议。

`moonbit/zhnum` 是第四个可复用库：中文数字（零〇一…九、壹…玖、两、十百千万亿、`点` 小数、`半`）解析、文本内数字归一化（全角数字、`百分之X`→`X%`）以及“单位前取数”。`motion.parse_query` 在匹配有界正则前先调用 `normalize_numerals`，所以中文数字指令与阿拉伯数字指令等价，而正则本身零改动。

`moonbit/core/environment_scene.mbt` 决定环境方位扇区混合、距离滞回、质量、视差、灯光和 reduced-motion。`environment-domain.mjs` 解析 frame，`lab-environment.mjs` 加载并呈现四个本地环境 GLB。

`moonbit/core/ui_feedback.mbt` 规范化指针样本、平移/倾斜/时长及 reduced-motion/coarse-pointer 决策。`visual-lab-shell.js` 采集 DOM 坐标并应用 CSS 值。布局、颜色、聚焦和页面语义继续由 HTML/CSS 负责。

## JavaScript 与 Three.js 的职责

JS 负责线协议解析、NFKC 文本规范化、DOM、事件适配和资源生命周期；中文结构名称与检索规则已归 MoonBit。Three.js 负责 GLB、骨架的几何 IK、向量/四元数、相机、材质和绘制。渲染循环把经过时间交给 MoonBit，再用返回相位定位暂停的 AnimationAction；不让渲染器独立推进业务时间。

## 保留的旧领域代码

`moonbit/core` 的 registry、resolver、movements、comparison、actions、state、events、wire 和 types 继续提供既有 14 结构颈肩契约。选区、StructureSet、证据关系与比较回归测试保留，但旧颈肩页、导航和其查询演示已经退役。不能把这些行全部表述为当前全身页的执行逻辑。

## 分发与验证

`.moonignore` 只让 motion 库、anatomy 术语库、agent 护栏库、zhnum 数量解析库、公开接口、测试、四个示例及说明/许可证进入 Mooncakes ZIP。完整应用及人体/环境资产留在 GitHub 项目中；库没有 DOM、Three.js、GLB、npm 包或网络依赖，执行 JS target 仍需要 Node.js。

`npm run check` 验证完整应用、MoonBit/Node 测试、生成物、冻结人体和规模基线；`npm run moonbit:package-check` 验证真实 ZIP 的路径/体积与隔离后的 check/build/test/run。公开 API `pkg.generated.mbti` 是生成物，修改 API 后先生成再审查。

## 可解释性与边界

移除 MoonBit 后，现有产品会失去动作定义、参数校验、参与提示、会话推进、姿态目标及环境/指针策略，需要重新实现这些规则才能恢复行为。绘制一个静态模型的能力仍在 Three.js 中。

当前只有三种预设教学动作；没有通用动作捕捉、任意 rig 重定向、软组织、实测肌电/受力、诊断、康复或训练建议。颜色是教学提示。库使用者可复用参数、解析和会话契约；采用姿态输出时需要适配当前固定骨架坐标约定。
