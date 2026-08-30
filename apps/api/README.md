# 涟千言 API

FastAPI 后端提供正式账号、课程知识、GraphRAG 检索、学习证据、画像、诊断、计划、辅导、考试、资源生成、AnySearch 联网检索、MiniMax 图片生成与 MiniMax 语音输出。

## 安装与启动

```powershell
uv sync --frozen
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

## 主要环境变量

| 变量 | 作用 |
| --- | --- |
| `EDUCATION_DATABASE_URL` | SQLAlchemy 数据库 URL |
| `EDUCATION_CORS_ORIGINS` | 逗号分隔的 HTTP(S) Origin allowlist |
| `EDUCATION_LLM_BASE_URL` / `API_KEY` / `MODEL` | OpenAI-compatible 对话与 AI 优化 |
| `EDUCATION_MINIMAX_API_KEY` | MiniMax 语音与图片生成 API Key |
| `EDUCATION_MINIMAX_BASE_URL` | MiniMax API 地址，默认 `https://api.minimax.io` |
| `EDUCATION_MINIMAX_GROUP_ID` | 旧区域端点可选 GroupId；国际默认端点不需要 |
| `EDUCATION_MINIMAX_MODEL` / `VOICE_ID` | MiniMax 语音模型与音色 |
| `EDUCATION_MINIMAX_IMAGE_MODEL` | MiniMax 图片模型，默认 `image-01` |
| `EDUCATION_ANYSEARCH_API_KEY` | AnySearch API Key（部署需要时配置） |
| `EDUCATION_ANYSEARCH_BASE_URL` | 默认 `https://api.anysearch.com` |

`GET /api/voice/status` 只返回 `minimax` 或 `unavailable`。`POST /api/voice/synthesize` 只接受 1–600 字符文本，并要求有效登录会话；浏览器不能指定密钥、模型或上游地址。项目不再包含本地语音引擎、推理模型、参考音频或浏览器朗读回退。

## 测试

```powershell
uv run pytest tests -q
```

测试数据库位于系统临时目录并在结束时清理；MiniMax 与 AnySearch 的契约测试使用 HTTP mock，不调用真实计费服务。
