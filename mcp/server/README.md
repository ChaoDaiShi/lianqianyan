# MCP Server —— EducationMind（架构预留）

> MCP Server 未来负责把 EducationMind Domain Service 封装为标准 MCP Tools，
> 供其他 Agent 系统（通过 MCP）接入教育能力。

**本轮只保留目录结构、README 与接口设计，不实现任何 Tool，也不编写不可用的假工具。**

## 定位

EducationMind 对外提供三类入口：

```text
Web UI   ·   Education API   ·   MCP Server   ← 本目录
```

通过 MCP，其他 Agent 可以标准地调用教育领域能力（如获取学习画像、诊断学习状态、
生成学习计划、评估作答、更新掌握度、生成学习报告）。

## 目录结构

```text
mcp/server/
├── README.md
└── docs/
    └── tools.md      # 未来 Tool 的接口设计（本轮仅设计）
```

未来实现（后续阶段）时，本目录将增加：

```text
mcp/server/
├── src/education_mcp_server/<tool>.py
├── pyproject.toml
└── tests/
```

## 未来 Tool 接口设计

见 [docs/tools.md](./docs/tools.md)。核心 Tool 与教育领域模型一一对应，
数据最终来源于 LearningEvidence → LearnerProfile → Diagnosis → StudyPlan 的闭环。

## 不做什么（本轮）

- 不实现具体 MCP Tool 逻辑
- 不引入 MCP SDK 依赖
- 不编写“看起来实现了 MCP”的假工具
