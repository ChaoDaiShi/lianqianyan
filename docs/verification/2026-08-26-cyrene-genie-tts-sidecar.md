# 昔涟 Genie-TTS 本地推理接入验证

> 历史记录：本架构已于 2026-08-27 被 Education API 内嵌 Genie-TTS 运行时取代。本文仅保留当时证据，不再作为当前启动或部署说明。

验证日期：2026-08-26（Asia/Shanghai）

验证分支：`phase-3-1-competition-sprint`

实现前 HEAD：`2ad71924331fc502dd4388d93cd909988310d88b`

功能验证 HEAD：`2958d8f78ca3efb8f75a69cb6ea59c34484745dd`

## 结论

真实昔涟 Genie-TTS 已接入，不是接口 Mock 或静态音频替代：本机 Genie-TTS 2.0.2 成功把用户转换的 9 个 V2ProPlus ONNX 文件加载为 `Cyrene`，真实生成 32 kHz、单声道、16 位动态 WAV；Education API 成功代理该音频；Chrome 在 `/#/agent` 上显示并调用 `genie_tts`，Live2D speaking 状态随实际语音请求触发。侧车关闭时页面如实改为浏览器语音，并且不再宣称当前输出是昔涟 Genie-TTS。

## 外部运行时与资产

### Genie-TTS 仓库

- 路径：`F:\gpt sovites 轻量级\Genie-TTS`
- Git HEAD：`15234749d53c07e975b68a97514e666ea5fc8247`
- Python：3.11.9
- `genie-tts`：2.0.2
- `onnxruntime`：1.22.1
- 许可证：MIT，Copyright (c) 2025 High_Logic
- 验证前后 Git 状态相同：`master...origin/master`，仅原有 `?? Output/`；没有 tracked modification

官方资料说明 Genie-TTS 支持 GPT-SoVITS V2/V2ProPlus、中文等语言、`GENIE_DATA_DIR` 和自定义角色加载。本项目没有复制上游源码或运行资产，只调用其外部环境并在 `THIRD_PARTY_NOTICES.md` 保留 MIT 声明。

### 昔涟模型与参考音频

执行：

```powershell
& apps\api\scripts\start_genie_voice.ps1 -ValidateOnly -PrintEducationEnvironment
```

结果：

- 模型目录：`Output\昔涟AI-GPT-SOVITS--V2proplus`
- 9 个模型文件全部通过固定大小与 SHA-256 校验
- 模型总字节数：335,992,804
- 模型加载日志：`Character Cyrene loaded successfully`、`Model Type: V2ProPlus`
- CN-HuBERT 加载成功；首条推理时 speaker verification model 加载成功
- 5 个必需中文运行资源通过检查
- 参考 WAV SHA-256：`C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`
- 参考 WAV 仍位于 Git 忽略的 `.local/voice/`，没有进入版本库

仓库追踪检查：WAV 0 个，ONNX/bin/ckpt/pth 0 个；没有把模型、推理资源、数据库或验收音频作为本轮变更提交。

## 侧车真实启动

执行：

```powershell
& apps\api\scripts\start_genie_voice.ps1
```

监听证据：

- 进程启动 UTC：`2026-08-26T06:21:17.8831099Z`
- 端口开始监听 UTC：`2026-08-26T06:21:30.0000000Z`
- 实测启动到监听：约 12.117 秒
- 唯一监听：`127.0.0.1:9881`
- Uvicorn workers：1
- `GET /health`：200，`{"ready":true,"runtime":"genie_tts","voice":"cyrene"}`
- 业务路由测试证明只存在 `/health` 与 `/tts`；没有公开模型加载、参考音频切换、任意保存、卸载或清缓存接口

## 真实语音生成

侧车直接请求均为 `POST http://127.0.0.1:9881/tts`，响应状态 200、Content-Type `audio/wav`、`X-Voice-Provider: genie-tts`、`Cache-Control: no-store`。

| 场景 | 文本 | 生成耗时 | WAV 时长 | 字节数 | 峰值比例 | RMS 比例 | SHA-256 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 首条 | 请记住，死锁的四个必要条件是互斥、占有并等待、不可抢占和循环等待。 | 6.936 s | 7.680 s | 491,564 | 0.758881 | 0.114291 | `BFCB57FA59EE8A3A99109374A5CF78CE7E55FCB937DE315694339397114FA758` |
| 热身后 | 学习不是赶路，我们先把这一步想明白。 | 3.127 s | 4.520 s | 289,324 | 0.762543 | 0.112097 | `6FCC43A5D69AD192D72F07642B711182F073482A25F2B8215FAA6A9341A6A4BC` |

两条文件均由 Python 标准 `wave` 解析通过：32,000 Hz、1 声道、2 字节采样宽度、非零帧；峰值与 RMS 证明输出不是静音或仅 WAV 头。这里记录的是当前机器实测值，没有套用 Genie-TTS README 中其他硬件的性能数据。

侧车自身创建的 `educationmind-cyrene-*.wav` 私有临时文件在响应后均删除；结束检查计数为 0。

## Education API 端到端

