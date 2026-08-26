import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SpeechControls } from './SpeechControls';

describe('SpeechControls', () => {
  it('names real Cyrene output without hiding the stop action', () => {
    const idle = renderToStaticMarkup(
      <SpeechControls
        text="讲解"
        supported
        speaking={false}
        mode="cyrene"
        onSpeak={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    const speaking = renderToStaticMarkup(
      <SpeechControls
        text="讲解"
        supported
        speaking
        mode="cyrene"
        onSpeak={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(idle).toContain('昔涟讲解');
    expect(idle).toContain('播放昔涟讲解');
    expect(speaking).toContain('停止讲解');
  });

  it('renders an explicit disabled state when output is unavailable', () => {
    const html = renderToStaticMarkup(
      <SpeechControls
        text="讲解"
        supported={false}
        speaking={false}
        mode="unavailable"
        onSpeak={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(html).toContain('语音讲解不可用');
    expect(html).toContain('disabled');
  });
});
