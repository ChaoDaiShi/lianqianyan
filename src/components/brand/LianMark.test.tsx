import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LianMark } from './LianMark';

describe('LianMark', () => {
  it('renders an accessible editable constellation mark', () => {
    const html = renderToStaticMarkup(<LianMark />);

    expect(html).toContain('<svg');
    expect(html).toContain('data-lian-mark="constellation"');
    expect(html).toContain('role="img"');
    expect(html).toContain('涟千言标志');
    expect(html).not.toContain('<img');
  });

  it('can be decorative without duplicating an accessible label', () => {
    const html = renderToStaticMarkup(<LianMark decorative size="sm" />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
    expect(html).toContain('data-mark-size="sm"');
  });
});
