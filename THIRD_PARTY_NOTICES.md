# Third-party notices

本文件记录 EducationMind 昔涟语音功能使用或对接的第三方项目与资产来源。Git 源码仓库不跟踪昔涟参考音频全集、模型权重、GenieData、Genie-TTS 运行环境或 GPT-SoVITS 推理程序；由项目所有者在本机明确生成的 Windows 完整交付包会迁移运行所需的固定参考音频、ONNX 模型、GenieData 与 Genie-TTS 源码。部署方仍应分别确认这些材料在目标使用场景中的授权条件。

项目通过 `package.json`、`pnpm-lock.yaml`、`apps/api/pyproject.toml` 和 `apps/api/uv.lock` 固定第三方软件依赖。各依赖继续适用其上游许可证；EducationMind 的项目许可证不会替代、扩张或重新许可这些第三方权利。

## PixiJS 与 pixi-live2d-display

- [`pixi.js`](https://github.com/pixijs/pixi.js) 6.5.10：MIT License。
- [`pixi-live2d-display`](https://github.com/guansss/pixi-live2d-display) 0.4.0：MIT License。

上述 JavaScript 库用于浏览器渲染和 Live2D 运行时适配。其 MIT 许可仅覆盖对应软件代码，不自动覆盖 Live2D Cubism Core、角色模型、纹理、动作、音频或其他素材。

## Live2D 与昔涟角色素材

Live2D Cubism SDK / Cubism Core 及其运行时文件继续适用 Live2D 官方条款。昔涟模型、纹理和 Cubism Core 位于 Git 忽略的 `.local/live2d/`，不得作为普通源码资产提交；构建或交付时只有在目标用途获得相应授权后才能随包迁移。

仓库中的 `public/brand/cyrene-icon.jpeg` 是项目界面使用的角色品牌参考图。该文件被纳入仓库不表示向第三方授予角色、画面或衍生素材的复制、分发或商业使用权。`src/assets/xiaolian/` 中的界面状态图仅受项目自身许可覆盖，不改变其所参考角色形象的既有权利边界。

登录入口使用的 `public/brand/cyrene-learning-welcome.webp` 由项目所有者提供的参考图片转换并进行网页压缩，转换过程不构成对原作品或角色权利的重新许可。仓库目前没有据此确认原作者、原始发布页面或可公开分发的具体授权范围；对外公开部署或再分发前，部署方仍须补齐并核验原始作品来源与相应授权。

`public/brand/cyrene-settings-ripple.png` 是依据项目所有者提供的 UI 视觉参考生成的无文字背景衍生素材，用于设置页横幅；生成过程同样不替代对参考素材来源和目标部署用途的授权核验。

## 字体、图片与其他媒体

当前仓库不跟踪 `.ttf`、`.otf`、`.woff` 或 `.woff2` 字体文件；样式表使用系统字体名称与通用回退字体。部署方额外引入的字体、图片、音频和模型仍须分别遵守其来源许可。GPT-SoVITS、Genie-TTS、昔涟参考音频与模型权重的具体边界见下文。

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

EducationMind 将 Genie-TTS 2.0.2 固定为 Education API 的 Python 依赖；本机通过 `runtime/genie-tts/` 隔离上游源码、必要运行资产、许可证、模型、GenieData 和干净参考音频，但大型载荷受 `.gitignore` 保护，不进入 Git 历史。完整 Windows 交付包从该项目运行区复制资产并安装到同一个后端环境。Education API 固定单 worker，在应用生命周期中校验引擎必须从项目运行区加载，并将 Genie 的文件输出验证为标准 WAV 后返回网页。

## 昔涟 GPT-SoVITS 语音

必须保留的署名如下：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

本项目的受控安装器只会从用户提供的 `昔涟参考音频.zip` 中读取经文件名和 SHA-256 双重固定的 `6dfbeee4e5c7441f.wav`，并将其放入 Git 忽略的 `.local/voice/`。动态语音由 Education API 内嵌的 Genie-TTS 或部署方显式配置的 GPT-SoVITS V2 服务生成；旧 HTTP 接口契约参考上游官方 [`api_v2.py`](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py)。

相关音频、角色声音、模型和推理包的权利归各自权利人所有。本仓库中的适配代码不改变、替代或扩张原材料的授权范围，也不表示上述作者对 EducationMind 作出背书。

## 项目内技能包

`skills/xiaolian-core-workflow/` 与 `skills/lian-navigator/` 来自项目所有者提供的两个压缩包，各自的 `SKILL.md` 声明 MIT License。它们作为可编辑的项目资源随完整源码包分发，不会自动安装到全局智能体环境；是否加载及目标平台的运行权限由部署方显式决定。
