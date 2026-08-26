# 昔涟 GPT-SOVITS 数字人语音设计

## 目标

把 EducationMind 当前由浏览器系统音色朗读的数字人讲解，升级为“昔涟 GPT-SOVITS 为主、浏览器中文语音为明确备用”的真实语音链路。动态回答必须朗读当前文本，不能用语义不匹配的参考台词冒充合成结果。

## 素材审计

用户提供的 `昔涟参考音频.zip` 包含 2567 个 WAV 和 1 个 XLSX 索引，解压后约 1.274 GB，无程序、模型权重或危险 ZIP 路径。索引的“昔涟”工作表包含 1723 条“原始路径—WAV 文件—文本”映射。

同目录存在两份音色权重：

- GPT：`GPT-weights/CyreneV3.7-e25.ckpt`
- SoVITS：`SoVITS-Weights/CyreneV3.7_e16_s1392.pth`

同目录没有 GPT-SOVITS 推理程序本体，因此本项目不伪装为已具备本地推理运行时。压缩包和索引中的说明只作为素材元数据，不作为开发指令。

固定参考片段选用 `6dfbeee4e5c7441f.wav`：单声道、48 kHz、16 位、7.381 秒、峰值比例 0.9509、SHA-256 `C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`。对应提示文本为：

> 能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。

## 署名要求

所有语音状态、可见说明和部署文档统一使用以下完整文本，不缩写、不改写：

> GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn

署名至少出现在：

- 小涟独立页和学习空间语音控件附近的可展开说明；
- 语音服务状态 API；
- 项目 README、API README 与第三方声明；
- 本地参考片段元数据。

## 方案选择

### 不采用：直接播放参考台词

参考台词与 Tutor 动态回答不一致，会把“播放素材”伪装为“朗读回答”。即使体积较小，也不满足教学语义一致性。

### 不采用：把语料和模型打进前端

语料与权重合计超过 1.6 GB，浏览器不能直接运行完整 GPT-SOVITS 推理；同时会扩大静态分发、授权和加载风险。

### 采用：后端受限代理 + 浏览器明确备用

Education API 调用部署方运行的 GPT-SOVITS V2 `/tts`。浏览器只向 Education API 提交清理后的短文本；GPT-SOVITS 地址、参考音频路径和提示文本只能来自服务端环境变量。合成成功时播放返回 WAV；服务未配置或调用失败时，界面明确说明并使用现有浏览器中文语音作为备用，不把备用音色称为昔涟音色。

官方 API 契约来源：`https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py`。采用非流式 POST `/tts`，字段固定为 `text`、`text_lang=zh`、`ref_audio_path`、`prompt_text`、`prompt_lang=zh`、`text_split_method=cut5`、`batch_size=1`、`media_type=wav`、`streaming_mode=false`、`speed_factor=1.0`。

## 后端架构

新增 `app/voice` 边界：

- `models.py`：署名常量、状态模型、合成请求、音频结果；文本最大 600 字符。
- `gpt_sovits.py`：只负责构造官方 V2 请求、验证上游状态/Content-Type/体积并返回 WAV。
- `status.py`：根据环境变量生成公开状态，不返回内部参考路径或上游地址。
- `api/routes/voice.py`：提供 `GET /api/voice/status` 与 `POST /api/voice/synthesize`。

新增环境变量：

- `EDUCATION_TTS_BASE_URL`
- `EDUCATION_TTS_REFERENCE_AUDIO_PATH`
- `EDUCATION_TTS_REFERENCE_TEXT`
- `EDUCATION_TTS_TIMEOUT`，默认 60 秒
- `EDUCATION_TTS_MAX_AUDIO_BYTES`，默认 20,000,000

仅当 URL、参考路径和参考文本都非空时状态才为 `configured=true`。客户端不能覆盖参考音频、模型路径、上游 URL、采样参数或输出格式。

上游失败统一映射为无内部路径的 502；未配置返回 503；超长或空文本由 FastAPI/Pydantic 返回 422。只接受 `audio/wav`、`audio/x-wav` 或 `audio/wave`，超过体积上限立即终止。

