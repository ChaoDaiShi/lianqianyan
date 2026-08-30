# 涟千言产品说明 PPT V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for execution tracking.

**Goal:** 基于 2026-08-30 最新开发日志与当前真实产品状态，交付一份内容丰富、叙事完整、20 页、16:9、低于 50MB 的《涟千言》创新赛道产品说明 PPTX。

**Architecture:** 以原竞赛模板和已确认的 6 张涟千言主题背景为视觉基础，用 artifact-tool 生成新的 V2 副本；内容按“学习行为 → 学习证据 → 状态理解 → GraphRAG → 下一步行动 → 新证据”的闭环重构。所有产品截图、测试数据和运行状态必须来自当前代码、当前开发日志或现场验证，并通过 speaker notes 记录来源。

**Tech Stack:** PowerPoint/PPTX、OpenAI artifact-tool（JavaScript ES modules）、LibreOffice Portable、Poppler/PDF 检查、PowerPoint XML 文本检查、项目当前 React/FastAPI 运行环境。

## Global Constraints

- [ ] 仅创建或修改 `ppt_work_20260830_v2/**`、本计划文件及最终交付文件 `涟千言_产品说明_创新赛道_V2.pptx`；不修改产品源代码与用户现有未提交内容。
- [ ] 品牌统一为“涟千言”，角色称“小涟”，必要时注明 Live2D 素材“昔涟”。
- [ ] 不出现学校、教师、单位名称；不出现可见“AI辅助制作”标识；不写“全自主 Agent Swarm”。
- [ ] 不伪造用户、学习状态、知识关系、来源、测试结果或运行状态。
- [ ] 每页均使用主题背景，至少覆盖 6 种背景变体；内容页使用局部半透明承载区，保证背景明显可见。
- [ ] 固定边界包括“没有证据，不做假设”“未评估 ≠ 薄弱”；复述不直接修改 Mastery；长期记忆只作为 Tutor 上下文；MiniMax 是当前唯一语音输出路径。
- [ ] 最终文件 20 页、16:9、低于 50MB，可由 `F:\LibreOffice\LibreOfficePortable\App\libreoffice\program\soffice.exe` 正常打开并导出 20 页 PDF。

---

## Task 1: 建立新版内容与证据清单

**Files:**
- Create: `ppt_work_20260830_v2/content-plan.txt`
- Create: `ppt_work_20260830_v2/source-notes.txt`
- Read: `docs/涟千言开发日志.md`
- Read: `docs/architecture.md`
- Read: `docs/superpowers/specs/2026-08-30-lianqianyan-ppt-v2-design.md`

- [ ] 创建 V2 工作目录及截图、渲染、导出子目录。
- [ ] 从最新开发日志提取 3.16–3.21 的可复核能力、边界、测试与浏览器验证证据，并分别标注日志阶段。
- [ ] 为 20 页写出“主结论、可见正文、视觉、来源、禁止夸大点”五项清单。
- [ ] 检查内容清单中是否残留“链千言”“忆涟千言—教”“EducationMind”、旧 TTS 路径或不可证实数字。

**Verification:**

Run: `Select-String -Path 'ppt_work_20260830_v2/content-plan.txt','ppt_work_20260830_v2/source-notes.txt' -Pattern 'TBD|TODO|链千言|忆涟千言—教|GPT-SoVITS|Genie-TTS|全自主 Agent Swarm'`

Expected: 无未解决占位符；旧名和旧能力仅允许出现在明确的禁止项或迁移说明中。

## Task 2: 采集当前真实产品界面证据

**Files:**
- Create: `ppt_work_20260830_v2/screenshots/*.png`
- Read: `package.json`
- Read: project startup documentation and current runtime configuration

- [ ] 只读检查当前端口、运行进程、可用账号/课程状态和现有截图，避免改变用户数据库。
- [ ] 必要时按项目既有方式启动前端和 API，使用独立浏览器会话访问当前真实产品。
- [ ] 优先采集：六维画像/诊断、下一步建议、小涟工作台与长期记忆、知识星图、知识点详情、资源工坊四阶段进度/预览、Live2D 与 MiniMax 状态。
- [ ] 对无法在当前环境证实的界面，不生成假截图；改用真实空状态、真实代码结构图或开发日志证据。
- [ ] 将每张截图的页面、状态、采集日期和数据边界写入 `source-notes.txt`。

**Verification:**

Run: `Get-ChildItem -LiteralPath 'ppt_work_20260830_v2/screenshots' -File | Select-Object Name,Length`

Expected: 每个计划使用的截图均存在、非空、可追溯；无旧品牌截图。

## Task 3: 建立 V2 生成器与视觉系统

**Files:**
- Create: `ppt_work_20260830_v2/build_lianqianyan_v2.mjs`
- Copy/Reuse: `ppt_work_20260829/template-starter.pptx`
- Reuse: `ppt_work_20260829/assets/backgrounds-v2/background-01.png` through `background-06.png`
- Create: `ppt_work_20260830_v2/working-template.pptx`

