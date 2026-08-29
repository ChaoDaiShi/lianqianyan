# 《链千言》产品说明 PPT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 `D:/25113/qqliaotian/qq-download/模板.pptx` 和用户提供的链环背景，制作一份 20 页、可编辑、面向创新赛道评委的《链千言》产品说明 PPT。

**Architecture:** 先用 `@oai/artifact-tool` 导入并审计模板，建立 20 页输出到源页的映射，再用复制后的模板页作为 authoring base，在继承的页眉、版式、图片槽位和文字对象上做定向编辑。真实产品截图来自项目验证素材，流程图和架构图使用 PowerPoint 原生可编辑对象；所有中间产物放入 `ppt_work_20260829`，最终 PPTX 输出到工作区根目录。

**Tech Stack:** PowerPoint PPTX、`@oai/artifact-tool` ES module、Node.js bundled runtime、LibreOffice 25.x headless export、项目已有 PNG/WEBP/JPG 素材。

## Global Constraints

- 输出 20 页，且不超过竞赛材料要求的 30 页。
- PPT 可见页面不出现“AI辅助制作”；该标识只留给后续佐证材料。
- 不出现学校、教师、单位名称。
- 不伪造用户、统计结果、知识关系、学习进度或实验结论。
- 保留真实“尚未评估/证据不足/无当前计划/成长记录不足”等产品状态。
- 不修改现有前端、后端、数据库、Agent、MCP 或语音代码。
- 使用 `@oai/artifact-tool` 创建/编辑/导出 PPTX，不使用 `python-pptx` 或旧版 Python artifact_tool。
- 使用现有模板的 master → layout → slide 层级，不以全新 deck 替代模板跟随流程。
- 仅在 `$TMP_DIR` 保留中间文件；最终 PPTX 为工作区根目录唯一交付文件。
- 每页包含 speaker notes 的 `[Sources]` 块，注明模板、用户提供背景、项目截图或项目文档来源。

## 文件结构

- Create: `ppt_work_20260829/inspect_template_direct.mjs` — 只读模板审计脚本，已用于导出源页 PNG 和 layout JSON。
- Create: `ppt_work_20260829/template-frame-map.json` — 20 页输出到模板源页的映射。
- Create: `ppt_work_20260829/template-audit.txt` — 模板结构、字体、版式和占位符审计。
- Create: `ppt_work_20260829/deviation-log.txt` — 相对源模板的有意内容替换记录。
- Create: `ppt_work_20260829/build_lianqianyan.mjs` — artifact-tool deck builder。
- Create: `ppt_work_20260829/final-layout/slide-*.layout.json` — 最终布局 QA 数据。
- Create: `ppt_work_20260829/final-slides/slide-*.png` — 最终逐页渲染。
- Create: `ppt_work_20260829/final-contact-sheet.png` — 最终 deck 总览。
- Create: `链千言_产品说明_创新赛道.pptx` — 最终可编辑交付文件。

### Task 1: 固化模板与素材映射

**Files:**
- Create: `ppt_work_20260829/template-frame-map.json`
- Create: `ppt_work_20260829/template-audit.txt`
- Create: `ppt_work_20260829/deviation-log.txt`

**Interfaces:**
- Consumes: 模板 PPT 20 张源页、用户提供链环背景、项目真实验证截图。
- Produces: 每个输出页一个 `sourceSlide` 的合法映射，后续 builder 使用该映射创建 starter deck。

- [ ] **Step 1: 记录模板源页职责与复用选择**

  使用源页 1 作为 P1/P20 封面与结束页骨架；源页 2、4、5、6、7、8、9、10、13、14、17、18、19、20 按照设计说明分配给对应内容页。源页可重复使用，但每一页必须在 map 中记录 `narrativeRole`、`reuseMode` 和明确的 `editTargets`。

- [ ] **Step 2: 写入模板映射 JSON**

  `template-frame-map.json` 顶层必须包含 `outputSlides` 和 `omittedSourceSlides`，并保证 `outputSlides.length === 20`，每个输出页都有 `sourceSlide`、`narrativeRole`、`reuseMode`、`editTargets`。

- [ ] **Step 3: 写入审计与偏离记录**

  `template-audit.txt` 记录 1280×720 尺寸、模板 master/layout 数量、页眉装饰、主要字体和源页类型；`deviation-log.txt` 逐条记录删除工业主题图片、替换深色内容、引入浅色链环背景、使用真实项目截图及不显示 AI 标识的原因。

### Task 2: 用 artifact-tool 构建 20 页 deck

**Files:**
- Create: `ppt_work_20260829/build_lianqianyan.mjs`
- Create: `ppt_work_20260829/template-starter.pptx`
- Create: `ppt_work_20260829/final-slides/*.png`
- Create: `ppt_work_20260829/final-layout/*.layout.json`
- Create: `链千言_产品说明_创新赛道.pptx`

