# EducationMind Windows 正式包

本目录用于完整 Windows 服务包。它包含静态网站、Education API 源码、昔涟 ONNX 模型、GenieData、Genie-TTS 源码和固定参考音频，但不携带开发数据库、历史学习记录、日志、密钥或机器绑定的 `.venv`。安装器把 Genie-TTS 与 Education API 安装到同一个 Python 环境，启动时只有一个后端进程，不使用语音侧车或额外端口。

## 安装与启动

环境要求：Windows 10/11、PowerShell 7、Python 3.11 或 3.12、可访问 Python 包索引的网络。

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
.\start.ps1
```

安装完成后打开 `http://127.0.0.1:8000/#/agent`。第一次启动会在 `data/education.db` 新建空白业务库；只创建共享课程、知识点和题型元数据，不创建默认学生、学习进度或考试成绩。Genie-TTS 在 FastAPI 生命周期内加载并固定使用一个 Uvicorn worker；只有模型真正就绪后语音状态才显示 `genie_tts`。

要允许同一局域网访问，可使用 `.\start.ps1 -HostAddress 0.0.0.0`，并由部署方配置防火墙、HTTPS 反向代理与请求限速。当前版本已启用正式登录注册；公开 HTTPS 部署还应设置 `EDUCATION_AUTH_COOKIE_SECURE=true`。

平台仅支持静态 ZIP 导入时，请改用 `EducationMind-Platform-Web-*.zip`。静态包只包含浏览器端，必须由平台把同域 `/api/*` 反向代理到本完整服务或另一套 Education API，否则服务型功能会明确不可用。

## 语音与权利声明

完整包中的 Genie-TTS 采用 MIT License；角色参考音频、模型与推理材料仍应由部署方确认目标使用场景的授权。

必须保留以下署名：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

完整第三方声明见 `THIRD_PARTY_NOTICES.md`。
