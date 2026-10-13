# 涟千言

> 当前语音输出仅使用部署方配置的 MiniMax 云端服务；本地语音引擎、参考音频、推理模型、账号级旧 TTS 与浏览器朗读回退均已移除。联网学习检索默认使用 AnySearch，资源图片使用 MiniMax `image-01`。下方若有历史版本遗留说明，以本段和 `apps/api/README.md` 为准。

涟千言是一个使用正式账号、以真实学习证据为核心的陪伴式教育智能体应用。完整站点提供学习诊断、动态计划、GraphRAG 知识空间、小涟对话、练习与考试、AnySearch 联网检索、图文资源生成和学习档案。

当前版本不再使用比赛展示页、固定公共学习者、匿名浏览器身份、预置掌握度或 Mock LLM。课程与知识点属于共享目录；画像、证据、计划、练习和考试结果只会由已登录账号的真实操作产生。

## 正式账号与空白学习空间

页面启动先恢复服务端 HttpOnly Cookie 会话；未登录时只展示登录/注册页，不挂载业务路由，也不会请求任何画像、计划或成绩。注册只建立账号，不生成学习计划、任务、证据、掌握度、画像或考试记录。新账号先完成目标与学习节奏初始化，再进入当前可用的学习空间；课程之后可随时调整。

密码以带独立随机盐的 scrypt 哈希保存，明文密码和会话令牌都不落库；会话令牌只通过 HttpOnly、SameSite=Lax Cookie 传输。连续五次失败会锁定账号 15 分钟。业务 API 默认要求认证，并校验当前账号、学习者和所选课程范围。

localStorage 只缓存非敏感的账号 ID 与已选课程，用于让现有学习模块建立请求上下文；它不是认证凭据。语音识别由浏览器完成，用户确认后的文字才会发送；原始音频不会上传到涟千言 API。语音输出文字会发送到部署方配置的 MiniMax 云端服务，API Key 仅保存在后端。

## 主要入口

| Hash 路由 | 用途 |
| --- | --- |
| `/#/` | 完整学习首页 |
| `/#/xiaolian` | 完整站点内的小涟工作区 |
| `/#/diagnosis` | 基于真实证据的学习诊断 |
| `/#/my-learning` | 当前计划与学习任务 |
| `/#/space` | 课程内容、辅导、练习和反思 |
| `/#/exams` | 自定义题型、题库、组卷、作答、评分与复盘 |
| `/#/resources` | 网络搜索、编译模拟和资源生成 |
| `/#/archive` | 学习画像、证据、计划与考试成长记录 |
| `/#/adaptive` | Lian-LEAP：诊断、教学决策、针对性学习与独立新题验证 |
| `/#/outcome-lab` | 真实前后作答成绩、教学过程、策略对照与延迟复测 |

`/demo` 和 `/showcase` 已撤除，不再注册路由。

## Lian-LEAP 自适应教学

当前以《数据结构与算法》（`course-ds`）为试点，覆盖单链表插入复杂度、栈与队列、二叉搜索树和图搜索。进入 `/#/adaptive` 后，学习者先作答，系统关联真实证据、形成误解假设并排序教学行动；完成讲解后，用不同题目进行无提示验证。验证结果写入现有 LearningEvidence、掌握度和动态规划；会话保存在数据库，刷新页面或从小涟、学习空间、诊断和档案进入后可以恢复。

六类行动为诊断追问、对比讲解、前置知识补强、分步练习、迁移挑战和主动回忆。目录、题库、显式评分规则与策略分别有版本；开放文本按预设要点评分，当前不宣称为经过校准的语义阅卷或已验证的教学算法。`M` 是 BKT 掌握估计，`U` 是当前证据量下的不确定性指标，`Q` 是误解候选分布；它们与独立测评成绩分别保存。课程内容状态为 `pending_human_review`，需教师正式审核。

主要 API（正式账号与所选课程权限沿用现有服务）：

| API | 作用 |
| --- | --- |
| `GET /api/adaptive/catalog` | 目录、误解映射、前置关系和可用动作 |
| `GET/POST /api/adaptive/sessions` | 列出或创建当前学习者会话 |
| `GET /api/adaptive/sessions/{id}` | 恢复已保存状态 |
| `POST /api/adaptive/sessions/{id}/diagnose` | 提交诊断作答并生成教学决策 |
| `POST /api/adaptive/sessions/{id}/intervene` | 执行或调整教学方式 |
| `POST /api/adaptive/sessions/{id}/practice` | 记录可选辅助练习；带提示成绩不计作独立验证 |
| `POST /api/adaptive/sessions/{id}/ready-probe` | 收起教学，进入已保存的独立验证阶段 |
| `POST /api/adaptive/sessions/{id}/probe` | 独立新题评分、结果记录与重规划 |
| `POST /api/adaptive/sessions/{id}/retest` | 到期后的 7 天无提示复测 |
| `GET /api/adaptive/overview` | 真实状态、会话和策略分组汇总 |
| `GET /api/adaptive/experiments/export` | 导出当前学习者的版本化过程与结果 JSON |

查询当前范围使用 `learner_id`、`course_id`。独立题按学习者与主题分配未见题，题池耗尽时明确提示；前测、训练、后测和延迟题分别维护。`/#/outcome-lab` 展示实际作答成绩，空组与尚未完成的复测保持待采集。A–D 是可运行机制对照，用户可选择固定策略、证据策略、LEAP 及单要素消融；单次前后变化与非随机分组统计不用于宣称因果教学增益。

部署沿用本项目原有前后端镜像与启动方式，不增加微服务。后端启动时为新的 `adaptive_sessions`、`adaptive_knowledge_states` 建表，保留现有账号与学习记录；前端使用 `pnpm build` 打包。必要检查为 `pnpm check`、`pnpm build`，后端核心流程检查为 `uv run pytest tests/test_adaptive_leap.py -q`。

## 证据星河与小涟协作流

首页以“诊断 → 计划 → 学习 → 验证”四节点证据轨道呈现当前学习闭环。节点状态只由当前账号的真实诊断、ACTIVE 计划、学习任务和持久化学习证据推导；没有数据的节点保持等待，不用预置进度补齐。

小涟对话使用 `POST /api/agents/chat/stream` 返回 SSE。浏览器会依次收到公开的业务阶段、实际执行的 Agent/Tool Trace、答案文本增量、完整结果和结束事件；这里展示的是可审计执行过程，不展示或伪造模型隐含推理。最终回答继续标记真实 Provider、模型、课程来源、上下文和建议动作。旧的 `POST /api/agents/chat` 保留兼容。

用户可以在生成期间停止回答。停止后保留已经收到的正文，但不会把它保存成完整助手消息；重新生成复用原问题，不重复写入用户消息。只有收到完整 `result` 后，助手回答才会进入账号对话历史。

## 本地运行

### 前端

项目契约只使用 pnpm：

```powershell
pnpm install
pnpm dev
```

Vite 默认监听 `http://localhost:5173`，并把 `/api` 代理到 `http://localhost:8000`。如需改变开发代理目标：

```powershell
$env:EDUCATION_API_URL = 'http://127.0.0.1:8000'
pnpm dev
```

`pnpm dev` 只启动前端。语音、图片、联网检索与 AI 优化均由后端代理云端服务，前端不读取任何服务密钥。

### 后端

```powershell
Set-Location apps\api
uv sync --frozen
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

API 文档：`http://localhost:8000/docs`。

后端配置在进程启动时读取并缓存；修改 `apps/api/.env` 后必须停止并重新启动 Uvicorn。

本机受信调试如果需要临时关闭验证码，可以只对当前后端进程设置：

```powershell
$env:EDUCATION_CAPTCHA_MODE = 'off'
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

该变量不会绕过账号密码、会话、学习者或课程范围校验。不要把 `off` 写入生产部署配置；不带该进程变量重新启动后，会恢复 `.env` 中的验证码模式。

默认数据库固定解析到 `apps/api/education.db`，不再随启动 API 的工作目录变化；`.env` 中的相对 SQLite URL 也会按该目录解析。部署时应使用绝对数据库 URL：

```powershell
$env:EDUCATION_DATABASE_URL = 'sqlite:///D:/educationmind-data/education.db'
```

不要把生产 SQLite、备份、密钥或 `.env` 提交到 Git。

## 嵌入其他平台

### 直接 iframe

登录注册界面可以直接嵌入 iframe；账号身份始终由涟千言服务端会话确定：

```html
<iframe
  src="https://learning.example.com/#/xiaolian"
  title="涟千言教育智能体"
  style="width:100%;min-height:760px;border:0"
  allow="microphone"
></iframe>
```

跨站 iframe 可能阻止会话 Cookie，正式部署推荐由宿主同域反向代理前端与 `/api/*`。宿主配置只用于指定 API 地址，不再接受注入的学习者或课程来绕过登录：

```html
<script>
  window.__EDUCATIONMIND_CONFIG__ = {
    apiBaseUrl: 'https://education-api.example.com'
  };
</script>
```

`apiBaseUrl` 只接受同源绝对路径或 HTTP(S) 地址。生产 HTTPS 部署设置 `EDUCATION_AUTH_COOKIE_SECURE=true`。

### 跨域 API

后端只向明确列出的宿主 Origin 返回 CORS 许可：

```powershell
$env:EDUCATION_CORS_ORIGINS = 'https://portal.example.com,https://learning.example.com'
```

默认仅允许 `http://localhost:5173` 与 `http://127.0.0.1:5173`。通配符和非 HTTP(S) Origin 会被忽略。

### 生产 API 地址

同域部署可保持空地址，让浏览器调用 `/api`。分离部署时在构建前配置：

```powershell
$env:VITE_EDUCATION_API_URL = 'https://education-api.example.com'
pnpm build
```

## 外部模型

只有三项配置都完整时才调用真实 OpenAI-compatible 服务：

```powershell
$env:EDUCATION_LLM_BASE_URL = 'https://llm.example.com/v1'
$env:EDUCATION_LLM_API_KEY = '<secret>'
$env:EDUCATION_LLM_MODEL = 'your-model'
```

未配置时，`GET /api/system/llm` 返回 `provider: unavailable`。小涟不会伪造模型输出，而是把真实课程检索结果、画像和计划组织成确定性的基础辅导，并在 API 与界面中标记为 `fallback`。状态接口不会返回 Key、Authorization 或内部 Base URL。

这三项就是项目的**部署默认对话模型**，位置为 `apps/api/.env`（本机开发）或部署平台的后端环境变量（生产）。不要把真实 Key 写入仓库。账号登录后还可以在“设置 → AI 与连接”添加并选择 OpenAI-compatible 对话模型；服务端只允许 `EDUCATION_CUSTOM_MODEL_HOSTS` 中的主机，防止任意 URL 变成内网代理。需要保存账号级 API Key 时先生成 Fernet Key 并只放在后端：

```powershell
apps\api\.venv\Scripts\python.exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
$env:EDUCATION_MODEL_SECRET_KEY = '<上一步生成的值>'
$env:EDUCATION_CUSTOM_MODEL_HOSTS = 'api.openai.com,models.example.com,voice.example.com'
```

仅本机受信开发端点确需 HTTP 时才设置 `EDUCATION_CUSTOM_MODEL_ALLOW_HTTP=true`，并把精确主机加入 allowlist。语音输出不再读取账号级模型配置，只使用部署方的 MiniMax 配置。

### Cloudflare Turnstile 验证码

Claude 不是验证码服务。本项目使用适合 SPA 的 Cloudflare Turnstile 显式渲染，并在后端调用 Siteverify；只配置前端 Site Key 不会启用验证。

> **配置文件位置**：后端进程读取的是 `apps/api/.env`（`API_ENV_FILE` 指向后端目录），不是仓库根目录的 `.env`。改完任何 `.env` 后必须重启后端进程才会生效。

可先复制无密钥模板：`Copy-Item apps/api/.env.example apps/api/.env`，再替换占位值。真实 `.env` 已被 Git 忽略。

```powershell
$env:EDUCATION_TURNSTILE_SITE_KEY = '<Cloudflare widget site key>'
$env:EDUCATION_TURNSTILE_SECRET_KEY = '<Cloudflare widget secret key>'
```

两项都配置后，注册与登录必须提交一次性验证码 token；Secret 永远不会出现在 `/api/public/config` 或前端构建中。本地未配置时验证码诚实地处于关闭状态，不使用假验证码。

### MiniMax 语音与图片生成

部署推荐使用 MiniMax 开放平台完成语音输出（替代 Genie-TTS / GPT-SoVITS 本地链路）。在 MiniMax 控制台的 Account → API Keys 创建 API Key 后，在后端实际读取的 `apps/api/.env` 中配置：

```powershell
$env:EDUCATION_MINIMAX_API_KEY = '<MiniMax API Key>'
# 可选：EDUCATION_MINIMAX_MODEL = 'speech-02-hd'
# 可选：EDUCATION_MINIMAX_VOICE_ID = 'female-shaonv' 等音色 ID
# 可选：EDUCATION_MINIMAX_IMAGE_MODEL = 'image-01'
```

MiniMax 配置后，`/api/voice/status` 返回 `provider=minimax`；同一 API Key 也用于资源页 `image-01` 图片生成。API Key 不会下发到前端。**修改 `.env` 后必须重启后端进程才会生效。** 未配置或云端失败时明确显示不可用，不回退到旧本地引擎、账号级 TTS 或浏览器朗读。

默认语音与图片都调用 `https://api.minimax.io`。仅使用旧区域端点的已有账号才同时设置
`EDUCATION_MINIMAX_BASE_URL=https://api.minimax.chat` 与 `EDUCATION_MINIMAX_GROUP_ID=<UID>`；
国际开放平台默认端点不需要 GroupId。

### AnySearch 联网检索

在 AnySearch 控制台创建 API Key 后写入后端配置：

```powershell
$env:EDUCATION_ANYSEARCH_API_KEY = '<AnySearch API Key>'
# 一般保持默认：EDUCATION_ANYSEARCH_BASE_URL = 'https://api.anysearch.com'
```

AnySearch 只用于外部延伸阅读；课程内 GraphRAG 仍使用本地课程知识与关系。联网失败时保留清晰错误和原始来源边界，不生成伪造搜索结果。

### Vaptcha 兜底验证

国内网络访问 Cloudflare 不稳定时，可配置 Vaptcha 作为兜底人机验证：在 [vaptcha.com](https://www.vaptcha.com/) 注册验证单元后填入

```powershell
$env:EDUCATION_VAPTCHA_VID = '<验证单元 VID>'
$env:EDUCATION_VAPTCHA_KEY = '<验证单元 Key>'
```

Turnstile 与 Vaptcha 同时配置时，`/api/public/config` 按 `["turnstile", "vaptcha"]` 下发验证链；前端 Turnstile 加载失败或超时未出票会自动切换 Vaptcha，请求携带 `captcha_provider` 标记实际来源，后端分别调用 Siteverify 或 `api.vaptcha.com/verify`（成功码 `0103`）。`EDUCATION_CAPTCHA_MODE` 可强制 `turnstile`、`vaptcha` 或 `off`，默认 `auto`。

## Live2D 资源

昔涟模型和 Cubism Core 位于被 Git 忽略的 `.local/live2d/`，源文件不会进入仓库。开发服务器将其只读挂载到 `/local-live2d/`；执行 `pnpm build` 时，如果本地目录存在，构建插件会拒绝符号链接并把普通文件复制到 `dist/local-live2d/`。交付 `dist` 前仍须确认模型与 Cubism 授权允许目标平台使用。

Live2D 加载失败时页面不会显示旧形象回退。构建通过并不代表模型可用，最终交付必须在真实浏览器检查模型请求、Cubism Core、可见尺寸、口型和抖动。

## 部署后的远程 MCP

账号进入“设置 → 远程 MCP 访问”创建个人令牌；明文只显示一次。部署端点为 `https://你的域名/mcp`（客户端允许跟随到 `/mcp/` 的标准挂载重定向），认证头为 `Authorization: Bearer emcp_...`。服务端会把学习者与课程范围固定为令牌所属账号和该账号当前所选课程，客户端传入其他 ID 不会扩大权限。

生产环境必须把真实域名（含端口时写端口）加入 DNS 重绑定保护：

```powershell
$env:EDUCATION_MCP_ALLOWED_HOSTS = 'learn.example.com,localhost:*,127.0.0.1:*'
$env:EDUCATION_MCP_PUBLIC_BASE_URL = 'https://learn.example.com/mcp'
```

本地桌面宿主仍可按 `mcp/server/README.md` 使用 stdio，不需要账号令牌。

## 项目技能资源

用户提供的两个 MIT 技能包已规范化导入 `skills/xiaolian-core-workflow/` 与 `skills/lian-navigator/`。它们属于项目资源，不会自动改写系统提示词或安装到全局工具目录；完整源码发布包会携带 `skills/`，由目标智能体平台按自身的技能加载规则显式启用。

## 数据初始化与旧数据退出

应用启动只创建共享课程目录、知识点和内置考试元数据，不创建任何学习者掌握度、证据、计划或考试结果。

先盘点旧固定学习者数据，命令必须使用绝对路径：

```powershell
Set-Location apps\api
uv run python scripts\remove_legacy_demo_learner.py --database 'D:\educationmind-data\education.db'
```

确认输出只命中 `demo-user-001` 后再应用：

```powershell
uv run python scripts\remove_legacy_demo_learner.py --database 'D:\educationmind-data\education.db' --apply
```

apply 会先创建 `*.pre-anonymous-<UTC>.bak`，再按依赖顺序删除该 ID 的考试作答、计划任务、证据、掌握度、档案和用户行。没有匹配行时不会备份或改写数据库；其他 learner ID 和课程目录不会被删除。

## 开发与质量

前端依赖和质量门禁：

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test -- --run
pnpm build
```

后端依赖和测试在现有 uv 项目中执行：

```powershell
Set-Location apps\api
uv sync --frozen
uv run pytest -q
```

`pnpm check` 是必需门禁，包含 TypeScript 与 ESLint。pytest 在会话开始前把应用数据库指向系统临时目录，测试结束后释放 SQLite 句柄并删除临时文件，不能触碰仓库中的运行库。GitHub Actions 会在每次 push 和 pull request 时自动执行同等的前端检查、测试、生产构建与后端测试。

## 真实能力边界

- 画像、诊断、计划、练习、考试和学习档案来自 API 持久化数据；证据不足保持未知。
- 网络搜索返回实际 Provider 状态和来源；失败不补造结果。
- 编译实验是受约束的语义模拟器，不执行任意用户代码。
- 资源生成基于真实课程材料与显式输入，失败不返回伪造资源。
- 正式账号会话隔离学习数据；当前版本尚未提供教师/管理员角色、邮箱找回、监考或防作弊保证。
- 历史开发规格可以保留为工程记录，但不代表当前运行时能力；以现有代码、测试和浏览器验证为准。
