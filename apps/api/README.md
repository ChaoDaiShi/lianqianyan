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
| `EDUCATION_TTS_BASE_URL` | GPT-SoVITS V2 服务地址，例如 `http://127.0.0.1:9880` |
| `EDUCATION_TTS_REFERENCE_AUDIO_PATH` | 推理服务可读取的昔涟参考 WAV 绝对路径 |
| `EDUCATION_TTS_REFERENCE_TEXT` | 与参考 WAV 完全对应的中文提示文本 |
| `EDUCATION_TTS_TIMEOUT` | 等待 GPT-SoVITS 返回音频的超时秒数，默认 60 |
| `EDUCATION_TTS_MAX_AUDIO_BYTES` | 允许代理返回的最大 WAV 字节数，默认 20000000 |

模型三项配置不完整时 Provider 为 `unavailable`，导师服务只返回有 `fallback` 标记的课程/学习记录基础辅导，不模拟外部模型。

## 昔涟 GPT-SoVITS 语音

API 只代理部署方另行运行的 GPT-SoVITS 服务，不分发或执行推理包、模型权重和参考音频全集。上游必须兼容官方 [`api_v2.py`](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py) 的非流式 `POST /tts`：EducationMind 固定中文、WAV、`cut5`、批量 1 和非流式参数，浏览器只能提交 1–600 字符的待朗读文本。

先在仓库根目录安装经审计的单个参考 WAV：

```powershell
apps\api\.venv\Scripts\python.exe apps\api\scripts\install_cyrene_voice.py `
  --zip 'F:\昔涟AI-GPT-SOVITS--V2proplus\昔涟参考音频.zip' `
  --output 'F:\比赛\智能体 ican 教育skill\.local\voice'
```

然后配置并启动 API：

```powershell
$env:EDUCATION_TTS_BASE_URL = 'http://127.0.0.1:9880'
$env:EDUCATION_TTS_REFERENCE_AUDIO_PATH = 'F:/比赛/智能体 ican 教育skill/.local/voice/cyrene-reference.wav'
$env:EDUCATION_TTS_REFERENCE_TEXT = '能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。'
uv run uvicorn app.main:app --port 8000
```

`EDUCATION_TTS_REFERENCE_AUDIO_PATH` 必须是 GPT-SoVITS 进程能读取的路径；容器或远程服务要使用只读共享卷中的路径。三项核心变量不完整时 `GET /api/voice/status` 返回 `configured: false`，前端明确使用浏览器备用语音。配置完整时 `POST /api/voice/synthesize` 返回 `audio/wav`，错误响应不会泄露上游地址和参考文件路径。

当前资源目录中可供推理服务配置的权重为：

- `F:\昔涟AI-GPT-SOVITS--V2proplus\GPT-weights\CyreneV3.7-e25.ckpt`
- `F:\昔涟AI-GPT-SOVITS--V2proplus\SoVITS-Weights\CyreneV3.7_e16_s1392.pth`

EducationMind 不含与这些权重匹配的推理程序；部署者仍需提供并启动该程序。必须保留以下署名：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

另见仓库根目录 `THIRD_PARTY_NOTICES.md`。

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
