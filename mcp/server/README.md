# EducationMind MCP Server

EducationMind 通过官方 Python MCP SDK 提供真实 stdio Server。MCP Tool 与内部 Agent 共享同一个 `EducationToolRegistry`，每次调用都直接进入既有 Application Service，不通过 HTTP 自调用，也不复制画像、诊断、规划、RAG 或重规划逻辑。

```text
MCP Client → tools/list | tools/call → EducationToolRegistry → Application Service
Internal Agent ─────────────────────→ EducationToolRegistry → Application Service
```

## 启动与验证

从仓库根目录运行：

```bash
uv sync --project apps/api
uv run --project apps/api python mcp/server/server.py
```

Server stdout 只承载 JSON-RPC/MCP 协议；普通日志写到 stderr，入口中没有启动提示 `print`。

协议级 smoke 会真实启动上面的子进程，并执行 initialize → tools/list → tools/call `get_learning_diagnosis`：

```bash
uv run --project apps/api python mcp/server/smoke.py
uv run --project apps/api pytest apps/api/tests/test_mcp_server.py -q
```

## 行为边界

- `tools/list` 的 inputSchema 直接来自同一 Pydantic Tool input model。
- `tools/call` 只调用 `EducationToolRegistry.execute`，单次超时为 30 秒。
- 成功和失败都保留 `structuredContent`；失败设置 `isError=true`，不向客户端返回 Python traceback。
- 写工具只有 `generate_study_plan` 与 `replan_study_plan`，annotations 中 `readOnlyHint=false`。
- 不暴露 `evaluate_practice`、Agent Chat、环境变量、API Key、Authorization 或 Base URL。

完整目录和输入见 [docs/tools.md](./docs/tools.md)。
