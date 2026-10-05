# 涟千言“证据星河”学习空间 V2 验收记录

## 验收范围

本次验证覆盖首页学习指挥台、证据星河 SVG、公共品牌与控件、桌面学习轨道、移动五槽 Dock、小涟 Agent SSE、停止与重试、Markdown 回答、执行 Trace、课程来源、对话历史、暗色主题及原有核心路由。

验证环境：Windows、PowerShell、Chrome、React/Vite 开发服务 `http://127.0.0.1:5173`、FastAPI `http://127.0.0.1:8000`。使用本地正式账号模型与 HttpOnly Cookie，会话账号为 `local_debug_20261005`，课程为 `course-os`。本地验证码只在当前 API 进程通过 `EDUCATION_CAPTCHA_MODE=off` 关闭；账号、密码、会话、学习者与课程范围校验仍启用。

## 实现结果

- 首页用诊断、计划、学习、验证四节点 SVG 轨道表现真实闭环；节点状态复用 `buildHomeJourney`，没有独立推测逻辑。
- 首页首屏同时呈现唯一主行动、推荐原因、当前重点、任务数和证据数，并挂载真实的“小涟今日观察”。
- 新增代码原生 `LianMark` SVG，顶栏、移动小涟入口和 Figma 基础共用交织水纹与证据节点语言。
- 移动主导航变为首页、我的学习、小涟、知识空间、更多五槽 Dock；诊断、考试、工坊、档案与设置进入可访问的更多面板。
- 新增 `/api/agents/chat/stream`：输出 `status`、`trace`、`delta`、`result`、`done`，保留普通 `/api/agents/chat`。
- 小涟在请求期显示真实业务阶段与已执行 Trace，答案增量出现；用户可停止并从取消态重新生成。
- 停止回答不保存助手草稿；重试不重复保存用户消息；完整 `result` 到达后才保存助手消息。
- Agent 回答使用安全 Markdown 子集渲染标题、列表、强调、引用、代码与 HTTP(S) 链接，不注入原始 HTML。
- 完成态把 Agent/Tool Trace 按真实执行顺序展示，并直接呈现课程来源，减少嵌套折叠。
- 公共 Button、Input、Textarea 与 Select 从模板蓝灰样式收敛到涟千言的紫、天蓝、柔粉语义体系。

## 自动验证

### 前端完整测试

命令：

```powershell
pnpm test -- --run
```

结果：`90 passed` 测试文件，`291 passed` 测试项，退出码 0。测试输出保留既有 `CaptchaPanel` mock ref 警告，没有测试失败。

### 项目门禁

命令：

```powershell
pnpm check
```

结果：TypeScript `tsc --noEmit` 与 ESLint 均通过，退出码 0。

### 生产构建

命令：

```powershell
pnpm build
```

结果：Vite 转换 2506 个模块并生成 `dist`，退出码 0。保留既有的 `vendor-pixi` 大于 500 kB 提示；它是构建建议，不是失败。

### 后端完整测试

命令：

```powershell
Set-Location apps\api
.venv\Scripts\pytest.exe -q
```

结果：`325 passed, 1 warning in 72.63s`，退出码 0。唯一警告是现有 Starlette TestClient/httpx 弃用提示。

## 真实 SSE 证据

在已登录浏览器中向 `/api/agents/chat/stream` 提交“用一句话解释互斥为什么是死锁的必要条件。”，逐块读取响应：

- HTTP 200，`Content-Type: text/event-stream; charset=utf-8`；
- 首个 `status` 在 87 ms 到达；
- 第一段答案在 1724 ms 到达；
- 1877 ms 收到 `done`；
- 事件顺序为 2 个 status、课程检索 trace、组织回答 status、小涟辅导 trace、5 个 delta、result、done；
- Trace 只包含真实执行的 `search_course_knowledge` 与 `tutoring`；
- 5 个 delta 拼接结果与 `result.answer` 完全一致；
- Provider 为 `openai_compatible`，`response_mode=provider`。

