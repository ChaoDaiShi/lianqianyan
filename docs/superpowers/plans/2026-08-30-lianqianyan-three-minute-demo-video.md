# 涟千言三分钟比赛演示视频 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一支真实运行、MiniMax 异步配音、时长低于 3 分钟且小于 200 MB 的 1080p MP4 比赛演示视频及完整验收证据。

**Architecture:** 在当前工作区代码之上启动独立端口和独立 SQLite 副本，通过 Playwright 分段录制真实浏览器操作；MiniMax 配音作为独立异步任务创建、轮询并下载。最后使用本机 Playwright 附带的 FFmpeg 进行裁剪、缩放、字幕、混音和 H.264/AAC 编码，并由机器指标与抽帧人工检查共同验收。

**Tech Stack:** React/Vite、FastAPI/Uvicorn、SQLite 副本、Playwright、Node.js、Python/httpx、MiniMax T2A Async、FFmpeg、PowerShell、MP4/H.264/AAC/SRT。

## Global Constraints

- MP4，1920×1080，16:9，30 fps。
- 目标时长 2:48–2:52；硬上限严格小于 180 秒。
- 目标大小 35–90 MB；硬上限小于 200 MB。
- 画面必须来自真实浏览器和真实本地 API，禁止前端假状态、静态图冒充运行结果或虚构学习数据。
- MiniMax 必须使用异步 TTS 创建任务、查询状态、取得 `file_id` 并立即下载；密钥不得写入脚本、日志或产物。
- 当前未提交改动、数据库和 PPT 是用户状态，禁止 reset、clean、覆盖、迁移或合并原数据库。
- 仅使用 `pnpm` 执行前端项目命令，最终必须运行 `pnpm check`。
- 不使用子智能体；在当前会话内联执行并持续验证。

## File Structure

- Create: `scripts/demo-video/demo-video-lib.mjs` — 时间线、字幕、FFmpeg 路径与媒体指标的纯函数。
- Create: `scripts/demo-video/demo-video-lib.test.mjs` — Node 原生测试，验证时间码、字幕、大小/时长门槛和密钥脱敏。
- Create: `scripts/demo-video/prepare-demo-runtime.ps1` — 建立输出目录、复制 SQLite、生成临时环境并启动/停止独立服务。
- Create: `scripts/demo-video/record-scenes.mjs` — 使用 Playwright 录制真实分段场景和操作证据。
- Create: `scripts/demo-video/minimax-async-tts.py` — 创建、轮询、下载 MiniMax 异步 TTS，并保存无密钥元数据。
- Create: `scripts/demo-video/compose-demo.mjs` — 依据 timeline 调用 FFmpeg 合成画面、字幕与旁白。
- Create: `scripts/demo-video/verify-demo.mjs` — 检查时长、分辨率、流、体积、SHA-256、抽帧和功能时间码。
- Create: `scripts/demo-video/timeline.json` — 场景顺序、目标时长、字幕和画面标注的唯一数据源。
- Create: `demo_video_20260830/旁白稿.md` — 最终中文旁白与镜头映射。
- Create: `demo_video_20260830/涟千言_三分钟功能演示.srt` — 最终字幕。
- Create: `demo_video_20260830/video-manifest.json` — 机器可读验收结果，不含密钥。
- Create: `demo_video_20260830/verification.md` — 运行、录制、TTS、媒体指标和人工复核证据。
- Create: `demo_video_20260830/涟千言_三分钟功能演示.mp4` — 比赛提交成片。

---

### Task 1: 时间线与安全媒体工具

**Files:**
- Create: `scripts/demo-video/demo-video-lib.mjs`
- Create: `scripts/demo-video/demo-video-lib.test.mjs`
- Create: `scripts/demo-video/timeline.json`

**Interfaces:**
- Produces: `parseClock(text): number`、`formatSrtTime(seconds): string`、`buildSrt(entries): string`、`assertCompetitionMetrics(metrics): void`、`redactSecrets(value): unknown`。
- Consumes: Node.js 标准库；无项目运行时依赖。

- [ ] **Step 1: 写失败测试**

测试必须覆盖：`02:50.250 → 170.25`；SRT 时间格式；179.99 秒通过而 180 秒失败；199 MiB 通过而 200 MiB 失败；对象中 `api_key`、`Authorization` 和 Bearer token 被替换为 `[REDACTED]`。

