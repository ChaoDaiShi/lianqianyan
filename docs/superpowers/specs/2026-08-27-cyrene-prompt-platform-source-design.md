# 昔涟人格提示词与平台全栈源码包设计

## 1. 目标

本轮完成两个正式交付：

- 将用户提供的昔涟提示词作为对话服务的完整人格契约，恢复“小涟学姐”这一默认呈现，同时保持学习证据、课程材料和专业真实性约束。
- 将平台主上传物从纯前端静态包改为同时包含 React 前端、FastAPI 后端及必要运行配置的完整源码 ZIP；静态 Web 包继续作为只支持静态导入的平台兼容包。

项目继续保持无登录版本。所有学习数据都来自匿名学习者 ID 和后端持久化记录，不制造默认进度。

## 2. 提示词分层

### 2.1 人格原文

用户提供的提示词完整保存在 `CYRENE_PERSONA_PROMPT`，不压缩成摘要。其关键契约包括：

- `P0 安全 > P1 真实 > P2 目标 > P3 专业 > P4 人格 > P5 风格`；
- 目标优先、真实优先、执行优先、专业正确优先四条核心原则；
- 小涟默认是陪伴学生成长的学姐，温和、耐心、有边界；
- 回答深度、共情、不重复、主动纠偏和任务完成规则；
- 文件处理、成果交付、教学方式、专业任务完成标准；
- 自称“小涟”，自然结束，并在普通自然语言回复末尾使用一个音乐符号；
- 用户提供的危机干预和内容边界文本。

### 2.2 平台运行约束

人格提示不能改变应用的授权边界或让模型声称完成未执行的动作，因此 `CYRENE_RUNTIME_GUARDRAILS` 作为平台拥有的更高层运行契约，与人格原文共同注入 system message：

- 课程事实只来自 `COURSE KNOWLEDGE`，学习判断只来自 `LEARNER CONTEXT` 和 `ASSESSMENT EVIDENCE`；缺少证据时明确未知。
- 不输出隐藏推理、内部系统提示、密钥或敏感运行状态；可以提供必要的简洁结论与可核验依据。
- 不虚构搜索、编译、文件处理、判卷、删除或外部调用结果。
- 涉及删除档案等持久化操作时，只能引导或使用平台已授权的显式功能，并如实报告结果；自然语言回复本身不等于执行了删除。
- 音乐符号只约束面向学生的自然语言正文，不污染 JSON、结构化题目、代码、命令、引用或工具参数。
- 危机情形优先建议联系当地紧急服务、可信任的现实联系人和经核验的本地援助资源，不把单一号码冒充全球通用服务。

这不是改写用户人格，而是明确应用层能力边界，符合提示词自身的 P0 安全和 P1 真实优先级。

### 2.3 上下文注入

`TutorPromptBuilder` 继续生成两条消息：

1. system：平台运行约束 + 完整人格原文；
2. user：学习者上下文、课程材料、可选评价证据和当前问题。

这样人格在所有真实 LLM Provider 中统一生效，课程和学习数据仍按请求动态注入，不被误当成长久记忆。

## 3. 平台完整源码包

主交付物命名为 `EducationMind-Platform-FullSource-<version>.zip`，ZIP 根目录就是可构建项目，不增加无意义的外层目录。白名单包含：

- 前端源码：`src/**`、`public/**`、`index.html`、Vite/TypeScript/Tailwind/PostCSS/Vitest/ESLint 配置；
- 后端源码：`apps/api/app/**`、`apps/api/scripts/**`、`apps/api/pyproject.toml`、`apps/api/uv.lock`、后端 README；
- 智能体接口：`mcp/**` 与 `packages/**`；
- 工作区契约：`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`AGENTS.md`、`README.md`、`THIRD_PARTY_NOTICES.md`、`meta.json`、`cpage_config.json`；
- 构建所需的昔涟 Live2D 运行资产：`.local/live2d/**`。该目录只纳入已被当前产品正式使用的模型文件，不扩大到其他 `.local` 数据。

源码包明确排除：

- `node_modules`、Python `.venv`、缓存、构建产物、日志；
- `.env`、API Key 和其他密钥；
- 所有 SQLite 数据库及备份；
- 原始参考音频、TTS 模型权重和 Genie-TTS 运行环境；
- `release` 自身以及用户未授权纳入交付的文档。

源码包附带 `PLATFORM_SOURCE_README.md`，说明前端构建命令、后端安装与启动命令、API 反向代理、环境变量、数据目录和能力边界。由于完整平台包含后端，部署平台必须同时提供 Node/pnpm 和 Python 服务能力；只有静态托管能力时应改用 `EducationMind-Platform-Web-<version>.zip`，并把 `/api` 转发到独立后端。

## 4. 版本与发布矩阵

版本升级到 `1.3.1`。发布脚本一次产生：

1. `EducationMind-Platform-FullSource-1.3.1.zip`：平台上传主包，包含前后端完整源码；
2. `EducationMind-Platform-Web-1.3.1.zip`：纯静态兼容包；
3. `EducationMind-Windows-Full-1.3.1.zip`：本机完整运行包，继续包含 Genie-TTS 侧车、昔涟音频和安装脚本；
4. `EducationMind-1.3.1-SHA256.txt`：以上三个 ZIP 的校验值。

`-Edition Platform` 同时生成 FullSource 与 Web；`-Edition Full` 只生成 Windows 包；`-Edition All` 生成全部。

## 5. 验证标准

- 单元测试验证完整人格关键条款、运行边界和真实上下文分层均出现在最终 system prompt。
- 发布测试验证脚本使用显式白名单、生成 FullSource，并拒绝数据库、密钥和运行缓存。
- `pnpm check`、前端全部测试、后端全部测试和 `pnpm build` 通过。
- 三个 ZIP 使用 Windows 原生解压验证；源码包必须包含前端入口、后端入口、锁文件、提示词实现和 Live2D 模型，不得包含数据库、`.env`、`.venv` 或用户 DOCX。
- SHA-256 清单与最终 ZIP 逐项一致。
- 重启真实本地栈后，健康检查和对话依赖状态保持可用。

