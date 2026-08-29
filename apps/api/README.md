# EducationMind API

FastAPI 后端为正式账号学习站和 `/#/agent` 独立智能体页提供登录注册、会话、课程目录、学习证据、画像、诊断、计划、辅导、考试、网络检索、编译模拟、资源生成和昔涟语音接口。

## 安装与普通启动

```powershell
uv sync --frozen
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

内嵌 Genie-TTS 时不要使用 `--reload`。重载器会保留父子进程和共享监听端口，并在每次后端文件变化时重新加载大模型；异常关闭终端后，残留 worker 可能与新 worker 同时响应 8000 端口。需要热更新代码时，先完整停止当前后端再重新运行上面的单 worker 命令，或直接使用项目的 `pnpm dev:cyrene` 入口。

未提供完整语音资产时，API 正常启动，`GET /api/voice/status` 如实返回 `unavailable`，网页明确降级为浏览器语音。需要在当前 Windows 工作站同时启动内嵌昔涟语音和网站时，从仓库根目录执行：

```powershell
pnpm dev:cyrene
```

该入口只启动 Education API 与 Vite 两个进程；Genie-TTS 2.0.2 在 Education API 生命周期中加载，不监听额外端口。只读校验使用 `pnpm dev:cyrene -ValidateOnly`。

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `EDUCATION_DATABASE_URL` | SQLAlchemy 数据库 URL |
| `EDUCATION_CORS_ORIGINS` | 逗号分隔的 HTTP(S) Origin allowlist |
| `EDUCATION_AUTH_REQUIRED` | 是否要求正式认证，生产默认 `true` |
| `EDUCATION_AUTH_COOKIE_SECURE` | HTTPS 部署应设置为 `true` |
| `EDUCATION_LLM_BASE_URL` / `API_KEY` / `MODEL` | 外部 OpenAI-compatible 模型配置 |
| `EDUCATION_TTS_PROVIDER` | 默认 `genie`；旧链路可显式设为 `gpt_sovits` |
| `EDUCATION_TTS_GENIE_ROOT` | Genie 模式必需：项目内 `runtime/genie-tts` 绝对目录 |
| `EDUCATION_TTS_MODEL_DIR` | Genie 模式必需：昔涟 ONNX 模型绝对目录 |
| `EDUCATION_TTS_GENIE_DATA_DIR` | Genie 模式必需：GenieData 绝对目录 |
| `EDUCATION_TTS_REFERENCE_AUDIO_PATH` | 昔涟固定参考 WAV 绝对路径 |
| `EDUCATION_TTS_REFERENCE_TEXT` | 与参考 WAV 完全对应的文本 |
| `EDUCATION_TTS_BASE_URL` | 仅旧 GPT-SoVITS HTTP 模式需要 |
| `EDUCATION_TTS_TIMEOUT` | 旧 HTTP Provider 超时秒数，默认 60 |
| `EDUCATION_TTS_MAX_AUDIO_BYTES` | 最大 WAV 字节数，默认 20000000 |

## 内嵌昔涟语音

```powershell
$env:EDUCATION_TTS_PROVIDER = 'genie'
$env:EDUCATION_TTS_GENIE_ROOT = 'D:/educationmind/runtime/genie-tts'
$env:EDUCATION_TTS_MODEL_DIR = 'D:/educationmind/runtime/genie-tts/Output/昔涟AI-GPT-SOVITS--V2proplus'
$env:EDUCATION_TTS_GENIE_DATA_DIR = 'D:/educationmind/runtime/genie-tts/GenieData'
$env:EDUCATION_TTS_REFERENCE_AUDIO_PATH = 'D:/educationmind/runtime/genie-tts/Reference/cyrene-reference.wav'
$env:EDUCATION_TTS_REFERENCE_TEXT = '能在梦里听见朦胧的神谕。'
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

启动时先确认 `genie_tts` 从项目运行区的 `src` 加载，再按固定 SHA-256 清单验证 9 个 ONNX/二进制模型、5 项中文运行资源和参考 WAV，并加载唯一角色 `cyrene`。模型实际就绪后，`GET /api/voice/status` 才返回 `provider: genie_tts`。该状态接口是不含模型路径、参考音频路径或密钥的公开就绪探针；`POST /api/voice/synthesize` 仍要求有效登录会话。初始化失败不会阻止账号、学习和考试 API 启动。

`POST /api/voice/synthesize` 只接受 1–600 字符文本。推理在一个异步锁内串行执行，输出必须为 32 kHz、单声道、16 位 RIFF/WAVE，临时文件在读取后立即删除。浏览器不能指定模型、参考音频、路径、保存位置或推理参数。必须使用一个 Uvicorn worker，否则每个 worker 都会重复加载模型。

旧 GPT-SoVITS V2 HTTP API 仍可显式配置：设置 `EDUCATION_TTS_PROVIDER=gpt_sovits`，并同时提供 `EDUCATION_TTS_BASE_URL`、参考 WAV 路径和匹配文本。

必须保留以下署名：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

Genie 模式另行显示：`Genie-TTS 2.0.2，Copyright (c) 2025 High_Logic，MIT License`。完整边界见仓库根目录 `THIRD_PARTY_NOTICES.md`。

## 测试

```powershell
uv run pytest tests -q
```

测试数据库位于系统临时目录并在结束时清理；测试不会加载真实昔涟模型。
