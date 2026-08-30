# 《涟千言》PPT 页顶标题与内容增补 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持 20 页、现有昔涟视觉系统和真实产品边界的前提下，把 P2–P19 页顶标题改成中文章节标识，详细补充应用场景与技术要点，并在 P19 简洁写明队长刘世超、队员刘羿涵。

**Architecture:** 继续使用现有 `@oai/artifact-tool` JavaScript 构建器，不直接修改 PPTX XML。通过统一页顶标题映射控制 P2–P19 的章节标识，集中修改 P3、P9、P11、P17、P18、P19 的可见内容，并输出新的 V3 文件以保留 V2 成品。验收通过构建器渲染、`slides_test.py`、LibreOffice PDF 导出和结构化 PPTX 审计完成。

**Tech Stack:** JavaScript ES modules、`@oai/artifact-tool`、LibreOffice、Python 只读 QA 工具、PowerShell。

## Global Constraints

- 输出为 20 页、16:9 PPTX，文件小于 50MB。
- P1 和 P20 不增加章节页眉；P2–P19 使用中文方案 A 页眉。
- 20 页均保留背景图，继续使用 6 种昔涟主题背景。
- 可见页面不出现“AI辅助制作”、旧品牌、学校、教师或单位名称。
- 应用场景和技术要点只描述当前产品已实现能力，不虚构用户、数据或运行结果。
- P19 团队区域只写“队长 刘世超｜队员 刘羿涵”，不写履历、职责、贡献或口号。
- Reflection 不直接修改 Mastery；长期记忆不替代 Learning Evidence；语音输出只走部署方 MiniMax。
- 不清理、不重置、不提交用户现有产品代码改动；只修改本计划列出的 PPT 构建和验收文件。

---

### Task 1: 统一中文页顶标题并保留 V2

**Files:**
- Modify: `ppt_work_20260830_v2/build_lianqianyan_v2.mjs:7,217-226,262-760`
- Output: `涟千言_产品说明_创新赛道_V3.pptx`

**Interfaces:**
- Consumes: 现有 `addHeader(slide, chapter, page, title, subtitle)` 与 20 页构建函数。
- Produces: `PAGE_HEADERS` 映射，以及 P2–P19 一致的中文页顶标题。

- [ ] **Step 1: 将输出文件改为 V3，保留 V2**

将构建器中的输出路径改为：

```js
const finalPptx = `${ROOT}/涟千言_产品说明_创新赛道_V3.pptx`;
```

- [ ] **Step 2: 增加逐页中文标题映射**

在标题辅助函数之前加入：

```js
const PAGE_HEADERS = {
  2: "01 问题洞察｜学习困境",
  3: "01 问题洞察｜产品定义",
  4: "02 学习闭环｜整体机制",
  5: "02 学习闭环｜学习证据",
  6: "02 学习闭环｜学习诊断",
  7: "02 学习闭环｜个性规划",
  8: "02 学习闭环｜动态重规划",
  9: "03 应用场景｜下一步引导",
  10: "03 应用场景｜陪伴工作台",
  11: "03 应用场景｜课程 GraphRAG",
  12: "03 应用场景｜知识空间",
  13: "03 应用场景｜知识溯源",
  14: "03 应用场景｜学习验证",
  15: "03 应用场景｜资源工坊",
  16: "03 应用场景｜自然陪伴",
  17: "04 技术要点｜Agent 与 MCP",
  18: "04 技术要点｜系统架构",
  19: "05 开发证据｜团队与过程",
};
```

- [ ] **Step 3: 让通用标题函数读取中文映射**

保持主标题与副标题坐标不变，把页顶小标题来源改成 `PAGE_HEADERS[page]`，并确保一行显示。P12 和 P18 使用自定义深色页眉，分别替换成 `PAGE_HEADERS[12]` 和 `PAGE_HEADERS[18]`。

- [ ] **Step 4: 构建并检查页顶标题**

Run:

```powershell
& $env:RUNTIME_NODE 'ppt_work_20260830_v2/build_lianqianyan_v2.mjs'
```

Expected: 生成 `涟千言_产品说明_创新赛道_V3.pptx` 和 20 张最新渲染图；P2–P19 不再出现 `LIAN QIAN YAN /`。

### Task 2: 增补应用场景与课程技术链

**Files:**
- Modify: `ppt_work_20260830_v2/build_lianqianyan_v2.mjs:275-310,456-503,504-546`

**Interfaces:**
- Consumes: P3 三支柱结构、P9 真实小涟截图、P11 课程约束 GraphRAG 流程。
- Produces: 四类真实应用场景和更详细的检索技术说明。

- [ ] **Step 1: 在 P3 增加应用入口总览**

在不缩小三支柱标题的前提下，将底部结论区改为四个简洁入口：

```js
const sceneEntrances = [
  ["新知识初学", "课程讲解"],
  ["薄弱点补强", "REMEDIATE"],
  ["练习后调整", "状态更新"],
  ["阶段复习", "REVIEW"],
];
```

底部保留“每一次真实学习行为，都成为下一次学习决策的依据”。

- [ ] **Step 2: 将 P9 扩展为四类真实学习情境**

保留真实截图，右侧内容改为：

```js
const scenarios = [
  ["不知道从哪里开始", "读取计划或诊断，给出一个可执行任务"],
  ["知识点反复出错", "定位薄弱点，进入 REMEDIATE 补强"],
  ["完成练习之后", "记录评价证据，更新状态并重新规划"],
  ["准备复习或考试", "结合知识空间与 REVIEW 任务复习"],
];
```

