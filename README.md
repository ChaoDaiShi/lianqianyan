# 忆涟千言—教 EducationMind

EducationMind 是一个使用正式账号、以真实学习证据为核心的教育智能体应用。完整站点提供学习诊断、动态计划、知识空间、数字人讲解、练习与考试、网络检索、编译模拟、资源生成和学习档案；`/#/agent` 提供可嵌入 iframe 或 WebView 的独立小涟页面。

当前版本不再使用比赛展示页、固定公共学习者、匿名浏览器身份、预置掌握度或 Mock LLM。课程与知识点属于共享目录；画像、证据、计划、练习和考试结果只会由已登录账号的真实操作产生。

## 正式账号与空白学习空间

页面启动先恢复服务端 HttpOnly Cookie 会话；未登录时只展示登录/注册页，不挂载业务路由，也不会请求任何画像、计划或成绩。注册只建立账号，不生成学习计划、任务、证据、掌握度、画像或考试记录。用户必须主动选择课程后才能进入学习空间。

密码以带独立随机盐的 scrypt 哈希保存，明文密码和会话令牌都不落库；会话令牌只通过 HttpOnly、SameSite=Lax Cookie 传输。连续五次失败会锁定账号 15 分钟。业务 API 默认要求认证，并校验当前账号、学习者和所选课程范围。

localStorage 只缓存非敏感的账号 ID 与已选课程，用于让现有学习模块建立请求上下文；它不是认证凭据。语音识别由浏览器完成，用户确认后的文字才会发送；原始音频不会上传到 EducationMind API。语音输出使用昔涟 GPT-SoVITS 时，待朗读文字会发送到部署方配置的语音服务；参考音频路径、模型权重和推理参数只保存在服务端。

## 主要入口

| Hash 路由 | 用途 |
| --- | --- |
| `/#/` | 完整学习首页 |
| `/#/agent` | 跨平台独立智能体页，无完整站点导航 |
| `/#/xiaolian` | 完整站点内的小涟工作区 |
| `/#/diagnosis` | 基于真实证据的学习诊断 |
| `/#/my-learning` | 当前计划与学习任务 |
| `/#/space` | 课程内容、辅导、练习和反思 |
| `/#/exams` | 自定义题型、题库、组卷、作答、评分与复盘 |
| `/#/resources` | 网络搜索、编译模拟和资源生成 |
| `/#/archive` | 学习画像、证据、计划与考试成长记录 |

`/demo` 和 `/showcase` 已撤除，不再注册路由。

## 正式发布包

先运行完整质量门禁，再生成平台全栈源码主包、静态兼容包和 Windows 完整服务包：

```powershell
pnpm check
pnpm test -- --run
Set-Location apps\api
uv run pytest -q
Set-Location ..\..
pnpm release
```

产物写入被 Git 忽略的 `release/`：

- `EducationMind-Platform-FullSource-1.4.0.zip`：平台上传源码包。ZIP 根目录包含 React/Vite 前端、FastAPI 后端、MCP、测试、锁文件、部署说明、昔涟 Live2D 资产和干净参考音频；不包含数据库、密钥、GenieData、TTS 模型、缓存或虚拟环境。目标平台必须能够分别构建 Node/pnpm 前端与 Python/uv 后端，详见包内 `PLATFORM_SOURCE_README.md`。
- `EducationMind-Platform-Web-1.4.0.zip`：`index.html` 位于压缩包根目录，供只有静态 ZIP 导入能力的平台使用；不包含 API、数据库、参考音频或密钥。平台必须把同域 `/api/*` 转发到另行部署的 Education API。
- `EducationMind-Windows-Full-1.4.0.zip`：包含静态网站、Education API、Genie-TTS 必需源码、GenieData、昔涟 ONNX 模型与固定参考音频；不包含任何开发数据库、历史学习记录、日志、密钥或现有 `.venv`。
- `EducationMind-1.4.0-SHA256.txt`：上述三个正式 ZIP 的 SHA-256 清单。

发布脚本同时保留 `release/staging/` 下的正式部署目录，使用白名单复制和 .NET `ZipArchive`，ZIP 成员使用 `/` 分隔且没有 `./` 前缀。`-Edition Platform` 会同时生成 FullSource 与 Web，`-Edition Full` 只生成 Windows 包。Windows 完整包解压后按包内 `README.md` 执行 `install.ps1` 与 `start.ps1`；首次启动只会新建空白业务库。

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

