# 正式无登录智能体页验收记录（2026-08-26）

## 验收范围

- 撤除 `/demo`、`/showcase` 与固定公共学习者运行时。
- 提供无登录匿名学习上下文和可嵌入的 `/#/agent` 页面。
- 未配置外部模型时明确报告 `unavailable`，只返回带 `fallback` 标记的课程材料基础辅导。
- 保持考试、语音辅助、学习画像、资源生成、联网检索、编译模拟和 MCP 工具的真实能力边界。
- 把本机 Live2D 普通文件复制到生产 `dist/local-live2d`，不跟踪源模型文件。

## 自动化门禁

| 命令 | 结果 |
| --- | --- |
| `pnpm test --run` | 52 个测试文件、183 项测试通过 |
| `pnpm check` | `tsc --noEmit` 与 ESLint 均通过 |
| `pnpm build` | Vite 生产构建通过，2467 个模块完成转换 |
| `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q` | 266 项通过；1 条既有 Starlette TestClient 弃用警告 |
| `apps/api/.venv/Scripts/python.exe mcp/server/smoke.py` | 7 个工具可列出；匿名新学习者 `primary_focus=null`、`unassessed_count=5` |

生产构建的 `vendor-pixi` 为 526.13 kB，触发 Vite 的大于 500 kB 非阻断告警。它已单独分包，但仍应在后续性能迭代继续评估按需加载。

## Live2D 构建产物

`pnpm build` 后检查 `dist/local-live2d`：

- 文件数：7
- 总字节数：10,993,724
- `Cyrene1002/Cyrene.model3.json`：存在
- `core/live2dcubismcore.min.js`：存在
- 符号链接：0

模型文件仍位于被 Git 忽略的 `.local/live2d`。向外部平台交付 `dist` 前，部署方必须自行确认模型与 Cubism Core 的授权范围。

## 独立 API 实例

使用端口 `8011` 与系统临时 SQLite 启动，不复用工作区 8000 端口进程；外部模型环境变量置空，CORS allowlist 为 `https://agent-host.example` 与本地验收 Origin。

- `GET /api/health`：200，`status=ok`。
- `GET /api/system/llm`：`provider=unavailable`、`configured=false`，未泄露密钥或 Base URL。
- 新学习者 `anon:live-smoke`：总知识点 5、已评估 0、尚未评估 5、综合掌握度 `null`、`primary_focus=null`。
- `POST /api/agents/chat`：200，`response_mode=fallback`；回答引用实际死锁课程章节，来源数组非空。
- CORS 预检：允许 allowlist 中的 `https://agent-host.example`，返回明确的允许方法。
- `POST /api/network/search`：Wikipedia Provider 返回“死锁”“操作系统”两条真实结果及 `zh.wikipedia.org` 原文链接。
- `POST /api/lab/compile-simulate`：受支持的 `int main()` 示例五阶段通过，标准输出为 `Hello, EducationMind!`；服务没有执行本机任意命令。
- `POST /api/resources/generate`：基于 `course-os/kp-deadlock` 返回 `course_template` 学习单及来源章节。
- `GET /api/exams/catalog`：新匿名学习者返回空目录，不预造考试成绩或作答。

## 浏览器验收

通过 Chrome DevTools Protocol 强制真实设备视口并捕获控制台、异常响应和网络失败；截图保存在本机 Codex visualization 目录，不进入仓库。

| 场景 | 关键结果 |
| --- | --- |
| 390×844 `/#/agent` | `innerWidth=390`、根节点 `scrollWidth=390`、Live2D canvas=1、业务内容无横向溢出 |
| 1440×1000 `/#/agent` | 根节点 `scrollWidth=1440`、Live2D canvas=1、独立页布局完整 |
| 点击“解释死锁四个必要条件” | 问题成功发送，带“基础辅导模式”的回答可见，回答包含“互斥”和“循环等待” |
| 两种视口 | 控制台错误 0、运行时异常 0、网络失败 0、4xx/5xx 响应 0 |

背景光斑使用负定位并由页面容器裁切；它们不增加根文档滚动宽度，不属于业务内容溢出。

## 运行数据库迁移与保护

仅清理精确 ID `demo-user-001`，执行前为两份工作区运行库创建原位备份。应用后再次只读盘点，两份库的八类关联表匹配数均为 0。

| 数据库 | 迁移前备份 SHA-256 | 迁移后当前 SHA-256 |
| --- | --- | --- |
| 根目录 `education.db` | `706E172F8183AA608676839A1603E6CA5E87BCB4ACB82C87CA8669A3250807AD` | `BFB398E51F2A4A89F513E446301B0A367D58DAE95070DC5FF48358CDB45FFE70` |
| `apps/api/education.db` | `846C5B2965AC65D39DF78A5F5064CA7C60D18B99B05CE50A867195EA1B6F4351` | `AAA6F62EC35892765EE28364B2737C32EF8AC46AB10E5F0459E8401DA0DE80C9` |

备份文件分别为：

- `education.db.pre-anonymous-20260825T151838677489Z.bak`
- `apps/api/education.db.pre-anonymous-20260825T151839088374Z.bak`

备份长度、修改时间和 SHA-256 与迁移前数据库完全一致；备份已加入忽略规则，不会进入 Git。全量测试前后两份当前运行库的长度、修改时间和 SHA-256 均未改变。

用户原有未跟踪文件 `docs/创新赛道——开发日志参考模板.docx` 未编辑、未暂存，最终核验 SHA-256 为 `13EC6564A06ED2A6526DDB43A6AD98D86C11E58E72CACB6F4F77E7436DC04155`。

## 正式边界

- 当前版本刻意不实现登录；浏览器匿名 ID 用于隔离本机档案，不是身份认证或敏感数据授权机制。
- 外部 LLM、语音识别/合成和 Wikipedia 联网能力依赖部署配置、浏览器实现或外部服务可用性；失败时必须保持明确状态，不补造成功结果。
- C 编译能力是受约束的教学模拟，不是任意代码沙箱。
- 历史开发规格中的 Demo 说明仅作为工程记录保留，不代表当前路由、Seed 或运行数据库状态。
