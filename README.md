# 忆涟千言—教 EducationMind

EducationMind 是一个无登录、以真实学习证据为核心的教育智能体应用。完整站点提供学习诊断、动态计划、知识空间、数字人讲解、练习与考试、网络检索、编译模拟、资源生成和学习档案；`/#/agent` 提供可嵌入 iframe 或 WebView 的独立小涟页面。

当前版本不再使用比赛展示页、固定公共学习者、预置掌握度或 Mock LLM。课程与知识点属于共享目录；画像、证据、计划、练习和考试结果只会由当前匿名档案的真实操作产生。

## 无登录匿名模式

页面启动时按以下顺序解析学习上下文：

1. 部署方在页面脚本加载前提供的 `window.__EDUCATIONMIND_CONFIG__`；
2. 当前浏览器 localStorage 中的随机匿名标识；
3. 首次访问时生成的 `anon:<uuid>`。

匿名标识是数据分区键，不是认证或授权凭据。它不提供账号找回、跨设备同步、教师/学生权限隔离、监考或防作弊保证。公开互联网部署必须由宿主网关限制访问范围、写接口和请求速率，不应让不受信任的访客直接访问命题与批阅能力。

localStorage 只保存随机匿名标识，不保存姓名、手机号或邮箱。语音识别由浏览器完成，用户确认后的文字才会发送；原始音频不会上传到 EducationMind API。语音输出使用昔涟 GPT-SoVITS 时，待朗读文字会发送到部署方配置的语音服务；参考音频路径、模型权重和推理参数只保存在服务端。

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

该命令会先校验 9 个 ONNX/二进制模型文件、中文运行资源和固定参考音频，再按就绪条件依次启动 `127.0.0.1:9881` 的 Genie-TTS 侧车、`127.0.0.1:8000` 的 Education API 和 `127.0.0.1:5173` 的 Vite 网站。看到 `CYRENE_WEB_READY` 后打开 `http://127.0.0.1:5173/#/agent`，点击回答旁的“昔涟讲解”即可生成并播放当前文字对应的语音。

只检查环境而不启动进程：

```powershell
pnpm dev:cyrene -ValidateOnly
```

一键入口把匿名学习记录持久化到被 Git 忽略的 `.local/runtime/education.db`，不会覆盖仓库根目录或 `apps/api` 下的现有 SQLite。API 与侧车日志写入 `.logs/`。按 Ctrl+C 时，Windows Job Object 会终止本轮创建的完整子进程树；端口已被其他程序占用时则直接拒绝启动，不会停止未知进程。

### 后端

```powershell
Set-Location apps\api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

API 文档：`http://localhost:8000/docs`。

默认数据库为后端工作目录下的 `education.db`。部署时应使用绝对数据库 URL：

```powershell
$env:EDUCATION_DATABASE_URL = 'sqlite:///D:/educationmind-data/education.db'
```

不要把生产 SQLite、备份、密钥或 `.env` 提交到 Git。

## 嵌入其他平台

### 直接 iframe

不需要宿主身份映射时，可以直接使用浏览器匿名档案：

```html
<iframe
  src="https://learning.example.com/#/agent"
  title="忆涟千言教育智能体"
  style="width:100%;min-height:760px;border:0"
  allow="microphone"
></iframe>
```

跨站 iframe 可能受到浏览器第三方存储策略影响。需要稳定的平台身份映射时，宿主应部署或代理同一前端，并在应用模块脚本之前注入一个不含个人信息的 opaque ID：

```html
<script>
  window.__EDUCATIONMIND_CONFIG__ = {
    learnerId: 'platform:user-42',
    courseId: 'course-os',
    apiBaseUrl: 'https://education-api.example.com'
  };
</script>
```

ID 允许字母、数字、点、下划线、冒号和连字符，长度为 3–128；不要放入姓名、邮箱或手机号。`apiBaseUrl` 只接受同源绝对路径或 HTTP(S) 地址。

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

## Live2D 资源

昔涟模型和 Cubism Core 位于被 Git 忽略的 `.local/live2d/`，源文件不会进入仓库。开发服务器将其只读挂载到 `/local-live2d/`；执行 `pnpm build` 时，如果本地目录存在，构建插件会拒绝符号链接并把普通文件复制到 `dist/local-live2d/`。交付 `dist` 前仍须确认模型与 Cubism 授权允许目标平台使用。

Live2D 加载失败时页面不会显示旧形象回退。构建通过并不代表模型可用，最终交付必须在真实浏览器检查模型请求、Cubism Core、可见尺寸、口型和抖动。

## 昔涟 Genie-TTS / GPT-SoVITS 语音

