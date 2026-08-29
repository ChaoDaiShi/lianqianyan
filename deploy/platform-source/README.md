# EducationMind 平台全栈源码部署

这个 ZIP 是平台上传的主交付物，根目录同时包含 React/Vite 前端和 FastAPI 后端源码。它不依赖仓库外的源代码，也没有额外的外层目录。

## 包内结构

- `src/`、`public/`、`index.html`：前端源码与品牌资产；
- `apps/api/app/`：FastAPI 正式服务；
- `apps/api/scripts/`：数据迁移、昔涟语音与运维脚本；
- `apps/api/tests/`、`src/**/*.test.*`：前后端基本测试；
- `mcp/`：面向智能体宿主的 MCP 服务；
- `.local/live2d/`：当前网站实际使用的昔涟 Live2D 模型与 Cubism Core；
- `package.json`、`pnpm-lock.yaml`、`apps/api/uv.lock`：可复现依赖契约。

## 前端构建

平台需要 Node.js 20+ 和 pnpm。只使用锁文件安装：

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

构建结果在 `dist/`。分离部署前先设置公开 API 地址，再执行构建：

```powershell
$env:VITE_EDUCATION_API_URL = 'https://education-api.example.com'
pnpm build
```

同域部署可以保持该变量为空，并把 `/api/*` 反向代理到后端服务。

## 后端安装与启动

平台需要 Python 3.11 或 3.12、uv，以及一个可持久化的数据目录：

```powershell
Set-Location apps/api
uv sync --frozen
$env:EDUCATION_DATABASE_URL = 'sqlite:///D:/educationmind-data/education.db'
$env:EDUCATION_CORS_ORIGINS = 'https://education.example.com'
$env:EDUCATION_AUTH_COOKIE_SECURE = 'true'
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Linux 平台可把 `EDUCATION_DATABASE_URL` 改成平台持久卷中的绝对 SQLite 路径。生产环境由 Nginx、Caddy 或平台网关提供 TLS，并将前端同域的 `/api/*` 转发到 `127.0.0.1:8000`。账号、会话与学习记录都需要持久化存储；重启实例不得更换数据库。

首次启动会创建数据库表和共享课程目录，但不会创建伪造的学生进度或成绩。升级前先备份 SQLite 文件；不要让多个后端实例直接并发写同一个 SQLite 文件。需要横向扩容时，应先把数据层迁移到支持多实例的正式数据库。

## 可选外部能力

外部大模型仅在三项变量都配置时启用：

```powershell
$env:EDUCATION_LLM_BASE_URL = 'https://llm.example.com/v1'
$env:EDUCATION_LLM_API_KEY = '<secret>'
$env:EDUCATION_LLM_MODEL = 'your-model'
```

Education API 已内嵌 Genie-TTS 2.0.2 依赖，不需要独立语音服务或额外端口；平台源码包携带干净参考音频，但不包含约 750 MB 的 ONNX 模型或 GenieData。平台若支持长期运行的 Python 3.11/3.12、原生 ONNX Runtime 和受控持久卷，可通过 `EDUCATION_TTS_GENIE_ROOT`、`EDUCATION_TTS_MODEL_DIR`、`EDUCATION_TTS_GENIE_DATA_DIR`、`EDUCATION_TTS_REFERENCE_AUDIO_PATH` 与 `EDUCATION_TTS_REFERENCE_TEXT` 挂载项目运行区，并以 `--workers 1` 启动。静态或 Serverless 平台不能承载该本地推理运行时；未配置时网页会明确降级为浏览器语音。完整本机语音环境请使用 Windows Full 包。

语音归属文字：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

## 安全与数据边界

本源码包不包含 `.env`、API Key、SQLite 数据库、运行日志、缓存、`node_modules`、Python `.venv`、GenieData 或 TTS 模型。部署时从平台的秘密管理功能注入环境变量，不要把密钥写入源码或 Vite 的公开变量。

部署后至少检查：

```text
GET /api/health
GET /api/system/llm
GET /api/voice/status
```

健康检查成功只表示服务可访问；考试生成、PPT、知识图谱、联网检索和语音仍应按各自状态接口及一次真实交互逐项验证。
