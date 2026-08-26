# 昔涟语音网站运行闭环设计

## 目标

让开发者通过一个 `pnpm` 命令启动可直接试听昔涟语音的网站。启动完成后，浏览器页面调用 Education API，由 API 代理本机 Genie-TTS 侧车并返回标准 WAV；不再要求使用者手工维护三个终端或单独生成本地试听文件。

## 已确认根因

现有页面、`/api/voice/status`、`/api/voice/synthesize`、Genie-TTS Provider、WAV 播放和浏览器降级均已实现。真实执行 `pnpm dev` 时只有 Vite 监听 5173，页面请求 `/api/voice/status` 得到 HTTP 500，Vite 日志为代理目标 `localhost:8000` 的 `ECONNREFUSED`。因此缺口是进程编排，不是模型、音频接口或页面按钮。

## 方案比较

### 方案一：继续手工启动三个终端

不需要代码变更，但启动顺序、环境变量和清理都依赖人工，容易再次出现“网页可打开但昔涟不可用”。不采用。

### 方案二：浏览器直接连接 Genie-TTS

少一层服务，但会绕过 Education API 已有的输入长度、WAV、响应体积、错误脱敏、缓存和 Provider 状态边界，也会把本机端口暴露给页面配置。不采用。

### 方案三：一键编排侧车、Education API 与 Vite

新增项目级 PowerShell 编排器和 `pnpm dev:cyrene`。编排器先校验端口与资产，启动侧车并轮询 `/health`，再以 `EDUCATION_TTS_PROVIDER=genie` 启动 API 并轮询 `/api/voice/status`，最后启动 Vite。退出或失败时只清理本轮创建的进程树。采用该方案。

## 组件与数据流

- `scripts/start-cyrene-web.ps1`：唯一的本地运行编排器；固定默认回环地址，允许覆盖 Genie 根目录、模型目录、参考 WAV、端口和数据库路径。
- `package.json`：新增 `dev:cyrene`，仍由 `pnpm` 作为唯一前端包管理入口。
- `.local/runtime/education.db`：默认匿名学习运行库。它被 Git 忽略，避免启动预览网站时覆盖仓库现有 SQLite；这不是演示数据，页面产生的真实匿名学习记录会持续写入这里。
- 现有 Vite `/api` 代理、Education API voice route 和 Genie 侧车保持不变。

```text
pnpm dev:cyrene
  -> 校验端口和本机资产
  -> 启动 127.0.0.1:9881，等待 ready
  -> 启动 127.0.0.1:8000，等待 provider=genie_tts
  -> 启动 Vite 5173
  -> 浏览器点击“昔涟讲解”
  -> /api/voice/synthesize -> Genie-TTS -> WAV -> Audio 播放
```

## 错误与清理

- 启动前如果目标端口已被其他进程占用，立即退出，不终止未知进程。
- 模型或参考音频校验失败时，不启动 API/Vite。
- 侧车或 API 在限定时间内未就绪时，输出阶段和日志路径并清理本轮子进程。
- 正常 Ctrl+C 或异常退出都递归终止本轮记录的子进程；不按端口模糊杀进程。
- API/侧车日志写入被 Git 忽略的 `.logs/`，网页日志留在当前终端。

## 测试与验收

- 静态契约测试先验证 `dev:cyrene`、回环默认值、Genie 环境变量、独立运行库、条件等待、隐藏子窗口和按 PID 清理；测试必须先因文件/脚本缺失而失败。
- 运行脚本的 `-ValidateOnly` 模式，证明端口、解释器、模型与参考音频可用，但不启动任何服务。
- 真正执行 `pnpm dev:cyrene`，通过 Vite 同源地址验证：页面 200、voice status 为 `genie_tts`、synthesize 返回可解码且非静音的 WAV。
- 在实际网站 `/#/agent` 中保留“昔涟讲解”、引擎声明与完整署名，并打开页面供用户点击试听。
- 最终运行定向测试、完整前后端测试、`pnpm check` 和 `pnpm build`；确认现有 SQLite、用户 DOCX 与外部 Genie-TTS 仓库未被修改。

## 完成标准

只有通过 Vite 网站源地址触发的 `/api/voice/synthesize` 返回真实昔涟模型生成的标准 WAV，并且一键进程退出可控，才称为网站语音运行闭环完成。直接请求 9881 或生成磁盘试听文件不能代替该验收。
