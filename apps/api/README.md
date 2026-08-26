# EducationMind API

FastAPI 后端为无登录匿名学习站和 `/#/agent` 独立智能体页提供课程目录、学习证据、画像、诊断、计划、辅导、考试、网络检索、编译模拟与资源生成接口。

## 启动

```powershell
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

默认数据库为当前目录下的 `education.db`。正式部署请设置绝对 `EDUCATION_DATABASE_URL`，并备份后再迁移。

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `EDUCATION_DATABASE_URL` | SQLAlchemy 数据库 URL |
| `EDUCATION_CORS_ORIGINS` | 逗号分隔的 HTTP(S) 宿主 Origin allowlist |
| `EDUCATION_LLM_BASE_URL` | OpenAI-compatible 服务地址 |
| `EDUCATION_LLM_API_KEY` | 外部模型密钥 |
| `EDUCATION_LLM_MODEL` | 外部模型名 |
| `EDUCATION_LLM_TIMEOUT` | 外部模型超时秒数 |
| `EDUCATION_TTS_PROVIDER` | `genie` 或 `gpt_sovits`；未设置时默认后者 |
| `EDUCATION_TTS_BASE_URL` | TTS 服务地址；Genie 默认使用 `http://127.0.0.1:9881` |
| `EDUCATION_TTS_REFERENCE_AUDIO_PATH` | 仅 GPT-SoVITS 模式需要：上游可读取的昔涟参考 WAV 绝对路径 |
| `EDUCATION_TTS_REFERENCE_TEXT` | 仅 GPT-SoVITS 模式需要：与参考 WAV 完全对应的中文文本 |
| `EDUCATION_TTS_TIMEOUT` | 等待语音服务返回音频的超时秒数，默认 60 |
| `EDUCATION_TTS_MAX_AUDIO_BYTES` | 允许代理返回的最大 WAV 字节数，默认 20000000 |

所选语音 Provider 配置不完整时语音状态为 `unavailable`；这不影响导师文本服务自己的 LLM/fallback 状态。

## 昔涟 Genie-TTS / GPT-SoVITS 语音

推荐 Provider 为本机 [Genie-TTS](https://github.com/High-Logic/Genie-TTS) 2.0.2 安全侧车。侧车使用外部 Genie `.venv`，固定加载昔涟 V2ProPlus ONNX 与参考音频，只监听回环地址且只公开健康检查和文本合成。Education API 是网页唯一入口；浏览器只能提交 1–600 字符文本，不能控制模型、参考音频、上游路径或保存位置。

先在仓库根目录安装经审计的单个参考 WAV：

```powershell
apps\api\.venv\Scripts\python.exe apps\api\scripts\install_cyrene_voice.py `
  --zip 'F:\昔涟AI-GPT-SOVITS--V2proplus\昔涟参考音频.zip' `
  --output 'F:\比赛\智能体 ican 教育skill\.local\voice'
```

校验本机 Genie 资产：

```powershell
& scripts\start_genie_voice.ps1 -ValidateOnly -PrintEducationEnvironment
```

在一个终端启动侧车：

```powershell
& scripts\start_genie_voice.ps1
```

启动器默认使用 `F:\gpt sovites 轻量级\Genie-TTS`，也支持 `-GenieRoot`、`-ModelDirectory` 和 `-ReferenceAudio` 覆盖。它逐项验证 9 个模型文件和参考音频哈希，拒绝非回环 host，不请求管理员权限，固定 Uvicorn 单 worker，不修改外部仓库。

在另一个终端配置并启动 Education API：

```powershell
$env:EDUCATION_TTS_PROVIDER = 'genie'
$env:EDUCATION_TTS_BASE_URL = 'http://127.0.0.1:9881'
uv run uvicorn app.main:app --port 8000
```

先检查 `http://127.0.0.1:9881/health`，再检查 `GET /api/voice/status` 是否返回 `provider: "genie_tts"`。`POST /api/voice/synthesize` 只接受 `{"text":"..."}`，返回经过侧车与 Education API 两层校验的 `audio/wav`；错误响应不会泄露上游地址、模型或参考文件路径。

旧 GPT-SoVITS V2 API 仍受支持。设置 `EDUCATION_TTS_PROVIDER=gpt_sovits`，上游需兼容官方 [`api_v2.py`](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py)，并同时配置 `EDUCATION_TTS_BASE_URL`、`EDUCATION_TTS_REFERENCE_AUDIO_PATH` 与 `EDUCATION_TTS_REFERENCE_TEXT`。默认未设置 Provider 时也按此兼容模式解释配置。

排查顺序：侧车启动时资产哈希错误先修正路径或恢复文件；`/health` 为 503 时查看侧车日志；Education 状态不可用时检查 Provider 与 URL；浏览器仍无声时检查 `/api/voice/synthesize` 是否返回带 RIFF/WAVE 头的非空 WAV。不要用增加 worker、开放公网监听或关闭哈希校验规避问题。

必须保留以下署名：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

当 Genie 为当前引擎时，页面另行显示 `Genie-TTS 2.0.2，Copyright (c) 2025 High_Logic，MIT License`。另见仓库根目录 `THIRD_PARTY_NOTICES.md`。

## 测试

```powershell
.venv\Scripts\python.exe -m pytest tests -q
```

全局测试边界会把应用数据库切到系统临时目录，并在结束时清理 SQLite 文件和 sidecar。

## 旧固定学习者清理

```powershell
uv run python scripts\remove_legacy_demo_learner.py --database 'D:\absolute\education.db'
uv run python scripts\remove_legacy_demo_learner.py --database 'D:\absolute\education.db' --apply
```

第一条只读盘点。第二条仅在存在精确 `demo-user-001` 关联行时先备份、后删除；不会删除课程目录或其他 learner ID。