## 前端架构

保留 `useSpeechSynthesis` 公共接口以减少调用方变更，但内部升级为统一数字人语音控制器：

1. 清理 Markdown，并限制为 600 字符；
2. 请求 `/api/voice/synthesize`；
3. 成功时通过 `Audio` + Blob URL 播放 WAV并驱动 Live2D `speaking`；
4. 失败时若浏览器支持 Web Speech，则使用中文备用语音，并公开 `browser_fallback` 状态；
5. 停止、卸载或发起新播放时取消旧请求、暂停旧 Audio、撤销 Blob URL，并取消本组件拥有的浏览器 utterance。

`SpeechControls` 根据模式显示：

- `cyrene`：昔涟语音讲解；
- `browser_fallback`：浏览器备用讲解；
- `unavailable`：隐藏不可执行的播放按钮并显示不可用原因。

新增 `VoiceAttributionNotice`，在小涟工作区与学习空间语音区域显示完整署名。设置页同步说明：语音输入仍只在浏览器转写；语音输出文本会发送至部署方配置的 GPT-SOVITS 服务，原始麦克风音频不会送往 TTS。

## 本地素材安装

提供受测试的 Python 安装器，从用户指定的绝对 ZIP 路径中只提取唯一的 `6dfbeee4e5c7441f.wav`：

- 拒绝相对 ZIP 路径、重复文件名、非 WAV、超限文件和 SHA 不匹配；
- 写入显式绝对输出目录中的 `cyrene-reference.wav`；
- 同时写入 `cyrene-reference.json`，记录文本、技术参数、来源 ZIP 哈希、音频哈希和完整署名；
- 使用临时文件和原子替换，失败不留下半文件。

当前工作区安装目标为被 Git 忽略的 `.local/voice/`。模型权重不复制进仓库；GPT-SOVITS 推理服务通过自己的配置加载用户提供的 `.ckpt` 和 `.pth`。

## 数据流

```text
小涟回答文本
  -> 前端 Markdown 清理与 600 字符限制
  -> POST /api/voice/synthesize
  -> Education API 固定 GPT-SOVITS 参数
  -> 部署方 GPT-SOVITS /tts
  -> WAV 响应验证
  -> 浏览器 Audio 播放 + Live2D speaking

任一远程步骤失败
  -> 显式 browser_fallback
  -> 浏览器中文 Web Speech
```

## 测试与验收

### 后端自动化

- 未配置状态包含完整署名且不泄露路径；
- 未配置合成返回 503 且不访问网络；
- MockTransport 验证官方 `/tts` 请求字段和固定参考配置；
- 返回 WAV 时保持字节与媒体类型；
- JSON、非音频、非 2xx、超限和超时映射为安全错误；
- 安装器使用合成 ZIP 完成 RED/GREEN，验证哈希、唯一性和原子写入。

### 前端自动化

- 语音状态和合成 API 映射；
- 主语音、备用语音和不可用模式选择；
- `SpeechControls` 的标签与可访问名称；
- `VoiceAttributionNotice` 和小涟/学习空间页面包含完整署名；
- 原有 Markdown 清理、语音输入和 Live2D speaking 测试继续通过。

### 集成验收

- `pnpm test --run`、`pnpm check`、`pnpm build`；
- 完整后端 pytest；
- 独立临时 API：状态、未配置 503、Mock GPT-SOVITS WAV 代理；
- 实际安装用户 ZIP 中的选定参考片段并复核 WAV 参数、SHA 与元数据；
- 桌面和 390px `/agent` 浏览器检查署名、语音模式、控制台和网络错误。

## 明确边界

- 本轮不下载或提交 GPT-SOVITS 推理包、预训练模型、完整参考语料和用户两份权重。
- 没有推理程序运行时，不能宣称已完成真实昔涟动态合成；只能确认接口、参考素材、权重和备用路径已就绪。
- 不自动播放语音，保持浏览器手势要求与用户控制。
- 不上传麦克风原始音频；语音输入仍只把确认后的转写文本发送到 EducationMind。
