# EducationMind AI 教官生成中心与正式导入包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The user explicitly prohibited subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有无登录教育智能体升级为 AI 教官驱动的整卷/练习/PPT/知识图谱生成平台，并交付经验证的静态导入 ZIP 与完整 Windows 部署 ZIP。

**Architecture:** 生成服务消费现有课程知识仓库和可选 OpenAI-compatible Provider，只产出经过领域校验的结构化内容；考试数据继续通过现有 ExamService 入库、发布、作答和投影学习证据。PPTX 在浏览器端由结构化幻灯片生成，知识图谱由后端生成可追溯节点/边并由前端 SVG 展示。发布脚本采用 allowlist 构建两个 ZIP，开发数据库和秘密永不进入工件。

**Tech Stack:** React 18、TypeScript、Vite、Vitest、Tailwind CSS、PptxGenJS、FastAPI、Pydantic v2、SQLAlchemy、pytest、PowerShell、.NET ZipArchive。

## Global Constraints

- 只使用 `pnpm`，提交前必须运行 `pnpm check`。
- 不使用子智能体，不询问用户普通实现决策。
- 用户提供的昔涟图片保持原样，不进行生成式重绘。
- 未配置或调用失败的 LLM 结果必须标记为 `course_grounded` 或 `auto_fallback`，不得冒充 AI。
- 正确答案在交卷前不得返回给学生。
- 完整部署包不得包含开发数据库、学习记录、密钥、缓存、日志、`node_modules` 或用户未纳入范围的 DOCX。
- Genie-TTS 只允许内部回环访问，完整部署包必须保留准确的语音归属文字。
- 平台静态 ZIP 和完整 Windows ZIP 必须分开，README 明确静态包不包含后端运行能力。

---

### Task 1: AI 教官角色与空学习档案

**Files:**
- Modify: `apps/api/app/services/tutor_prompt.py`
- Modify: `apps/api/tests/test_tutor.py`
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/home/TodaysJourney.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Test: `src/components/home/TodaysJourney.test.tsx`
- Test: `src/pages/XiaolianSpeech.test.tsx`

**Interfaces:**
- Produces: `SYSTEM_PROMPT` 将昔涟定义为 AI 教官；空档案只提供主动入口，不显示已开始的默认任务。

- [ ] **Step 1: 写失败测试**

```python
def test_tutor_system_prompt_uses_instructor_contract():
    assert "AI 教官" in SYSTEM_PROMPT
    assert "本次目标" in SYSTEM_PROMPT
    assert "检查理解" in SYSTEM_PROMPT
```

```tsx
it('does not present a default learning task before the learner starts', () => {
  const html = renderToStaticMarkup(<TodaysJourney plan={null} evidence={[]} />);
  expect(html).toContain('选择学习目标');
  expect(html).not.toContain('继续默认学习');
});
```

- [ ] **Step 2: 运行定向测试并确认因缺少新契约而失败**

Run: `Set-Location apps/api; uv run pytest tests/test_tutor.py -q`

Run: `Set-Location ../..; pnpm test -- src/components/home/TodaysJourney.test.tsx src/pages/XiaolianSpeech.test.tsx --run`

- [ ] **Step 3: 最小实现角色与空态文案**

将系统提示词改为“昔涟 AI 教官”，要求目标、讲解、检查理解和行动建议；组件根据真实 plan/evidence 分支渲染，不制造默认进度。

- [ ] **Step 4: 重新运行定向测试并保持通过**

- [ ] **Step 5: 提交**

Run: `git add apps/api/app/services/tutor_prompt.py apps/api/tests/test_tutor.py src/pages/Home.tsx src/components/home/TodaysJourney.tsx src/components/home/TodaysJourney.test.tsx src/pages/XiaolianPage.tsx src/pages/XiaolianSpeech.test.tsx && git commit -m "feat: make cyrene an ai instructor"`

### Task 2: 整卷与练习生成后端

**Files:**
- Create: `apps/api/app/exams/generation.py`
- Modify: `apps/api/app/exams/models.py`
- Modify: `apps/api/app/exams/__init__.py`
- Modify: `apps/api/app/api/routes/exams.py`
- Test: `apps/api/tests/test_exam_generation.py`