`pnpm dev` 只启动前端，不会加载昔涟模型。当前 Windows 工作站要直接运行带真实昔涟语音的完整网站，使用 PowerShell 7 和一键入口：

```powershell
pnpm dev:cyrene
```

该命令会先校验 9 个 ONNX/二进制模型文件、中文运行资源和固定参考音频，再启动内嵌 Genie-TTS 的 `127.0.0.1:8000` Education API 与 `127.0.0.1:5173` Vite 网站。看到 `CYRENE_WEB_READY` 后打开 `http://127.0.0.1:5173/#/agent`，点击回答旁的“昔涟讲解”即可生成并播放当前文字对应的语音。

只检查环境而不启动进程：

```powershell
pnpm dev:cyrene -ValidateOnly
```

一键入口把账号与学习记录持久化到被 Git 忽略的 `.local/runtime/education.db`，不会覆盖仓库根目录或 `apps/api` 下的现有 SQLite。API 与网站日志写入 `.logs/`。按 Ctrl+C 时，Windows Job Object 会终止本轮创建的完整子进程树；端口已被其他程序占用时则直接拒绝启动，不会停止未知进程。

### 后端

```powershell
Set-Location apps\api
uv sync --frozen
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

API 文档：`http://localhost:8000/docs`。

内嵌 Genie-TTS 时不要使用 `--reload`。Uvicorn 的重载父子进程会分别持有监听端口，文件变化时还会反复卸载、加载数 GB 的语音模型；终端被强制关闭后，旧子进程也可能继续接收请求，造成“日志显示模型成功、网页状态却不可用”的随机结果。日常开发优先从仓库根目录运行 `pnpm dev:cyrene`，需要刷新后端代码时先按 Ctrl+C 完整停止，再重新启动。

默认数据库固定解析到 `apps/api/education.db`，不再随启动 API 的工作目录变化；`.env` 中的相对 SQLite URL 也会按该目录解析。部署时应使用绝对数据库 URL：

```powershell
$env:EDUCATION_DATABASE_URL = 'sqlite:///D:/educationmind-data/education.db'
```

不要把生产 SQLite、备份、密钥或 `.env` 提交到 Git。

## 嵌入其他平台

### 直接 iframe

登录注册界面可以直接嵌入 iframe；账号身份始终由 EducationMind 服务端会话确定：

