# Third-party notices

本文件记录 EducationMind 昔涟语音功能使用或对接的第三方项目与资产来源。仓库不分发昔涟参考音频全集、模型权重或 GPT-SoVITS 推理程序；部署方应分别确认这些材料在目标使用场景中的授权条件。

## 昔涟 GPT-SoVITS 语音

必须保留的署名如下：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

本项目的受控安装器只会从用户提供的 `昔涟参考音频.zip` 中读取经文件名和 SHA-256 双重固定的 `6dfbeee4e5c7441f.wav`，并将其放入 Git 忽略的 `.local/voice/`。动态语音由部署方另行运行的 GPT-SoVITS 服务生成，接口契约参考上游官方 [`api_v2.py`](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py)。

相关音频、角色声音、模型和推理包的权利归各自权利人所有。本仓库中的适配代码不改变、替代或扩张原材料的授权范围，也不表示上述作者对 EducationMind 作出背书。
