import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';

describe('shared control scale', () => {
  it('keeps shared button labels available across the supported sizes', () => {
    const html = renderToStaticMarkup(
      <div>
        <Button>默认按钮</Button>
        <Button size="sm">紧凑按钮</Button>
        <Button size="lg">主行动</Button>
        <Button size="icon" aria-label="图标按钮">+</Button>
      </div>,
    );

    expect(html).toContain('默认按钮');
    expect(html).toContain('紧凑按钮');
    expect(html).toContain('主行动');
    expect(html).toContain('aria-label="图标按钮"');
  });

  it('preserves accessible names and placeholders on text controls', () => {
    const html = renderToStaticMarkup(
      <div>
        <Input aria-label="短文本" placeholder="输入内容" />
        <Textarea aria-label="长文本" placeholder="输入长内容" />
      </div>,
    );

    expect(html).toContain('aria-label="短文本"');
    expect(html).toContain('placeholder="输入内容"');
    expect(html).toContain('aria-label="长文本"');
    expect(html).toContain('placeholder="输入长内容"');
  });
});
