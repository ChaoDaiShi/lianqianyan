# 涟千言“证据星河”学习空间 V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把涟千言升级为以真实学习证据为视觉主线、支持可审计 Agent 阶段与 SSE 增量回答、且桌面和移动端一致可用的陪伴式学习空间。

**Architecture:** 保留现有 React/FastAPI 领域边界，在 Agent 编排器增加可选事件接收器，由新 SSE 路由把真实阶段、Trace、答案片段与最终响应发送给前端。前端用独立流客户端与 reducer 管理草稿回答；首页、导航与公共控件通过代码原生 SVG 和语义样式升级，不改变真实数据来源。

**Tech Stack:** React 18、TypeScript 5、Vite 5、Tailwind CSS 3、Vitest、FastAPI、Pydantic 2、SQLAlchemy 2、Pytest、SSE、Playwright、Figma Plugin API。

## Global Constraints

- 只使用 `pnpm` 执行前端命令。
- 对外品牌统一为“涟千言”；兼容字段 `EducationMind` 与 `EDUCATION_*` 不改名。
- 不生成虚假诊断、计划、掌握度、来源、Agent 步骤或完成状态。
- 保留 `/api/agents/chat` 与现有响应结构；新增能力必须向后兼容。
- 不增加数据库迁移、不更换前端框架、不引入新的运行时依赖。
- 所有新行为先写失败测试并确认按预期失败，再实现最小代码。
- SQLite、`.env`、密钥、`.local`、构建输出和浏览器状态不得提交。
- 移动端目标宽度为 390px，桌面目标为 1440px；不得出现文档级横向溢出。
- 设计稿使用 Inter；中文回退保持 `PingFang SC`、`Microsoft YaHei`、system-ui。

---

### Task 1: Agent SSE 事件契约与真实阶段

**Files:**
- Modify: `apps/api/app/agents/base.py`
- Modify: `apps/api/app/agents/orchestrator.py`
- Modify: `apps/api/app/api/routes/agents.py`
- Test: `apps/api/tests/test_agents.py`

**Interfaces:**
- Consumes: `AgentRequest`、`AgentsChatResponse`、现有 `EducationAgentOrchestrator.handle()`。
- Produces: `AgentStreamEvent`、`AgentEventSink = Callable[[AgentStreamEvent], None]`、`POST /api/agents/chat/stream`。

- [ ] **Step 1: 写 SSE 顺序与真实性失败测试**

在 `test_agents.py` 增加解析 `event:` / `data:` 行的帮助函数，并验证协作问题产生 `status → trace* → delta* → result → done`，`delta` 拼接等于 `result.answer`，Trace 顺序仍为诊断、工具、规划、工具、检索、辅导。

```python
def parse_sse(response):
    events = []
    event_name = None
    for line in response.iter_lines():
        if line.startswith("event: "):
            event_name = line.removeprefix("event: ")
        elif line.startswith("data: "):
            events.append((event_name, json.loads(line.removeprefix("data: "))))
    return events

def test_agents_stream_emits_real_trace_and_complete_result(client: TestClient) -> None:
    with client.stream("POST", "/api/agents/chat/stream", json={
        "learner_id": TEST_LEARNER_ID,
        "course_id": COURSE_OS,
        "message": "我现在最应该学什么，为什么？",
    }) as response:
        events = parse_sse(response)
    assert response.status_code == 200
    assert events[0][0] == "status"
    assert "".join(data["text"] for name, data in events if name == "delta") == next(
        data["answer"] for name, data in events if name == "result"
    )
    assert events[-1][0] == "done"
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `Set-Location apps/api; .venv/Scripts/pytest.exe tests/test_agents.py -k stream -q`

Expected: `FAIL`，原因是 `/api/agents/chat/stream` 返回 404。

- [ ] **Step 3: 增加事件模型与可选事件接收器**

在 `base.py` 增加公开阶段模型，在 `orchestrator.py` 的 `handle` 增加可选 `event_sink`，只在路由完成、真实 Agent/工具完成和组织回答阶段调用。

```python
class AgentStreamEvent(BaseModel):
    kind: Literal["status", "trace"]
    stage: str
    label: str
    trace: AgentTraceItem | None = None

