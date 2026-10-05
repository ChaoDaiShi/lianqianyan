# 涟千言 Workspace Shell R2 验收记录

## 验收范围

本轮只调整前端布局与阅读尺度：桌面侧栏、右侧工作区、顶栏、页面标题、按钮和输入控件、首页信息、对话上下文、流式回答、Markdown、Trace 与课程来源。路由、API、数据库、账号范围、Agent SSE 和业务逻辑未改变。

## 基线与结果

改造前 1440×900 实测：导航宽 72px、标签 10px，主内容从 x=84 开始；主按钮字体 14px，部分首页说明为 12px，小涟回答与上下文多为 9–14px。

改造后：

| 视口 | 导航模式 | 导航宽度 | 内容起点 | 内容宽度 | 横向溢出 |
| --- | --- | ---: | ---: | ---: | --- |
| 1440×900 | 完整侧栏 | 248px | 272px | 1168px | 无，1440=1440 |
| 1280×800 | 完整侧栏 | 248px | 272px | 1008px | 无，1280=1280 |
| 1024×768 | 紧凑轨道 | 84px | 104px | 920px | 无，1024=1024 |
| 390×844 | 五槽 Dock | 不适用 | 0px | 390px | 无，390=390 |

完整侧栏分为“开始学习”“探索与训练”“记录与设置”，主标签 14px，并为每个入口提供 11px辅助说明。移动 Dock 的入口和行为保持原样。

## 字体与控件

- 全局正文基准 16px，行高 1.65；
- PageIntro 标题为 30px / 36px，说明为 15px / 16px；
- 首页观察正文在桌面为 17px，指标值 16px，路径说明 16px；
- 小涟历史标题 14px、元信息 12px、下一步标题 14px；
- 最终回答 16px，Markdown 实际计算行高 28px，详情入口 14px；
- Button default/sm/lg/icon 为 44/40/52/44px；
- 首页主行动保留 48px，高度与视觉权重不变，字体提升到 15px；
- Input 和 Select 默认 44px，Textarea 最小高度 104px，正文 15px。

## 结果输出

- Markdown 根排版为 15px / 16px、28px 行高、16px段落间距；
- H1/H2/H3 提升为 24/20/17px；
- 流式回答内边距提升到 20/24px，状态和停止/重试操作使用统一控件尺寸；
- Agent Trace 节点为 24px，标签 13px，类型说明 10px；
- 课程来源标题与摘录为 13px，摘录行高 1.65；
- 桌面助手消息最大宽度 86%，用户消息最大宽度 78%，代码块保持内部横向滚动。

## 自动验证

### 前端完整测试

```powershell
pnpm test -- --run
```

结果：`94 passed` 测试文件、`299 passed` 测试项。保留既有 CaptchaPanel 测试 mock ref 警告，没有失败。

### 项目门禁

```powershell
pnpm check
```

结果：TypeScript 与 ESLint 均通过。

### 生产构建

```powershell
pnpm build
```

结果：2503 个模块转换完成，生产构建成功。保留既有 `vendor-pixi` 大于 500kB 的构建提示。

本轮没有后端代码变更，因此没有重复运行后端完整套件；运行中的 `/api/health` 返回 `{"status":"ok","service":"education-api"}`。

## 浏览器验收

在首页、小涟、知识空间、学习工坊和设置页按唯一标题等待页面完成后检查：

- `consoleErrors=[]`；
- `pageErrors=[]`；
- `requestFailures=[]`；
- HTTP 4xx/5xx 列表为空；
- 五个页面在 1440px 下均无文档级横向溢出。

1280×800 下完整侧栏 `clientHeight=702`、`scrollHeight=702`，无需滚动；最后“设置”入口距侧栏底部仍有 74px，九个入口初始全部可见。

放大控件后曾检测到移动输入框与固定 Dock 约 16px 覆盖。根因是小涟面板仍使用旧控件高度的视口公式；调整移动面板高度后，输入框底部为 706.35px、Dock 顶部为 764.11px，保留约 57.76px 间隔，1024px及以上桌面高度公式保持不变。

## 视觉证据

本地 Git 忽略目录 `.local/ux-audit-20261005/`：

- `r2-layout-home-task1.png`：248px 完整侧栏初版；
- `r2-layout-home-task3.png`：首页字体与指标提升；
- `r2-xiaolian-output-final.png`：回答区 16px 字体中检；
- `r2-after-home-1440.png`：1440px 最终首页；
- `r2-after-home-1024.png`：1024px 紧凑轨道；
- `r2-after-home-390.png`：390px 移动布局；
- `r2-after-xiaolian-1440.png`、`r2-xiaolian-complete.png`：小涟工作区和最终结果。
- `r2-after-xiaolian-390.png`：移动输入区与 Dock 间距修复。

这些截图只作为本机验收证据，不提交 Git。
