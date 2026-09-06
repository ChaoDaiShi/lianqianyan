/**
 * 涟千言课堂演示文稿模板生成器。
 *
 * 产物：public/templates/lianqianyan-course-template.pptx
 * 每页 speaker notes 记录该版式的字段契约，供 /api/resources/generate 的
 * presentation 资源与前端 presentationExport 对齐使用。
 * 重新生成：node scripts/build-course-ppt-template.mjs
 */
import pptxgen from 'pptxgenjs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'templates');
mkdirSync(outDir, { recursive: true });

// 品牌色板：BACKGROUND → PRIMARY → ACCENT，全模板只引用这些常量
const BG_LIGHT = 'F7F6FD';
const BG_DARK = '2B2650';
const PRIMARY = '7C6FF0';
const PRIMARY_DEEP = '5B4DC7';
const PRIMARY_TINT = 'EDEAFE';
const ACCENT = 'F59E0B';
const TEXT = '2E2854';
const MUTED = '8B83A8';
const ON_DARK = 'FFFFFF';
const ON_DARK_MUTED = 'C9C2E8';
const FONT = 'Microsoft YaHei';

const W = 13.33;
const H = 7.5;
const M = 0.62;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = '涟千言 · 小涟学姐';
pres.company = '涟千言';
pres.subject = '涟千言课堂演示文稿模板';
pres.title = '涟千言课堂模板';
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

const makeShadow = () => ({ type: 'outer', color: '3A2F6B', blur: 8, offset: 2, angle: 90, opacity: 0.14 });
const bullet = () => ({ code: '25B8', indent: 12 });

/** 浅色内容页页脚：品牌落款 + 页码。 */
function lightFooter(slide, index, total) {
  slide.addText('涟千言 · 课程材料驱动', { x: M, y: H - 0.42, w: 3.4, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, margin: 0 });
  slide.addText(`${index} / ${total}`, { x: W - M - 1.2, y: H - 0.42, w: 1.2, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, align: 'right', margin: 0 });
}

/** 内容页标题行：紫色圆角方块记号 + 标题（全模板统一记号，不用色条）。 */
function contentHeader(slide, title, accent = PRIMARY) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 0.56, w: 0.26, h: 0.26, rectRadius: 0.06, fill: { color: accent }, line: { type: 'none' } });
  slide.addText(title, { x: M + 0.42, y: 0.36, w: W - M * 2 - 0.42, h: 0.66, fontFace: FONT, fontSize: 27, bold: true, color: TEXT, margin: 0, valign: 'middle' });
}

let page = 0;
const TOTAL = 6;

// —— 1. 封面（深色）：title 版式 ——
{
  page += 1;
  const slide = pres.addSlide();
  slide.background = { color: BG_DARK };
  slide.addShape(pres.shapes.OVAL, { x: 10.1, y: -1.6, w: 4.4, h: 4.4, fill: { color: PRIMARY, transparency: 82 }, line: { type: 'none' } });
  slide.addShape(pres.shapes.OVAL, { x: -1.3, y: 5.2, w: 3.4, h: 3.4, fill: { color: PRIMARY_DEEP, transparency: 74 }, line: { type: 'none' } });
  slide.addText('涟千言 · 小涟学姐', { x: M, y: 0.5, w: 4, h: 0.32, fontFace: FONT, fontSize: 12, color: ON_DARK_MUTED, margin: 0 });
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 2.02, w: 2.06, h: 0.4, rectRadius: 0.2, fill: { color: ACCENT }, line: { type: 'none' } });
  slide.addText('课程材料驱动生成', { x: M, y: 2.02, w: 2.06, h: 0.4, fontFace: FONT, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0 });
  slide.addText('死锁', { x: M, y: 2.62, w: W - M * 2, h: 1.15, fontFace: FONT, fontSize: 54, bold: true, color: ON_DARK, margin: 0 });
  slide.addText('进程同步的关键难题 · 课堂演示', { x: M, y: 3.86, w: W - M * 2, h: 0.5, fontFace: FONT, fontSize: 18, color: ON_DARK_MUTED, margin: 0 });
  slide.addText('内容只来自课程材料章节，不补充外部事实', { x: M, y: H - 0.66, w: W - M * 2, h: 0.3, fontFace: FONT, fontSize: 10, color: ON_DARK_MUTED, margin: 0 });
  slide.addNotes('版式 title：主标题=知识点名称（54pt）；副标题=「章节主题 · 课堂演示」；琥珀色徽标文字固定为「课程材料驱动生成」。');
}

