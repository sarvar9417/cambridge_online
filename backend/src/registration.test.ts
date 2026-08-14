import argon2 from 'argon2';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from './lib/actor.js';
import { requireActiveAccount } from './middleware/auth.js';
import { createAuthRouter } from './routes/auth.js';
import { AuthService } from './services/auth-service.js';
import { EnrolmentService } from './services/enrolment-service.js';
import { clearRateLimits } from './middleware/rate-limit.js';
import type { AuthRepository, AuthUser } from './repositories/auth-repository.js';

const pendingUser: AuthUser = {
  id: 'student-1',
  schoolId: null,
  role: 'student',
  fullName: 'Dilshod Nazarov',
  passwordHash: 'hash',
  tokenVersion: 1,
  isActive: true,
  status: 'pending',
};

function stubRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findByIdentifier: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    storeRefreshToken: vi.fn().mockResolvedValue(undefined),
    findRefreshToken: vi.fn().mockResolvedValue(null),
    rotateRefreshToken: vi.fn().mockResolvedValue(undefined),
    revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
    revokeAllSessions: vi.fn().mockResolvedValue(undefined),
    updateLastLogin: vi.fn().mockResolvedValue(undefined),
    redeemInvite: vi.fn(),
    createPendingStudent: vi.fn().mockResolvedValue(pendingUser),
    changePassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function authApp(repository: AuthRepository) {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(new AuthService(repository)));
  return app;
}

const staff: Actor = {
  id: 'teacher-1',
  role: 'teacher',
  schoolId: 'school-1',
  fullName: 'Teacher',
  status: 'active',
};

describe('student self-registration', () => {
  beforeEach(() => clearRateLimits());

  it('creates a pending student and signs them in', async () => {
    const createPendingStudent = vi.fn().mockResolvedValue(pendingUser);
    const response = await request(authApp(stubRepository({ createPendingStudent })))
      .post('/auth/register')
      .send({ fullName: 'Dilshod Nazarov', email: 'Dilshod@Example.com', password: 'parol12345' });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ role: 'student', status: 'pending' });
    expect(response.body.accessToken).toBeTypeOf('string');
    // The email is normalised before it reaches the database.
    expect(createPendingStudent).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'dilshod@example.com' }),
    );
  });

  it('never lets a registration pick its own role or school', async () => {
    const createPendingStudent = vi.fn().mockResolvedValue(pendingUser);
    await request(authApp(stubRepository({ createPendingStudent })))
      .post('/auth/register')
      .send({
        fullName: 'Dilshod Nazarov',
        email: 'd@example.com',
        password: 'parol12345',
        role: 'owner',
        schoolId: 'school-1',
        status: 'active',
      });

    expect(createPendingStudent).toHaveBeenCalledWith({
      fullName: 'Dilshod Nazarov',
      email: 'd@example.com',
      passwordHash: expect.any(String),
    });
  });

  it('rejects a duplicate email with 409', async () => {
    const createPendingStudent = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error(), { code: '23505' }));
    const response = await request(authApp(stubRepository({ createPendingStudent })))
      .post('/auth/register')
      .send({ fullName: 'Dilshod', email: 'taken@example.com', password: 'parol12345' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('email_taken');
  });

  it('rejects a weak password', async () => {
    const response = await request(authApp(stubRepository()))
      .post('/auth/register')
      .send({ fullName: 'Dilshod', email: 'd@example.com', password: 'qisqa' });
    expect(response.status).toBe(400);
  });

  it('rate limits registration per IP', async () => {
    const app = authApp(stubRepository());
    const send = () =>
      request(app)
        .post('/auth/register')
        .send({ fullName: 'Dilshod', email: 'd@example.com', password: 'parol12345' });
    for (let attempt = 0; attempt < 5; attempt += 1) await send();
    expect((await send()).status).toBe(429);
  });

  it('refuses login for a suspended account', async () => {
    const passwordHash = await argon2.hash('parol12345', { type: argon2.argon2id });
    const repository = stubRepository({
      findByIdentifier: vi
        .fn()
        .mockResolvedValue({ ...pendingUser, passwordHash, status: 'suspended' }),
    });
    const response = await request(authApp(repository))
      .post('/auth/login')
      .send({ identifier: 'd@example.com', password: 'parol12345' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('account_suspended');
  });
});