底部结论使用：“不同学习时刻，需要不同的下一步。”

- [ ] **Step 3: 详细补充 P11 GraphRAG 要点**

保留现有检索流程，补充两条边界说明：

```text
检索上下文：用户问题 + 当前知识点 + 当前学习状态
课程边界：只扩展既有课程关系，不创造学生掌握关系
```

保留 `retrieval_mode: graph_rag_course_grounded` 和来源回答。

- [ ] **Step 4: 渲染检查 P3、P9、P11**

Expected: 三页主标题不换行；P9 四种场景全部可读；P11 的课程边界和检索模式同时可见。

### Task 3: 详细补充 Agent、架构与简洁团队信息

**Files:**
- Modify: `ppt_work_20260830_v2/build_lianqianyan_v2.mjs:663-777`

**Interfaces:**
- Consumes: 当前 Agent/Tools/MCP 图、四层架构、P19 开发时间线。
- Produces: Agent 职责说明、三项技术创新和一行团队情况。

- [ ] **Step 1: 为 P17 增加四类 Agent 职责**

在 Agent 名称下使用短职责：

```js
const agents = [
  ["Diagnosis", "理解当前状态", C.blue],
  ["Planner", "生成学习行动", C.lavender],
  ["Tutor", "课程讲解与辅导", C.pink],
  ["Assessment", "解释评价结果", C.green],
];
```

保留 EducationToolRegistry、Web/Internal Agent、MCP Client 和可验证调用边界。

- [ ] **Step 2: 在 P18 增加三项技术创新**

压缩四层架构垂直间距，在底部加入三个一行总结：

```js
const innovations = [
  ["证据驱动", "不凭聊天印象修改掌握度"],
  ["课程约束 GraphRAG", "知识关系与来源可追溯"],
  ["诊断到行动闭环", "状态变化继续影响计划"],
];
```

- [ ] **Step 3: 在 P19 只增加简洁团队信息**

P19 主体继续是阶段时间线和开发证据，仅增加一个小型横条：

```text
团队情况｜队长 刘世超｜队员 刘羿涵
```

不增加头像、履历、分工、个人贡献或团队口号。

- [ ] **Step 4: 更新来源备注**

P19 的 speaker notes 增加“团队姓名由用户于 2026-08-30 明确提供”，不增加外部个人信息来源。

- [ ] **Step 5: 渲染检查 P17–P19**

Expected: P17 Agent 名称和职责可读；P18 三项创新不挤压四层架构；P19 团队横条不抢开发证据主视觉。

### Task 4: 全量构建和自动验收

**Files:**
- Modify: `ppt_work_20260830_v2/validate_pptx.py:14-45`
- Verify: `涟千言_产品说明_创新赛道_V3.pptx`

**Interfaces:**
- Consumes: V3 PPTX、20 张渲染图、LibreOffice。
- Produces: 内容、背景、版式、页数和体积验收证据。

- [ ] **Step 1: 更新结构化验收目标和必要文字**

将验证文件指向 V3，并要求检测：

```python
PPTX = Path(r"F:\比赛\智能体 ican 教育skill\涟千言_产品说明_创新赛道_V3.pptx")
```

必要文字增加：

```text
01 问题洞察｜学习困境
03 应用场景｜下一步引导
04 技术要点｜Agent 与 MCP
05 开发证据｜团队与过程
队长 刘世超
队员 刘羿涵
```

禁用文字增加 `LIAN QIAN YAN /`。

- [ ] **Step 2: 运行构建器并生成 20 页 V3**

Expected: 构建器退出码 0，输出 `slides: 20`。

- [ ] **Step 3: 运行画布溢出检测**

Run:

```powershell
& $python '.../slides_test.py' '涟千言_产品说明_创新赛道_V3.pptx'
```

Expected: `Test passed. No overflow detected.`

- [ ] **Step 4: 用 LibreOffice 导出 PDF**

Run:

```powershell
& 'F:\LibreOffice\LibreOfficePortable\App\libreoffice\program\soffice.exe' --headless --convert-to pdf --outdir 'ppt_work_20260830_v2/pdf-v3' 'F:\比赛\智能体 ican 教育skill\涟千言_产品说明_创新赛道_V3.pptx'
```

Expected: PDF 存在，`pypdf` 读取为 20 页。

- [ ] **Step 5: 运行结构化验收**

Run:

```powershell
& $python 'ppt_work_20260830_v2/validate_pptx.py'
```

Expected: `status` 为 `PASS`、`slide_count` 为 20、6 种背景均被使用、20 页均有 `[Sources]`、禁用词为空、文件小于 50MB。

- [ ] **Step 6: 逐页视觉复核并记录最终哈希**

检查 20 张最终渲染图和 LibreOffice PDF montage，重点检查 P2、P3、P9、P11、P17、P18、P19；修复任何标题换行、内容拥挤或可读性问题。最后记录 PPTX SHA-256。

### Task 5: 交付

**Files:**
- Deliver: `涟千言_产品说明_创新赛道_V3.pptx`

**Interfaces:**
- Consumes: 所有验收通过的 V3 成品。
- Produces: 用户可直接使用的 PPTX，并保留 V2 作为上一个版本。

- [ ] **Step 1: 确认 V2 未被覆盖**

Expected: V2 与 V3 均存在，V3 修改时间晚于 V2。

- [ ] **Step 2: 在 Codex 中打开 V3**

Expected: V3 在右侧文件面板中可见。

- [ ] **Step 3: 交付摘要**

说明方案 A 页眉、应用场景、技术要点、简洁团队信息和验收结果；只引用最终 V3 PPTX 一次。
