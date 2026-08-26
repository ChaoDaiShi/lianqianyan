# 昔涟语音网站运行闭环验证

验证日期：2026-08-26（Asia/Shanghai）

验证分支：`phase-3-1-competition-sprint`

## 根因与修复边界

修复前实际执行 `pnpm dev`，`/#/agent` 页面返回 200，但 `GET /api/voice/status` 返回 500。Vite 日志为代理目标 `localhost:8000` 的 `ECONNREFUSED`；5173 是唯一监听端口，8000 和 9881 均未启动。已有页面按钮、Education API 语音路由、Genie Provider 与浏览器 WAV 播放逻辑没有缺失，问题是日常启动命令没有形成三进程运行闭环。

新增 `pnpm dev:cyrene` 后，项目使用 `scripts/start-cyrene-web.ps1` 依次完成：

1. 校验本机 Genie-TTS、9 个昔涟 V2ProPlus 模型文件、5 个中文资源、固定参考音频和三个空闲端口；
2. 启动回环侧车并等待 `/health` 返回 `ready=true`；
3. 使用 `EDUCATION_TTS_PROVIDER=genie` 和忽略目录中的独立 SQLite 启动 Education API，并等待 voice status；
4. 启动 Vite 并等待页面可访问；
5. 输出 `CYRENE_WEB_READY`，由 Windows Kill-on-close Job Object 托管本轮完整子进程树。

## RED—GREEN 证据

首个测试运行：

```text
apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_start_cyrene_web_script.py -q
FFF
KeyError: dev:cyrene
FileNotFoundError: scripts/start-cyrene-web.ps1
```

加入最小编排器后为 `3 passed`。首次运行又发现 Windows PowerShell 5.1 会把 UTF-8 无 BOM 中文脚本误按 ANSI 解析；先把入口测试改为要求 `pwsh` 并确认 `1 failed, 2 passed`，再将包入口切换为 PowerShell 7，回归恢复为 `3 passed`。

首次 Ctrl+C 退出揭示隐藏子进程会越过 PowerShell `finally`：5173、8000、9881 仍监听。核对命令行确认它们分别是本轮 Vite、Education API 和 Genie 侧车后，按已验证的根 PID 清理。随后增加 Job Object 契约测试，先因缺少 `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` 和 `AssignProcessToJobObject` 而失败，再实现系统级 Kill-on-close 托管。

第二次完整启动后发送 Ctrl+C，fresh 检查为：

```text
port_5173_listening=false
port_8000_listening=false
port_9881_listening=false
```

另用当前 PowerShell 进程预先占用回环端口 19981，再以该端口执行 `-ValidateOnly`。启动器返回“端口已被其他进程占用”，复查该监听仍存在，证明拒绝路径没有停止未知端口所有者；验证结束后由测试代码关闭自己的监听。

## 网站同源真实语音

请求没有直连 9881，而是全部从 Vite 网站源 `http://127.0.0.1:5173` 发起：

| 检查项 | 结果 |
| --- | --- |
| `GET /#/agent` | HTTP 200 |
| `GET /api/voice/status` | `provider=genie_tts`、`configured=true`、`voice=cyrene` |
| `POST /api/voice/synthesize` | HTTP 200、`audio/wav`、`X-Voice-Provider=genie-tts`、`Cache-Control=no-store` |
| 文本 | `你好呀，我是昔涟。现在这段语音，是从网站的昔涟讲解按钮对应的服务链路实时生成的。` |
| 推理与代理耗时 | 7.951 秒 |
| WAV | 545,324 字节、32,000 Hz、单声道、16 位、272,640 帧、8.520 秒 |
| 非静音 | 峰值 26,303、RMS 4,041.45 |
| SHA-256 | `32B7C27920FE9AFB07EC402734A043B02B0850073B8A615BBE1D6251C7737303` |

验收 WAV 位于被 Git 忽略的 `.local/voice/cyrene-website-e2e-20260826.wav`，不进入交付提交。该证据证明网站、Vite 代理、Education API、Genie 侧车与真实模型形成了同一条动态输出链路；磁盘文件仅用于结构与非静音复核。

## 运行状态与署名

网站入口为 `http://127.0.0.1:5173/#/agent`。回答旁的“昔涟讲解”按钮调用上述同源接口，页面继续显示：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

Genie-TTS 声明继续为：`Genie-TTS 2.0.2，Copyright (c) 2025 High_Logic，MIT License`。

## 自动化门禁

| 命令 | 实测结果 |
| --- | --- |
| `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_start_cyrene_web_script.py -q` | 3 passed |
| `pnpm test --run` | 57 个测试文件、208 项测试全部通过 |
| `pnpm check` | `tsc --noEmit` 与 ESLint 均退出 0，0 warning、0 error |
| `pnpm build` | TypeScript 与 Vite 退出 0，转换 2,471 个模块 |
| `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q --basetemp .tmp\pytest-cyrene-web-final` | 335 passed，1 条既有 Starlette TestClient 弃用警告 |

生产构建仍有既有的 `vendor-pixi` 526.13 kB 分块体积提示；它不属于本轮脚本变更，也没有导致构建失败。

## 保护状态复核

完整测试、两次全栈启动、网站同源推理和生产构建后重新计算：

| 文件 | 字节数 | UTC 修改时间 | SHA-256 |
| --- | ---: | --- | --- |
| `education.db` | 278,528 | `2026-08-25T15:18:38.6904909Z` | `BFB398E51F2A4A89F513E446301B0A367D58DAE95070DC5FF48358CDB45FFE70` |
| `apps/api/education.db` | 270,336 | `2026-08-25T15:18:39.1035572Z` | `AAA6F62EC35892765EE28364B2737C32EF8AC46AB10E5F0459E8401DA0DE80C9` |
| `docs/创新赛道——开发日志参考模板.docx` | 34,588 | `2026-08-23T07:58:00.7022530Z` | `13EC6564A06ED2A6526DDB43A6AD98D86C11E58E72CACB6F4F77E7436DC04155` |

三者与任务前已有验证基线完全一致。用户 DOCX 仍未跟踪、未暂存；两份既有 SQLite 未被启动流程打开写入。新运行库与验收 WAV均命中 `.gitignore:47:.local/`。

外部 `F:\gpt sovites 轻量级\Genie-TTS` 仍位于 `15234749d53c07e975b68a97514e666ea5fc8247`，Git 状态仍只有原有 `?? Output/`，没有修改或提交外部仓库内容。

## 最终运行方式

```powershell
pnpm dev:cyrene
```

看到 `CYRENE_WEB_READY` 后访问 `http://127.0.0.1:5173/#/agent`。停止时在运行命令的终端按 Ctrl+C；Job Object 已通过真实退出测试证明会同步关闭 5173、8000 和 9881。
