# BodyMate AI 对话接入

完整人体页面已经能在本地播放俯卧撑、深蹲和弯举，并以 MoonBit 的定性参与 profile 高亮相关肌群。本接入层让用户可以自然语言提问；模型只能提出受限的“播放已支持动作”或“检索本地肌肉”建议，浏览器会再次用现有 MoonBit 目录验证后才执行。

## Windows：从剪贴板配置 GLM

如果 GLM 标准开放平台的 API Key 已在 Windows 剪贴板中，运行：

```powershell
npm run ai:configure-glm
```

该命令只在本机读取剪贴板，并使用 Windows DPAPI 的当前用户作用域加密保存到 `%LOCALAPPDATA%\BodyMate\ai-provider.dpapi.json`。仓库、浏览器和 `.env.local` 都不会收到明文密钥。默认使用智谱 OpenAI 兼容地址 `https://open.bigmodel.cn/api/paas/v4` 和 `glm-5.3-flash`（旧的 `glm-4.7-flash` 已不在通用端点模型列表中，调用只会得到 1305 拥挤错误）；要换模型或端点，直接给脚本传参：`powershell -NoProfile -File scripts/save-bodymate-glm-from-clipboard.ps1 -Model glm-5.3`。如需替换密钥，重新运行该命令即可。该文件只能由当前 Windows 用户解密，迁移到另一台电脑或另一个账户后需要重新配置。

随后正常启动：

```powershell
npm run ai:serve
```

## 通用本地启动

复制示例配置为本机私有文件，再在本机编辑它：

```powershell
Copy-Item .env.example .env.local
```

在 `.env.local` 中填写一个 **Chat Completions 兼容**服务的三个值：

```text
BODYMATE_AI_API_KEY=仅保留在本机的密钥
BODYMATE_AI_BASE_URL=https://你的服务地址/v1
BODYMATE_AI_MODEL=你的模型名称
```

不要将密钥粘贴进聊天、提交到 Git，或放进浏览器代码。然后启动：

```powershell
npm run ai:serve
```

打开 `http://127.0.0.1:4174/?view=full-body`。没有配置加密 GLM 文件或 `.env.local` 时，该服务仍可加载页面；对话区会明确提示 AI 未配置，并继续保留原有本地动作和肌肉检索功能。

## 数据与执行边界

每次模型请求只会发送：用户本次输入、最近最多六条本次页面对话、当前播放动作及参数，以及 MoonBit 导出的三种可用动作和参数范围。人体 GLB、浏览器密钥、文件系统内容和历史页面数据不会进入请求。

模型返回的 `action` 只允许是：

- `motion`：`push_up`、`squat` 或 `curl`，以及对应的数值参数；
- `muscle`：一个本地肌肉检索词；
- `none`：只回答，不改变画面。

客户端会丢弃未知动作、未知参数、非有限数值和其他操作。真正启动动画、规范化参数和高亮参与肌群仍由现有 MoonBit 动作目录与 Three.js 查看器完成。高亮是定性教学提示，不是实测发力、肌电、诊断或训练处方。

该代理默认只监听 `127.0.0.1`，没有数据库，也不会写入对话记录。若以后部署到公网，应将同一代理迁移到受保护的服务端，并把密钥保存在宿主的秘密管理中。

## 上游错误的可见性

上游返回失败且正文是 JSON 错误对象时，`npm run ai:serve` 的控制台会打印一行 `status`、错误码和错误消息；API Key 和请求头不会出现在日志里。以智谱为例：`1113` 表示账户余额或资源包不足，`1302`–`1305` 表示并发或频率限流（其中 `1305`“该模型当前访问量过大”在模型名已退役时会持续出现，此时应换成当前在售模型，而不是等待）。页面上的 429 提示会对 `1113`（余额）和 `1305`（模型拥挤）分别说明，其余 429 仍显示通用限流提示。

`GET /api/ai/health` 返回 `{ configured, model, endpoint }`——只有模型名和端点地址，不含密钥，用来一眼确认当前到底在调哪个端点、哪个模型。服务每次请求都会核对加密配置文件的大小和修改时间：重新运行 `npm run ai:configure-glm` 后**无需重启**即可生效；文件被删除时 `configured` 会立刻变为 `false`，不会继续沿用内存里的旧配置。

注意 GLM Coding Plan 等包月套餐的额度只在其专属端点内抵扣，不能用于默认的通用端点 `https://open.bigmodel.cn/api/paas/v4`；用套餐 Key 调用通用端点会扣账户余额，余额为零时就会得到 `1113`。要改端点或模型而不重新处理密钥，只需在本机 `.env.local` 中写 `BODYMATE_AI_BASE_URL` 和 `BODYMATE_AI_MODEL` 两行，它们会覆盖加密文件中的对应值，密钥仍留在 DPAPI 密文里。
