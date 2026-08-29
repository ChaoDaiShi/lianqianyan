# EducationMind 1.4.0 账号模型、远程 MCP、主题与语音修复验证记录

验证日期：2026-08-28  
工作分支：`phase-3-1-competition-sprint`  
验证基线：`00d930891ccaf030ab9c9ef1617c9f360eea4c1f` 加当前工作区改动  
验证范围：账号级模型设置、外部语音、昔涟参考音频、深色主题、Turnstile、远程 MCP、项目内技能、品牌素材、平台发布包。

## 功能结果

- 设置页支持系统、浅色、深色三种主题；匿名状态使用本地偏好，登录后同步账号偏好。
- 支持账号级 LLM/TTS 模型配置、选用与删除；API 密钥只写不回显，并使用部署密钥加密保存。
- 自定义模型地址受 `EDUCATION_CUSTOM_MODEL_HOSTS` 精确主机白名单限制；生产环境默认要求 HTTPS。
- 登录和注册可启用 Cloudflare Turnstile；未配置时保持开发兼容，配置后缺少或无效令牌会拒绝请求。
- `/mcp` 提供需要账号访问令牌的 Streamable HTTP MCP；令牌只在创建时返回明文，数据库只保存摘要。
- 远程 MCP 工具以令牌所属账号为边界，不接受调用方伪造 `learner_id`。
- 昔涟语音使用裁剪后的单句参考音频，不再把原素材中的后续参考语句带入推理提示。
- 外部语音支持账号级 OpenAI 兼容 Speech 接口与 GPT-SoVITS 接口；内嵌 Genie-TTS 保留为本机部署选项。
- 两个用户提供的技能包已作为项目内技能导入，不进行全局安装；导航技能包中的外层 Markdown 围栏已规范化。
- 设置页使用基于用户提供视觉参考生成的无文字涟漪花瓣背景。

## 自动化验证

### 前端质量门禁

命令：`pnpm check`

结果：TypeScript `tsc --noEmit` 与 ESLint 均通过，零错误。

### 前端测试

命令：`pnpm exec vitest run`

结果：64 个测试文件通过，220 项测试通过。

### 后端测试

命令：`apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q`

结果：354 项测试通过。存在 1 条来自 Starlette `TestClient` 的上游弃用提示，不是本项目功能失败。

### 生产构建

命令：`pnpm build`

结果：Vite 5.4.21 成功转换 2485 个模块并生成 `dist`。`vendor-pixi` 压缩前约 526.30 kB，触发非阻断体积提示；Live2D/Pixi 已独立分包，不影响构建成功。

### 昔涟语音运行时

- API 状态：`provider=genie_tts`、`configured=true`。
- 实际合成结果：RIFF/WAV、32 kHz、153,644 字节。
- 合成样本：`.local/voice/cyrene-clean-live-check-20260828.wav`
- 合成样本 SHA-256：`0C422CEA0F367B7120776C14E64401DAB6261E26B54ADF35FE4ED0754DDBDFF4`
- 清理后参考音频 SHA-256：`EB9F7564AEDCE832428623E6968EF206ABB5115B965FBBFF9C1B995229C17AA1`
- 原始参考音频固定 SHA-256：`C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`

### 项目技能

- `xiaolian-core-workflow` 静态验证：0 错误、0 警告。
- `lian-navigator` 路由 JSON：语法验证通过。
- 完整源码发布包中的技能文件：24 个。

## 发布包验证

### 完整前后端源码包

文件：`release/EducationMind-Platform-FullSource-1.4.0-20260828-settings.zip`

- ZIP 条目：521
- 包含设置页、远程 MCP、24 个项目技能、品牌背景、Live2D 与清理后参考音频。
- 包内参考音频 SHA-256：`EB9F7564AEDCE832428623E6968EF206ABB5115B965FBBFF9C1B995229C17AA1`
- 未包含 `.env`、SQLite 数据库、`__pycache__` 或 `./` 前缀条目。
- ZIP SHA-256：`078AFBD06FEEAA19950E97032D80A9E68233C762A2B783C03D03D44FFB1F0EDA`

### 平台静态网页包

文件：`release/EducationMind-Platform-Web-1.4.0-20260828-settings.zip`

- ZIP 条目：49
- 包含构建后的设置页与品牌背景。
- 按设计不包含后端、模型、技能、参考音频、数据库或密钥；部署平台需要将同域 `/api/*` 转发到 Education API。
- 未包含 `.env`、SQLite 数据库、`__pycache__` 或 `./` 前缀条目。
- ZIP SHA-256：`453DB18C9F6B52D3F6EB798275808538697E7C923ACC891514B089E0F3F57BB1`

哈希清单：`release/EducationMind-1.4.0-20260828-settings-SHA256.txt`

## 尚未冒充完成的外部验证

- 未在用户目标托管平台执行在线导入、域名、TLS、反向代理或持久化数据库验证。
- 未使用真实 Cloudflare Turnstile 站点密钥进行公网挑战；本地已覆盖关闭、缺令牌、成功、失败和上游异常路径。
- 未使用公网 MCP 客户端跨域接入；本地已按实际 Streamable HTTP 协议验证鉴权、账号隔离、工具调用与撤销。
- 未验证用户计划采用的每一家外部 LLM/TTS 厂商；接口按 OpenAI 兼容 Speech 与 GPT-SoVITS 常见协议实现，部署时仍需填写供应商实际地址、模型名和凭据。

## 工作区说明

本轮未创建提交、未推送远程仓库，也未清理或覆盖其他既有未提交改动。发布包和验证记录来自当前工作区快照。