AgentEventSink = Callable[[AgentStreamEvent], None]
```

- [ ] **Step 4: 实现认证范围内的 SSE 路由**

复用普通路由的 scope 和 thread 检查，使用 `asyncio.Queue`、后台任务与 `StreamingResponse(media_type="text/event-stream")`。事件编码固定为：

```python
def sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
```

答案按 18–32 个 Unicode 字符的可读片段发送；异常只返回通用公开错误并取消后台任务。

- [ ] **Step 5: 运行聚焦后端测试确认 GREEN**

Run: `Set-Location apps/api; .venv/Scripts/pytest.exe tests/test_agents.py -q`

Expected: 所有 `test_agents.py` 测试通过。

- [ ] **Step 6: 提交后端流式契约**

```powershell
git add -- apps/api/app/agents/base.py apps/api/app/agents/orchestrator.py apps/api/app/api/routes/agents.py apps/api/tests/test_agents.py
git commit -m "feat: stream agent collaboration progress"
```

### Task 2: 前端流客户端与确定性 reducer

**Files:**
- Create: `src/lib/agentStream.ts`
- Create: `src/lib/agentStream.test.ts`
- Modify: `src/lib/educationApi.ts`
- Modify: `src/lib/services.ts`

**Interfaces:**
- Consumes: `/api/agents/chat/stream` 事件与 `AgentChatRequest` / `AgentChatResponse`。
- Produces: `AgentStreamEvent` 联合类型、`streamAgentChat(request, options)`、`reduceAgentStream(state, event)`。

- [ ] **Step 1: 写事件合并、结束与取消失败测试**

```ts
it('merges deltas and replaces metadata with the authoritative result', () => {
  const streamed = [
    { type: 'status', stage: 'route', label: '正在理解问题' },
    { type: 'delta', text: '先理解' },
    { type: 'delta', text: '死锁。' },
    { type: 'result', result: completedResponse },
  ] as AgentStreamEvent[];
  const state = streamed.reduce(reduceAgentStream, initialAgentStreamState());
  expect(state.text).toBe(completedResponse.answer);
  expect(state.result).toEqual(completedResponse);
  expect(state.complete).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- --run src/lib/agentStream.test.ts`

Expected: `FAIL`，模块不存在。

- [ ] **Step 3: 实现类型、解析器、reducer 与请求函数**

`streamAgentChat` 使用 `@microsoft/fetch-event-source`，设置 `credentials: 'include'`、`Accept: text/event-stream`、`signal`，禁止无限重试；`result` 使用 `mapAgentChatResponse` 与普通接口共用映射。

```ts
export type AgentStreamEvent =
  | { type: 'status'; stage: string; label: string }
  | { type: 'trace'; item: AgentTraceItem }
  | { type: 'delta'; text: string; index: number }
  | { type: 'result'; result: AgentChatResponse }
  | { type: 'error'; message: string }
  | { type: 'done' };
```

- [ ] **Step 4: 删除未使用的通用流包装，仅保留 `useApi`**

`src/lib/services.ts` 中现有 `streamRequest` 没有调用者，移除该死代码；SSE 业务约束由 `agentStream.ts` 管理。

- [ ] **Step 5: 运行测试确认 GREEN**

Run: `pnpm test -- --run src/lib/agentStream.test.ts`

Expected: 新增测试全部通过。

- [ ] **Step 6: 提交流客户端**

```powershell
git add -- src/lib/agentStream.ts src/lib/agentStream.test.ts src/lib/educationApi.ts src/lib/services.ts
git commit -m "feat: add typed agent stream client"
```

### Task 3: 品牌 SVG 与公共视觉基础

**Files:**
- Create: `src/components/brand/LianMark.tsx`
- Create: `src/components/brand/LianMark.test.tsx`
- Modify: `src/components/layout/TopCompanionBar.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/design/theme.css`

**Interfaces:**
- Produces: `<LianMark size="sm|md|lg" decorative?: boolean />`，可在顶栏、移动 Dock 和空状态复用。

- [ ] **Step 1: 写 SVG 可访问性和公共控件品牌样式失败测试**

```tsx
it('renders an accessible constellation mark without an external image', () => {
  const html = renderToStaticMarkup(<LianMark />);
  expect(html).toContain('<svg');
  expect(html).toContain('涟千言标志');
  expect(html).toContain('data-lian-mark="constellation"');
  expect(html).not.toContain('<img');
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- --run src/components/brand/LianMark.test.tsx src/components/layout/TopCompanionBar.test.tsx`

Expected: `FAIL`，`LianMark` 不存在或顶栏仍引用旧位图标志。

- [ ] **Step 3: 实现品牌 SVG 与语义视觉类**

SVG 使用交织水纹、四节点与星点，渐变 ID 通过 `useId()` 隔离；`theme.css` 增加 `--em-surface-raised`、`--em-border-strong`、`--em-focus-ring`、`em-control` 与 reduced-motion 规则。

- [ ] **Step 4: 收敛 Button/Input/Textarea/Select**

默认状态改用 primary、violet border、14–18px 圆角与统一焦点环；破坏性、ghost、outline 等变体保留语义与 API。

- [ ] **Step 5: 运行组件测试确认 GREEN**

Run: `pnpm test -- --run src/components/brand/LianMark.test.tsx src/components/layout/TopCompanionBar.test.tsx`

Expected: 测试通过。

- [ ] **Step 6: 提交品牌基础**

```powershell
git add -- src/components/brand src/components/layout/TopCompanionBar.tsx src/components/ui src/design/theme.css
git commit -m "feat: establish constellation visual language"
```

### Task 4: 响应式学习轨道与移动 Dock

**Files:**
- Modify: `src/components/layout/LearningRail.tsx`
- Modify: `src/components/layout/LearningRail.test.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `currentPath`。
- Produces: 桌面完整学习轨道、移动五槽 Dock、`aria-expanded` 更多面板。

- [ ] **Step 1: 修改测试为五槽 Dock 契约并确认 RED**

```tsx
expect(html).toContain('data-mobile-dock="primary"');
expect(html).toContain('和小涟聊聊');
expect(html).toContain('aria-label="更多学习入口"');
expect(html).not.toContain('overflow-x-auto');
```

Run: `pnpm test -- --run src/components/layout/LearningRail.test.tsx`

Expected: 至少一项断言失败。

- [ ] **Step 2: 实现桌面轨道、中央小涟入口和更多面板**

移动 Dock 直接显示首页、我的学习、小涟、知识空间、更多；更多面板显示诊断、考试、工坊、档案、设置。路由变化或点击入口后关闭面板，焦点环与 `aria-current` 保持可用。

- [ ] **Step 3: 调整 AppShell 底部安全区**

正文在移动端为 Dock 与 safe-area 预留稳定空间，桌面端保持左侧 5.25rem。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `pnpm test -- --run src/components/layout/LearningRail.test.tsx`

Expected: 测试通过。

- [ ] **Step 5: 提交响应式导航**

```powershell
git add -- src/components/layout/LearningRail.tsx src/components/layout/LearningRail.test.tsx src/components/layout/AppShell.tsx
git commit -m "feat: add responsive learning command dock"
```

### Task 5: 证据轨道与首页学习指挥台

**Files:**
- Create: `src/components/home/EvidenceOrbit.tsx`
- Create: `src/components/home/EvidenceOrbit.test.tsx`
- Modify: `src/components/home/HeroBanner.tsx`
- Modify: `src/components/home/HomeCompanionEntry.test.tsx`
- Modify: `src/components/home/TodaysJourney.tsx`
- Modify: `src/pages/Home.tsx`

**Interfaces:**
- Produces: `buildEvidenceOrbit({ diagnosis, plan, task, evidence })` 返回四节点、当前阶段、完成数量与真实计数；`EvidenceOrbit` 只消费该模型。

- [ ] **Step 1: 写空数据、部分闭环、完整闭环失败测试**

```ts
expect(buildEvidenceOrbit(emptyInput).nodes.map(n => n.state)).toEqual([
  'current', 'waiting', 'waiting', 'waiting',
]);
expect(buildEvidenceOrbit(withDiagnosis).nodes[0].state).toBe('completed');
expect(buildEvidenceOrbit(withEvidence).evidenceCount).toBe(2);
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- --run src/components/home/EvidenceOrbit.test.tsx src/components/home/HomeCompanionEntry.test.tsx`

Expected: 模块不存在或新结构断言失败。

- [ ] **Step 3: 实现 SVG 轨道和紧凑首屏**

轨道只根据真实 props 推导状态；`HeroBanner` 改为左侧行动指挥台、右侧轨道与小涟形象，首屏最小高度从 430px 的人物留白改为内容驱动的 360–410px。

- [ ] **Step 4: 挂载 XiaolianDailyInsight 并压缩今日路径**

`Home.tsx` 在路径后加入已有 `XiaolianDailyInsight`，复用同一 `onPrepareTask`；`TodaysJourney` 保留四阶段但降低冗余留白。

- [ ] **Step 5: 运行首页测试确认 GREEN**

Run: `pnpm test -- --run src/components/home src/pages/Home.tsx`

Expected: 首页与轨道相关测试通过。

- [ ] **Step 6: 提交首页升级**

```powershell
git add -- src/components/home src/pages/Home.tsx
git commit -m "feat: turn evidence into a learning constellation"
```

### Task 6: 小涟流式工作区

**Files:**
- Create: `src/components/xiaolian/StreamingResponse.tsx`
- Create: `src/components/xiaolian/StreamingResponse.test.tsx`
- Modify: `src/components/xiaolian/ConversationRail.tsx`
- Modify: `src/components/learning/AgentToolTrace.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Modify: `src/pages/XiaolianSpeech.test.tsx`

**Interfaces:**
- Consumes: `AgentStreamState`、`streamAgentChat`、现有 Companion 历史 API。
- Produces: 流式草稿消息、阶段指示、停止与重试动作；只有完整 `result` 才保存助手历史。

- [ ] **Step 1: 写流式状态、停止与移动优先级失败测试**

```tsx
expect(html).toContain('data-streaming-response="active"');
expect(html).toContain('正在检索课程知识');
expect(html).toContain('停止生成');
expect(html).toContain('aria-live="polite"');
```

更新 `XiaolianSpeech.test.tsx`，让 mock 流依次发送 status、trace、delta、result、done，并断言最终正文和服务来源可见。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- --run src/components/xiaolian/StreamingResponse.test.tsx src/pages/XiaolianSpeech.test.tsx`

Expected: 新组件不存在或页面仍调用普通 Chat。

- [ ] **Step 3: 实现 StreamingResponse**

呈现阶段节点、实时 Trace、增量正文、闪烁光标、停止/重试和错误；reduced-motion 下光标静止。阶段文案只来自服务器事件。

- [ ] **Step 4: 将 XiaolianPage 切换为 SSE**

每次发送创建 `AbortController` 和助手草稿消息；事件更新同一消息；`result` 到达后持久化；取消或错误保留已收到正文并释放 pending 状态；卸载页面时 abort。

- [ ] **Step 5: 收敛移动端上下文栏与最终 Trace**

移动端将历史、记忆与下一步放入可展开上下文区，桌面仍保持左栏。完成回答的 `AgentToolTrace` 改成更清晰的节点时间线和来源区。

- [ ] **Step 6: 运行相关前端测试确认 GREEN**

Run: `pnpm test -- --run src/lib/agentStream.test.ts src/components/xiaolian src/pages/XiaolianSpeech.test.tsx`

Expected: 相关测试全部通过且没有未处理 Promise 警告。

- [ ] **Step 7: 提交流式工作区**

```powershell
git add -- src/components/xiaolian src/components/learning/AgentToolTrace.tsx src/pages/XiaolianPage.tsx src/pages/XiaolianSpeech.test.tsx
git commit -m "feat: make Xiaolian collaboration visible"
```

### Task 7: Figma 可编辑设计与视觉对照

**Files:**
- External artifact: Figma file `涟千言 2.0 · 证据星河学习空间`
- Local evidence only: `.local/ux-audit-20261005/**`

**Interfaces:**
- Consumes: `tailwind.config.js`、`src/design/theme.css`、当前网页捕获与新实现。
- Produces: 首页桌面稿、小涟桌面稿、首页移动稿、品牌变量、复用组件和 SVG 层。

- [ ] **Step 1: 捕获旧页面作为临时布局参考**

临时向 `index.html` 注入 Figma capture script，捕获已登录首页；捕获完成后立即移除脚本，确认 Git diff 不含临时注入。

- [ ] **Step 2: 建立本地品牌变量与组件**

在 Starter 计划单模式约束下创建 `Lian/Foundations` 集合：品牌色、背景、文本、边框、间距和半径，全部设置精确 scope 与 WEB code syntax。创建 `LianMark`、`ActionButton`、`StatusPill`、`EvidenceNode` 组件。

- [ ] **Step 3: 组合三张可编辑画面**

画面宽度分别为 1440、1440、390；文字、卡片、SVG 和组件保持可编辑。组件主节点放在独立 Foundations 区，画面只放实例。

- [ ] **Step 4: 结构与视觉验收**

读回节点数量、类型、图片填充和字体；确认没有完整 UI 位图留在画面中，字体为 Inter，截图无裁切、重叠和占位文本。转移品牌离散图片后删除旧页面捕获根节点。

### Task 8: 集成、浏览器验收与旧产物清理

**Files:**
- Modify: `README.md`
- Create: `docs/verification/2026-10-05-evidence-constellation-v2.md`
- Remove: 仅本轮确认已被替代且未跟踪的旧审计/构建产物；保留数据库、`.env`、Live2D、PPT、视频与历史验证文档。

**Interfaces:**
- Produces: 可复查的自动检查、API 流、桌面/移动截图、浏览器错误清单和运行说明。

- [ ] **Step 1: 运行聚焦测试**

Run: `pnpm test -- --run src/lib/agentStream.test.ts src/components/brand src/components/layout src/components/home src/components/xiaolian src/pages/XiaolianSpeech.test.tsx`

Expected: 所有聚焦前端测试通过。

Run: `Set-Location apps/api; .venv/Scripts/pytest.exe tests/test_agents.py -q`

Expected: Agent 测试全部通过。

- [ ] **Step 2: 运行项目门禁与生产构建**

Run: `pnpm check`

Expected: TypeScript 和 ESLint 退出码 0。

Run: `pnpm build`

Expected: Vite 生产构建退出码 0。

- [ ] **Step 3: 真实 API 流验证**

使用本地调试账号 Cookie 请求 `/api/agents/chat/stream`，确认首个事件在最终结果前到达、Trace 与普通响应一致、delta 拼接等于 answer、结果可保存到历史。

- [ ] **Step 4: 真实 Chrome 验收**

在 1440×900 和 390×844 验证：首页主行动、证据轨道、小涟流式回答、停止、来源详情、历史刷新、移动 Dock、更多面板和所有核心路由。记录 `console.error`、`pageerror`、`requestfailed`，业务验收要求三者无本轮回归。

- [ ] **Step 5: 更新文档与清理旧产物**

README 补充流式协作说明和本地验证码恢复边界；验证报告写入实际命令、结果、截图和限制。删除被新证据替代的 `.local/ux-audit-20261005` 旧截图与过期 `dist`，不触碰比赛交付物。

- [ ] **Step 6: 最终审查与提交**

Run: `git diff --check; git status --short; git log -8 --oneline`

Expected: 无空白错误，只剩本轮文档或干净工作区。

```powershell
git add -- README.md docs/verification/2026-10-05-evidence-constellation-v2.md
git commit -m "docs: verify evidence constellation experience"
```

