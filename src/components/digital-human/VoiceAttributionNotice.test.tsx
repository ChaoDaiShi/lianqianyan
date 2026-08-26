import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VoiceAttributionNotice } from './VoiceAttributionNotice';
import { VOICE_ATTRIBUTION } from './voiceAttribution';

describe('VoiceAttributionNotice', () => {
  it('renders the mandatory attribution and the real Cyrene mode', () => {
    const html = renderToStaticMarkup(
      <VoiceAttributionNotice mode="cyrene" error={null} />,
    );

    expect(html).toContain('当前输出：昔涟 GPT-SoVITS');
    expect(html).toContain(VOICE_ATTRIBUTION);
    expect(html).toContain('语音技术来源');
  });

  it('does not label browser fallback as Cyrene', () => {
    const html = renderToStaticMarkup(
      <VoiceAttributionNotice
        mode="browser_fallback"
        error="昔涟语音服务暂时不可用，已切换为浏览器语音。"
      />,
    );

    expect(html).toContain('当前输出：浏览器语音');
    expect(html).toContain('已切换为浏览器语音');
    expect(html).toContain(VOICE_ATTRIBUTION);
  });
});
