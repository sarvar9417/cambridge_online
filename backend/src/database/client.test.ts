import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('../config.js', () => ({ config: { DATABASE_URL: 'postgresql://test:test@localhost:5432/test', NODE_ENV: 'test' } }));

import { pool } from './client.js';

afterAll(async () => { await pool?.end(); });

describe('background database connection errors', () => {
  it('handles an idle disconnect without crashing or logging connection credentials', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('Connection terminated unexpectedly'), { code: 'ECONNRESET' });
    const client = { connectionParameters: { password: 'must-not-be-logged' } };
    try {
      expect(() => pool!.emit('error', error, client)).not.toThrow();
      expect(log).toHaveBeenCalledExactlyOnceWith('Idle database connection failed', {
        message: error.message, code: 'ECONNRESET',
      });
    } finally { log.mockRestore(); }
  });
});
