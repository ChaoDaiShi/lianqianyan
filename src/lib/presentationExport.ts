import PptxGenJS from 'pptxgenjs';
import type { GeneratedResource } from './educationApi';

export async function downloadPresentation(resource: GeneratedResource): Promise<void> {
  if (resource.format !== 'presentation' || resource.slides.length === 0) {
    throw new Error('structured presentation slides are required');
  }
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '忆涟千言—教 · 小涟';
  pptx.company = 'EducationMind';
  pptx.subject = '课程材料驱动学习资源';
  pptx.title = resource.title;
  pptx.theme = {
    headFontFace: 'Microsoft YaHei',
    bodyFontFace: 'Microsoft YaHei',
  };

  resource.slides.forEach((item, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: index === 0 ? 'F8F3FF' : 'FCFBFF' };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 0.16,
      line: { color: 'D9C7FF', transparency: 100 }, fill: { color: 'A78BFA' },
    });
    slide.addText(item.title, {
      x: 0.75, y: index === 0 ? 2.05 : 0.5, w: 11.8, h: index === 0 ? 0.8 : 0.55,
      fontFace: 'Microsoft YaHei', fontSize: index === 0 ? 30 : 22,
      bold: true, color: '392F52', align: index === 0 ? 'center' : 'left',
      margin: 0,
    });
    if (item.subtitle) {
      slide.addText(item.subtitle, {
        x: 1.2, y: index === 0 ? 3.0 : 1.15, w: 10.9, h: 0.45,
        fontFace: 'Microsoft YaHei', fontSize: index === 0 ? 15 : 11,
        color: '776B91', align: index === 0 ? 'center' : 'left', margin: 0,
      });
    }
    if (item.bullets.length > 0) {
      slide.addText(
        item.bullets.map((text) => ({ text, options: { bullet: { indent: 16 } } })),
        {
          x: 1.0, y: 1.55, w: 11.2, h: 4.9,
          fontFace: 'Microsoft YaHei', fontSize: 18, color: '4D4266',
          breakLine: true, paraSpaceAfter: 12, margin: 0.08, valign: 'top',
        },
      );
    }
    slide.addText(`小涟 · ${index + 1}/${resource.slides.length}`, {
      x: 9.5, y: 7.08, w: 3.1, h: 0.2, fontFace: 'Microsoft YaHei',
      fontSize: 8, color: '998DAE', align: 'right', margin: 0,
    });
    if (item.speakerNotes) slide.addNotes(item.speakerNotes);
  });

  await pptx.writeFile({ fileName: resource.filename });
}
