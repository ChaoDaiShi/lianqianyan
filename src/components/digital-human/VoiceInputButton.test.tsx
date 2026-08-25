import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { VoiceInputButton } from './VoiceInputButton';

describe('VoiceInputButton', () => {
  it('renders an explicit unsupported state instead of hiding the capability', () => {
    const html = renderToStaticMarkup(
      <VoiceInputButton
        supported={false}
        listening={false}
        error={null}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(html).toContain('语音输入不可用');
    expect(html).toContain('disabled');
  });

  it('uses accessible dynamic labels for start and stop', () => {
    const idle = renderToStaticMarkup(
      <VoiceInputButton
        supported
        listening={false}
        error={null}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    const listening = renderToStaticMarkup(
      <VoiceInputButton
        supported
        listening
        interimTranscript="正在识别死锁"
        error={null}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(idle).toContain('aria-label="开始语音输入"');
    expect(listening).toContain('aria-label="停止语音输入"');
    expect(listening).toContain('正在识别死锁');
  });

  it('surfaces a sanitized recognition error', () => {
    const html = renderToStaticMarkup(
      <VoiceInputButton
        supported
        listening={false}
        error="未获得麦克风权限，请在浏览器设置中允许后重试。"
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(html).toContain('未获得麦克风权限');
    expect(html).toContain('role="status"');
  });
});

