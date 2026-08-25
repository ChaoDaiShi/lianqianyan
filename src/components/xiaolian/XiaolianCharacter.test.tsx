import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  resolveXiaolianCharacterState,
  XiaolianCharacter,
} from './XiaolianCharacter';

describe('XiaolianCharacter Live2D facade', () => {
  it('preserves runtime and companion state precedence', () => {
    expect(resolveXiaolianCharacterState('thinking', 'celebrating')).toBe(
      'thinking',
    );
    expect(resolveXiaolianCharacterState('loading', 'companion')).toBe(
      'analyzing',
    );
    expect(resolveXiaolianCharacterState('idle', 'reminding')).toBe(
      'teaching',
    );
  });

  it('renders a lightweight avatar until it owns the sole Live2D lease', () => {
    const html = renderToStaticMarkup(
      <XiaolianCharacter state="teaching" size="hero" priority speaking />,
    );

    expect(html).toContain('data-xiaolian-avatar="true"');
    expect(html).toContain('data-character-state="teaching"');
    expect(html).not.toContain('data-live2d-character="true"');
    expect(html).not.toContain('.svg');
    expect(html).not.toContain('/xiaolian/');
  });

  it('keeps the optional companion message visible as text', () => {
    const html = renderToStaticMarkup(
      <XiaolianCharacter message="我们继续学习。" />,
    );

    expect(html).toContain('我们继续学习。');
  });
});