describe('requireActiveAccount', () => {
  const appWith = (actor: Actor) => {
    const app = express();
    app.use((req, _res, next) => {
      req.actor = actor;
      next();
    });
    app.use(requireActiveAccount);
    app.get('/x', (_req, res) => res.sendStatus(204));
    return app;
  };

  it('blocks a pending account with an actionable code', async () => {
    const response = await request(appWith({ ...staff, role: 'student', status: 'pending' })).get(
      '/x',
    );
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('account_pending');
  });

  it('blocks a suspended account', async () => {
    const response = await request(appWith({ ...staff, status: 'suspended' })).get('/x');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('account_suspended');
  });

  it('lets an active account through', async () => {
    expect((await request(appWith(staff)).get('/x')).status).toBe(204);
  });
});

describe('EnrolmentService', () => {
  const transactionPool = (queries: Array<{ rowCount: number; rows: any[] }>) => {
    const query = vi.fn();
    for (const result of queries) query.mockResolvedValueOnce(result);
    query.mockResolvedValue({ rowCount: 1, rows: [{}] });
    const release = vi.fn();
    return {
      pool: { connect: vi.fn().mockResolvedValue({ query, release }), query } as unknown as Pool,
      query,
      release,
    };
  };

  it('activates the student and enrols them in one transaction', async () => {
    const { pool, query, release } = transactionPool([
      { rowCount: 0, rows: [] }, // begin
      { rowCount: 1, rows: [{ id: 'class-1', school_id: 'school-1' }] }, // class scope
      { rowCount: 1, rows: [{ id: 'student-1', status: 'pending' }] }, // student lock
      { rowCount: 1, rows: [{}] }, // group belongs to class
    ]);

    const result = await new EnrolmentService(pool).assignStudent(staff, 'student-1', {
      classId: 'class-1',
      groupId: 'group-1',
    });

    expect(result).toEqual({
      studentId: 'student-1',
      classId: 'class-1',
      groupId: 'group-1',
      status: 'active',
    });
    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toBe('begin');
    expect(statements.some((sql) => sql.includes('insert into enrollments'))).toBe(true);
    expect(statements.some((sql) => sql.includes("set status = 'active'"))).toBe(true);
    expect(statements.some((sql) => sql.includes('audit_log'))).toBe(true);
    expect(statements.at(-1)).toBe('commit');
    expect(release).toHaveBeenCalled();
  });

  it('rolls back and 404s when the class is outside the actor scope', async () => {
    const { pool, query } = transactionPool([
      { rowCount: 0, rows: [] }, // begin
      { rowCount: 0, rows: [] }, // class scope misses
    ]);

    await expect(
      new EnrolmentService(pool).assignStudent(staff, 'student-1', { classId: 'other-class' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(query.mock.calls.map(([sql]) => String(sql))).toContain('rollback');
  });

  it('rejects a group that belongs to another class', async () => {
    const { pool } = transactionPool([
      { rowCount: 0, rows: [] },
      { rowCount: 1, rows: [{ id: 'class-1', school_id: 'school-1' }] },
      { rowCount: 1, rows: [{ id: 'student-1', status: 'pending' }] },
      { rowCount: 0, rows: [] }, // group not in this class
    ]);

    await expect(
      new EnrolmentService(pool).assignStudent(staff, 'student-1', {
        classId: 'class-1',
        groupId: 'foreign-group',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('refuses to let a student approve anyone', async () => {
    const { pool } = transactionPool([]);
    const student: Actor = { ...staff, role: 'student' };
    await expect(
      new EnrolmentService(pool).assignStudent(student, 'student-2', { classId: 'class-1' }),
    ).rejects.toMatchObject({ status: 403, code: 'staff_only' });
    await expect(new EnrolmentService(pool).pendingStudents(student)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('restricts suspension to the owner and rotates the token version', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rowCount: 1, rows: [{ id: 'student-1', status: 'suspended' }] });
    const pool = { query } as unknown as Pool;
    const service = new EnrolmentService(pool);

    await expect(service.setStatus(staff, 'student-1', 'suspended')).rejects.toMatchObject({
      status: 403,
      code: 'owner_only',
    });

    await service.setStatus({ ...staff, role: 'owner' }, 'student-1', 'suspended');
    expect(String(query.mock.calls[0]![0])).toContain('token_version + 1');
  });
});