// —— 2. 学习目标（浅色编号行）：content 版式 ——
{
  page += 1;
  const slide = pres.addSlide();
  slide.background = { color: BG_LIGHT };
  contentHeader(slide, '学习目标');
  const goals = ['能说出死锁的定义并区分阻塞与饥饿', '能推导四个必要条件，并举出一个反例', '能比较预防、避免、检测三种策略的代价'];
  goals.forEach((goal, index) => {
    const y = 1.72 + index * 1.42;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y, w: 0.62, h: 0.62, rectRadius: 0.14, fill: { color: PRIMARY_TINT }, line: { type: 'none' } });
    slide.addText(`0${index + 1}`, { x: M, y, w: 0.62, h: 0.62, fontFace: FONT, fontSize: 17, bold: true, color: PRIMARY_DEEP, align: 'center', valign: 'middle', margin: 0 });
    slide.addText(goal, { x: M + 0.92, y: y - 0.08, w: W - M * 2 - 0.92, h: 0.8, fontFace: FONT, fontSize: 19, color: TEXT, valign: 'middle', margin: 0 });
    if (index < goals.length - 1) slide.addShape(pres.shapes.LINE, { x: M + 0.92, y: y + 1.06, w: W - M * 2 - 0.92, h: 0, line: { color: 'E3DEF6', width: 0.75 } });
  });
  lightFooter(slide, page, TOTAL);
  slide.addNotes('版式 content（目标页）：每行 = 一个可检验的学习目标；编号方块 01/02/03，行间用发丝线分隔。生成时按章节数量增删行。');
}

// —— 3. 知识章节（浅色知识卡片）：content 版式 ——
{
  page += 1;
  const slide = pres.addSlide();
  slide.background = { color: BG_LIGHT };
  contentHeader(slide, '四个必要条件');
  const cards = [
    ['互斥', '资源一次只能被一个进程占有'],
    ['占有并等待', '持有资源的同时继续申请新资源'],
    ['不可剥夺', '资源只能由占有者主动释放'],
    ['循环等待', '等待链首尾相接形成环路'],
  ];
  const cardW = 5.72, cardH = 1.92, gapX = 0.36, gapY = 0.34;
  cards.forEach(([title, desc], index) => {
    const x = M + (index % 2) * (cardW + gapX);
    const y = 1.66 + Math.floor(index / 2) * (cardH + gapY);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cardW, h: cardH, rectRadius: 0.12, fill: { color: 'FFFFFF' }, line: { type: 'none' }, shadow: makeShadow() });
    slide.addShape(pres.shapes.OVAL, { x: x + 0.34, y: y + 0.4, w: 0.16, h: 0.16, fill: { color: PRIMARY }, line: { type: 'none' } });
    slide.addText(title, { x: x + 0.66, y: y + 0.24, w: cardW - 0.9, h: 0.5, fontFace: FONT, fontSize: 18, bold: true, color: TEXT, margin: 0 });
    slide.addText(desc, { x: x + 0.66, y: y + 0.82, w: cardW - 0.98, h: 0.92, fontFace: FONT, fontSize: 13, color: MUTED, margin: 0, valign: 'top' });
  });
  lightFooter(slide, page, TOTAL);
  slide.addNotes('版式 content（卡片页）：每张卡片 = 短语标题 + 一句说明（说明≤16字）。适合并列概念；卡片数量 ≤6 时用双列，更多改用纯列表页。');
}

// —— 4. 课堂检查（浅色琥珀强调）：question 版式 ——
{
  page += 1;
  const slide = pres.addSlide();
  slide.background = { color: BG_LIGHT };
  contentHeader(slide, '课堂检查', ACCENT);
  const questions = ['为什么“循环等待”成立还需要“不可剥夺”才可能死锁？', '银行家算法在什么情况下会拒绝一次资源申请？', '死锁检测恢复后，被剥夺资源的进程会发生什么？'];
  questions.forEach((question, index) => {
    const y = 1.78 + index * 1.34;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y, w: 0.58, h: 0.58, rectRadius: 0.12, fill: { color: 'FDF0D9' }, line: { type: 'none' } });
    slide.addText(`Q${index + 1}`, { x: M, y, w: 0.58, h: 0.58, fontFace: FONT, fontSize: 15, bold: true, color: 'B45309', align: 'center', valign: 'middle', margin: 0 });
    slide.addText(question, { x: M + 0.86, y: y - 0.06, w: W - M * 2 - 0.86, h: 0.72, fontFace: FONT, fontSize: 18, color: TEXT, valign: 'middle', margin: 0 });
  });
  slide.addText('先让学生回答，再展示对应章节要点', { x: M, y: H - 0.98, w: W - M * 2, h: 0.32, fontFace: FONT, fontSize: 11, color: MUTED, margin: 0 });
  lightFooter(slide, page, TOTAL);
  slide.addNotes('版式 question：每行 = 一道开放问题（≤30字），Q 徽标用琥珀色；底部提示语固定。生成时取前 3 个章节各出一题。');
}

