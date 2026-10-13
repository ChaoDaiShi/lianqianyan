import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NebulaBackground } from './NebulaBackground';

describe('NebulaBackground', () => {
  it('uses the static workbench canvas without loading a background asset', () => {
    const html = renderToStaticMarkup(<NebulaBackground scene="companion" />);

    expect(html).toContain('data-background="workbench"');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('learning-space-background');
  });
});
