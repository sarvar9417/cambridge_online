import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const startup = vi.hoisted(() => ({ listen: vi.fn(), schedule: vi.fn(), pool: {} }));
vi.mock('./app.js', () => ({ app: { listen: startup.listen } }));
vi.mock('./config.js', () => ({ config: { PORT: 3001 } }));
vi.mock('./database/client.js', () => ({ pool: startup.pool }));
vi.mock('./jobs/attempt-scheduler.js', () => ({ startAttemptScheduler: startup.schedule }));

describe('backend startup', () => {
  let exitCode: typeof process.exitCode;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    exitCode = process.exitCode;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = exitCode;
    vi.restoreAllMocks();
  });

  it('starts background work only after the server is listening', async () => {
    await import('./server.js');
    expect(startup.schedule).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
    startup.listen.mock.calls[0]![1]();
    expect(startup.schedule).toHaveBeenCalledWith(startup.pool);
    expect(console.log).toHaveBeenCalledWith('Backend http://localhost:3001');
  });

  it('reports an occupied port without claiming the backend started', async () => {
    await import('./server.js');
    startup.listen.mock.calls[0]![1](Object.assign(new Error('Port busy'), { code: 'EADDRINUSE' }));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('3001-port band'));
    expect(console.log).not.toHaveBeenCalled();
    expect(startup.schedule).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('reports other startup errors and exits unsuccessfully', async () => {
    await import('./server.js');
    const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
    startup.listen.mock.calls[0]![1](error);
    expect(console.error).toHaveBeenCalledWith('Backend ishga tushmadi:', error);
    expect(console.log).not.toHaveBeenCalled();
    expect(startup.schedule).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