**Interfaces:**
- Produces: `ExamGenerationRequest`, `ExamGenerationResult`, `ExamGenerationService.generate(request) -> ExamGenerationResult`。
- Consumes: `KnowledgeRepository.get_point_content()`, `BaseLLMProvider.chat()`, `ExamService.create_question/create_exam/publish_exam()`。

- [ ] **Step 1: 写失败 API 测试**

```python
def test_generate_practice_creates_published_exam(client):
    response = client.post("/api/exams/generate", json={
        "course_id": "course-os",
        "knowledge_point_ids": ["kp-deadlock"],
        "purpose": "practice",
        "title": "死锁专项练习",
        "question_count": 3,
        "difficulty": 0.6,
        "duration_minutes": 20,
        "publish_immediately": True,
        "include_ai_review_question": False,
    })
    assert response.status_code == 201
    body = response.json()
    assert body["exam"]["status"] == "published"
    assert len(body["exam"]["items"]) == 3
    assert body["generation_mode"] in {"llm", "course_grounded"}
    assert body["source_sections"]
```

- [ ] **Step 2: 运行测试，确认 `/api/exams/generate` 返回 404/405**

Run: `Set-Location apps/api; uv run pytest tests/test_exam_generation.py -q`

- [ ] **Step 3: 实现严格请求、课程材料生成器和事务回滚**

课程降级生成单选、判断、关键词简答；LLM 路径只接收 JSON 数组并逐题构造 `QuestionCreate`，任何一题无效则整个生成失败并回滚。

- [ ] **Step 4: 增加 LLM 非法 JSON、越界题数、未知知识点和重复选项测试**

- [ ] **Step 5: 运行考试生成与既有考试测试**

Run: `uv run pytest tests/test_exam_generation.py tests/test_exam_api.py tests/test_exam_service.py -q`

- [ ] **Step 6: 提交**

Run: `git add apps/api/app/exams apps/api/app/api/routes/exams.py apps/api/tests/test_exam_generation.py && git commit -m "feat: generate grounded exams and practice"`

### Task 3: AI 语义自动判卷

**Files:**
- Create: `apps/api/app/exams/ai_grading.py`
- Modify: `apps/api/app/exams/models.py`
- Modify: `apps/api/app/exams/seed.py`
- Modify: `apps/api/app/exams/service.py`
- Modify: `apps/api/app/api/routes/exams.py`
- Modify: `src/domain/exam.ts`
- Test: `apps/api/tests/test_exam_ai_grading.py`
- Test: `src/components/exam/examPresentation.test.ts`

**Interfaces:**
- Produces: `AIAnswerGrader.grade(question, answer, max_score) -> AIGradeResult`。
- Produces: `GradingStrategy.AI_SEMANTIC`、`AnswerGradingStatus.AI`、`AnswerGradingStatus.AUTO_FALLBACK`。

- [ ] **Step 1: 写失败测试，证明 AI 评分结果被限制并持久化**

```python
@pytest.mark.asyncio
async def test_ai_grader_clamps_score_and_persists_feedback(fake_llm, exam_attempt):
    fake_llm.content = '{"score_ratio":1.4,"is_correct":true,"feedback":"覆盖完整"}'
    result = await grader.grade_pending(exam_attempt.id)
    assert result.answers[0].awarded_score == result.answers[0].points
    assert result.answers[0].grading_status == "ai"
```

- [ ] **Step 2: 运行测试，确认新策略和评分器不存在**

- [ ] **Step 3: 实现 AI 严格 JSON 评分和关键词降级**

LLM 不可用、超时或 JSON 无效时用题目关键词比例评分，状态为 `auto_fallback`，反馈不得包含上游异常或密钥。

- [ ] **Step 4: 将提交接口改为 async，在确定性评分后自动完成 AI 待判答案**

- [ ] **Step 5: 运行 AI 判卷、评分和结果视图测试**

Run: `Set-Location apps/api; uv run pytest tests/test_exam_ai_grading.py tests/test_exam_grading.py tests/test_exam_api.py -q`

- [ ] **Step 6: 提交**

Run: `git add apps/api/app/exams apps/api/app/api/routes/exams.py apps/api/tests/test_exam_ai_grading.py src/domain/exam.ts src/components/exam/examPresentation.test.ts && git commit -m "feat: grade semantic answers with ai"`

### Task 4: 生成式考试前端