为避免覆盖运行库，API 使用系统临时 SQLite 和端口 18080：

```powershell
$env:EDUCATION_DATABASE_URL = 'sqlite:///C:/Users/25113/AppData/Local/Temp/.../integration.db'
$env:EDUCATION_TTS_PROVIDER = 'genie'
$env:EDUCATION_TTS_BASE_URL = 'http://127.0.0.1:9881'
uvicorn app.main:app --host 127.0.0.1 --port 18080
```

结果：

- `GET /api/voice/status`：200，Provider `genie_tts`、voice `cyrene`、configured `true`、fallback `browser_speech`
- 状态正文包含完整要求署名，不包含端口 9881、reference、模型目录或参考路径
- `POST /api/voice/synthesize`：200、`audio/wav`、`X-Voice-Provider: genie-tts`、`Cache-Control: no-store`
- 代理实测：2.879 秒返回 225,324 字节、3.520 秒、32 kHz/单声道/16 位 WAV
- 代理 WAV SHA-256：`C4F310678261B1026BCCE54568C536B7B8DE1763A2C0B1F484656BA51DE9900C`

## Chrome 真实渲染与交互

环境：Chrome 151.0.7922.174，Vite `127.0.0.1:15173` 代理到临时 Education API。

### 桌面 1440×1000

- 页面显示“当前输出：昔涟 Genie-TTS”
- 页面显示 `Genie-TTS 2.0.2`、High_Logic、MIT License
- 页面显示完整 GPT-SOVITS 署名
- Live2D canvas 1 个，稳定后可见尺寸 112×145 CSS 像素；旧形象 fallback 计数 0
- 点击“昔涟讲解”后 `/api/voice/synthesize` 返回 200 `audio/wav`
- `data-live2d-speaking=true` 在语音播放阶段出现
- `scrollWidth=clientWidth=1432`，无横向溢出

截图：`educationmind-genie-desktop-settled.png`。

### 移动 390×844

- Genie 标签、运行时声明、完整署名和 Live2D 均可见
- Live2D canvas 1 个，旧形象 fallback 计数 0
- `window.innerWidth=clientWidth=scrollWidth=390`，无横向溢出

截图：`educationmind-genie-mobile.png`。

Chrome 稳定加载捕获到 1 条 Motion “Reduced Motion enabled” warning，这是无头测试环境开启减少动态效果的提示；Runtime exception、console error、网络 loading failure 均为 0。

### 受控故障降级

停止侧车后保留 Education API 配置，再点击“昔涟讲解”：

- 状态请求 200；合成请求按预期返回 502
- Chrome 支持 `speechSynthesis`
- UI 显示“当前输出：浏览器语音（非昔涟音色）”
- UI 显示“昔涟语音服务暂时不可用，已切换为浏览器语音”
- UI 不再显示“当前输出：昔涟 Genie-TTS”，但保留技术署名
- 修复全局拦截器噪声后，控制台 error 0；其他 API 502 仍由单元测试证明会报告

## 自动化门禁

在最终功能提交后重新执行：

```powershell
pnpm test --run
pnpm check
pnpm build
apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q
```

结果：

- Vitest：57 files passed，208 tests passed
- TypeScript：`tsc --noEmit` 通过
- ESLint：0 warnings / 0 errors
- Vite production build：2,471 modules transformed，构建成功
- pytest：332 passed，1 个既有 Starlette TestClient 弃用警告
- 构建保留既有 Pixi chunk 526.13 kB 大小提示，不是构建失败；Live2D 被单独拆到 `vendor-live2d`，Pixi 本身已在 `vendor-pixi`

## 受保护状态与进程清理

- 根 `education.db`：278,528 字节，UTC 修改时间 `2026-08-25T15:18:38.6904909Z`，SHA-256 仍为 `BFB398E51F2A4A89F513E446301B0A367D58DAE95070DC5FF48358CDB45FFE70`
- 用户 DOCX：34,588 字节，UTC 修改时间 `2026-08-23T07:58:00.7022530Z`，SHA-256 仍为 `13EC6564A06ED2A6526DDB43A6AD98D86C11E58E72CACB6F4F77E7436DC04155`
- `apps/api/education.db`：270,336 字节，UTC 修改时间仍为 `2026-08-25T15:18:39.1035572Z`；任务前记录 SHA-256 为 `AAA6F62EC35892765EE28364B2737C32EF8AC46AB10E5F0459E8401DA0DE80C9`
- 最后一项最终重读被一个自 2026-08-25 起监听 `127.0.0.1:8000` 的旧 Education API 进程独占锁阻止；本轮没有停止该用户进程。长度与修改时间未变，但不把“元数据未变”冒充为本轮已重新算出哈希
- 本轮启动的 9881、18080、15173、19222 均已停止监听
- 原有 8000 服务保持运行，未被中断
- 项目状态只有用户原有未跟踪 `docs/创新赛道——开发日志参考模板.docx`
- 外部 Genie-TTS 状态仍只有原有 `?? Output/`

## 署名

所有语音入口、状态 API、README、API README 与第三方声明保留以下原文：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn
