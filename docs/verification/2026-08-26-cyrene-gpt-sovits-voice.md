# 昔涟 GPT-SoVITS 语音接入验证记录

- 验证日期：2026-08-26（Asia/Shanghai）
- 分支：`phase-3-1-competition-sprint`
- 实施基线：`da8f98c`
- 验证范围：参考音频审计与安装、服务端代理、前端播放与降级、三处讲解入口、署名、隐私说明、生产构建、独立 API 契约和真实浏览器布局

## 结论

EducationMind 已把原有浏览器优先的通用数字人朗读替换为“部署方 GPT-SoVITS 昔涟语音优先、浏览器语音明确降级”的真实服务路径。网页只能提交 1–600 字符的清洗后文本；上游地址、参考音频路径、提示文本和推理参数均由 Education API 持有。小涟对话、知识点陪学和考试读题三个入口均展示实际输出模式及完整署名。

当前机器已提供参考音频包和两份模型权重，但没有发现可运行的 GPT-SoVITS 推理程序。因此，本次已用本地独立桩服务验证官方 `POST /tts` 请求和 WAV 中继契约；没有把桩服务结果冒充为真实昔涟动态语音。未部署推理程序时，页面经过真实浏览器验证会显示“当前输出：浏览器语音（非昔涟音色）”。

必须保留的署名：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

## 参考音频审计与安装

用户提供的 `F:\昔涟AI-GPT-SOVITS--V2proplus\昔涟参考音频.zip` 未被整体解压或改写。只读审计结果：

| 项目 | 结果 |
| --- | --- |
| ZIP 大小 | 901,543,024 字节 |
| ZIP 条目 | 2,577 个，其中 2,568 个文件、9 个目录 |
| WAV | 2,567 个 |
| XLSX 索引 | 1 个 |
| 非压缩 WAV + XLSX 总量 | 1,274,835,069 字节 |
| 不安全路径 | 0 |
| 索引工作表 | 7 个工作表、6 个表；“昔涟”主表含 1,723 条语音映射 |

经索引文本、时长、采样参数、峰值和哈希筛选后，固定参考音频为 `6dfbeee4e5c7441f.wav`：

| 属性 | 结果 |
| --- | --- |
| 对应文本 | 能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。 |
| SHA-256 | `C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6` |
| 文件大小 | 708,620 字节 |
| PCM | 单声道、48,000 Hz、16-bit |
| 帧数 / 时长 | 354,288 / 7.381 秒 |

`apps/api/scripts/install_cyrene_voice.py` 只读取唯一匹配的固定文件，并依次验证绝对路径、ZIP 路径安全、唯一叶文件名、体积、SHA-256、PCM 参数和时长。安装结果位于 Git 忽略的 `.local/voice/cyrene-reference.wav` 与 `.local/voice/cyrene-reference.json`；`git check-ignore -v` 均命中 `.gitignore:47:.local/`。

已发现但未复制进仓库的模型权重：

- `F:\昔涟AI-GPT-SOVITS--V2proplus\GPT-weights\CyreneV3.7-e25.ckpt`，155,312,141 字节；
- `F:\昔涟AI-GPT-SOVITS--V2proplus\SoVITS-Weights\CyreneV3.7_e16_s1392.pth`，172,764,533 字节。

## 自动化门禁

| 命令 | 结果 |
| --- | --- |
| `pnpm test --run` | 57 个测试文件、198 项测试全部通过 |
| `pnpm check` | `tsc --noEmit` 与 ESLint 均退出 0 |
| `pnpm build` | TypeScript 与 Vite 生产构建退出 0，转换 2,468 个模块 |
| `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q` | 283 项测试全部通过 |
| 安装器定向测试 | 7 项通过：Unicode 嵌套路径、绝对路径、重复目标、错误哈希、超限条目、不安全路径、失败不覆盖 |
| 语音后端定向测试 | 10 项通过：状态、官方请求字段、WAV 保真、未配置、上游错误、媒体类型、超时与体积限制 |

生产构建仍有一个已知非阻断提示：`vendor-pixi` 压缩后约 526.29 kB，超过 Vite 500 kB 的分块提示阈值。后端测试仍有一个来自 Starlette `TestClient` 的既有 `httpx` 弃用警告；两者均未导致测试或构建失败。

浏览器验证期间发现并修复：React 卸载时主动取消 Axios 请求曾被全局拦截器输出为 `Request Error: canceled`。新增 `apiCancellation.test.ts` 的红—绿回归测试后，预期的 `ERR_CANCELED` 不再记为控制台错误，真实请求错误仍保留报告。

## 独立 API 与 GPT-SoVITS 契约

