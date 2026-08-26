# 昔涟 Genie-TTS 本地推理侧车设计

## 目标

把已在 `F:\gpt sovites 轻量级\Genie-TTS` 验证过的 Genie-TTS 2.0.2 与昔涟 V2ProPlus ONNX 模型接入 EducationMind，使小涟页、学习空间和考试讲解能够生成与当前文本一致的昔涟语音。系统继续保持无登录、浏览器不接触模型路径、参考音频路径或推理参数；Genie-TTS 不可用时明确降级为浏览器系统语音。

## 当前素材与运行时审计

Genie-TTS 工作区是独立 Git 仓库，当前本地提交为 `15234749d53c07e975b68a97514e666ea5fc8247`，安装包版本为 2.0.2，许可证为 MIT，作者标记为 High_Logic。其 `.venv` 使用 Python 3.11.9，并已安装 `genie-tts`、ONNX Runtime、FastAPI、Uvicorn、SoundFile 等运行依赖。`GenieData` 共 17 个资源文件，约 391.5 MiB；中文路径所需的 Chinese G2P、Chinese HuBERT 与 speaker encoder 均存在，未安装的中文 RoBERTa 是官方说明中的可选韵律增强，不作为可用性前置条件。

用户已经转换出的模型位于 `Output\昔涟AI-GPT-SOVITS--V2proplus`，包含 V2 基础模型与 V2ProPlus prompt encoder 共 9 个文件，约 320.5 MiB。该目录是 Genie-TTS 仓库中唯一的未跟踪状态，本轮只读使用，不修改、移动或提交。

固定参考音频继续使用项目已安装的 `.local/voice/cyrene-reference.wav`：单声道、48 kHz、16 位、SHA-256 `C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`。对应文本为：

> 能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。

## 原始服务风险与兼容性结论

Genie-TTS 自带 FastAPI 服务同时公开模型加载、参考音频切换、任意 `save_path`、卸载和缓存清理等管理接口，不适合作为浏览器或公网入口。它的 `/tts` 流式响应声明为 `audio/wav`，但实际流出的块是 32 kHz、单声道、16 位裸 PCM，没有 RIFF/WAVE 文件头，浏览器 `Audio` 无法被视为可靠消费者；后台推理异常还可能表现为内容为空的 200 响应。

同步 Python API 在传入 `save_path` 时会由 Genie-TTS 自己写出标准 WAV。该路径可被受控侧车调用，但不能把保存路径暴露给客户端。Genie-TTS 的模型管理器、参考音频上下文和播放器是进程级可变单例，因此一个进程只能加载固定角色，并且所有合成请求必须串行执行；Uvicorn worker 数必须固定为 1。

## 方案比较

### 不采用：直接暴露 Genie-TTS 原始 HTTP 服务

改动最少，但会公开过宽的本地文件与模型管理能力，WAV Content-Type 与真实裸 PCM 不一致，错误与空音频语义也不足以支撑可靠降级。

### 不采用：把 Genie-TTS 直接装入 Education API

能减少一个端口，却会把约 700 MiB 的资源/角色模型生命周期、单例状态和串行 CPU 推理绑定到课程、考试、画像等主 API。模型启动或推理故障会扩大到整个教育服务，也会污染主 API 的轻量依赖边界。

### 采用：固定配置的回环侧车 + Education API 统一代理

新增项目自有的安全侧车，使用 Genie-TTS 的现有 `.venv` 启动，只监听 `127.0.0.1`，只公开健康检查和文本合成。模型、资源、参考音频都由启动环境固定，客户端只能提交 1–600 字符文本。Education API 继续作为网页唯一入口，按配置选择 `genie` 或原有 `gpt_sovits` Provider；前端仍调用现有 `/api/voice/status` 与 `/api/voice/synthesize`。

## 组件与职责

### Genie-TTS 侧车

在 `apps/api/app/voice/genie_sidecar.py` 实现独立 FastAPI 应用与可注入运行时：

- 先读取和验证绝对的 `GENIE_DATA_DIR`、模型目录、参考 WAV 与参考文本，再延迟导入 `genie_tts`，防止首次运行进入交互式下载流程；
- 固定角色名 `cyrene`、语言 `zh`，启动时只加载一次角色和参考音频；
- 校验 9 个模型文件的文件名、大小与 SHA-256，防止选错目录、截断文件或模型被意外替换；
- 校验参考 WAV 的固定 SHA-256，确保文字与音频匹配；
- `POST /tts` 只接受 `{ "text": "..." }`，禁止客户端提供模型、音频或输出路径；
- 使用 `asyncio.Lock` 将请求串行化，并在线程中调用同步 Genie API，输出写入系统临时文件；
- 读取后验证 RIFF/WAVE、非空帧、单声道、16 位、32 kHz 与最大字节数，随后删除临时文件；
- 上游内部路径和原始异常只写服务器日志，对外统一返回安全的 503/502；
- `GET /health` 返回运行时、角色与 ready 状态，不返回任何本地路径；
- 只允许回环地址启动且固定单 worker，拒绝 `0.0.0.0` 和非回环 host。

启动变量使用独立前缀：

- 官方 `GENIE_DATA_DIR`
- `GENIE_SIDECAR_MODEL_DIR`
- `GENIE_SIDECAR_REFERENCE_AUDIO`
- `GENIE_SIDECAR_REFERENCE_TEXT`
- `GENIE_SIDECAR_HOST`，默认 `127.0.0.1`
- `GENIE_SIDECAR_PORT`，默认 `9881`
- `GENIE_SIDECAR_MAX_AUDIO_BYTES`，默认 `20000000`

