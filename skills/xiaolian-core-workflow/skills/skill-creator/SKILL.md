---
name: skill-creator
description: >
  仅由 xiaolian-core-workflow 调度，或在用户明确点名本技能时直接使用。负责设计、创建和优化 Skill——明确 Skill 目标与触发条件、设计能力契约和目录结构、调度 skill-developer 实现、生成测试用例并完成静态验证。不负责内容开发实现（委托 skill-developer）。
license: MIT
---

# Skill Creator（技能创建与优化）

## 能力契约

| 字段 | 内容 |
|------|------|
| 职责 | 设计 Skill 目标、触发条件、能力契约和目录结构；调度 skill-developer 实现 |
| 适用场景 | 创建新 Skill、优化现有 Skill、评估 Skill 设计 |
| 不适用场景 | 直接在文件中编写内容（委托 skill-developer） |
| 必要输入 | Skill 意图描述或既有 Skill 文件 |
| 标准输出 | Skill 设计方案（目标、契约、目录结构）+ 测试用例 |
| 完成条件 | 设计确认、skill-developer 完成实现、静态校验通过 |
| 失败回退 | 无法确定触发条件时，基于最接近的已有 Skill 类比推断 |
| 可组合 | skill-developer, qa-checker, validate_skills.py |

## 触发条件

仅由 xiaolian-core-workflow 调度，或在用户明确点名本技能时使用。典型场景：用户要求创建新 Skill、优化 Skill、或评估 Skill 设计。

## 核心职责（仅此四项）

### 1. 明确 Skill 目标与触发条件

- 这个 Skill 要解决什么问题？
- 什么情况下应该触发（用户说法、上下文信号）？
- 什么情况下不应该触发（容易混淆的场景）？
- 输入是什么、输出是什么？

### 2. 设计能力契约和目录结构

按 skill-creator 规范（frontmatter 字段、渐进式披露）设计：

```
skill-name/
├── SKILL.md          ← name + description + 正文（<500 行）
├── scripts/          ← 确定性脚本（可选）
├── references/       ← 大段文档、示例（可选）
└── assets/           ← 模板、配置（可选）
```

能力契约必须包含：职责、适用/不适用场景、必要/可选输入、标准输出、完成条件、失败回退、可组合 Skill。

### 3. 调度 skill-developer 实现

设计方案确认后，将实现工作委托给 `skill-developer`：

```
skill-creator（设计方案） → skill-developer（编写正文/脚本/参考） → validate_skills.py → qa-checker
```

### 4. 生成测试用例并完成静态验证

为 Skill 生成 3-5 个测试用例，覆盖：
- 应触发场景（不同措辞）
- 不应触发场景（容易混淆的边界）
- 异常输入场景

最终通过 `scripts/validate_skills.py` 完成静态验证。

## 关键约束

- 不直接编写大段 Skill 正文（委托 skill-developer）
- 不假设平台支持子智能体、浏览器、异步任务通知
- 不引用不存在的外部脚本或工具
- 测试用例为静态文档，不依赖运行时环境
- 信息不足时：不影响整体方向→采用合理默认值；会改变核心职责/安全边界→询问一个关键问题

## 优化已有 Skill 的标准流程

```
skill-creator（分析问题） → skill-developer（执行修改） → validate_skills.py → qa-checker
```

每次优化聚焦一个明确的问题，不过度重构。

## 输出格式

```markdown
## Skill 设计方案

**名称**：xxx
**目标**：一句话
**触发条件**：...
**不触发场景**：...
**能力契约**：[表格]
**目录结构**：[树形]
**测试用例**：[3-5 个]
```