**Files:**
- Create: `src/components/exam/ExamGenerator.tsx`
- Modify: `src/pages/ExamPage.tsx`
- Modify: `src/domain/exam.ts`
- Modify: `src/lib/educationApi.ts`
- Test: `src/components/exam/ExamGenerator.test.tsx`
- Test: `src/lib/examApi.test.ts`

**Interfaces:**
- Produces: `generateExam(input: ExamGenerationInput): Promise<ExamGenerationResult>`。
- Consumes: `ExamGenerator` 的成功回调刷新 `ExamCatalog`/`ExamBuilder`。

- [ ] **Step 1: 写失败映射和组件测试**

```tsx
it('offers both exam and practice generation and reports provenance', () => {
  const html = renderToStaticMarkup(<ExamGenerator />);
  expect(html).toContain('生成整张试卷');
  expect(html).toContain('生成专项练习');
  expect(html).toContain('生成模式');
});
```

- [ ] **Step 2: 运行测试并确认组件/API 不存在**

- [ ] **Step 3: 实现知识点、多题型、难度、题数、时长与发布选项表单**

成功后展示题数、总分、来源、`llm/course_grounded` 徽标，并提供“进入考试目录”和“继续核对草稿”。

- [ ] **Step 4: 运行组件、考试页和 API 映射测试**

Run: `pnpm test -- src/components/exam/ExamGenerator.test.tsx src/pages/ExamPage.test.tsx src/lib/examApi.test.ts --run`

- [ ] **Step 5: 提交**

Run: `git add src/components/exam/ExamGenerator.tsx src/pages/ExamPage.tsx src/domain/exam.ts src/lib/educationApi.ts src/components/exam/ExamGenerator.test.tsx src/lib/examApi.test.ts && git commit -m "feat: add exam generation studio"`

### Task 5: PPTX 与知识图谱

**Files:**
- Modify: `apps/api/app/resources/models.py`
- Modify: `apps/api/app/resources/service.py`
- Modify: `apps/api/app/knowledge/models.py`
- Create: `apps/api/app/knowledge/graph.py`
- Modify: `apps/api/app/api/routes/knowledge.py`
- Test: `apps/api/tests/test_resource_generation.py`
- Test: `apps/api/tests/test_knowledge_graph.py`
- Modify: `src/components/workshop/ResourceGenerator.tsx`
- Modify: `src/components/workshop/workshopPresentation.ts`
- Create: `src/lib/presentationExport.ts`
- Create: `src/components/knowledge/KnowledgeGraph.tsx`
- Modify: `src/pages/KnowledgePage.tsx`
- Modify: `src/lib/educationApi.ts`
- Test: `src/components/workshop/ResourceGenerator.test.tsx`
- Test: `src/components/knowledge/KnowledgeGraph.test.tsx`
- Test: `src/lib/presentationExport.test.ts`

**Interfaces:**
- Produces: `ResourceType.PRESENTATION` 和结构化 `slides`。
- Produces: `KnowledgeGraphOut { nodes, edges, sources, generation_mode }`。
- Produces: `downloadPresentation(resource): Promise<void>`。

- [ ] **Step 1: 写失败后端测试**

```python
def test_presentation_resource_contains_structured_slides(client):
    body = client.post("/api/resources/generate", json={
        "course_id": "course-os",
        "knowledge_point_id": "kp-deadlock",
        "resource_type": "presentation",
    }).json()
    assert body["format"] == "presentation"
    assert len(body["slides"]) >= 5

def test_course_graph_has_traceable_edges(client):
    body = client.get("/api/knowledge/graph?course_id=course-os").json()
    assert body["nodes"]
    assert all(edge["source_sections"] for edge in body["edges"])
```

- [ ] **Step 2: 运行测试确认类型和接口不存在**

- [ ] **Step 3: 实现结构化幻灯片和可追溯课程图谱**

- [ ] **Step 4: 用 pnpm 添加 `pptxgenjs` 并先写失败前端测试**

Run: `pnpm add pptxgenjs`

- [ ] **Step 5: 实现 PPTX 导出和 SVG 图谱组件**

PPTX 必须调用 `pptx.writeFile({ fileName })`；图谱按层级确定性布局，节点按钮支持键盘操作并显示来源详情。

- [ ] **Step 6: 运行定向前后端测试**

Run: `Set-Location apps/api; uv run pytest tests/test_resource_generation.py tests/test_knowledge_graph.py -q`

