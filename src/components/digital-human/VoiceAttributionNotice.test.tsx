import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VoiceAttributionNotice } from './VoiceAttributionNotice';
import { VOICE_ATTRIBUTION } from './voiceAttribution';

describe('VoiceAttributionNotice', () => {
  it('renders the mandatory attribution and the active Genie runtime', () => {
    const html = renderToStaticMarkup(
      <VoiceAttributionNotice
        mode="cyrene"
        provider="genie_tts"
        error={null}
      />,
    );

    expect(html).toContain('当前输出：昔涟 Genie-TTS');
    expect(html).toContain('Genie-TTS 2.0.2');
    expect(html).toContain('High_Logic');
    expect(html).toContain('MIT License');
    expect(html).toContain(VOICE_ATTRIBUTION);
    expect(html).toContain('语音技术来源');
  });

  it('keeps the legacy GPT-SoVITS label when that provider is active', () => {
    const html = renderToStaticMarkup(
      <VoiceAttributionNotice
        mode="cyrene"
        provider="gpt_sovits"
        error={null}
      />,
    );

    expect(html).toContain('当前输出：昔涟 GPT-SoVITS');
    expect(html).not.toContain('Genie-TTS 2.0.2');
    expect(html).toContain(VOICE_ATTRIBUTION);
  });

  it('does not label browser fallback as Cyrene', () => {
    const html = renderToStaticMarkup(
      <VoiceAttributionNotice
        mode="browser_fallback"
        provider="browser_speech"
        error="昔涟语音服务暂时不可用，已切换为浏览器语音。"
      />,
    );

    expect(html).toContain('当前输出：浏览器语音');
    expect(html).toContain('已切换为浏览器语音');
    expect(html).toContain(VOICE_ATTRIBUTION);
  });
});
