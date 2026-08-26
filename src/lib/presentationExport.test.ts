import { describe, expect, it, vi } from 'vitest';
import type { GeneratedResource } from './educationApi';

const writeFile = vi.fn().mockResolvedValue(undefined);
const addText = vi.fn();
const addShape = vi.fn();
const addNotes = vi.fn();
const addSlide = vi.fn(() => ({ addText, addShape, addNotes, background: {} }));

vi.mock('pptxgenjs', () => ({
  default: class FakePptxGenJS {
    layout = '';
    author = '';
    subject = '';
    title = '';
    company = '';
    lang = '';
    addSlide = addSlide;
    writeFile = writeFile;
    ShapeType = { rect: 'rect' };
  },
}));

import { downloadPresentation } from './presentationExport';

describe('presentation export', () => {
  it('builds and writes a real pptx file from structured slides', async () => {
    const resource: GeneratedResource = {
      title: '死锁 · 课堂演示文稿', resourceType: 'presentation',
      format: 'presentation', content: '# preview', generationMode: 'course_template',
      sourceSections: ['定义'], filename: 'deadlock.pptx',
      slides: [
        { layout: 'title', title: '死锁', subtitle: '昔涟教官', bullets: [], speakerNotes: '' },
        { layout: 'content', title: '定义', subtitle: '', bullets: ['互相等待'], speakerNotes: '来源：定义' },
      ],
    };

    await downloadPresentation(resource);

    expect(addSlide).toHaveBeenCalledTimes(2);
    expect(addText).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith({ fileName: 'deadlock.pptx' });
  });
});
