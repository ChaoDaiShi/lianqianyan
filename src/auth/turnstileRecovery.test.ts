import { describe, expect, it, vi } from 'vitest';
import { resetTurnstileWidget } from './TurnstileWidget';

describe('resetTurnstileWidget', () => {
  it('clears the one-time token and resets the rendered widget', () => {
    const onToken = vi.fn();
    const reset = vi.fn();

    resetTurnstileWidget({ reset }, 'widget-1', onToken);

    expect(onToken).toHaveBeenCalledWith(null);
    expect(reset).toHaveBeenCalledWith('widget-1');
    expect(onToken.mock.invocationCallOrder[0]).toBeLessThan(reset.mock.invocationCallOrder[0]);
  });

  it('clears the token when the widget has not rendered yet', () => {
    const onToken = vi.fn();

    expect(() => resetTurnstileWidget(undefined, null, onToken)).not.toThrow();
    expect(onToken).toHaveBeenCalledWith(null);
  });
});
