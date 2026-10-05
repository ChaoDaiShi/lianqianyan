import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LongTermMemoryPanel } from './LongTermMemoryPanel';

describe('LongTermMemoryPanel', () => {
  it('uses readable context typography and standard controls', () => {
    const html = renderToStaticMarkup(
      <LongTermMemoryPanel
        memories={[]}
        busy={false}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain('text-sm');
    expect(html).toContain('text-[13px]');
    expect(html).toContain('h-11');
    expect(html).toContain('w-11');
  });
});
