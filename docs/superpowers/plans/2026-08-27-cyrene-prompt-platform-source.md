# 昔涟人格提示词与平台全栈源码包 Implementation Plan

> **执行约束：** 用户已明确禁止子智能体；本计划在当前会话逐项执行，并以测试和最终工件验证作为完成依据。

**Goal:** 让正式对话使用用户提供的完整昔涟人格提示词，并生成可上传到目标平台、同时包含前端和后端源码的主交付 ZIP。

**Architecture:** 对话 system message 由平台运行约束与完整人格原文组成，请求级学生/课程/评价数据继续放在 user message；发布脚本采用显式白名单分别生成全栈源码包、静态兼容包和 Windows 完整包。

**Tech Stack:** React 18、TypeScript、Vite、Vitest、FastAPI、Pydantic、SQLAlchemy、pytest、PowerShell、.NET ZipArchive、pnpm、uv。

## Task 1：建立昔涟提示词契约

**Files:**

- Modify: `apps/api/tests/test_tutor.py`
- Modify: `apps/api/app/services/tutor_prompt.py`

- [ ] 先把旧“AI 教官”测试改成完整人格与平台运行边界断言。
- [ ] 运行定向 pytest，确认测试因旧提示词而失败。
- [ ] 新增 `CYRENE_RUNTIME_GUARDRAILS` 和 `CYRENE_PERSONA_PROMPT`，并由 `SYSTEM_PROMPT` 组合。
- [ ] 保持 TutorContext、课程材料和评价证据的现有注入协议不变。
- [ ] 运行导师相关测试并提交。

## Task 2：建立完整源码发布契约

**Files:**

- Modify: `apps/api/tests/test_release_assets.py`
- Modify: `scripts/build-platform-release.ps1`
- Create: `deploy/platform-source/README.md`

- [ ] 先增加 FullSource 名称、前后端白名单、锁文件、Live2D 和排除项测试。
- [ ] 运行定向 pytest，确认测试因发布脚本尚未支持源码包而失败。
- [ ] 扩展发布脚本：`Platform` 生成 FullSource + Web，`All` 生成全部。
- [ ] 为源码包逐项复制根配置、前端、后端、MCP、packages 与 Live2D。
- [ ] 在源码包根部复制平台源码部署说明，不复制数据库、秘密、缓存或用户文件。
- [ ] 运行发布测试并提交。

## Task 3：版本与正式文档

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `meta.json`
- Modify: `README.md`

- [ ] 版本更新为 `1.3.1`，产品描述由“AI 教官”调整为符合“小涟学姐/AI 教学助手”的表述。
- [ ] README 将 FullSource 标为平台主上传物，将 Web 标为静态兼容物。
- [ ] 记录完整源码包的前后端部署方式、环境变量和能力边界。
- [ ] 运行元数据相关测试并提交。

## Task 4：全量验证与工件检查

- [ ] 运行 `pnpm test --run`。
- [ ] 运行 `pnpm check`。
- [ ] 运行 `pnpm build`。
- [ ] 运行 `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q`。
- [ ] 使用发布脚本生成 1.3.1 三个 ZIP 和 SHA-256 清单。
- [ ] 原生解压三个 ZIP；核验源码包包含 React、FastAPI、MCP、锁文件、提示词与 Live2D，且不含数据库、密钥、缓存、用户 DOCX。
- [ ] 校验 SHA-256 清单。
- [ ] 重启本地完整栈并检查 API、语音状态及主要页面入口。
- [ ] 读取 verification-before-completion 与 finishing-a-development-branch 技能，按其要求完成最终证据检查和交付。

