import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { AdminUsersError, AdminUsersService } from './admin-users-service.js';
import type { Actor } from '../lib/actor.js';

const owner: Actor = { id: '00000000-0000-4000-8000-000000000001', role: 'owner', schoolId: 'school-1', fullName: 'Owner' };
const teacher: Actor = { ...owner, id: '00000000-0000-4000-8000-000000000002', role: 'teacher' };
const target = '00000000-0000-4000-8000-000000000003';

function transactionalPool(handler: (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }> | { rows: Record<string, unknown>[]; rowCount: number }) {
  const statements: string[] = [];
  const params: unknown[][] = [];
  const client = {
    query: vi.fn(async (sql: string, values?: unknown[]) => {
      statements.push(sql);
      if (values) params.push(values);
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [], rowCount: 0 };
      return handler(sql, values);
    }),
    release: vi.fn(),
  } as unknown as PoolClient;
  const pool = {
    connect: vi.fn(async () => client),
    query: vi.fn(async (sql: string, values?: unknown[]) => handler(sql, values)),
  } as unknown as Pool;
  return { pool, client, statements, params };
}

const richRow = (overrides: Record<string, unknown> = {}) => ({
  id: target,
  school_id: 'school-1',
  full_name: 'Student',
  email: 'student@example.com',
  username: 'student',
  role: 'student',
  status: 'active',
  status_reason: null,
  email_verified_at: '2026-09-01T00:00:00Z',
  registration_note: null,
  created_at: '2026-09-01T00:00:00Z',
  last_login_at: null,
  memberships: [],
  ...overrides,
});

describe('AdminUsersService', () => {
  it('rejects non-owner management before touching the database', async () => {
    const { pool } = transactionalPool(() => ({ rows: [], rowCount: 0 }));
    await expect(new AdminUsersService(pool).listUsers(teacher)).rejects.toBeInstanceOf(AdminUsersError);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('suspends inside one transaction, revokes sessions and writes an audit event', async () => {
    const { pool, statements } = transactionalPool((sql) => {
      if (sql.includes('select status, status_reason')) return { rows: [{ status: 'active', status_reason: null }], rowCount: 1 };
      if (sql.includes('from users u')) return { rows: [richRow({ status: 'suspended', status_reason: 'Ta’til' })], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    const result = await new AdminUsersService(pool).setStatus(owner, target, 'suspended', 'Ta’til');
    expect(result.status).toBe('suspended');
    expect(statements[0]).toBe('begin');
    expect(statements.some((sql) => sql.includes('token_version = token_version + 1'))).toBe(true);
    expect(statements.some((sql) => sql.includes('update refresh_tokens'))).toBe(true);
    expect(statements.some((sql) => sql.includes('insert into audit_log'))).toBe(true);
    expect(statements.at(-1)).toBe('commit');
  });

  it('moving a student closes another active enrolment before opening the chosen class', async () => {
    const classId = '00000000-0000-4000-8000-000000000004';
    const { pool, statements } = transactionalPool((sql) => {
      if (sql.includes('select role from users')) return { rows: [{ role: 'student' }], rowCount: 1 };
      if (sql.includes('select school_id from classes')) return { rows: [{ school_id: 'school-1' }], rowCount: 1 };
      if (sql.includes('from users u')) return { rows: [richRow({ memberships: [{ classId, className: '11-A', kind: 'student', groupId: null, groupName: null }] })], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    const result = await new AdminUsersService(pool).assignClass(owner, target, classId);
    expect(result.memberships[0]?.classId).toBe(classId);
    expect(statements.some((sql) => sql.includes('class_id <> $2') && sql.includes('left_at'))).toBe(true);
    expect(statements.some((sql) => sql.includes('insert into enrollments'))).toBe(true);
    expect(statements.some((sql) => sql.includes('admin.user_class_assign'))).toBe(false);
    expect(statements.some((sql) => sql.includes('insert into audit_log'))).toBe(true);
  });

  it('changing a teacher into a student removes teaching links, transfers owned classes and revokes sessions', async () => {
    const { pool, statements } = transactionalPool((sql) => {
      if (sql.includes('select role from users')) return { rows: [{ role: 'teacher' }], rowCount: 1 };
      if (sql.includes('from users u')) return { rows: [richRow({ role: 'student' })], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    const result = await new AdminUsersService(pool).setRole(owner, target, 'student');
    expect(result.role).toBe('student');
    expect(statements.some((sql) => sql.includes('delete from class_teachers'))).toBe(true);
    expect(statements.some((sql) => sql.includes('update classes set owner_id'))).toBe(true);
    expect(statements.some((sql) => sql.includes('update refresh_tokens'))).toBe(true);
  });

  it('purge preserves required historical references by transferring them and clears nullable ones', async () => {
    const { pool, statements } = transactionalPool((sql) => {
      if (sql.includes('select id, school_id, full_name')) return { rows: [richRow()], rowCount: 1 };
      if (sql.includes('from pg_constraint')) return {
        rows: [
          { schema_name: 'public', table_name: 'assignments', column_name: 'created_by', attnotnull: true, confdeltype: 'a' },
          { schema_name: 'public', table_name: 'gradings', column_name: 'graded_by', attnotnull: false, confdeltype: 'a' },
          { schema_name: 'public', table_name: 'submissions', column_name: 'student_id', attnotnull: true, confdeltype: 'c' },
        ],
        rowCount: 3,
      };
      if (sql.startsWith('update "public"."assignments"')) return { rows: [], rowCount: 2 };
      if (sql.startsWith('update "public"."gradings"')) return { rows: [], rowCount: 3 };
      if (sql.includes('delete from users')) return { rows: [{ id: target }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    const result = await new AdminUsersService(pool).purgeUser(owner, target);
    expect(result).toEqual({ deleted: true, transferredReferences: 2, clearedReferences: 3 });
    expect(statements.some((sql) => sql.startsWith('update "public"."assignments"'))).toBe(true);
    expect(statements.some((sql) => sql.startsWith('update "public"."gradings"'))).toBe(true);
    expect(statements.some((sql) => sql.includes('submissions') && sql.startsWith('update'))).toBe(false);
    expect(statements.at(-1)).toBe('commit');
  });

  it('rolls back a destructive action if PostgreSQL refuses the final delete', async () => {
    const { pool, statements } = transactionalPool((sql) => {
      if (sql.includes('select id, school_id, full_name')) return { rows: [richRow()], rowCount: 1 };
      if (sql.includes('from pg_constraint')) return { rows: [], rowCount: 0 };
      if (sql.includes('delete from users')) {
        throw Object.assign(new Error('foreign key'), { code: '23503', constraint: 'some_user_fk' });
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(new AdminUsersService(pool).purgeUser(owner, target)).rejects.toMatchObject({
      code: 'user_purge_blocked', status: 409, detail: 'some_user_fk',
    });
    expect(statements.at(-1)).toBe('rollback');
  });
});
