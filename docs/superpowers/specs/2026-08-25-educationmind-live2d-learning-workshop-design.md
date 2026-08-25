# EducationMind 昔涟数字人与学习工坊设计

日期：2026-08-25  
状态：已批准，进入实现  
目标版本：Phase 3-6

## 1. 背景与目标

本阶段完成五个此前缺失或仅停留在界面描述中的能力：

1. 使用用户提供的昔涟 Cubism 4 Live2D 模型替换旧的静态角色立绘。
2. 让小涟的 Tutor 回答可以通过浏览器语音合成朗读，并让 Live2D 嘴型随朗读状态变化，形成可操作的数字人讲解。
3. 提供真实的联网学习资料检索，并明确服务来源和失败边界。
4. 提供安全、确定性的 C 语言教学编译模拟，不执行任意本机代码。
5. 把 `/resources` 从占位页升级为可生成、预览和下载学习资源的学习工坊。

本阶段继续遵守项目的可信性原则：界面只呈现已经执行的能力；网络失败不伪造检索结果；模板生成不冒充大模型生成；编译模拟不冒充真实操作系统沙箱；本机缺少 Live2D 资产时不回退旧立绘。

## 2. 已确认的现状

- 前端为 React 18 + Vite + TypeScript，后端为 FastAPI。
- `POST /api/knowledge/search` 只检索内置课程资料，并非网络搜索。
- `POST /api/agents/chat` 与 `POST /api/tutor/chat` 已能结合真实学习上下文回答。
- `/resources` 当前是明确的占位页。
- 项目不存在编译沙箱、数字人运行时、TTS 或外部搜索服务。
- 用户提供的 ZIP 是有效的 Cubism 4 模型，包含 `.moc3`、两个 4096 纹理、物理配置、显示信息和模型清单；模型声明了 `LipSync` 参数。
- 模型附带说明明确禁止二次配布，著作权归属米哈游。因此模型文件和 Cubism Core 不进入 Git、不进入生产构建、不进入交付压缩包。

## 3. 方案比较与决策

### 方案 A：只做前端演示壳

优点是速度快；缺点是联网搜索、资源生成和编译结果都无法由可测试服务支撑，继续存在“页面写了但能力没做”的问题。否决。

### 方案 B：直接执行用户代码并接入泛搜索引擎

优点是表面能力强；缺点是当前 Docker Engine 未运行，本机也没有可用的 C 编译器，直接进程执行存在命令注入、资源耗尽和隔离逃逸风险；泛搜索网页抓取也不稳定。否决。

### 方案 C：本机 Live2D + 可信联网来源 + 教学编译模拟 + 课程资料生成

这是采用的方案：

- Live2D 只通过开发期本机资产服务加载，生产缺失时隐藏角色画布。
- 网络检索使用固定的 Wikipedia / MediaWiki API Provider，返回标题、摘要、来源域名和可点击原文，不声称覆盖整个互联网。
- 编译实验室实现受限 C 子集的词法、语法、语义、链接、运行五阶段模拟；不使用 `eval`、`exec`、子进程或 Docker。
- 资源工坊从现有课程章节确定性生成学习单、闪卡、测验、思维导图和学习计划，并返回来源章节与 `course_template` 模式。
- 数字人朗读使用浏览器 Web Speech API；用户显式点击播放，避免自动播报干扰。

这一方案在当前环境中可离线验证主要逻辑，同时对需要网络、浏览器语音和本机受限资产的能力诚实降级。

## 4. 资产与许可边界

### 4.1 本机目录

```text
.local/
└── live2d/
    ├── core/live2dcubismcore.min.js
    └── Cyrene1002/
        ├── Cyrene.model3.json
        ├── Cyrene.moc3
        ├── Cyrene.physics3.json
        ├── Cyrene.cdi3.json
        └── Cyrene.4096/*.png
```

`.local/` 整体加入 `.gitignore`。Vite 插件只在开发服务器中把该目录映射为 `/local-live2d/`；生产构建不复制这些文件。

### 4.2 安装器

仓库新增 `scripts/install-local-live2d.ps1`，只提交安装逻辑，不提交模型。安装器必须：

- 校验 ZIP 存在、大小上限和所有条目的安全路径；
- 只提取模型运行必需的白名单扩展；
- 拒绝绝对路径、`..` 路径和预期根目录以外的条目；
- 验证 `Cyrene.model3.json` 引用的 moc、纹理和物理文件均存在；
- 可接受本机 Cubism Core 路径并复制到 `.local`；
- 输出安装结果与 SHA-256，不把受限资产加入版本控制。

### 4.3 运行时失败策略

