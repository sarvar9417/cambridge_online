import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { AssignmentsService } from './assignments-service.js';

const student: Actor = { id: 'student', role: 'student', schoolId: null, fullName: 'QA learner' };
const databaseNow = new Date('2026-09-30T08:00:10Z');
const makeService = (assignment: Record<string, unknown> = {}) => {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('select a.*,existing.late_granted_until')) return { rows: [{
      opens_at: databaseNow, due_at: null, time_limit_min: null, server_now: databaseNow, ...assignment,
    }] };
    if (sql.includes('insert into submissions')) return { rows: [{ id: 'submission', status: 'in_progress', started_at: databaseNow, time_extension_min: 0 }] };
    return { rows: [], rowCount: 0 };
  });
  return { service: new AssignmentsService({ connect: async () => ({ query, release: vi.fn() }) } as unknown as Pool), query };
};

describe('Assignment database clock', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-30T08:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  it('rejects a classmate attempting to open another learner’s private practice', async () => {
    const { service, query } = makeService({ mode: 'practice', created_by: 'another-student' });
    await expect(service.start(student, 'assignment')).rejects.toMatchObject({ code: 'not_found', status: 404 });
    expect(query.mock.calls.some(([sql]) => sql.includes('insert into submissions'))).toBe(false);
    expect(query.mock.calls.at(-1)?.[0]).toBe('rollback');
  });

  it('allows the creator to open their private practice', async () => {
    const { service } = makeService({ mode: 'practice', created_by: student.id });
    await expect(service.start(student, 'assignment')).resolves.toHaveProperty('submissionId');
  });

  it('opens a newly created assignment immediately when the API clock is behind', async () => {
    const { service } = makeService();
    const attempt = await service.start(student, 'assignment', 'session');
    expect(attempt.serverNow).toEqual(databaseNow);
  });

  it('does not open a future assignment when the API clock is ahead', async () => {
    vi.setSystemTime(new Date('2026-09-30T09:00:00Z'));
    const { service } = makeService({ opens_at: new Date('2026-09-30T08:30:00Z') });
    await expect(service.start(student, 'assignment')).rejects.toMatchObject({ code: 'assignment_not_open' });
  });

  it('closes a past-due assignment using the same clock as the stored deadline', async () => {
    const { service } = makeService({ opens_at: null, due_at: new Date('2026-09-30T08:00:05Z'), allow_late: false });
    await expect(service.start(student, 'assignment')).rejects.toMatchObject({ code: 'assignment_closed' });
  });

  it('honours a late grant that is still valid on the database clock', async () => {
    vi.setSystemTime(new Date('2026-09-30T09:00:00Z'));
    const { service } = makeService({ due_at: new Date('2026-09-30T08:00:05Z'), allow_late: false, late_granted_until: new Date('2026-09-30T08:30:00Z') });
    await expect(service.start(student, 'assignment')).resolves.toHaveProperty('submissionId', 'submission');
  });

  it('rejects a late answer even when the API clock has not reached the deadline', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ status: 'in_progress', due_at: new Date('2026-09-30T07:59:55Z'), server_now: databaseNow }] });
    await expect(new AssignmentsService({ query } as unknown as Pool).saveAnswer(student, 'submission', 'question', 'answer')).rejects.toMatchObject({ code: 'time_expired' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns a heartbeat consistent with the database deadline', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ status: 'in_progress', active_session_id: 'session', due_at: new Date('2026-09-30T08:01:10Z'), server_now: databaseNow }] });
    const result = await new AssignmentsService({ query } as unknown as Pool).heartbeat(student, 'submission', 'session');
    expect(result.remainingSeconds).toBe(60);
    expect(result.serverNow).toEqual(databaseNow);
  });
});
