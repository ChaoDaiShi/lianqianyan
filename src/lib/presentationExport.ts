import PptxGenJS from 'pptxgenjs';
import type { GeneratedResource } from './educationApi';

/**
 * 真实 .pptx 导出：与 public/templates/lianqianyan-course-template.pptx
 * 共用同一套版式契约（涟千言品牌、深色封面/收尾、圆角记号标题、琥珀色问答强调）。
 * 版式字段契约见模板每页的 speaker notes。
 */

const BG_LIGHT = 'F7F6FD';
const BG_DARK = '2B2650';
const PRIMARY = '7C6FF0';
const PRIMARY_DEEP = '5B4DC7';
const ACCENT = 'F59E0B';
const ACCENT_TINT = 'FDF0D9';
const ACCENT_DEEP = 'B45309';
const TEXT = '2E2854';
const MUTED = '8B83A8';
const ON_DARK = 'FFFFFF';
const ON_DARK_MUTED = 'C9C2E8';
const FONT = 'Microsoft YaHei';

const W = 13.33;
const H = 7.5;
const M = 0.62;

export async function downloadPresentation(resource: GeneratedResource): Promise<void> {
  if (resource.format !== 'presentation' || resource.slides.length === 0) {
    throw new Error('structured presentation slides are required');
  }
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '涟千言 · 小涟学姐';
  pptx.company = '涟千言';
  pptx.subject = '课程材料驱动学习资源';
  pptx.title = resource.title;
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  const total = resource.slides.length;
  const bullet = () => ({ code: '25B8', indent: 12 });

  const contentHeader = (slide: PptxGenJS.Slide, title: string, accent = PRIMARY) => {
    slide.addShape(pptx.ShapeType.roundRect, { x: M, y: 0.56, w: 0.26, h: 0.26, rectRadius: 0.06, fill: { color: accent }, line: { type: 'none' } });
    slide.addText(title, { x: M + 0.42, y: 0.36, w: W - M * 2 - 0.42, h: 0.66, fontFace: FONT, fontSize: 27, bold: true, color: TEXT, margin: 0, valign: 'middle' });
  };

  const lightFooter = (slide: PptxGenJS.Slide, index: number) => {
    slide.addText('涟千言 · 课程材料驱动', { x: M, y: H - 0.42, w: 3.4, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, margin: 0 });
    slide.addText(`${index} / ${total}`, { x: W - M - 1.2, y: H - 0.42, w: 1.2, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, align: 'right', margin: 0 });
  };

  const addBullets = (slide: PptxGenJS.Slide, bullets: string[], options: { x: number; y: number; w: number; h: number; fontSize?: number; color?: string; paraSpaceAfter?: number }) => {
    if (bullets.length === 0) return;
    slide.addText(
      bullets.map((text, index) => ({ text, options: { bullet: bullet(), breakLine: index < bullets.length - 1 } })),
      {
        ...options,
        fontFace: FONT,
        fontSize: options.fontSize ?? 17,
        color: options.color ?? TEXT,
        paraSpaceAfter: options.paraSpaceAfter ?? 12,
        margin: 0,
        valign: 'top',
      },
    );
  };

  resource.slides.forEach((item, index) => {
    const page = index + 1;
    const slide = pptx.addSlide();

    if (item.layout === 'title') {
      slide.background = { color: BG_DARK };
      slide.addShape(pptx.ShapeType.ellipse, { x: 10.1, y: -1.6, w: 4.4, h: 4.4, fill: { color: PRIMARY, transparency: 82 }, line: { type: 'none' } });
      slide.addShape(pptx.ShapeType.ellipse, { x: -1.3, y: 5.2, w: 3.4, h: 3.4, fill: { color: PRIMARY_DEEP, transparency: 74 }, line: { type: 'none' } });
      slide.addText('涟千言 · 小涟学姐', { x: M, y: 0.5, w: 4, h: 0.32, fontFace: FONT, fontSize: 12, color: ON_DARK_MUTED, margin: 0 });
      slide.addShape(pptx.ShapeType.roundRect, { x: M, y: 2.02, w: 2.06, h: 0.4, rectRadius: 0.2, fill: { color: ACCENT }, line: { type: 'none' } });
      slide.addText('课程材料驱动生成', { x: M, y: 2.02, w: 2.06, h: 0.4, fontFace: FONT, fontSize: 11, bold: true, color: ON_DARK, align: 'center', valign: 'middle', margin: 0 });
      slide.addText(item.title, { x: M, y: 2.62, w: W - M * 2, h: 1.15, fontFace: FONT, fontSize: 54, bold: true, color: ON_DARK, margin: 0 });
      if (item.subtitle) slide.addText(item.subtitle, { x: M, y: 3.86, w: W - M * 2, h: 0.5, fontFace: FONT, fontSize: 18, color: ON_DARK_MUTED, margin: 0 });
      slide.addText('内容只来自课程材料章节，不补充外部事实', { x: M, y: H - 0.66, w: W - M * 2, h: 0.3, fontFace: FONT, fontSize: 10, color: ON_DARK_MUTED, margin: 0 });
    } else if (item.layout === 'question') {
      slide.background = { color: BG_LIGHT };
      contentHeader(slide, item.title, ACCENT);
      const rows = item.bullets.slice(0, 4);
      rows.forEach((question, rowIndex) => {
        const y = 1.78 + rowIndex * 1.34;
        slide.addShape(pptx.ShapeType.roundRect, { x: M, y, w: 0.58, h: 0.58, rectRadius: 0.12, fill: { color: ACCENT_TINT }, line: { type: 'none' } });
        slide.addText(`Q${rowIndex + 1}`, { x: M, y, w: 0.58, h: 0.58, fontFace: FONT, fontSize: 15, bold: true, color: ACCENT_DEEP, align: 'center', valign: 'middle', margin: 0 });
        slide.addText(question, { x: M + 0.86, y: y - 0.06, w: W - M * 2 - 0.86, h: 0.72, fontFace: FONT, fontSize: 18, color: TEXT, valign: 'middle', margin: 0 });
      });
      lightFooter(slide, page);
    } else if (item.layout === 'sources') {
      slide.background = { color: BG_DARK };
      slide.addShape(pptx.ShapeType.ellipse, { x: 11.2, y: 5.6, w: 3.6, h: 3.6, fill: { color: PRIMARY_DEEP, transparency: 76 }, line: { type: 'none' } });
      slide.addText(item.title, { x: M, y: 0.72, w: W - M * 2, h: 0.7, fontFace: FONT, fontSize: 30, bold: true, color: ON_DARK, margin: 0 });
      addBullets(slide, item.bullets, { x: M, y: 1.9, w: W - M * 2, h: 2.8, fontSize: 16, color: ON_DARK_MUTED, paraSpaceAfter: 14 });
      slide.addText('所有内容均来自这些课程章节', { x: M, y: 4.9, w: W - M * 2, h: 0.34, fontFace: FONT, fontSize: 12, italic: true, color: ON_DARK_MUTED, margin: 0 });
      slide.addText('涟千言 · 小涟学姐', { x: M, y: H - 0.62, w: 4, h: 0.3, fontFace: FONT, fontSize: 10, color: ON_DARK_MUTED, margin: 0 });
    } else {
      // content / summary 共用浅色版式；summary 以紫色记号区分
      slide.background = { color: BG_LIGHT };
      contentHeader(slide, item.title, item.layout === 'summary' ? PRIMARY_DEEP : PRIMARY);
      addBullets(slide, item.bullets, { x: M + 0.1, y: 1.66, w: W - M * 2 - 0.2, h: H - 2.4 });
      lightFooter(slide, page);
    }

    if (item.speakerNotes) slide.addNotes(item.speakerNotes);
  });

  await pptx.writeFile({ fileName: resource.filename });
}
