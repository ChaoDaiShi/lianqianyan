// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  resolveXiaolianCharacterState,
  XiaolianCharacter,
} from './XiaolianCharacter';

vi.mock('@/components/live2d/Live2DCharacter', () => ({
  Live2DCharacter: () => <div data-live2d-character="true" />,
}));

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

  it('keeps non-dialogue companion roles out of the Live2D runtime', () => {
    const { container } = render(<XiaolianCharacter size="hero" priority />);

    expect(container.querySelector('[data-live2d-character="true"]')).toBeNull();
    expect(container.querySelector('[data-xiaolian-avatar="true"]')).not.toBeNull();
  });

  it('keeps the optional companion message visible as text', () => {
    const html = renderToStaticMarkup(
      <XiaolianCharacter message="我们继续学习。" />,
    );

    expect(html).toContain('我们继续学习。');
  });

  it('renders the brand icon as the fallback avatar instead of the text glyph', () => {
    const html = renderToStaticMarkup(
      <XiaolianCharacter state="teaching" size="sm" speaking />,
    );

    expect(html).toContain('/brand/cyrene-icon.jpeg');
    expect(html).toContain('object-cover');
    expect(html).not.toContain('>涟<');
    expect(html).not.toContain('<strong');
    expect(html).toContain('data-live2d-speaking="true"');
  });

  it('uses action-oriented labels for encouragement and success states', () => {
    const encouragement = renderToStaticMarkup(
      <XiaolianCharacter state="encourage" />,
    );
    const success = renderToStaticMarkup(<XiaolianCharacter state="success" />);

    expect(encouragement).toContain('aria-label="准备开始学习"');
    expect(success).toContain('aria-label="查看学习记录"');
  });
});
