import { describe, expect, it, vi } from 'vitest';
import { opportunisticMaintenance } from './opportunistic-maintenance.js';

const call = (middleware: ReturnType<typeof opportunisticMaintenance>) => {
  const next = vi.fn();
  middleware({} as never, {} as never, next);
  return next;
};

describe('opportunistic maintenance', () => {
  it('deduplicates maintenance inside the interval', async () => {
    const close = vi.fn().mockResolvedValue(0);
    const middleware = opportunisticMaintenance(close, 60_000);
    const first = call(middleware);
    const second = call(middleware);
    expect(close).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not block requests when maintenance fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const middleware = opportunisticMaintenance(vi.fn().mockRejectedValue(Error('db')));
    const next = call(middleware);
    expect(next).toHaveBeenCalled();
    // The rejection is handled on a later tick; the request never saw it.
    await vi.waitFor(() => expect(log).toHaveBeenCalled());
    log.mockRestore();
  });

  it('lets the request through immediately, without waiting for a slow database', async () => {
    // The reason this middleware exists is that expired attempts should close
    // themselves. The reason it must not await is this: an unreachable database
    // would otherwise hold one request per interval for the whole connection
    // timeout, for work that request never asked for.
    let settle: () => void = () => {};
    const close = vi.fn(() => new Promise<void>((resolve) => { settle = resolve; }));
    const next = call(opportunisticMaintenance(close, 60_000));
    expect(close).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    settle();
  });

  it('starts the next round only after the previous one settles', async () => {
    let settle: () => void = () => {};
    const close = vi.fn(() => new Promise<void>((resolve) => { settle = resolve; }));
    const middleware = opportunisticMaintenance(close, 0);
    call(middleware);
    call(middleware);
    expect(close).toHaveBeenCalledTimes(1);
    settle();
    await vi.waitFor(() => {
      call(middleware);
      expect(close).toHaveBeenCalledTimes(2);
    });
  });
});