- [ ] 在首次 authoring 命令前执行一次 artifact operation marker（edit、1 个 PPTX 输出）。
- [ ] 复制现有生成器作为 V2 基础，所有路径和输出名改到 V2 工作目录及最终 V2 文件。
- [ ] 更新页眉、页脚、图片替代文本和 speaker notes 中的品牌名称。
- [ ] 为 6 种背景定义一致的暗/亮遮罩、内容承载区、强调色与章节分配。
- [ ] 保留 16:9、20 页结构，不混入产品内置 6 页课程 PPT 模板作为第二套母版。

**Verification:**

Run: `Select-String -Path 'ppt_work_20260830_v2/build_lianqianyan_v2.mjs' -Pattern '链千言|AI辅助制作|GPT-SoVITS|Genie-TTS'`

Expected: 无可见旧品牌、AI 标识或旧语音路径；若出现在检测/禁止列表中须有明确注释。

## Task 4: 重构 P1–P10

**Files:**
- Modify: `ppt_work_20260830_v2/build_lianqianyan_v2.mjs`
- Output: `ppt_work_20260830_v2/draft-01.pptx`

- [ ] P1–P3 完成问题、定位与三件事的产品价值链。
- [ ] P4–P8 完成学习闭环、证据、六维画像、诊断规划与动态重规划。
- [ ] P9–P10 使用当前真实界面呈现下一步引导、紧凑工作台、历史与长期记忆。
- [ ] 每页只保留一个主结论，丰富信息放在层级化卡片、标注和 speaker notes 中。
- [ ] 为每页补齐 `[Sources]` speaker notes。

**Verification:**

Run: `node ppt_work_20260830_v2/build_lianqianyan_v2.mjs`

Expected: 生成 20 页可打开的中间稿，P1–P10 无溢出、无旧品牌、无未解释的空白。

## Task 5: 重构 P11–P20

**Files:**
- Modify: `ppt_work_20260830_v2/build_lianqianyan_v2.mjs`
- Output: `涟千言_产品说明_创新赛道_V2.pptx`

- [ ] P11–P13 完成课程约束 GraphRAG、知识星图与节点详情/来源导航。
- [ ] P14–P16 完成完整学习过程、资源工坊验证流水线、Live2D 与 MiniMax 明确边界。
- [ ] P17–P18 完成 Agent/Education Tools/MCP 复用关系及最新版四层架构。
- [ ] P19 使用 Phase 1 → 3.21 的开发证据时间线，数字均注明对应阶段，不拼接为虚假总量。
- [ ] P20 以“证据、理解、行动、成长”收束。
- [ ] 生成最终 V2 PPTX，保留旧稿不覆盖。

**Verification:**

Run: `node ppt_work_20260830_v2/build_lianqianyan_v2.mjs`

Expected: 最终路径存在，20 页完整，全部页面均有背景图。

## Task 6: 全量渲染与视觉修正

**Files:**
- Create: `ppt_work_20260830_v2/rendered/*.png`
- Create: `ppt_work_20260830_v2/montage.png`
- Modify: `ppt_work_20260830_v2/build_lianqianyan_v2.mjs`（仅修复发现的问题）

- [ ] 使用 presentation render 工具渲染全部 20 页。
- [ ] 逐页全尺寸检查标题换行、文字溢出、对齐、背景可见度、截图裁切、对比度和视觉密度。
- [ ] 检查 6 种背景是否全部出现，且各页背景不是弱到不可辨识。
- [ ] 修复所有视觉问题后重新生成和重新渲染，直到 montage 与单页检查均通过。

**Verification:**

Run: presentation renderer and `slides_test.py` against `涟千言_产品说明_创新赛道_V2.pptx`

Expected: 20 张渲染图；无异常重叠、越界、占位符或不可读小字。

## Task 7: LibreOffice、PDF、XML 与交付验收

**Files:**
- Create: `ppt_work_20260830_v2/pdf/涟千言_产品说明_创新赛道_V2.pdf`
- Verify: `涟千言_产品说明_创新赛道_V2.pptx`

- [ ] 用 LibreOffice Portable 无界面导出 PDF。
- [ ] 验证 PDF 为 20 页，并抽查/渲染全部页面。
- [ ] 解包检查 PPT XML 中无旧品牌、无“AI辅助制作”、无模板占位符、无旧 TTS 当前能力。
- [ ] 检查 PPTX 文件大小低于 50MB。
- [ ] 检查 20/20 页存在图片/背景对象，最终文件可重新打开。
- [ ] 仅在全部验证命令新鲜通过后宣布完成。

**Verification:**

Run: LibreOffice export, PDF page count, XML string audit, file-size check, and final reopen/render.

Expected: PPTX 20 页、PDF 20 页、PPTX <50MB、无禁用词与占位符，最终交付文件可用。

## Plan Self-Review

- [ ] 全部任务都有明确输入、输出与验证方式。
- [ ] 计划不要求修改产品代码，不覆盖用户现有 PPT 草稿。
- [ ] 视觉、内容、真实性、竞赛格式和文件大小均有独立验收项。
- [ ] 没有 `TBD`、`TODO` 或依赖用户临时决策的步骤。
