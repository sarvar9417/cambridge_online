import { describe, expect, it, vi } from 'vitest';
import { installOfflineAnswerSync } from './useOfflineAnswerSync';

class ConnectivityTarget {
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(type: 'online' | 'offline', listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: 'online' | 'offline', listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: 'online' | 'offline') {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

describe('offline answer synchronization lifecycle', () => {
  it('flushes immediately, reflects connectivity changes and detaches cleanly', () => {
    const target = new ConnectivityTarget();
    const flushPending = vi.fn(async () => {});
    const setOnline = vi.fn();

    const cleanup = installOfflineAnswerSync(target, flushPending, setOnline);

    expect(setOnline).toHaveBeenLastCalledWith(true);
    expect(flushPending).toHaveBeenCalledTimes(1);

    target.emit('offline');
    expect(setOnline).toHaveBeenLastCalledWith(false);
    expect(flushPending).toHaveBeenCalledTimes(1);

    target.emit('online');
    expect(setOnline).toHaveBeenLastCalledWith(true);
    expect(flushPending).toHaveBeenCalledTimes(2);

    cleanup();
    target.emit('offline');
    target.emit('online');

    expect(setOnline).toHaveBeenCalledTimes(3);
    expect(flushPending).toHaveBeenCalledTimes(2);
  });
});