// —— 5. 总结与下一步（浅色双栏）：summary 版式 ——
{
  page += 1;
  const slide = pres.addSlide();
  slide.background = { color: BG_LIGHT };
  contentHeader(slide, '总结与下一步');
  slide.addText('本节回顾', { x: M, y: 1.62, w: 5.6, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: PRIMARY_DEEP, margin: 0 });
  slide.addShape(pres.shapes.RECTANGLE, { x: M - 0.24, y: 2.14, w: 6.2, h: 3.9, fill: { color: PRIMARY_TINT, transparency: 45 }, line: { type: 'none' } });
  slide.addText([
    { text: '死锁 = 相互等待，整体无法推进', options: { bullet: bullet(), breakLine: true } },
    { text: '四条件缺一不可，破坏其一即可预防', options: { bullet: bullet(), breakLine: true } },
    { text: '策略选择取决于系统代价偏好', options: { bullet: bullet() } },
  ], { x: M + 0.06, y: 2.38, w: 5.6, h: 3.4, fontFace: FONT, fontSize: 15, color: TEXT, paraSpaceAfter: 12, margin: 0, valign: 'top' });
  slide.addText('下一步建议', { x: 7.15, y: 1.62, w: 5.6, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: TEXT, margin: 0 });
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.15, y: 2.14, w: 5.55, h: 3.9, rectRadius: 0.12, fill: { type: 'none' }, line: { color: 'D8D0F2', width: 1 } });
  slide.addText([
    { text: '完成「检测与解除」章节自测', options: { bullet: bullet(), breakLine: true } },
    { text: '用银行家算法手工演算一个安全序列', options: { bullet: bullet(), breakLine: true } },
    { text: '进入考试中心的进程同步专项', options: { bullet: bullet() } },
  ], { x: 7.45, y: 2.38, w: 5.0, h: 3.4, fontFace: FONT, fontSize: 15, color: TEXT, paraSpaceAfter: 12, margin: 0, valign: 'top' });
  lightFooter(slide, page, TOTAL);
  slide.addNotes('版式 summary：左栏（浅紫底）=按章节复述；右栏（描边框）=下一步动作，每条一个可执行动作。');
}

// —— 6. 课程来源（深色收尾）：sources 版式 ——
{
  page += 1;
  const slide = pres.addSlide();
  slide.background = { color: BG_DARK };
  slide.addShape(pres.shapes.OVAL, { x: 11.2, y: 5.6, w: 3.6, h: 3.6, fill: { color: PRIMARY_DEEP, transparency: 76 }, line: { type: 'none' } });
  slide.addText('课程来源', { x: M, y: 0.72, w: W - M * 2, h: 0.7, fontFace: FONT, fontSize: 30, bold: true, color: ON_DARK, margin: 0 });
  slide.addText([
    { text: '操作系统 · 死锁：定义与判断 / 四个必要条件 / 死锁预防', options: { bullet: bullet(), breakLine: true } },
    { text: '操作系统 · 死锁：死锁避免与银行家算法 / 检测与解除', options: { bullet: bullet(), breakLine: true } },
    { text: '操作系统 · 死锁：例子、误区与自测', options: { bullet: bullet() } },
  ], { x: M, y: 1.9, w: W - M * 2, h: 2.6, fontFace: FONT, fontSize: 16, color: ON_DARK_MUTED, paraSpaceAfter: 14, margin: 0, valign: 'top' });
  slide.addText('所有内容均来自这些课程章节', { x: M, y: 4.9, w: W - M * 2, h: 0.34, fontFace: FONT, fontSize: 12, italic: true, color: ON_DARK_MUTED, margin: 0 });
  slide.addText('涟千言 · 小涟学姐', { x: M, y: H - 0.62, w: 4, h: 0.3, fontFace: FONT, fontSize: 10, color: ON_DARK_MUTED, margin: 0 });
  slide.addNotes('版式 sources（深色收尾）：逐行列出真实来源章节，斜体固定句「所有内容均来自这些课程章节」。');
}

await pres.writeFile({ fileName: join(outDir, 'lianqianyan-course-template.pptx') });
console.log('template written:', join(outDir, 'lianqianyan-course-template.pptx'));