Run: `Set-Location ../..; pnpm test -- src/components/workshop/ResourceGenerator.test.tsx src/components/knowledge/KnowledgeGraph.test.tsx src/lib/presentationExport.test.ts --run`

- [ ] **Step 7: 提交**

Run: `git add package.json pnpm-lock.yaml apps/api/app/resources apps/api/app/knowledge apps/api/app/api/routes/knowledge.py apps/api/tests/test_resource_generation.py apps/api/tests/test_knowledge_graph.py src/components/workshop src/components/knowledge src/pages/KnowledgePage.tsx src/lib/educationApi.ts src/lib/presentationExport.ts && git commit -m "feat: generate pptx and knowledge graphs"`

### Task 6: 昔涟图标和正式发布脚本

**Files:**
- Copy: `G:/照片以及视频/照片/昔涟.jpeg` -> `public/brand/cyrene-icon.jpeg`
- Modify: `index.html`
- Modify: `src/components/layout/TopCompanionBar.tsx`
- Create: `scripts/build-platform-release.ps1`
- Create: `deploy/README.md`
- Create: `deploy/.env.example`
- Create: `deploy/THIRD_PARTY_ATTRIBUTION.txt`
- Test: `apps/api/tests/test_platform_release_script.py`

**Interfaces:**
- Produces: `release/EducationMind-Platform-Web-<version>.zip`。
- Produces: `release/EducationMind-Windows-Full-<version>.zip`。
- Produces: `release/SHA256SUMS.txt` 和每个工件的清单。

- [ ] **Step 1: 写失败脚本契约测试**

```python
def test_release_script_excludes_runtime_data(project_root):
    text = (project_root / "scripts/build-platform-release.ps1").read_text("utf-8")
    assert "education.db" in text
    assert "node_modules" in text
    assert "ZipArchive" in text
    assert "Expand-Archive" in text
```

- [ ] **Step 2: 导入原图并更新 favicon/品牌头像引用**

复制必须校验输入文件 SHA-256，输出保持相同 SHA-256；不裁剪、不重绘。

- [ ] **Step 3: 实现 allowlist 发布脚本**

静态 ZIP 从 `dist` 根创建；完整 ZIP 包含前端、API、部署文件和明确选择的 Genie 模型资产。脚本在覆盖已有 release 前先创建新版本目录，不删除未知文件。

- [ ] **Step 4: 运行脚本测试和前端品牌测试**

- [ ] **Step 5: 提交**

Run: `git add public/brand/cyrene-icon.jpeg index.html src/components/layout/TopCompanionBar.tsx scripts/build-platform-release.ps1 deploy apps/api/tests/test_platform_release_script.py && git commit -m "feat: package formal educationmind releases"`

### Task 7: 全量验证和工件验收

**Files:**
- Modify: `README.md`
- Modify: `THIRD_PARTY_NOTICES.md`
- Generate: `release/**`

**Interfaces:**
- Consumes: Tasks 1-6 的全部功能和脚本。
- Produces: 可复核测试日志、ZIP 清单、SHA-256 和浏览器验收结果。

- [ ] **Step 1: 运行 API 全量测试**

Run: `Set-Location apps/api; uv run pytest -q`

- [ ] **Step 2: 运行前端全量测试、检查和构建**

Run: `Set-Location ../..; pnpm test -- --run`

Run: `pnpm check`

Run: `pnpm build`

- [ ] **Step 3: 重启本地三层栈并做真实 API 烟测**

检查 `/api/health`、生成练习、开始作答、提交、PPT 大纲、知识图谱、`/api/voice/status` 和一次真实 WAV 合成。

- [ ] **Step 4: 浏览器验证**

检查 `/#/agent`、`/#/exams`、`/#/resources`、`/#/knowledge`，保存关键页面截图并确认控制台无错误。

- [ ] **Step 5: 构建并解压两个 ZIP**

Run: `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/build-platform-release.ps1`

检查 ZIP 成员无 `./`、无绝对路径、无 `..`，使用 `Expand-Archive` 解压，比较清单、文件数量和 SHA-256。

- [ ] **Step 6: 更新 README/第三方声明并运行最终 `git diff --check`**

- [ ] **Step 7: 提交最终文档和发布脚本产生的非二进制清单**

Run: `git add README.md THIRD_PARTY_NOTICES.md deploy scripts docs/superpowers/plans/2026-08-26-educationmind-generation-deployment.md && git commit -m "docs: deliver educationmind platform packages"`