提供 PowerShell 启动器，默认识别当前机器上的 Genie-TTS、模型与项目参考音频路径，同时允许参数覆盖以便迁移到其他 Windows 主机。启动器不请求管理员权限、不修改 Genie-TTS 仓库、不自动下载资源，也不重新执行 PyTorch 权重转换。

### Education API Provider 选择

在现有 `app/voice` 边界新增 `GenieTTSProvider` 与 Provider 工厂：

- `EDUCATION_TTS_PROVIDER=genie` 时，只要求合法 `EDUCATION_TTS_BASE_URL`，向侧车 `POST /tts` 发送文本；
- `EDUCATION_TTS_PROVIDER=gpt_sovits` 时保留现有官方 GPT-SoVITS V2 payload，并继续要求参考音频路径与文本；
- 未识别 Provider、URL 非法或对应配置不完整时公开状态为 `unavailable`；
- 两种 Provider 都限制超时、响应体积、WAV Content-Type 和 RIFF/WAVE 文件头；
- `/api/voice/status` 的 `provider` 如实返回 `genie_tts`、`gpt_sovits` 或 `unavailable`；
- `/api/voice/synthesize` 的 `X-Voice-Provider` 与实际 Provider 一致，仍设置 `Cache-Control: no-store`。

保持旧部署兼容：没有设置 `EDUCATION_TTS_PROVIDER` 时默认使用 `gpt_sovits`，原有三项配置行为不变。

### 前端状态与可见说明

`useSpeechSynthesis` 在现有 `mode` 之外保留当前 `provider`：

- `genie_tts` 成功时显示“当前输出：昔涟 Genie-TTS”；
- `gpt_sovits` 成功时显示“当前输出：昔涟 GPT-SoVITS”；
- 远程失败后切换为 `browser_speech`，显示“浏览器语音（非昔涟音色）”；
- 完全不可用时显示语音讲解不可用。

所有现有语音入口继续展示用户要求的完整 GPT-SOVITS 署名，不改写、不缩短：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

当 Genie-TTS 为当前引擎时，另行显示 `Genie-TTS 2.0.2，Copyright (c) 2025 High_Logic，MIT License`。隐私说明改为“部署方配置的语音服务（Genie-TTS 或 GPT-SoVITS）”，继续明确麦克风原始音频不会上传到 TTS。

## 数据流

```text
当前讲解文本
  -> 前端清理与 600 字符限制
  -> Education API /api/voice/synthesize
  -> GenieTTSProvider（只传 text）
  -> 回环 Genie 侧车 /tts
  -> 串行同步 ONNX 推理
  -> 临时标准 WAV -> 结构/体积校验 -> 立即删除临时文件
  -> Education API 二次校验并返回 no-store WAV
  -> 浏览器 Audio 播放 + Live2D speaking

任一步骤失败
  -> 安全错误，不泄露本地路径
  -> 前端显式 browser_speech 降级
```

## 许可证与资产边界

仓库不复制 Genie-TTS 源码、`.venv`、`GenieData` 或约 320.5 MiB 的昔涟 ONNX 模型，只提交适配代码、模型完整性清单、启动器与文档。`THIRD_PARTY_NOTICES.md` 增加 Genie-TTS 的 MIT 版权声明和官方项目链接；原 GPT-SOVITS 署名继续完整保留。

原始 `.ckpt`/`.pth` 转换会通过 PyTorch 反序列化第三方权重，本轮不重复执行。只读加载用户已经转换好的 ONNX 文件，避免无必要的反序列化与外部目录写入。

## 测试与验收

### 测试先行

- 侧车配置拒绝相对路径、非回环 host、缺失/哈希错误模型与错误参考音频；
- 注入假的 Genie runtime，验证只加载固定角色、参考音频、文本边界、串行锁、WAV 校验、临时文件清理和安全错误；
- Provider 工厂验证 Genie/GPT-SoVITS/不可用三种配置；
- Genie Provider 验证只发送文本、拒绝 JSON/空音频/伪 WAV/超限/超时且不泄露内部地址；
- 前端验证状态 provider 映射、Genie/GPT-SoVITS/浏览器三种可见标签与完整署名；
- 旧 GPT-SoVITS Provider、语音输入、Live2D speaking 与所有现有功能测试保持通过。

### 真实运行验证

- 使用外部 `.venv` 启动回环侧车，确认只监听 `127.0.0.1:9881`；
- 真实加载当前 9 个 ONNX 文件和固定参考音频，生成一条短中文讲解；
- 校验返回为可解码 WAV，记录采样率、声道、位深、时长、字节数、首条和热身后推理耗时，不套用官方硬件数据；
- 通过独立临时 Education API 实例完成 `/status` 与 `/synthesize` 端到端代理；
- 在桌面与 390px 浏览器检查实际 Genie 标签、播放、降级、控制台、网络和页面横向溢出；
- 执行完整前后端测试、`pnpm check` 与生产构建；
- 复核两个运行时 SQLite、用户未跟踪 DOCX 的哈希/长度/修改时间，以及 Genie-TTS 外部仓库仍只有原有 `Output/` 未跟踪状态。

## 完成标准

只有实际模型推理、标准 WAV、Education API 代理和浏览器播放链路都通过，才称为“真实昔涟 Genie-TTS 已接入”。如果真实运行被本机资源或模型兼容性阻断，代码与 Mock 测试不能代替真实完成声明，必须如实记录阻断点和可复现命令。
