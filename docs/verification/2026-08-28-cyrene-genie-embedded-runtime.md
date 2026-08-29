# 昔涟 Genie-TTS 内嵌运行时验证记录

验证时间：2026-08-28（Asia/Shanghai）

## 架构结果

- Education API 直接依赖 `genie-tts==2.0.2`，锁定 `onnxruntime==1.22.1`。
- FastAPI 生命周期校验并加载唯一角色 `cyrene`，状态保存在同一应用进程中。
- 活动代码和启动脚本不再包含 `9881`、`SidecarPort`、语音侧车进程或第二个 Python 虚拟环境。
- Genie 推理通过单一异步锁串行执行；应用固定 `--workers 1`。
- 初始化失败时 Education API 继续运行，语音状态如实降级为 `unavailable`。

## 资产校验

`pnpm dev:cyrene -ValidateOnly` 退出码为 0：

- 模型文件：9 个；
- 模型总字节：335,992,804；
- 固定参考 WAV SHA-256：`C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`；
- 中文运行资源：Chinese G2P、Chinese HuBERT 和 speaker encoder 清单通过。

## 真实 API 合成

仅启动一个命令：

```powershell
uv run --project apps/api uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000 --workers 1
```

日志确认：

- `Character Cyrene loaded successfully.`
- `Model Type: V2ProPlus`
- `Successfully loaded CN_HuBERT model.`
- `Application startup complete.`

使用本轮专用临时数据库注册临时账号后调用网站相同端点：

```text
GET  /api/voice/status     -> 200, provider=genie_tts, configured=true
POST /api/voice/synthesize -> 200, Content-Type=audio/wav
X-Voice-Provider: genie-tts
Cache-Control: no-store
```

合成文本：`你好，欢迎回到忆涟千言。今天也一起继续学习吧。`

生成音频：

- 字节：394,284；
- SHA-256：`C325EC3F46CD65FCBEDA35BC317EBCA720306A618D3393559177E1691AD1185F`；
- 声道：1；
- 采样宽度：2 字节（16 位）；
- 采样率：32,000 Hz；
- 帧数：197,120；
- 时长：6.160 秒。

API 停止后 `127.0.0.1:8000` 监听数为 0。生成 WAV 位于系统临时目录，不进入 Git。临时验证数据库位于 Git 忽略的 `.local/runtime/education-embedded-validation.db`；当前命令策略拒绝删除操作，因此未绕过策略强制清理。

## 真实网站启动故障复测

实际分开执行普通 Vite 与 `uvicorn --reload` 时，后端没有注入 Genie 模型、GenieData、参考音频和参考文本，因此只能如实降级为浏览器音色。进一步用隔离端口执行 `pnpm dev:cyrene` 后确认第二个独立问题：模型已经输出 `Character Cyrene loaded successfully` 和 `Successfully loaded CN_HuBERT model`，但启动器的未登录就绪请求连续收到 401，最终错误退出。

修复后，`GET /api/voice/status` 作为不含内部路径的公开就绪探针；`POST /api/voice/synthesize` 继续要求登录。使用 `18080/15173` 隔离端口从 Vite 同源 `/api` 代理完成注册、选课和真实合成：

- 未登录状态：200，`provider=genie_tts`、`configured=true`；
- 未登录合成：401；
- 登录后合成：200，`audio/wav`、`X-Voice-Provider=genie-tts`、`Cache-Control=no-store`；
- WAV：389,164 字节，SHA-256 `C303FEFF895618DB5FA489401411F56DE0862A5A5FCEE7CC7A5F7E5AB2FB851A`；
- 音频格式：32,000 Hz、单声道、16 位、194,560 帧、6.080 秒；
- 修复后的 API 日志没有就绪探针 401，也没有 5xx。

验证后 `18080/15173` 监听数均为 0。临时验证 WAV 位于系统临时目录；临时数据库位于 Git 忽略的 `.local/runtime/education-voice-debug.db`。

## 自动化门禁

- `pnpm check`：通过；
- `pnpm exec vitest run`：64 个文件、220 项测试全部通过；
- `uv run --project apps/api pytest apps/api/tests -q`：346 项测试全部通过；
- `uv lock --check --project apps/api`：通过，78 个包解析一致；
- `python -m compileall -q apps/api/app`：通过；
- 三份活动 PowerShell 脚本解析错误均为 0；
- `pnpm build`：通过，2,484 个模块完成转换。

后端测试仍显示 FastAPI/Starlette TestClient 关于 `httpx` 的一项上游弃用警告；生产构建仍显示既有 `vendor-pixi` 约 526 kB 的分块体积警告。两者都不是本轮失败或新增语音依赖问题。
