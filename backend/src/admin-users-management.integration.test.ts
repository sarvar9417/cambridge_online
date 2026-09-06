import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { config } from './config.js';
import { MemoryAuthRepository } from './repositories/auth-repository.memory.js';
import { AuthService } from './services/auth-service.js';
import type { AdminUsersService, ManagedUser } from './services/admin-users-service.js';

const OWNER_ID = '22605ad7-b3df-4249-9b58-052f5d830fd8';
const TARGET_ID = 'a3b08f8b-0d6d-4f5e-88db-29f084166255';
const SCHOOL_ID = '3b55a939-fba8-48f3-b54a-68949aa6e898';
const CLASS_ID = 'f0c8f1cb-9a5c-4f5b-9a45-3f9b0f4b2d11';

const managedUser = (overrides: Partial<ManagedUser> = {}): ManagedUser => ({
  id: TARGET_ID,
  schoolId: SCHOOL_ID,
  fullName: 'Aziza Karimova',
  email: 'aziza@maktab.uz',
  username: 'aziza',
  role: 'student',
  status: 'active',
  statusReason: null,
  emailVerified: true,
  note: null,
  createdAt: new Date('2026-09-01T08:00:00Z'),
  lastLoginAt: null,
  memberships: [],
  ...overrides,
});

function managementDouble() {
  const user = managedUser();
  return {
    listUsers: vi.fn(async () => ({ users: [user], total: 1 })),
    getUser: vi.fn(async () => user),
    createUser: vi.fn(async (_actor, input) => managedUser({
      id: randomUUID(),
      fullName: input.fullName,
      email: input.email ?? null,
      username: input.username ?? null,
      role: input.role,
    })),
    updateUser: vi.fn(async (_actor, _id, input) => managedUser({
      fullName: input.fullName ?? user.fullName,
      email: input.email === undefined ? user.email : input.email,
      username: input.username === undefined ? user.username : input.username,
    })),
    setPassword: vi.fn(async () => ({ ok: true })),
    revokeSessions: vi.fn(async () => ({ ok: true })),
    setStatus: vi.fn(async (_actor, _id, status, reason) => managedUser({ status, statusReason: reason ?? null })),
    setRole: vi.fn(async (_actor, _id, role) => managedUser({ role })),
    assignClass: vi.fn(async () => managedUser({ memberships: [{
      classId: CLASS_ID, className: '9618/1A', kind: 'student', groupId: null, groupName: null,
    }] })),
    removeClass: vi.fn(async () => user),
    listAudit: vi.fn(async () => [{
      id: randomUUID(), action: 'admin.user_role_change', before: { role: 'student' },
      after: { role: 'teacher' }, actorId: OWNER_ID, actorName: 'Sarvar', createdAt: new Date(),
    }]),
    purgeUser: vi.fn(async () => ({ deleted: true, transferredReferences: 2, clearedReferences: 3 })),
    recordAction: vi.fn(async () => undefined),
  };
}

