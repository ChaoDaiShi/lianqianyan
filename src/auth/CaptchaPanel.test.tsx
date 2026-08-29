// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CaptchaPanel, type CaptchaPanelHandle } from './CaptchaPanel';

const turnstileTokenReceiver = vi.fn<(token: string | null) => void>();
const vaptchaTokenReceiver = vi.fn<(token: string | null) => void>();

vi.mock('./TurnstileWidget', () => ({
  TurnstileWidget: ({
    onToken,
    onUnavailable,
  }: {
    onToken(token: string | null): void;
    onUnavailable(): void;
  }) => {
    turnstileTokenReceiver.mockImplementation(onToken);
    return (
      <div data-testid="turnstile-widget">
        <button
          type="button"
          data-testid="turnstile-pass"
          onClick={() => onToken('cf-token')}
        >
          pass
        </button>
        <button
          type="button"
          data-testid="turnstile-unavailable"
          onClick={() => onUnavailable()}
        >
          unavailable
        </button>
      </div>
    );
  },
}));

vi.mock('./VaptchaWidget', () => ({
  VaptchaWidget: ({
    onToken,
    onUnavailable,
  }: {
    onToken(token: string | null): void;
    onUnavailable(): void;
  }) => {
    vaptchaTokenReceiver.mockImplementation(onToken);
    return (
      <div data-testid="vaptcha-widget">
        <button
          type="button"
          data-testid="vaptcha-pass"
          onClick={() => onToken('va-token')}
        >
          pass
        </button>
        <button
          type="button"
          data-testid="vaptcha-unavailable"
          onClick={() => onUnavailable()}
        >
          unavailable
        </button>
      </div>
    );
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('CaptchaPanel', () => {
  it('renders nothing when the chain is empty', () => {
    render(
      <CaptchaPanel
        chain={[]}
        turnstileSiteKey={null}
        vaptchaVid={null}
        theme="dark"
        onCredential={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('turnstile-widget')).toBeNull();
    expect(screen.queryByTestId('vaptcha-widget')).toBeNull();
  });

  it('starts with turnstile and falls back to vaptcha after the timeout', () => {
    const onCredential = vi.fn();
    const onFallback = vi.fn();
    render(
      <CaptchaPanel
        chain={['turnstile', 'vaptcha']}
        turnstileSiteKey="site"
        vaptchaVid="vid"
        theme="dark"
        onCredential={onCredential}
        onFallback={onFallback}
      />,
    );
    expect(screen.getByTestId('turnstile-widget')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    expect(screen.queryByTestId('turnstile-widget')).toBeNull();
    expect(screen.getByTestId('vaptcha-widget')).toBeTruthy();
    expect(onFallback).toHaveBeenCalledWith('vaptcha');

    fireEvent.click(screen.getByTestId('vaptcha-pass'));
    expect(onCredential).toHaveBeenLastCalledWith({ token: 'va-token', provider: 'vaptcha' });
  });

  it('does not fall back once a turnstile token arrived', () => {
    const onCredential = vi.fn();
    render(
      <CaptchaPanel
        chain={['turnstile', 'vaptcha']}
        turnstileSiteKey="site"
        vaptchaVid="vid"
        theme="dark"
        onCredential={onCredential}
      />,
    );
    fireEvent.click(screen.getByTestId('turnstile-pass'));
    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    expect(screen.getByTestId('turnstile-widget')).toBeTruthy();
    expect(onCredential).toHaveBeenLastCalledWith({ token: 'cf-token', provider: 'turnstile' });
  });

  it('switches immediately when the turnstile script cannot load', () => {
    const onFallback = vi.fn();
    render(
      <CaptchaPanel
        chain={['turnstile', 'vaptcha']}
        turnstileSiteKey="site"
        vaptchaVid="vid"
        theme="dark"
        onCredential={vi.fn()}
        onFallback={onFallback}
      />,
    );
    fireEvent.click(screen.getByTestId('turnstile-unavailable'));
    expect(screen.getByTestId('vaptcha-widget')).toBeTruthy();
    expect(screen.queryByTestId('turnstile-widget')).toBeNull();
    expect(onFallback).toHaveBeenCalledWith('vaptcha');
  });

  it('does not fall back when vaptcha is not in the chain', () => {
    render(
      <CaptchaPanel
        chain={['turnstile']}
        turnstileSiteKey="site"
        vaptchaVid={null}
        theme="dark"
        onCredential={vi.fn()}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    expect(screen.getByTestId('turnstile-widget')).toBeTruthy();
  });

  it('reports all providers unavailable when the vaptcha fallback also fails', () => {
    const onAllUnavailable = vi.fn();
    render(
      <CaptchaPanel
        chain={['turnstile', 'vaptcha']}
        turnstileSiteKey="site"
        vaptchaVid="vid"
        theme="dark"
        onCredential={vi.fn()}
        onAllUnavailable={onAllUnavailable}
      />,
    );
    fireEvent.click(screen.getByTestId('turnstile-unavailable'));
    fireEvent.click(screen.getByTestId('vaptcha-unavailable'));
    expect(onAllUnavailable).toHaveBeenCalledTimes(1);
  });

  it('reports all providers unavailable for a turnstile-only chain', () => {
    const onAllUnavailable = vi.fn();
    render(
      <CaptchaPanel
        chain={['turnstile']}
        turnstileSiteKey="site"
        vaptchaVid={null}
        theme="dark"
        onCredential={vi.fn()}
        onAllUnavailable={onAllUnavailable}
      />,
    );
    fireEvent.click(screen.getByTestId('turnstile-unavailable'));
    expect(onAllUnavailable).toHaveBeenCalledTimes(1);
  });

  it('exposes reset through the imperative handle', () => {
    const handle = createRef<CaptchaPanelHandle>();
    const onCredential = vi.fn();
    render(
      <CaptchaPanel
        ref={handle}
        chain={['turnstile', 'vaptcha']}
        turnstileSiteKey="site"
        vaptchaVid="vid"
        theme="dark"
        onCredential={onCredential}
      />,
    );
    fireEvent.click(screen.getByTestId('turnstile-pass'));
    act(() => {
      handle.current?.reset();
    });
    expect(onCredential).toHaveBeenLastCalledWith(null);
  });
});