- 找不到模型或 Cubism Core：组件标记为 unavailable 并隐藏画布，不显示旧 SVG 角色。
- 加载中：只显示低调的光晕骨架和“正在连接本机数字人”状态。
- WebGL 或模型加载失败：记录清理后的错误，不把文件系统路径或模型内容写入 UI。

## 5. Live2D 与数字人讲解

### 5.1 依赖

固定使用 `pixi.js@6.5.10` 和 `pixi-live2d-display@0.4.0`。Cubism Core 必须先动态加载，之后再动态导入 Cubism 4 运行时。

### 5.2 组件结构

```text
XiaolianCharacter
└── Live2DCharacter
    ├── loadCubismCore()
    ├── create Pixi Application
    ├── Live2DModel.from(modelUrl)
    ├── contain-fit + resize observer
    ├── pointer focus
    └── speaking mouth driver
```

`XiaolianCharacter` 保留现有状态解析 API，避免全站调用方重写，但不再读取旧 SVG manifest。`priority` 实例优先加载；小尺寸实例启用较低渲染分辨率。卸载时销毁模型、Pixi Application、ResizeObserver 和动画帧。

### 5.3 嘴型驱动

当 `speaking=true` 时，动画帧以平滑波形更新 `ParamMouthOpenY`；停止、取消或卸载时归零。若模型不含该参数，朗读仍可工作，只跳过嘴型驱动。

### 5.4 语音合成

新增 `useSpeechSynthesis` Hook：

- 能力检测：没有 `window.speechSynthesis` 时返回 unsupported；
- 只在用户点击“数字人讲解”后朗读；
- 优先选择 `zh-CN` / 中文音色，找不到时使用浏览器默认音色；
- 新朗读开始前取消旧朗读；
- 暂停、结束、错误、组件卸载都同步重置 speaking 状态；
- 去除 Markdown 标记和过长技术追踪文本，单次朗读设置长度上限；
- 保留文字回答作为完整、可访问的主内容。

小涟聊天页和学习空间 Tutor 都提供播放/停止按钮，按钮状态与 Live2D 嘴型联动。

## 6. 联网学习检索

### 6.1 API

`POST /api/network/search`

请求：

```json
{
  "query": "死锁 银行家算法",
  "limit": 4,
  "language": "zh"
}
```

响应：

```json
{
  "provider": "wikipedia",
  "query": "死锁 银行家算法",
  "results": [
    {
      "title": "银行家算法",
      "summary": "……",
      "url": "https://zh.wikipedia.org/wiki/……",
      "source_domain": "zh.wikipedia.org"
    }
  ]
}
```

### 6.2 Provider 设计

- `BaseNetworkSearchProvider` 定义异步 `search(query, limit, language)`。
- `WikipediaSearchProvider` 调用固定 MediaWiki API，不接受客户端传入任意 URL。
- 使用超时、重定向上限、明确 User-Agent 和结果条数上限。
- 使用 `prop=extracts` + `explaintext` 获取纯文本摘要，不把上游 HTML 注入页面。
- 只允许 `zh` 和 `en`，并由服务端选择固定域名。
- 上游超时、限流和协议异常统一转为清理后的 503；空结果保持 200 + `results=[]`。

### 6.3 边界

界面名称固定为“联网学习检索 · Wikipedia”，并提示它是补充资料，不替代课程内置材料。网络结果绝不混入 Tutor 的课程证据或学习者诊断。

## 7. 教学编译模拟

### 7.1 API

`POST /api/lab/compile-simulate`

请求只包含 `language="c-edu"` 和 `code`。响应包含：

- `success`
- `language`
- `mode="simulation"`
- `stages[]`：预处理、语法、语义、链接、运行
- `diagnostics[]`：阶段、级别、行号、错误码、中文信息
- `stdout`
- `safety_notice`

### 7.2 支持的教学子集

- 可选 `#include <stdio.h>`；
- `int main()` 或 `int main(void)`；
- 整数变量声明、赋值；
- 整数常量、变量、括号、`+ - * / %`；
- `printf("纯文本")`；
- `printf("%d\n", 表达式)`；
- `return 0;`。

拒绝循环、数组、指针、文件、网络、系统调用、宏展开、任意函数和其他头文件。表达式通过 Python `ast.parse(..., mode="eval")` 后只遍历严格白名单节点并自行求值，不调用 `eval`。

### 7.3 限制

- 代码最多 4,000 字符、80 行；
- 模拟输出最多 2,000 字符；
- 除零、未声明变量、重复声明、语法错误和不支持语句返回稳定诊断；
- 任一编译阶段失败后，后续阶段标记 skipped；
- 页面固定展示“教学模拟，不执行本机程序”。

## 8. 学习资源生成

### 8.1 API