当前推荐链路使用本机 [High-Logic/Genie-TTS](https://github.com/High-Logic/Genie-TTS) 2.0.2 和已经转换的昔涟 V2ProPlus ONNX 模型；旧的 GPT-SoVITS V2 HTTP 链路继续作为部署兼容选项。两条链路都只能由 Education API 访问，网页最多提交 600 个清洗后的字符，不能指定模型、上游地址、参考音频、保存路径或推理参数。未配置或调用失败时，界面会明确显示“浏览器语音（非昔涟音色）”，不会把系统语音冒充为昔涟。

当前机器优先使用前文的 `pnpm dev:cyrene` 启动完整网站。下面的分步命令用于部署、迁移和单独排障，不是日常试听所必需的三个手工步骤。

### 1. 安装经审计的参考音频

不要整体解压约 1.27 GB 的参考语料。使用安装器只读取一个固定文件：

```powershell
apps\api\.venv\Scripts\python.exe apps\api\scripts\install_cyrene_voice.py `
  --zip 'F:\昔涟AI-GPT-SOVITS--V2proplus\昔涟参考音频.zip' `
  --output 'F:\比赛\智能体 ican 教育skill\.local\voice'
```

安装器要求绝对路径，验证 ZIP 路径安全、唯一文件名、大小、PCM 参数和 SHA-256，然后生成被 Git 忽略的：

- `.local/voice/cyrene-reference.wav`
- `.local/voice/cyrene-reference.json`

固定 WAV 的 SHA-256 为 `C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`；提示文本为“能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。”。

### 2. 校验并启动 Genie-TTS 侧车

当前机器已审计以下运行资产：

- Genie-TTS：`F:\gpt sovites 轻量级\Genie-TTS`，本地版本 2.0.2；
- 昔涟 ONNX：`Output\昔涟AI-GPT-SOVITS--V2proplus`，9 个文件、335,992,804 字节；
- GenieData：中文 G2P、Chinese HuBERT 与 speaker encoder 已就绪；
- 参考音频：`.local/voice/cyrene-reference.wav`。

先执行只读校验。它会逐个核对模型文件大小和 SHA-256，不加载模型、不生成音频、不修改 Genie-TTS 仓库：

```powershell
& apps\api\scripts\start_genie_voice.ps1 -ValidateOnly -PrintEducationEnvironment
```

随后在独立终端以前台方式启动侧车：

```powershell
& apps\api\scripts\start_genie_voice.ps1
```

侧车固定监听 `127.0.0.1:9881`、固定单 worker，只公开 `GET /health` 与 `POST /tts`。它不需要管理员权限，不使用 Genie-TTS 原始的模型管理/任意保存接口；每次请求串行推理到私有临时 WAV，验证 32 kHz、单声道、16 位、RIFF/WAVE 和体积后立即删除临时文件。

迁移到其他 Windows 主机时覆盖路径即可，不必修改代码：

```powershell
& apps\api\scripts\start_genie_voice.ps1 `
  -GenieRoot 'D:\voice\Genie-TTS' `
  -ModelDirectory 'D:\voice\models\cyrene-v2pp' `
  -ReferenceAudio 'D:\educationmind\voice\cyrene-reference.wav'
```

不要把 Genie-TTS `.venv`、`GenieData`、ONNX 模型、原始 `.ckpt`/`.pth` 或生成 WAV 提交到本仓库。当前 ONNX 已可使用，本流程不会重新反序列化原始 PyTorch 权重或重新转换模型。

### 3. 配置并启动 Education API（Genie 推荐）

```powershell
$env:EDUCATION_TTS_PROVIDER = 'genie'
$env:EDUCATION_TTS_BASE_URL = 'http://127.0.0.1:9881'
$env:EDUCATION_TTS_TIMEOUT = '60'
$env:EDUCATION_TTS_MAX_AUDIO_BYTES = '20000000'
Set-Location apps\api
uv run uvicorn app.main:app --port 8000
```

Genie 模式只需要 Provider 与侧车 URL。`GET /api/voice/status` 如实返回 `genie_tts`、`gpt_sovits` 或 `unavailable`，但不泄露内部地址或路径；`POST /api/voice/synthesize` 只接受 `{"text":"..."}` 并返回二次校验、禁止缓存的 WAV。侧车故障时请求返回安全错误，前端自动改用明确标注的浏览器语音。

### 4. 旧 GPT-SoVITS V2 兼容配置

未设置 `EDUCATION_TTS_PROVIDER` 时默认保持 `gpt_sovits`。兼容官方 [`api_v2.py`](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py) 的部署仍可使用：

```powershell
$env:EDUCATION_TTS_PROVIDER = 'gpt_sovits'
$env:EDUCATION_TTS_BASE_URL = 'http://127.0.0.1:9880'
$env:EDUCATION_TTS_REFERENCE_AUDIO_PATH = 'F:/比赛/智能体 ican 教育skill/.local/voice/cyrene-reference.wav'
$env:EDUCATION_TTS_REFERENCE_TEXT = '能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。'
```

这一路径仍要求 URL、参考 WAV 路径和匹配文本三项完整；远程/容器部署时，参考路径必须是 GPT-SoVITS 进程可见的只读挂载路径。

语音功能的完整署名为：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

Genie-TTS 运行时声明为：`Genie-TTS 2.0.2，Copyright (c) 2025 High_Logic，MIT License`。详情见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。部署方仍须自行确认参考音频、角色音色、模型权重和推理包在目标平台上的授权范围。

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

## 质量门禁

```powershell
pnpm test --run
pnpm check
pnpm build
apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q
```

`pnpm check` 是必需门禁，包含 TypeScript 与 ESLint。pytest 在会话开始前把应用数据库指向系统临时目录，测试结束后释放 SQLite 句柄并删除临时文件，不能触碰仓库中的运行库。

## 真实能力边界

- 画像、诊断、计划、练习、考试和学习档案来自 API 持久化数据；证据不足保持未知。
- 网络搜索返回实际 Provider 状态和来源；失败不补造结果。
- 编译实验是受约束的语义模拟器，不执行任意用户代码。
- 资源生成基于真实课程材料与显式输入，失败不返回伪造资源。
- 无登录版本没有账号权限；匿名 ID 不应被用作敏感信息访问控制。
- 历史开发规格可以保留为工程记录，但不代表当前运行时能力；以现有代码、测试和浏览器验证为准。
