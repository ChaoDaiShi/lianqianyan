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

模型三项配置不完整时 Provider 为 `unavailable`，导师服务只返回有 `fallback` 标记的课程/学习记录基础辅导，不模拟外部模型。

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