`POST /api/resources/generate`

请求：

```json
{
  "course_id": "course-os",
  "knowledge_point_id": "kp-deadlock",
  "resource_type": "flashcards"
}
```

支持类型：

- `study_sheet`：章节摘要与复习重点；
- `flashcards`：章节标题作为问题、章节要点作为答案；
- `quiz`：基于章节生成带参考答案的自测；
- `mind_map`：Markdown 层级导图；
- `study_plan`：按章节排序的学习任务。

响应包含标题、Markdown 内容、生成模式、来源章节和文件名。第一版生成模式固定为 `course_template`：只转换仓库中的 `KnowledgePointContent`，不凭空补充事实。课程或知识点不存在时返回 404。

### 8.2 前端能力

- 选择知识点和资源类型；
- 生成、预览、复制；
- 下载 UTF-8 Markdown 文件；
- 展示“基于课程材料模板生成”和具体来源章节；
- API 失败时不保留伪成功预览。

## 9. 学习工坊信息架构

`/resources` 保留原路径，但页面改名为“学习工坊”，包含三个清晰标签页：

1. 资源生成
2. 联网检索
3. 编译实验

学习星轨新增“学习工坊”入口。移动端从五列调整为六列，保持标签短、点击区域不小于现有尺寸。

页面顶部由 Live2D 小涟、能力说明和三项诚实边界组成；每个标签页都提供初始示例、加载、空结果、失败和成功状态。外部链接使用 `target="_blank"` 与 `rel="noreferrer"`。

## 10. 前后端分层

### 后端新增区域

```text
apps/api/app/
├── api/routes/network.py
├── api/routes/lab.py
├── api/routes/resources.py
├── network/{models.py,provider.py,wikipedia.py,service.py}
├── lab/{models.py,compiler_simulator.py}
└── resources/{models.py,service.py}
```

Route 只做验证、依赖注入和 HTTP 错误映射；Provider/Service 可脱离 FastAPI 单测。

### 前端新增区域

```text
src/
├── components/live2d/{Live2DCharacter.tsx,live2dRuntime.ts}
├── components/digital-human/{SpeechControls.tsx,useSpeechSynthesis.ts}
├── components/workshop/{ResourceGenerator.tsx,NetworkSearchPanel.tsx,CompilerLab.tsx}
└── pages/ResourcesPage.tsx
```

API 请求和 snake_case → camelCase 映射继续集中在 `src/lib/educationApi.ts`。

## 11. 测试与验收

### 11.1 自动测试

- Live2D：资源 URL、状态解析、核心加载去重、生产不复制本机资产。
- Speech：文本清理、unsupported 状态、开始/结束/取消状态机。
- 网络：MockTransport 验证 URL、参数、纯文本映射、空结果、超时和错误清理。
- 编译模拟：合法程序、算术输出、未声明变量、除零、不支持语句、限制与阶段跳过。
- 资源：五种类型、确定性、来源章节、课程隔离、404。
- API：三个新路由的请求边界与响应契约。
- 前端：API 映射、公开路由清单、学习星轨入口和三个面板的诚实文案。

### 11.2 构建与安全验证

- `pnpm test -- --run`
- `pnpm check`
- `pnpm build`
- `uv run --project apps/api pytest`
- 检查 `dist/` 中不存在 `Cyrene`、`.moc3`、4096 纹理或 Cubism Core。
- 检查 Git 中不存在 `.local` 模型文件。

### 11.3 运行验证

- 使用安装器加载用户 ZIP 和本机 Cubism Core。
- 启动 FastAPI 与 Vite，实际打开首页、小涟页、学习空间、学习工坊。
- 验证 Live2D 可见、尺寸合理、窗口缩放不抖动、控制台无错误。
- 点击数字人讲解并验证播放/停止 UI 与 speaking 状态；若无系统中文音色，记录浏览器能力限制。
- 对 Wikipedia 做一次真实网络烟测；网络不可达时同时验证 503 和前端错误态。
- 对编译示例和错误示例各执行一次。
- 生成并下载一种 Markdown 资源，验证 UTF-8 内容与来源标记。

## 12. 明确不做

- 不提交、再分发或部署用户提供的 Live2D 模型和 Cubism Core。
- 不自动播放语音，不采集麦克风，不做语音识别。
- 不把 Wikipedia 结果当作课程证据、诊断依据或权威唯一答案。
- 不运行任意 C/Python/JavaScript 代码，不声称提供 Docker/OS 级隔离。
- 不伪装大模型资源生成；第一版明确为课程模板生成。
- 不用 AI 生图替换用户给出的真实 Live2D 角色。本轮 UI 用现有设计系统和真实模型完成，避免新增风格不一致的位图资产。