```html
<iframe
  src="https://learning.example.com/#/agent"
  title="忆涟千言教育智能体"
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

这三项就是项目的**部署默认对话模型**，位置为 `apps/api/.env`（本机开发）或部署平台的后端环境变量（生产）。不要把真实 Key 写入仓库。账号登录后还可以在“设置 → 账号模型”添加并选择 OpenAI-compatible 对话模型或外部语音模型；服务端只允许 `EDUCATION_CUSTOM_MODEL_HOSTS` 中的主机，防止任意 URL 变成内网代理。需要保存账号级 API Key 时先生成 Fernet Key 并只放在后端：

```powershell
apps\api\.venv\Scripts\python.exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
$env:EDUCATION_MODEL_SECRET_KEY = '<上一步生成的值>'
$env:EDUCATION_CUSTOM_MODEL_HOSTS = 'api.openai.com,models.example.com,voice.example.com'
```

仅本机受信开发端点确需 HTTP 时才设置 `EDUCATION_CUSTOM_MODEL_ALLOW_HTTP=true`，并把精确主机加入 allowlist。账号级语音支持 OpenAI-compatible `/v1/audio/speech` 和 GPT-SoVITS `/tts`；选择后 `/api/voice/status` 返回 `account_tts`。

### Cloudflare Turnstile 验证码

Claude 不是验证码服务。本项目使用适合 SPA 的 Cloudflare Turnstile 显式渲染，并在后端调用 Siteverify；只配置前端 Site Key 不会启用验证。

```powershell
$env:EDUCATION_TURNSTILE_SITE_KEY = '<Cloudflare widget site key>'
$env:EDUCATION_TURNSTILE_SECRET_KEY = '<Cloudflare widget secret key>'
```

两项都配置后，注册与登录必须提交一次性验证码 token；Secret 永远不会出现在 `/api/public/config` 或前端构建中。本地未配置时验证码诚实地处于关闭状态，不使用假验证码。

## Live2D 资源

昔涟模型和 Cubism Core 位于被 Git 忽略的 `.local/live2d/`，源文件不会进入仓库。开发服务器将其只读挂载到 `/local-live2d/`；执行 `pnpm build` 时，如果本地目录存在，构建插件会拒绝符号链接并把普通文件复制到 `dist/local-live2d/`。交付 `dist` 前仍须确认模型与 Cubism 授权允许目标平台使用。

Live2D 加载失败时页面不会显示旧形象回退。构建通过并不代表模型可用，最终交付必须在真实浏览器检查模型请求、Cubism Core、可见尺寸、口型和抖动。

## 昔涟 Genie-TTS / GPT-SoVITS 语音

当前推荐链路使用项目内隔离的 [High-Logic/Genie-TTS](https://github.com/High-Logic/Genie-TTS) 2.0.2 和已经转换的昔涟 V2ProPlus ONNX 模型；旧的 GPT-SoVITS V2 HTTP 链路继续作为部署兼容选项。两条链路都只能由 Education API 访问，网页最多提交 600 个清洗后的字符，不能指定模型、上游地址、参考音频、保存路径或推理参数。未配置或调用失败时，界面会明确显示“浏览器语音（非昔涟音色）”，不会把系统语音冒充为昔涟。

当前机器优先使用前文的 `pnpm dev:cyrene` 启动完整网站。下面的分步命令用于部署、迁移和单独排障，不是日常试听所必需的三个手工步骤。

### 1. 安装经审计的参考音频

不要整体解压约 1.27 GB 的参考语料。使用安装器只读取一个固定文件：

```powershell
apps\api\.venv\Scripts\python.exe apps\api\scripts\install_cyrene_voice.py `
  --zip 'F:\昔涟AI-GPT-SOVITS--V2proplus\昔涟参考音频.zip' `
  --output 'F:\比赛\智能体 ican 教育skill\.local\voice'
```

安装器要求绝对路径，验证 ZIP 路径安全、唯一文件名、大小、PCM 参数和 SHA-256，然后生成被 Git 忽略的：

- `.local/voice/cyrene-reference-clean.wav`（2.12 秒单句语音加无声尾帧，共 3.05 秒）
- `.local/voice/cyrene-reference.json`

安装器先校验原始 WAV 的 SHA-256 `C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`，再只保留第一句并补无声尾帧到 Genie 建议的 3 秒以上，生成文件 SHA-256 为 `EB9F7564AEDCE832428623E6968EF206ABB5115B965FBBFF9C1B995229C17AA1`；提示文本必须精确使用“能在梦里听见朦胧的神谕。”。这样既不引入第二句，又避免把含多段停顿的长参考作为语义提示，降低模型复述参考台词的概率。

### 2. 导入项目内隔离 Genie-TTS 运行区

先将已审计的外部资产复制到项目 `runtime/genie-tts/`。脚本只复制引擎源码、GenieData、昔涟 ONNX 模型、必要许可证和清理后的单句参考音频，不移动或删除原目录：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/install-project-genie-runtime.ps1 -Force
```

当前项目运行区包含：

- Genie-TTS 引擎：`runtime/genie-tts/src/genie_tts/`，版本 2.0.2；
- 昔涟 ONNX：`runtime/genie-tts/Output/昔涟AI-GPT-SOVITS--V2proplus/`，9 个文件、335,992,804 字节；
- GenieData：`runtime/genie-tts/GenieData/`，包含中文 G2P、Chinese HuBERT 与 speaker encoder；
- 参考音频：`runtime/genie-tts/Reference/cyrene-reference.wav`；
- 清单：`runtime/genie-tts/RUNTIME_MANIFEST.json`。

执行一键入口的只读校验。它会逐个核对模型文件大小和 SHA-256，确认 Education API 可以导入 Genie-TTS，但不启动网站、不生成音频：

```powershell
pnpm dev:cyrene -ValidateOnly
```

