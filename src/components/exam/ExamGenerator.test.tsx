import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExamGenerator } from './ExamGenerator';

describe('ExamGenerator', () => {
  it('offers formal exam and practice generation with provenance boundaries', () => {
    const html = renderToStaticMarkup(<ExamGenerator />);

    expect(html).toContain('AI 组卷中心');
    expect(html).toContain('生成整张试卷');
    expect(html).toContain('生成专项练习');
    expect(html).toContain('AI 语义自动判卷');
    expect(html).toContain('生成模式');
    expect(html).toContain('课程材料降级');
  });
});