验证使用系统临时目录中的全新 SQLite、两个随机本地端口和一个只实现 `/tts` 的 FastAPI 桩；验证结束后释放 SQLAlchemy 引擎并删除临时数据库。

未配置状态：

- `GET /api/voice/status` → HTTP 200、`provider: unavailable`、`configured: false`、`fallback: browser_speech`；
- `POST /api/voice/synthesize` → HTTP 503；
- 状态响应不含参考文件路径或内部服务地址。

配置状态：

- `GET /api/voice/status` → HTTP 200、`provider: gpt_sovits`、`configured: true`；
- `POST /api/voice/synthesize` → HTTP 200、`audio/wav`、9,644 字节、`Cache-Control: no-store`、`X-Voice-Provider: gpt-sovits`；
- 中继 WAV 可由标准库读取为单声道 48 kHz。

桩服务实际收到的固定请求为：

```json
{
  "text": "死锁的四个必要条件",
  "text_lang": "zh",
  "ref_audio_path": "C:/private/cyrene-reference.wav",
  "prompt_text": "能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。",
  "prompt_lang": "zh",
  "text_split_method": "cut5",
  "batch_size": 1,
  "media_type": "wav",
  "streaming_mode": false,
  "speed_factor": 1.0
}
```

该字段集合与 GPT-SoVITS 官方 [`api_v2.py`](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py) 的 V2 非流式接口对应。浏览器请求体只有 `text`，无法覆盖其他字段。

## 真实浏览器验证

浏览器页面：`http://127.0.0.1:15173/#/agent`；后端使用独立端口 18080 和临时数据库，未配置 GPT-SoVITS，以验证真实降级界面。使用 Chrome DevTools Protocol 强制刷新并等待 Live2D 进入 `ready` 后采集。

| 检查项 | 桌面 1440×1000 | 移动 390×844 |
| --- | --- | --- |
| 完整署名存在于文档 | 通过 | 通过 |
| 显示“浏览器语音（非昔涟音色）” | 通过 | 通过 |
| 未错误显示“昔涟 GPT-SoVITS” | 通过 | 通过 |
| 讲解按钮 / 无障碍标签 | “浏览器讲解” / “播放浏览器讲解” | 同左 |
| Live2D | `ready`、Canvas 存在、112×145 | 同左 |
| 根滚动宽度 / 客户区宽度 | 1432 / 1432 | 390 / 390 |
| 控制台错误 / 运行时异常 | 0 | 0 |
| 失败请求 / HTTP ≥ 400 | 0 / 0 | 0 / 0 |

验证环境启用了 Reduced Motion，Framer Motion 因而各输出一条环境提示；这不属于应用错误，且页面按可访问性偏好减少动画。

截图：

- [桌面 1440×1000](screenshots/2026-08-26-cyrene-agent-desktop.png)，333,612 字节，SHA-256 `67A8381874FB3FEC63890B534800EA03AF5C1ACFA76725CF1F3DC3A25614A60E`；
- [移动 390×844](screenshots/2026-08-26-cyrene-agent-mobile.png)，99,896 字节，SHA-256 `6C2C2A600E780E13CBABD4761CEA22FE6AC5017C0AD62F82E707B0AAA55069BF`。

## 受保护文件复核

测试和浏览器验证全部使用临时数据库。任务前后长度、UTC 修改时间和 SHA-256 一致：

| 文件 | 长度 | UTC 修改时间 | SHA-256 |
| --- | ---: | --- | --- |
| `education.db` | 278,528 | `2026-08-25T15:18:38.6904909Z` | `BFB398E51F2A4A89F513E446301B0A367D58DAE95070DC5FF48358CDB45FFE70` |
| `apps/api/education.db` | 270,336 | `2026-08-25T15:18:39.1035572Z` | `AAA6F62EC35892765EE28364B2737C32EF8AC46AB10E5F0459E8401DA0DE80C9` |
| `docs/创新赛道——开发日志参考模板.docx` | 34,588 | `2026-08-23T07:58:00.7022530Z` | `13EC6564A06ED2A6526DDB43A6AD98D86C11E58E72CACB6F4F77E7436DC04155` |

该 DOCX 仍是用户拥有的未跟踪文件，除完整性哈希外未解析内容、未编辑、未暂存。两份运行 SQLite 仍被 Git 忽略，未备份覆盖或迁移。

## 当前仍需要的部署依赖

要获得与动态讲解文本完全对应的真实昔涟音色，部署方还必须提供并启动与上述两份权重兼容的 GPT-SoVITS 推理程序，并让该程序能够读取 `.local/voice/cyrene-reference.wav`。仅有参考音频和权重不能形成网络推理服务。本次仓库已经完成安装器、受限代理、前端播放器、故障降级、隐私边界、署名和部署变量；未伪造“已完成真实昔涟在线推理”的结论。