Genie-TTS 由 Education API 生命周期从项目运行区直接加载，不监听额外端口。每次请求在单一异步锁中串行推理到私有临时 WAV，验证 32 kHz、单声道、16 位、RIFF/WAVE 和体积后立即删除临时文件。迁移到其他 Windows 主机时，默认无需再指定外部路径；确需诊断其他运行区时仍可覆盖：

```powershell
pnpm dev:cyrene `
  -GenieRoot 'D:\educationmind\runtime\genie-tts' `
  -ModelDirectory 'D:\educationmind\runtime\genie-tts\Output\昔涟AI-GPT-SOVITS--V2proplus' `
  -ReferenceAudio 'D:\educationmind\runtime\genie-tts\Reference\cyrene-reference.wav'
```

`runtime/genie-tts/` 位于同一个项目目录，但除说明文件外的约 750 MB 运行载荷由 `.gitignore` 隔离，不进入 Git 历史。不要提交 Genie-TTS `.venv`、GenieData、ONNX 模型、原始 `.ckpt`/`.pth` 或生成 WAV。当前 ONNX 已可使用，本流程不会重新反序列化原始 PyTorch 权重或重新转换模型；Windows Full 发布脚本会显式携带项目运行区。

### 3. 配置并启动内嵌昔涟语音的 Education API

```powershell
$env:EDUCATION_TTS_PROVIDER = 'genie'
$env:EDUCATION_TTS_GENIE_ROOT = 'F:/比赛/智能体 ican 教育skill/runtime/genie-tts'
$env:EDUCATION_TTS_MODEL_DIR = 'F:/比赛/智能体 ican 教育skill/runtime/genie-tts/Output/昔涟AI-GPT-SOVITS--V2proplus'
$env:EDUCATION_TTS_GENIE_DATA_DIR = 'F:/比赛/智能体 ican 教育skill/runtime/genie-tts/GenieData'
$env:EDUCATION_TTS_REFERENCE_AUDIO_PATH = 'F:/比赛/智能体 ican 教育skill/runtime/genie-tts/Reference/cyrene-reference.wav'
$env:EDUCATION_TTS_REFERENCE_TEXT = '能在梦里听见朦胧的神谕。'
$env:EDUCATION_TTS_TIMEOUT = '60'
$env:EDUCATION_TTS_MAX_AUDIO_BYTES = '20000000'
Set-Location apps\api
uv run uvicorn app.main:app --port 8000 --workers 1
```

Genie 模式要求项目运行区、模型、GenieData、参考 WAV 和参考文本五项完整，且固定使用一个 Uvicorn worker，避免重复加载模型。运行时会校验 `genie_tts` 的实际模块路径必须位于 `runtime/genie-tts/src`，不会悄悄回退到外部环境同名包。`GET /api/voice/status` 是不含内部路径的公开就绪探针，只有模型实际加载成功后才返回 `genie_tts`；初始化失败时主 API 继续运行并如实返回 `unavailable`。`POST /api/voice/synthesize` 仍要求有效登录会话，只接受 `{"text":"..."}` 并返回禁止缓存的 WAV，前端失败时自动改用明确标注的浏览器语音。

### 4. 旧 GPT-SoVITS V2 兼容配置

需要旧 HTTP 服务时显式设置 `EDUCATION_TTS_PROVIDER=gpt_sovits`。兼容官方 [`api_v2.py`](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py) 的部署仍可使用：

```powershell
$env:EDUCATION_TTS_PROVIDER = 'gpt_sovits'
$env:EDUCATION_TTS_BASE_URL = 'http://127.0.0.1:9880'
$env:EDUCATION_TTS_REFERENCE_AUDIO_PATH = 'F:/比赛/智能体 ican 教育skill/.local/voice/cyrene-reference-clean.wav'
$env:EDUCATION_TTS_REFERENCE_TEXT = '能在梦里听见朦胧的神谕。'
```

这一路径仍要求 URL、参考 WAV 路径和匹配文本三项完整；远程/容器部署时，参考路径必须是 GPT-SoVITS 进程可见的只读挂载路径。

语音功能的完整署名为：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

Genie-TTS 运行时声明为：`Genie-TTS 2.0.2，Copyright (c) 2025 High_Logic，MIT License`。详情见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。部署方仍须自行确认参考音频、角色音色、模型权重和推理包在目标平台上的授权范围。

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
