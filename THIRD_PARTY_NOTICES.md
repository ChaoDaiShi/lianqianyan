# Third-party notices

本文件记录 EducationMind 昔涟语音功能使用或对接的第三方项目与资产来源。Git 源码仓库不跟踪昔涟参考音频全集、模型权重、GenieData、Genie-TTS 运行环境或 GPT-SoVITS 推理程序；由项目所有者在本机明确生成的 Windows 完整交付包会迁移运行所需的固定参考音频、ONNX 模型、GenieData 与 Genie-TTS 源码。部署方仍应分别确认这些材料在目标使用场景中的授权条件。

## Genie-TTS

- 项目：[`High-Logic/Genie-TTS`](https://github.com/High-Logic/Genie-TTS)
- 本地接入版本：2.0.2
- Copyright (c) 2025 High_Logic
- License: MIT

MIT License

Copyright (c) 2025 High_Logic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

EducationMind 在 Git 中只提交自己的安全侧车与适配代码；完整交付包会把外部 Genie-TTS 的必要资产复制到包内的受控运行目录，但不会反向提交到源码仓库。侧车固定模型和参考音频、限制回环地址与单 worker，并将 Genie 的文件输出验证为标准 WAV 后再交给 Education API。

## 昔涟 GPT-SoVITS 语音

必须保留的署名如下：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

本项目的受控安装器只会从用户提供的 `昔涟参考音频.zip` 中读取经文件名和 SHA-256 双重固定的 `6dfbeee4e5c7441f.wav`，并将其放入 Git 忽略的 `.local/voice/`。动态语音由部署方运行的 Genie-TTS 侧车或 GPT-SoVITS V2 服务生成；旧 HTTP 接口契约参考上游官方 [`api_v2.py`](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py)。

相关音频、角色声音、模型和推理包的权利归各自权利人所有。本仓库中的适配代码不改变、替代或扩张原材料的授权范围，也不表示上述作者对 EducationMind 作出背书。
