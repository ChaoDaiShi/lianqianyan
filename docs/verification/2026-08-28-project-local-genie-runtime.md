# EducationMind 项目内 Genie-TTS 运行时验证记录

验证日期：2026-08-28  
目标版本：1.4.0  
目标：将 Genie-TTS 引擎、推理数据、昔涟模型和干净参考音频放入项目内的隔离目录，并验证网站后端可直接输出昔涟音色。

## 交付结构

项目内运行时根目录为 `runtime/genie-tts`：

- `src/genie_tts`：从 API 虚拟环境中已锁定的 `genie-tts==2.0.2` 包导入，共 68 个文件、4,565,195 字节；
- `GenieData`：共 17 个文件、410,517,475 字节；
- `Output/昔涟AI-GPT-SOVITS--V2proplus`：共 9 个文件、335,992,804 字节；
- `Reference/cyrene-reference.wav`：干净单句参考音频，SHA-256 为 `EB9F7564AEDCE832428623E6968EF206ABB5115B965FBBFF9C1B995229C17AA1`；
- `RUNTIME_MANIFEST.json`：记录引擎版本、来源说明、文件数、字节数和参考音频摘要。

原始外部目录 `F:\gpt sovites 轻量级\Genie-TTS` 未删除、未改写。项目启动和正式完整包不再依赖该目录。

## 配置与隔离

- `EDUCATION_TTS_GENIE_ROOT` 指向项目内 `runtime/genie-tts`；
- API 在导入前将该根目录下的 `src` 加入模块搜索路径，并校验 `genie_tts.__file__` 必须属于此目录；
- `scripts/start-cyrene-web.ps1` 默认使用项目内引擎、模型、GenieData 和参考音频；
- `scripts/build-platform-release.ps1` 的 Windows 完整包只从项目内运行时取材；
- 大型运行时文件通过 `.gitignore` 隔离，只保留可追踪的目录说明；
- API 的 dotenv 路径固定为 `apps/api/.env`，不再随启动当前目录变化；pytest 明确禁用 dotenv 文件源，真实密钥不会污染测试。

## 真实网站语音端点验证

以项目 `apps/api/.env` 的项目内路径启动 API，测试时仅将登录要求关闭，并使用一次性 SQLite 数据库。验证请求：

- `GET http://127.0.0.1:8011/api/voice/status`
- `POST http://127.0.0.1:8011/api/voice/synthesize`
- 文本：`欢迎回来，我们继续今天的学习。`

结果：

- 状态提供方：`genie_tts`；
- 配置状态：`true`；
- HTTP 状态：`200`；
- `X-Voice-Provider`：`genie-tts`；
- `Content-Type`：`audio/wav`；
- 文件签名：`RIFF/WAVE`；
- 音频大小：212,524 字节；
- SHA-256：`B25CFD13EEA7FB5D294628DF9489F9C2776242E39CAA9D5E559C139017083F96`；
- 输出文件：`.local/voice/cyrene-http-project-runtime-smoke-20260828.wav`。

验证完成后 API 进程和一次性测试数据库均已关闭、清理；生成的 WAV 作为人工试听证据保留。

## 自动化验证

- `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q`：359 项通过；
- `pnpm check`：TypeScript 与 ESLint 通过；
- `pnpm exec vitest run`：64 个测试文件、220 项测试通过；
- `pnpm build`：生产构建成功；
- `pnpm dev:cyrene -ValidateOnly`：通过，实际引擎路径为 `runtime/genie-tts/src/genie_tts/__init__.py`，模型文件 9 个、335,992,804 字节。

已知非阻断提示：FastAPI 测试依赖给出 `httpx`/Starlette 迁移警告；Vite 对 `vendor-pixi` 大于 500 kB 给出分块体积警告。两者均未造成测试或构建失败。

## 发布包审计

生成并审计以下 1.4.0 发布物：

- `EducationMind-Platform-FullSource-1.4.0.zip`：12,991,779 字节，524 个文件，包含前端、后端和运行时导入脚本，不包含模型、GenieData、数据库、`.env`、虚拟环境或 `node_modules`；
- `EducationMind-Platform-Web-1.4.0.zip`：12,522,386 字节，49 个文件，仅用于静态平台导入；
- `EducationMind-Windows-Full-1.4.0.zip`：612,035,405 字节，297 个文件，其中项目内 Genie 运行时 101 个文件，包含运行时清单与干净参考音频；
- `EducationMind-1.4.0-SHA256.txt`：记录三个 ZIP 的 SHA-256。

三个 ZIP 均确认：无 `./` 成员前缀，无 `.env`、数据库、`__pycache__`、`.venv` 或 `node_modules` 成员。平台源码包用于平台自行构建前后端；Windows 完整包包含可离线安装的项目内 Genie 运行时。未执行任何第三方平台的在线上传或线上域名验证。