describe('complete admin user management routes', () => {
  let repository: MemoryAuthRepository;
  let management: ReturnType<typeof managementDouble>;
  let app: ReturnType<typeof createApp>;

  const token = async (role: 'owner' | 'teacher' | 'student' = 'owner', id = OWNER_ID) =>
    new SignJWT({ role, schoolId: SCHOOL_ID, tv: 1 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(id)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(config.JWT_SECRET));

  beforeEach(() => {
    repository = new MemoryAuthRepository();
    repository.add({
      id: OWNER_ID,
      schoolId: SCHOOL_ID,
      role: 'owner',
      fullName: 'Sarvar',
      passwordHash: 'unused-in-this-test',
      email: 'sarvar@maktab.uz',
      username: 'sarvar',
    });
    repository.add({
      id: TARGET_ID,
      schoolId: SCHOOL_ID,
      role: 'student',
      fullName: 'Aziza Karimova',
      passwordHash: 'unused-in-this-test',
      email: 'aziza@maktab.uz',
      username: 'aziza',
    });
    management = managementDouble();
    app = createApp(
      new AuthService(repository),
      undefined,
      undefined,
      repository,
      undefined,
      management as unknown as AdminUsersService,
    );
  });

  it('passes search, role and paging filters to the richer owner list', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users?status=active&role=student&q=aziza&limit=25&offset=10')
      .set('authorization', `Bearer ${await token()}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.users[0]).toMatchObject({ role: 'student', fullName: 'Aziza Karimova' });
    expect(management.listUsers).toHaveBeenCalledWith(expect.objectContaining({ id: OWNER_ID, role: 'owner' }), {
      status: 'active', role: 'student', q: 'aziza', limit: 25, offset: 10,
    });
  });

  it('keeps full management owner-only', async () => {
    const teacherId = randomUUID();
    repository.add({
      id: teacherId, schoolId: SCHOOL_ID, role: 'teacher', fullName: 'Teacher',
      passwordHash: 'unused', username: 'teacher',
    });
    const response = await request(app)
      .post('/api/v1/admin/users')
      .set('authorization', `Bearer ${await token('teacher', teacherId)}`)
      .send({ fullName: 'New User', username: 'new-user', password: 'strong-password', role: 'student' });

    expect(response.status).toBe(403);
    expect(management.createUser).not.toHaveBeenCalled();
  });

  it('creates an active account through the existing People surface', async () => {
    const body = {
      fullName: 'New Student', email: 'new@maktab.uz', username: 'new-student',
      password: 'strong-password', role: 'student', classId: CLASS_ID,
    };
    const response = await request(app)
      .post('/api/v1/admin/users')
      .set('authorization', `Bearer ${await token()}`)
      .send(body);

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ fullName: 'New Student', role: 'student' });
    expect(response.body.user.password).toBeUndefined();
    expect(management.createUser).toHaveBeenCalledWith(expect.objectContaining({ id: OWNER_ID }), body);
  });

  it('lets an owner set a password and revoke every existing session', async () => {
    const password = await request(app)
      .post(`/api/v1/admin/users/${TARGET_ID}/password`)
      .set('authorization', `Bearer ${await token()}`)
      .send({ password: 'new-secure-password' });
    expect(password.status).toBe(204);
    expect(management.setPassword).toHaveBeenCalledWith(
      expect.objectContaining({ id: OWNER_ID }), TARGET_ID, 'new-secure-password',
    );

    const revoke = await request(app)
      .post(`/api/v1/admin/users/${TARGET_ID}/revoke-sessions`)
      .set('authorization', `Bearer ${await token()}`)
      .send({});
    expect(revoke.status).toBe(204);
    expect(management.revokeSessions).toHaveBeenCalledWith(expect.objectContaining({ id: OWNER_ID }), TARGET_ID);
  });

  it('uses the richer service for role, status, class placement and audit', async () => {
    expect((await request(app)
      .post(`/api/v1/admin/users/${TARGET_ID}/role`)
      .set('authorization', `Bearer ${await token()}`)
      .send({ role: 'teacher' })).status).toBe(200);
    expect(management.setRole).toHaveBeenCalledWith(expect.objectContaining({ id: OWNER_ID }), TARGET_ID, 'teacher');

    expect((await request(app)
      .post(`/api/v1/admin/users/${TARGET_ID}/status`)
      .set('authorization', `Bearer ${await token()}`)
      .send({ status: 'suspended', reason: 'Ta’til' })).status).toBe(200);
    expect(management.setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: OWNER_ID }), TARGET_ID, 'suspended', 'Ta’til',
    );

    expect((await request(app)
      .post(`/api/v1/admin/users/${TARGET_ID}/classes`)
      .set('authorization', `Bearer ${await token()}`)
      .send({ classId: CLASS_ID })).status).toBe(200);
    expect(management.assignClass).toHaveBeenCalledWith(
      expect.objectContaining({ id: OWNER_ID }), TARGET_ID, CLASS_ID, undefined,
    );

    const audit = await request(app)
      .get(`/api/v1/admin/users/${TARGET_ID}/audit`)
      .set('authorization', `Bearer ${await token()}`);
    expect(audit.status).toBe(200);
    expect(audit.body.events).toHaveLength(1);
  });

  it('protects the owner from self-lockout and requires an explicit purge confirmation', async () => {
    const selfRole = await request(app)
      .post(`/api/v1/admin/users/${OWNER_ID}/role`)
      .set('authorization', `Bearer ${await token()}`)
      .send({ role: 'student' });
    expect(selfRole.status).toBe(409);
    expect(selfRole.body.error.code).toBe('cannot_change_self');
    expect(management.setRole).not.toHaveBeenCalled();

    const badPurge = await request(app)
      .post(`/api/v1/admin/users/${TARGET_ID}/purge`)
      .set('authorization', `Bearer ${await token()}`)
      .send({ confirm: 'yes' });
    expect(badPurge.status).toBe(400);
    expect(management.purgeUser).not.toHaveBeenCalled();

    const purge = await request(app)
      .post(`/api/v1/admin/users/${TARGET_ID}/purge`)
      .set('authorization', `Bearer ${await token()}`)
      .send({ confirm: 'DELETE' });
    expect(purge.status).toBe(200);
    expect(purge.body).toMatchObject({ deleted: true, transferredReferences: 2, clearedReferences: 3 });
    expect(management.purgeUser).toHaveBeenCalledWith(expect.objectContaining({ id: OWNER_ID }), TARGET_ID);
  });
});
