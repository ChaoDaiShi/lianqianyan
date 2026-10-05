import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';

describe('shared control scale', () => {
  it('uses consistent readable button heights and typography', () => {
    const html = renderToStaticMarkup(
      <div>
        <Button>默认按钮</Button>
        <Button size="sm">紧凑按钮</Button>
        <Button size="lg">主行动</Button>
        <Button size="icon" aria-label="图标按钮">+</Button>
      </div>,
    );

    expect(html).toContain('h-11 px-5');
    expect(html).toContain('h-10 rounded-xl px-4 text-sm');
    expect(html).toContain('h-[3.25rem]');
    expect(html).toContain('text-base');
    expect(html).toContain('h-11 w-11');
    expect(html).toContain('text-[15px]');
  });

  it('keeps text inputs and textareas on the same readable scale', () => {
    const html = renderToStaticMarkup(
      <div>
        <Input placeholder="输入内容" />
        <Textarea placeholder="输入长内容" />
      </div>,
    );

    expect(html).toContain('h-11');
    expect(html).toContain('min-h-[104px]');
    expect(html.match(/text-\[15px\]/g)).toHaveLength(2);
  });
});
