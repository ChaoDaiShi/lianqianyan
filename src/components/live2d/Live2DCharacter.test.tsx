import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Live2DCharacter } from './Live2DCharacter';

describe('Live2DCharacter loading presentation', () => {
  it('keeps a visible Xiaolian fallback while the WebGL model is loading', () => {
    const html = renderToStaticMarkup(
      <Live2DCharacter
        stateLabel="小涟正在陪伴你"
        characterState="idle"
      />,
    );

    expect(html).toContain('data-live2d-status="loading"');
    expect(html).toContain('data-live2d-fallback="true"');
    expect(html).toContain('/brand/cyrene-icon.jpeg');
  });
});
