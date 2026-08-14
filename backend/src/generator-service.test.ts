import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { GeneratorService } from './services/generator-service.js';
const student = { id: 's', role: 'student' as const, schoolId: 'x', fullName: 'S' },
  owner = { ...student, role: 'owner' as const };
describe('generator service', () => {
  it('rejects student before query', async () => {
    const query = vi.fn();
    await expect(
      new GeneratorService({ query } as unknown as Pool).generate(student, {
        classId: 'c',
        title: 'T',
        targetMarks: 10,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });
  it('returns warning when pool empty', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const r = await new GeneratorService({ query } as unknown as Pool).generate(owner, {
      classId: 'c',
      title: 'T',
      targetMarks: 10,
    });
    expect(r.warnings).toContain('insufficient_pool');
  });
});
