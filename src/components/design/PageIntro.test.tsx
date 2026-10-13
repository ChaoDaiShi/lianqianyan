import { renderToStaticMarkup } from 'react-dom/server';
import { Sparkles } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { PageIntro } from './PageIntro';

describe('PageIntro', () => {
  it('renders a compact semantic page heading with optional aside content', () => {
    const html = renderToStaticMarkup(
      <PageIntro
        eyebrow='CREATION WORKSPACE'
        title='创作工作台'
        description='图文并行生成。'
        icon={Sparkles}
        aside={<span>小涟</span>}
      />
    );

    expect(html).toContain('data-page-intro="compact"');
    expect(html).toContain('<h1');
    expect(html).toContain('创作工作台');
    expect(html).toContain('小涟');
    expect(html).toContain('图文并行生成。');
  });
});
