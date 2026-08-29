import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NebulaBackground } from './NebulaBackground';

describe('NebulaBackground', () => {
  it('uses the shared learning-space background layer', () => {
    const html = renderToStaticMarkup(<NebulaBackground scene="companion" />);

    expect(html).toContain('data-background="learning-space"');
    expect(html).toContain('/brand/learning-space-background.png');
  });
});
