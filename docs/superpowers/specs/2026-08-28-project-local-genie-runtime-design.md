# EducationMind 项目内隔离 Genie-TTS 运行区设计

日期：2026-08-28

## 目标

把当前分散在 `F:\gpt sovites 轻量级\Genie-TTS` 与项目 `.local/voice` 中的 Genie-TTS 引擎源码、GenieData、昔涟 ONNX 模型和干净参考音频复制到 EducationMind 项目根目录下的独立运行区，使本机运行与全运行发布包不再依赖原始外部目录，同时继续保持 Education API 进程内推理、无 Sidecar 端口。

## 选定方案

采用 `runtime/genie-tts/` 作为项目内唯一运行资产根目录，并保留 Genie 上游原生结构：

```text
runtime/genie-tts/
├─ src/genie_tts/                         # uv.lock 固定安装并验证过的 Genie-TTS 2.0.2 包
├─ GenieData/                             # G2P、HuBERT、BERT、speaker encoder
├─ Output/昔涟AI-GPT-SOVITS--V2proplus/   # 昔涟 ONNX 模型
├─ Reference/cyrene-reference.wav         # 裁剪后的单句参考音频
├─ pyproject.toml
├─ requirements.txt
├─ LICENSE
├─ README.md
├─ README_zh.md
└─ RUNTIME_MANIFEST.json                  # 文件数、体积、关键哈希和来源记录
```

没有采用符号链接，因为平台 ZIP、Windows 解压和托管构建对符号链接支持不一致；没有把 `.venv` 复制进运行区，因为 Python 虚拟环境不可跨机器可靠迁移。后端仍通过 `uv.lock` 安装固定依赖，但运行时将项目内 `runtime/genie-tts/src` 放在导入优先级最前，确保实际加载项目内隔离引擎。

## 导入边界

新增幂等安装脚本 `scripts/install-project-genie-runtime.ps1`：

- 只接受绝对的 Genie 上游目录与干净参考 WAV。
- 从 `apps/api/.venv/Lib/site-packages/genie_tts` 复制 `uv.lock` 固定安装并已通过真实合成的 Genie-TTS 2.0.2 包；不采用外部工作副本中可能存在未完成修改的 `src`。
- 从外部资产目录固定复制 `GenieData`、指定昔涟模型目录和必要许可证/说明文件。
- 不复制上游 `.git`、`.venv`、`.cache`、`Tutorial`、`UserData` 或历史生成音频。
- 先复制到项目内临时暂存目录，验证关键文件、文件数、体积和参考音频哈希后，再替换目标运行区。
- 原始 F 盘目录只读保留，不移动、不删除、不改写。

## 运行时行为

- `pnpm dev:cyrene` 默认从 `<project>/runtime/genie-tts` 解析引擎、GenieData、模型和参考音频。
- 仍保留 `-GenieRoot`、`-ModelDirectory`、`-ReferenceAudio` 参数，供诊断或迁移覆盖。
- 新增 `EDUCATION_TTS_GENIE_ROOT`；`GenieRuntimeSettings` 要求它与模型、GenieData、参考音频均为绝对存在路径。
- `GenieRuntime` 在导入 `genie_tts` 前把 `<genie-root>/src` 插入 `sys.path`，并验证最终导入模块位于项目内运行区，避免意外回退到其他环境中的同名包。
- 推理仍由 Education API 生命周期加载一次，通过单异步锁串行执行，不监听额外端口。

## Git 与发布边界

约 750 MB 的模型和 GenieData 不进入 Git 历史；`.gitignore` 忽略 `runtime/genie-tts` 的运行载荷，只跟踪项目说明文件。发布脚本显式读取本地运行区：

- `Platform-FullSource` 保持适合源码平台的精简包，只携带后端依赖声明、适配代码和参考音频，并明确模型需外置或使用外部 TTS。
- 新增/保留 `Windows-Full` 全运行包，直接从项目内运行区复制引擎、GenieData、昔涟模型和参考音频，不再依赖 `F:\gpt sovites 轻量级\Genie-TTS`。
- 运行区本身可作为同项目目录整体迁移；若托管平台允许大包，可在上传前按平台限制单独构建全运行 Edition。

这样既满足“同一个项目下、方便隔离”，也避免普通 Git 克隆和源码 ZIP 被数百 MB 权重拖垮。

## 安全与失败行为

- 导入脚本拒绝相对路径、目标越界、缺文件、无效 WAV 和错误参考音频哈希。
- 运行区不包含 API Key、`.env`、数据库或用户生成音频。
- 运行区缺失或校验失败时，API 保持可用，语音状态诚实返回 `unavailable`，不把浏览器系统音色冒充为昔涟。
- 第三方署名、MIT License 与既有 GPT-SoVITS 署名继续保留。

## 验收标准

1. 外部源目录保持不变，项目内出现完整隔离运行区。
2. 断开外部目录引用后，`pnpm dev:cyrene -ValidateOnly` 仍通过。
3. `genie_tts` 的实际导入路径位于项目 `runtime/genie-tts/src`。
4. 真实昔涟语音合成通过，WAV 为 32 kHz、单声道、16 位。
5. 启动脚本、后端测试、发布脚本测试、`pnpm check`、前端测试和后端全量测试通过。
6. Git 状态不出现数百 MB 模型文件，发布说明准确区分源码包与全运行包。
