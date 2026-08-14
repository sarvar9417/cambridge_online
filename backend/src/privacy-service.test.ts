import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PrivacyService } from './services/privacy-service.js';

const owner = { id:'owner-id',role:'owner' as const,schoolId:'school-id',fullName:'Owner' };
const student = { id:'student-id',role:'student' as const,schoolId:'school-id',fullName:'Student' };

describe('privacy service', () => {
  it('exports only the authenticated user data', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount:1,rows:[{ id:student.id,full_name:'Student' }] })
      .mockResolvedValue({ rowCount:0,rows:[] });
    const release = vi.fn();
    const connect = vi.fn().mockResolvedValue({ query,release });
    const result = await new PrivacyService({ connect } as unknown as Pool).exportOwnData(student);
    expect(result.profile.id).toBe(student.id);
    expect(query.mock.calls[0]![0]).toContain('repeatable read read only');
    for (const call of query.mock.calls.slice(1,7)) expect(call[1]).toEqual([student.id]);
    expect(query.mock.calls[4]![0]).toContain('t.number topic_number');
    expect(query.mock.calls[4]![0]).not.toMatch(/(?:^|[^a-z])t\.code/);
    expect(query.mock.calls[7]![0]).toBe('commit');
    expect(release).toHaveBeenCalled();
  });

  it('rejects anonymization by a student before querying the database', async () => {
    const connect = vi.fn();
    await expect(new PrivacyService({ connect } as unknown as Pool).anonymizeStudent(student, 'target-id'))
      .rejects.toMatchObject({ code:'owner_only',status:403 });
    expect(connect).not.toHaveBeenCalled();
  });

  it('hides a student outside the owner school and rolls back', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount:0,rows:[] })
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const connect = vi.fn().mockResolvedValue({ query,release });
    await expect(new PrivacyService({ connect } as unknown as Pool).anonymizeStudent(owner, 'target-id'))
      .rejects.toMatchObject({ code:'not_found',status:404 });
    expect(query.mock.calls[1]![0]).toContain("school_id=$2 and role='student'");
    expect(query.mock.calls[2]![0]).toBe('rollback');
    expect(release).toHaveBeenCalled();
  });

  it('anonymizes personal fields while retaining statistical records', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount:1,rows:[{ id:'target-id' }] })
      .mockResolvedValue({});
    const release = vi.fn();
    const connect = vi.fn().mockResolvedValue({ query,release });
    await expect(new PrivacyService({ connect } as unknown as Pool).anonymizeStudent(owner, 'target-id'))
      .resolves.toEqual({ id:'target-id',anonymized:true });
    const sql = query.mock.calls.map((call) => call[0]).join('\n');
    expect(sql).toContain('update answers set text=null');
    expect(sql).toContain("full_name='O''chirilgan foydalanuvchi'");
    expect(sql).toContain('update refresh_tokens');
    expect(sql).toContain("'student.anonymized'");
    expect(sql).not.toContain('delete from submissions');
    expect(query.mock.calls.at(-1)![0]).toBe('commit');
    expect(release).toHaveBeenCalled();
  });
});