- [ ] **Step 2: 验证失败**

Run: `node --test scripts/demo-video/demo-video-lib.test.mjs`

Expected: FAIL，原因是 `demo-video-lib.mjs` 尚不存在。

- [ ] **Step 3: 实现纯函数与时间线**

`timeline.json` 固定七段：`opening` 8 秒、`auth-home` 19 秒、`learning-loop` 48 秒、`knowledge` 23 秒、`exam` 20 秒、`resources` 27 秒、`xiaolian-close` 25 秒，总目标 170 秒。每段包含 `id`、`targetSeconds`、`narration`、`caption`、`featureEvidence`。

- [ ] **Step 4: 运行测试**

Run: `node --test scripts/demo-video/demo-video-lib.test.mjs`

Expected: 所有测试 PASS，进程退出码 0。

- [ ] **Step 5: 提交**

```powershell
git add -- scripts/demo-video/demo-video-lib.mjs scripts/demo-video/demo-video-lib.test.mjs scripts/demo-video/timeline.json
git commit -m "feat: add demo video timeline tooling"
```

### Task 2: 隔离的真实演示运行环境

**Files:**
- Create: `scripts/demo-video/prepare-demo-runtime.ps1`
- Create: `demo_video_20260830/runtime/`（ignored output）

**Interfaces:**
- Produces: `start`、`status`、`stop` 三个动作；服务地址 `http://127.0.0.1:5180` 与 `http://127.0.0.1:8010`；PID 文件和独立 SQLite 副本。
- Consumes: 当前源码、`apps/api/.venv/Scripts/python.exe`、`pnpm.cmd`、`apps/api/education.db` 或当前实际 SQLite 路径。

- [ ] **Step 1: 写参数与路径验证测试模式**

脚本 `-Action validate` 必须只输出 JSON：解析后的工作区、源数据库、目标数据库、前后端端口和 `safe=true`；若目标数据库逃逸 `demo_video_20260830/runtime` 则失败。

- [ ] **Step 2: 验证测试模式失败**

Run: `powershell -ExecutionPolicy Bypass -File scripts/demo-video/prepare-demo-runtime.ps1 -Action validate`

Expected: FAIL，因为脚本尚未实现。

- [ ] **Step 3: 实现安全启动与停止**

启动时复制而不是移动源数据库；设置 `EDUCATION_DATABASE_URL` 指向副本、`EDUCATION_CAPTCHA_MODE=off`、独立 CORS 地址；使用 `Start-Process -WindowStyle Hidden` 启动单 worker Uvicorn 与 `pnpm dev --host 127.0.0.1 --port 5180`。停止动作只读取本目录 PID 文件并校验进程命令行/端口后停止，禁止按进程名批量终止。

