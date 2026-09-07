import { describe, expect, it, vi } from 'vitest';
import { installExportPolling, shouldPollExports } from './useStaffExportPolling';

describe('staff export polling contract', () => {
  it('polls only staff sessions with work still in flight', () => {
    expect(shouldPollExports('student', [{ status: 'running' }])).toBe(false);
    expect(shouldPollExports('teacher', [{ status: 'ready' }])).toBe(false);
    expect(shouldPollExports('teacher', [{ status: 'queued' }])).toBe(true);
    expect(shouldPollExports('owner', [{ status: 'running' }])).toBe(true);
    expect(shouldPollExports(null, [{ status: 'running' }])).toBe(false);
  });

  it('uses the two-second cadence and detaches cleanly', async () => {
    let callback: (() => void) | undefined;
    const target = {
      setInterval: vi.fn((handler: () => void, milliseconds: number) => {
        callback = handler;
        expect(milliseconds).toBe(2_000);
        return 17;
      }),
      clearInterval: vi.fn(),
    };
    const refresh = vi.fn(async () => {});

    const cleanup = installExportPolling(target, refresh);
    callback?.();
    await Promise.resolve();

    expect(refresh).toHaveBeenCalledOnce();
    cleanup();
    expect(target.clearInterval).toHaveBeenCalledWith(17);
  });
});
