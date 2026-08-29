# Genie-TTS 项目内隔离运行区

这个目录是 EducationMind 的项目内隔离 Genie-TTS 2.0.2 运行区。它让 Education API 在同一 Uvicorn 进程中加载本地引擎、GenieData、昔涟 ONNX 模型和单句参考音频，不再依赖项目之外的固定 F 盘目录，也不会恢复 Sidecar 服务。

运行载荷由以下命令导入：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/install-project-genie-runtime.ps1
```

导入后结构：

```text
runtime/genie-tts/
├─ src/genie_tts/                         # 从后端锁定安装的 2.0.2 包复制
├─ GenieData/
├─ Output/昔涟AI-GPT-SOVITS--V2proplus/
├─ Reference/cyrene-reference.wav
├─ pyproject.toml
├─ requirements.txt
├─ LICENSE
├─ UPSTREAM_README.md
├─ UPSTREAM_README_zh.md
└─ RUNTIME_MANIFEST.json
```

除本说明外，大型运行载荷不进入 Git；这是为了避免把约 750 MB 的模型与推理数据写入仓库历史。`EducationMind-Windows-Full` 全运行包会显式读取该目录并携带运行载荷，普通源码包则保留轻量、可审计的依赖与适配代码。

导入脚本不会移动、删除或改写原始 Genie-TTS 目录，只会从经过验证的绝对路径复制允许的文件。引擎源码取自 `apps/api/.venv` 中由 `uv.lock` 固定安装的 `genie-tts==2.0.2`，避免把外部工作副本的未完成修改带入运行区；模型和 GenieData 仍从经过审计的资产目录复制。参考音频必须是清理后的单句版本，SHA-256 固定为 `EB9F7564AEDCE832428623E6968EF206ABB5115B965FBBFF9C1B995229C17AA1`。

第三方声明：Genie-TTS 2.0.2，Copyright (c) 2025 High_Logic，MIT License。昔涟语音的 GPT-SoVITS 相关署名和授权边界见项目根目录 `THIRD_PARTY_NOTICES.md`。
