import { describe, expect, it, vi } from 'vitest';
import { AUTH_EXPIRED_EVENT } from '../lib/api';
import { installAuthExpiryListener } from './useSessionLifecycle';

class EventTargetLike {
  private listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener(new Event(type));
  }
}

describe('session lifecycle contract', () => {
  it('owns auth-expiry subscription and detaches it cleanly', () => {
    const target = new EventTargetLike();
    const onExpired = vi.fn();
    const cleanup = installAuthExpiryListener(target, onExpired);

    target.emit(AUTH_EXPIRED_EVENT);
    expect(onExpired).toHaveBeenCalledOnce();

    cleanup();
    target.emit(AUTH_EXPIRED_EVENT);
    expect(onExpired).toHaveBeenCalledOnce();
  });
});