- [ ] **Step 4: 验证隔离和健康状态**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/demo-video/prepare-demo-runtime.ps1 -Action validate
powershell -ExecutionPolicy Bypass -File scripts/demo-video/prepare-demo-runtime.ps1 -Action start
powershell -ExecutionPolicy Bypass -File scripts/demo-video/prepare-demo-runtime.ps1 -Action status
```

Expected: validate JSON 中 `safe=true`；`/api/health` 与前端首页均返回 2xx；源数据库 SHA-256 在启动前后相同。

- [ ] **Step 5: 提交**

```powershell
git add -- scripts/demo-video/prepare-demo-runtime.ps1
git commit -m "feat: add isolated demo runtime launcher"
```

### Task 3: 真实浏览器分场景录制

**Files:**
- Create: `scripts/demo-video/record-scenes.mjs`
- Create: `demo_video_20260830/raw-scenes/`（ignored output）
- Create: `demo_video_20260830/recording-evidence.json`（ignored output）

**Interfaces:**
- Produces: 七个 WebM 原始片段、关键 PNG 截图、每次点击/导航/API 响应的无敏感信息证据。
- Consumes: `timeline.json`、Playwright、独立前后端、临时演示账号。

- [ ] **Step 1: 写 `--dry-run` 合约检查**

`--dry-run` 必须解析所有场景，确认目标总长 170 秒、每段有稳定路由与至少一个 `featureEvidence`，并检查浏览器可执行文件存在。

- [ ] **Step 2: 验证 dry-run 失败**

Run: `node scripts/demo-video/record-scenes.mjs --dry-run`

Expected: FAIL，因为脚本尚未实现。

- [ ] **Step 3: 实现录制流程**

使用 1920×1080 context 和独立 storage state。首次运行通过真实注册/登录与初始化界面建立临时演示账号；后续依次录制首页/我的学习、学习空间、知识星图、考试、资源生成、小涟与档案/设置。对每次关键 API 记录 URL path、method、status、elapsedMs，不记录 Cookie、请求体密码、Authorization 或模型密钥。选择器优先 `getByRole`/`getByText`/label，并为云端响应设置有限超时与真实降级分支。

- [ ] **Step 4: 执行真实录制并复查**

Run: `node scripts/demo-video/record-scenes.mjs`

Expected: 七个可解码 WebM、关键截图、`recording-evidence.json`；无未处理 page error；关键业务 API 至少一项 2xx 证据映射到每个功能段。

- [ ] **Step 5: 提交脚本**

```powershell
git add -- scripts/demo-video/record-scenes.mjs
git commit -m "feat: record authentic demo scenes"
```

### Task 4: MiniMax 异步旁白生成与下载

**Files:**
- Create: `scripts/demo-video/minimax-async-tts.py`
- Create: `demo_video_20260830/旁白稿.md`
- Create: `demo_video_20260830/audio/narration.mp3`
- Create: `demo_video_20260830/audio/minimax-task.json`

**Interfaces:**
- Produces: 下载到本地的完整旁白音频与不含密钥的任务元数据。
- Consumes: `apps/api/.env` 中 MiniMax 配置和 `timeline.json` 的旁白文本。

- [ ] **Step 1: 写离线解析与脱敏测试**

脚本 `--dry-run` 必须输出模型、Voice ID、字符数、预计轮询参数和旁白 SHA-256，不输出 API Key、Authorization 或完整环境变量内容；缺少必要配置时退出非零。

- [ ] **Step 2: 验证 dry-run**

Run: `apps/api/.venv/Scripts/python.exe scripts/demo-video/minimax-async-tts.py --dry-run`

Expected: 输出安全元数据；若脚本不存在则先 FAIL。

- [ ] **Step 3: 实现异步 API**

调用 `POST /v1/t2a_async_v2` 创建任务，按 2、3、5、8、13 秒退避查询 `/v1/query/t2a_async_query_v2`，成功后以 `file_id` 调用 `/v1/files/retrieve_content` 立即写入临时文件并原子改名。支持配置的 Base URL 和可选 GroupId；失败响应只记录状态码、MiniMax `base_resp` 和 task id，不记录请求头。

- [ ] **Step 4: 真实生成和下载**

Run: `apps/api/.venv/Scripts/python.exe scripts/demo-video/minimax-async-tts.py`

Expected: `narration.mp3` 非空且可解码，`minimax-task.json` 记录 task id、file id、模型、Voice ID、字符数、下载时间和 SHA-256，无密钥。

- [ ] **Step 5: 提交脚本与旁白文本**

```powershell
git add -- scripts/demo-video/minimax-async-tts.py demo_video_20260830/旁白稿.md
git commit -m "feat: generate demo narration with minimax async tts"
```

### Task 5: 成片合成与字幕

**Files:**
- Create: `scripts/demo-video/compose-demo.mjs`
- Create: `demo_video_20260830/涟千言_三分钟功能演示.srt`
- Create: `demo_video_20260830/涟千言_三分钟功能演示.mp4`

**Interfaces:**
- Produces: H.264/AAC/yuv420p/faststart 的 1080p MP4 和对应 SRT。
- Consumes: 七段 WebM、timeline、MiniMax narration、`ffmpeg-win64.exe`。

- [ ] **Step 1: 写 `--dry-run` 滤镜图测试**

dry-run 输出必须列出每段裁剪区间、缩放/补边、concat、字幕、响度归一化、H.264/AAC 和 faststart 参数，并计算目标码率不会超过 180 MiB。

- [ ] **Step 2: 验证 dry-run 失败**

Run: `node scripts/demo-video/compose-demo.mjs --dry-run`

Expected: FAIL，因为脚本尚未实现。

- [ ] **Step 3: 实现字幕与 FFmpeg 合成**

从 timeline 生成 UTF-8 BOM SRT；原始片段按目标时长裁剪，统一 1920×1080/30fps，拼接后与旁白对齐；字幕使用 CJK 字体、安全边距和半透明底；输出 H.264 CRF 20–23、AAC 160 kbps、`yuv420p`、`+faststart`。若 Playwright FFmpeg 缺少 H.264/AAC 编码器，下载官方可信 Windows FFmpeg build 到输出工具缓存并记录 URL/SHA-256，不把二进制提交 Git。

- [ ] **Step 4: 生成成片**

Run: `node scripts/demo-video/compose-demo.mjs`

Expected: MP4 可解码，画面与旁白完整，脚本输出实际时长和大小。

- [ ] **Step 5: 提交合成脚本与字幕/旁白文本**

```powershell
git add -- scripts/demo-video/compose-demo.mjs demo_video_20260830/涟千言_三分钟功能演示.srt demo_video_20260830/旁白稿.md
git commit -m "feat: compose three-minute competition demo"
```

### Task 6: 技术与内容验收

**Files:**
- Create: `scripts/demo-video/verify-demo.mjs`
- Create: `demo_video_20260830/video-manifest.json`
- Create: `demo_video_20260830/verification.md`

**Interfaces:**
- Produces: 可复核的媒体指标、SHA-256、功能时间码、抽帧和人工检查结果。
- Consumes: 最终 MP4、SRT、timeline、recording evidence 和 MiniMax task metadata。

- [ ] **Step 1: 写门槛失败测试**

用纯函数测试构造 180 秒、200 MiB、非 1920×1080、无音轨和无功能证据五种失败输入，均必须抛出清晰错误。

- [ ] **Step 2: 实现媒体探测和抽帧**

调用 FFmpeg/FFprobe 等价接口获取时长、视频/音频流、分辨率、帧率和编码；计算 SHA-256；在 0、8、27、75、98、118、145、168 秒抽帧；扫描日志和 JSON 不得含 API Key、Bearer token、Cookie 或演示密码。

- [ ] **Step 3: 运行全部自动验收**

Run:

```powershell
node --test scripts/demo-video/demo-video-lib.test.mjs
node scripts/demo-video/verify-demo.mjs
pnpm check
git diff --check
```

Expected: 所有自动检查通过；时长 <180 秒；大小 <200 MiB；1920×1080；H.264 视频与 AAC 音频；功能证据完整；无敏感信息。

- [ ] **Step 4: 人工完整播放与抽帧检查**

完整播放一次成片，逐项记录：无黑帧/花屏、文字清晰、鼠标动作可理解、字幕不遮挡关键控件、旁白无缺句或重叠、产品内语音与旁白不打架、真实降级说明准确。抽帧图逐张检查隐私和场景对应关系。

- [ ] **Step 5: 停止并清理临时运行环境**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/demo-video/prepare-demo-runtime.ps1 -Action stop
powershell -ExecutionPolicy Bypass -File scripts/demo-video/prepare-demo-runtime.ps1 -Action status
```

Expected: 只停止录制专用 PID；临时浏览器 profile/session 被删除；原数据库 SHA-256 不变；最终成片、字幕、旁白稿、manifest 和 verification 保留。

- [ ] **Step 6: 提交验收脚本与文本证据**

```powershell
git add -- scripts/demo-video/verify-demo.mjs demo_video_20260830/video-manifest.json demo_video_20260830/verification.md
git commit -m "test: verify competition demo deliverable"
```

## Final Delivery Gate

- [ ] `涟千言_三分钟功能演示.mp4` 存在且完整播放。
- [ ] 实测时长低于 180 秒，文件低于 200 MB。
- [ ] 1920×1080、H.264、AAC、画面与声音清晰。
- [ ] MiniMax 异步任务创建、轮询、下载证据齐全且无密钥。
- [ ] 每个主功能段有真实操作/API 证据和成片时间码。
- [ ] `pnpm check` 通过。
- [ ] 原数据库、用户进程和既有未提交改动未被覆盖或清理。
