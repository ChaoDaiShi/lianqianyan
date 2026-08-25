import { describe, expect, it, vi } from 'vitest';
import { Live2DLeaseCoordinator } from './live2dLease';

describe('Live2DLeaseCoordinator', () => {
  it('allows only one active canvas owner at a time', () => {
    const coordinator = new Live2DLeaseCoordinator();
    const primary = Symbol('primary');
    const secondary = Symbol('secondary');

    expect(coordinator.register(primary)).toBe(true);
    expect(coordinator.register(secondary)).toBe(false);
    expect(coordinator.acquire(primary)).toBe(true);
    expect(coordinator.acquire(secondary)).toBe(false);
  });

  it('hands the lease to a waiting character after the owner unmounts', async () => {
    const coordinator = new Live2DLeaseCoordinator();
    const primary = Symbol('primary');
    const secondary = Symbol('secondary');
    const listener = vi.fn();
    coordinator.subscribe(listener);
    coordinator.register(primary);
    coordinator.register(secondary);

    coordinator.unregister(primary);
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(coordinator.acquire(secondary)).toBe(true);
  });

  it('does not release during React StrictMode effect replay', async () => {
    const coordinator = new Live2DLeaseCoordinator();
    const character = Symbol('character');
    coordinator.register(character);

    coordinator.unregister(character);
    expect(coordinator.register(character)).toBe(true);
    await Promise.resolve();

    expect(coordinator.acquire(character)).toBe(true);
  });
});
