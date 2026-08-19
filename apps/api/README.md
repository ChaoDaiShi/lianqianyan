# Education API（忆涟千言—教）

「忆涟千言—教」EducationMind 的 FastAPI 后端（Education API），与 Web 前端分离。

## 技术栈

- Python 3.11+
- FastAPI + Pydantic v2
- SQLAlchemy 2.0
- 依赖管理：`uv`

## 快速启动

```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

交互式文档：`http://localhost:8000/docs`

## 测试

```bash
uv run pytest
```

## 目录结构

```text
apps/api/
├── pyproject.toml
├── tests/test_health.py
└── app/
    ├── main.py               # 应用入口
    ├── core/config.py        # 配置（数据库 URL 等）
    ├── api/                  # 路由
    │   ├── __init__.py       # 路由聚合
    │   └── routes/           # health / profile / diagnosis / plans / learning / practice / assessment / reports
    ├── domain/models.py      # 领域模型（Pydantic 出入参 + SQLAlchemy 实体）
    ├── db/session.py         # SQLAlchemy 会话
    └── llm/                  # 统一 LLM Provider 抽象（未来接入）
```

## 领域原则

- **LearningEvidence（学习证据）是核心数据**；`POST /api/learning/evidence` 是核心概念入口。
- 数据库层统一使用 SQLAlchemy，第一阶段 SQLite，未来迁移 PostgreSQL/MySQL 仅需覆盖 `EDUCATION_DATABASE_URL`。
- LLM 仅保留抽象契约（`app/llm/provider.py`），未来接入 OpenAI-compatible / DeepSeek / Qwen。