停止生成验收：在课程检索阶段点击停止，65 ms 内进入 `cancelled` 状态；已执行阶段保留，未完整正文不保存为助手历史。点击重新生成后问题只出现 1 次，完整回答成功保存。

## 浏览器路由与响应式验证

在 1440×900 下按每页唯一标题等待懒加载完成后检查：

| 路由 | 页面标题 | 文档横向溢出 |
| --- | --- | --- |
| `/#/` | 今天，把这一步做扎实 | 无，1440 = 1440 |
| `/#/my-learning` | 我的成长路线 | 无 |
| `/#/diagnosis` | 学习观察空间 | 无 |
| `/#/knowledge` | 课程 GraphRAG 知识空间 | 无 |
| `/#/exams` | 测评工作台 | 无 |
| `/#/resources` | 创作工作台 | 无 |
| `/#/archive` | 成长不是一组指标，而是一段有出处的故事 | 无 |
| `/#/settings` | 偏好与服务 | 无 |
| `/#/xiaolian` | 和小涟一起想明白 | 无 |
| `/#/about` | 关于涟千言 | 无 |

浏览器最终结果：`consoleErrors=[]`、`pageErrors=[]`、`requestFailures=[]`、HTTP 4xx/5xx 列表为空。

390×844 验收：文档宽度 390 = 视口 390；首页存在 4 个证据节点和 5 个 Dock 入口；更多面板显示学习诊断、考试中心、学习工坊、学习档案、设置。小涟对话位于移动首屏，历史为默认关闭的“对话与记忆上下文”，输入框可见。

暗色主题验收：设置页选择“黑夜”后，`data-theme=dark`、`color-scheme=dark`、`--em-canvas=#11101c`，1440px 无横向溢出；验收后恢复“明亮”。

历史验收：刷新小涟页面后，停止再重试的问题只出现 1 次，完整“生产者—消费者”回答可见，证明用户消息未重复且最终助手消息已持久化。

## 视觉证据

本地证据目录：`.local/ux-audit-20261005/`。

- 改造前：首页桌面 `before-home-desktop.png`、首页移动 `before-home-mobile.png`、小涟移动 `before-xiaolian-mobile-live.png`；
- 改造后：首页桌面 `after-home-desktop.png`、首页移动 `after-home-mobile.png`、移动更多面板 `after-home-mobile-more.png`；
- 小涟：桌面 `after-xiaolian-desktop.png`、移动 `after-xiaolian-mobile.png`；
- 主题：`after-home-dark.png`。

这些文件位于 Git 忽略的 `.local`，只作为本机验收证据，不进入源码提交。

## Figma 辅助结果

Figma 文件：[涟千言 2.0 · 证据星河学习空间](https://www.figma.com/design/yNbdwdTEf08Unn23IR6YkL)。

已完成：当前首页可编辑捕获参考、页面/字体/库检查、`Lian / Tokens` 集合、23 个带 scope 与 WEB code syntax 的品牌变量、6 个文字样式和 2 个效果样式。随后 Starter 套餐触发 MCP 调用上限，组件库和三张最终组合画面未能继续写入。生产 UI 按同一规格在代码中完成，并以真实浏览器截图校准；未把未完成的 Figma 画面声明为最终交付。

## 清理与限制

- 临时加入 `index.html` 的 Figma capture script 已移除，源码 diff 不包含该脚本。
- 新构建前 `pnpm build` 已删除旧 `dist` 并生成当前产物。
- `.local/retired-20261005` 中 262 个已确认废弃文件（约 772,905,870 bytes）仍未永久删除。自动审批拒绝递归删除，Windows 回收站此前也拒绝授权；这些文件不参与运行且被 Git 忽略。
- 自动审批同样拒绝删除本轮非递归中间截图，因此 `.local` 可能包含额外过程证据，不影响源码或构建。
- 未推送远端、未发布部署、未创建 GitHub Release。