**Interfaces:**
- Consumes: `模板.pptx`、`template-frame-map.json`、真实产品截图、链环背景、模板继承页。
- Produces: 20 张可编辑 slide、嵌入图片素材、speaker notes 来源块和最终 PPTX。

- [ ] **Step 1: 运行一次 artifact authoring marker**

  在第一次复制/创建 starter deck 前，以 presentations skill 目录为工作目录，单独运行：

  ```powershell
  node container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pptx
  ```

- [ ] **Step 2: 复制模板源页生成 starter deck**

  运行 `prepare_template_starter_deck.mjs`，输入模板和 `template-frame-map.json`，输出 `ppt_work_20260829/template-starter.pptx`，同时导出 starter preview 与 starter layout JSON。每页只编辑继承的标题、正文、图片或图形对象；不在复制页上铺一层不可编辑的全屏图片来掩盖空占位符。

- [ ] **Step 3: 在 builder 中导入 starter deck**

  builder 使用以下结构加载和导出：

  ```js
  import { FileBlob, PresentationFile } from "@oai/artifact-tool";

  const presentation = await PresentationFile.importPptx(
    await FileBlob.load(starterPptx),
  );
  // resolve exact slide/shape ids from the starter inspection records
  // edit inherited objects, add bounded native diagrams only where mapped
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(finalPptx);
  ```

- [ ] **Step 4: 处理共用视觉与来源 notes**

  所有页面保持 1280×720；封面和结束页使用用户链环背景，关键机制页使用浅色局部露出；正文页维持模板科技蓝/紫的层次。每页 notes 追加类似以下内容，并不显示在页面：

  ```text
  [Sources]
  - User-provided template: D:/25113/qqliaotian/qq-download/模板.pptx
  - User-provided brand background: C:/Users/25113/AppData/Local/Temp/codex-clipboard-9bfdc0a3-ab27-4085-b635-3c4764236a49.png
  - Project evidence screenshot: F:/比赛/智能体 ican 教育skill/.local/ui-r2-audit/diagnosis-desktop.png
  ```

- [ ] **Step 5: 完成 20 页内容**

  按设计说明逐页写入标题和正文：P1/P20 品牌封面与收束，P2/P3 问题和对比，P4–P8 学习闭环与证据，P9–P16 工作台/小涟/Agent/RAG/知识空间/成长记忆，P17–P18 Tool/MCP/架构，P19 开发证据。P8 的数字标记为示例链路；P6、P13、P15 使用真实截图及真实状态边界说明。

### Task 3: 多引擎 QA 与交付

**Files:**
- Modify: `ppt_work_20260829/build_lianqianyan.mjs` — 只在 QA 发现布局问题时修正。
- Create: `ppt_work_20260829/final-contact-sheet.png`
- Create: `ppt_work_20260829/libreoffice-export.pdf`
- Create: `ppt_work_20260829/qa-ledger.txt`

**Interfaces:**
- Consumes: 最终 PPTX、逐页 PNG/layout JSON、LibreOffice PDF。
- Produces: 通过逐页视觉、结构、溢出、占位符和 LibreOffice 打开/导出检查的最终 PPTX。

- [ ] **Step 1: 渲染每一页与总览图**

  使用 artifact-tool 导出每页 PNG 与 layout JSON，再用 `create_montage.py` 生成 contact sheet。逐页检查标题是否单行、正文是否裁切、截图是否失真、连接线是否穿过节点、页眉是否一致、空模板提示是否残留。

- [ ] **Step 2: 执行结构 QA**

  运行 `slides_test.py 链千言_产品说明_创新赛道.pptx`，并检查最终 PPTX XML 中所有带 `<p:ph>` 的继承占位符，不允许留下空白的 title/body/date/footer/slide number 占位符。

- [ ] **Step 3: 使用 LibreOffice 验证**

  使用 `F:\LibreOffice\program\soffice.exe --headless --convert-to pdf --outdir <TMP_DIR> <FINAL_PPTX>` 导出 PDF，并用 PDF 渲染工具检查页数为 20、页面比例正确、字体和图片未丢失。若 LibreOffice 导出与 artifact-tool 视觉存在差异，优先缩短文字或调整继承对象，不降低模板字体层级。

- [ ] **Step 4: 写入 QA ledger 并修复问题**

  `qa-ledger.txt` 对每页记录 `pass/fix`、标题、主体内容、图片、溢出、占位符和来源 notes 状态。所有发现的遮挡、错位、裁切、溢出和未填占位符必须在交付前修复并重新渲染。

- [ ] **Step 5: 最终交付**

  最终回复只提供 `链千言_产品说明_创新赛道.pptx` 的输出引用，并说明已完成的页数、真实截图使用情况、LibreOffice 验证结果，以及未将“AI辅助制作”放入 PPT 可见页面。
