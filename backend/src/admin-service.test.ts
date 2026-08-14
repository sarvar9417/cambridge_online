import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { AdminService } from './services/admin-service.js';
const student = { id: 's', role: 'student' as const, schoolId: 'x', fullName: 'S' },
  owner = { ...student, role: 'owner' as const };
describe('owner admin boundary', () => {
  for (const method of ['settings', 'aiCalls', 'audit'] as const)
    it(`student cannot access ${method}`, async () => {
      const query = vi.fn();
      await expect(
        new AdminService({ query } as unknown as Pool)[method](student),
      ).rejects.toMatchObject({ status: 403 });
      expect(query).not.toHaveBeenCalled();
    });
  it('owner can read settings', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await new AdminService({ query } as unknown as Pool).settings(owner);
    expect(query).toHaveBeenCalled();
  });
});
