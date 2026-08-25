import { useEffect, useRef, useState } from 'react';

type LeaseToken = symbol;
type LeaseListener = () => void;

/**
 * Cubism models share cached GPU resources. Keeping one active renderer avoids
 * binding those resources across independent WebGL contexts on content-heavy
 * pages. Registrations are reference-counted so React StrictMode's effect
 * replay cannot briefly hand the lease to another character.
 */
export class Live2DLeaseCoordinator {
  private owner: LeaseToken | null = null;
  private readonly registrations = new Map<LeaseToken, number>();
  private readonly listeners = new Set<LeaseListener>();

  register(token: LeaseToken): boolean {
    this.registrations.set(token, (this.registrations.get(token) ?? 0) + 1);
    if (this.owner === null) this.owner = token;
    return this.owner === token;
  }

  acquire(token: LeaseToken): boolean {
    if ((this.registrations.get(token) ?? 0) <= 0) return false;
    if (this.owner === null) this.owner = token;
    return this.owner === token;
  }

  unregister(token: LeaseToken): void {
    const count = this.registrations.get(token) ?? 0;
    this.registrations.set(token, Math.max(0, count - 1));

    queueMicrotask(() => {
      if ((this.registrations.get(token) ?? 0) > 0) return;
      this.registrations.delete(token);
      if (this.owner !== token) return;
      this.owner = null;
      this.listeners.forEach((listener) => listener());
    });
  }

  subscribe(listener: LeaseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const live2dLeaseCoordinator = new Live2DLeaseCoordinator();

export function useLive2dLease(enabled = true): boolean {
  const tokenRef = useRef<LeaseToken>();
  if (!tokenRef.current) tokenRef.current = Symbol('xiaolian-live2d');
  const [hasLease, setHasLease] = useState(false);

  useEffect(() => {
    const token = tokenRef.current;
    if (!enabled || !token) {
      setHasLease(false);
      return;
    }

    const refresh = () => setHasLease(live2dLeaseCoordinator.acquire(token));
    const unsubscribe = live2dLeaseCoordinator.subscribe(refresh);
    setHasLease(live2dLeaseCoordinator.register(token));

    return () => {
      unsubscribe();
      live2dLeaseCoordinator.unregister(token);
    };
  }, [enabled]);

  return hasLease;
}
