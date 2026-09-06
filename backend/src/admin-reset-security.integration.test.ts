import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config.js';
import { MemoryAuthRepository } from './repositories/auth-repository.memory.js';
import { AuthService } from './services/auth-service.js';

const SCHOOL_ID = '3b55a939-fba8-48f3-b54a-68949aa6e898';
const OTHER_SCHOOL_ID = 'd4ae761e-1972-45c0-a949-511ad17c0778';
const OWNER_ID = '22605ad7-b3df-4249-9b58-052f5d830fd8';
const TEACHER_ID = '8d907a2a-a7cf-45db-abab-ff14df3ea222';
const STUDENT_ID = 'a3b08f8b-0d6d-4f5e-88db-29f084166255';
const OTHER_STUDENT_ID = 'b8cb2a52-6ab5-4aaf-965a-56a6c6732875';

const passwordHash = 'unused-in-reset-route-tests';

describe('admin reset-link authorization boundaries', () => {
  let repository: MemoryAuthRepository;
  let app: ReturnType<typeof createApp>;

  const token = async (
    id: string,
    role: 'owner' | 'teacher' | 'student',
    schoolId = SCHOOL_ID,
  ) => new SignJWT({ role, schoolId, tv: 1 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(config.JWT_SECRET));

  beforeEach(() => {
    repository = new MemoryAuthRepository();
    repository.add({
      id: OWNER_ID, schoolId: SCHOOL_ID, role: 'owner', fullName: 'Owner',
      username: 'owner', passwordHash,
    });
    repository.add({
      id: TEACHER_ID, schoolId: SCHOOL_ID, role: 'teacher', fullName: 'Teacher',
      username: 'teacher', passwordHash,
    });
    repository.add({
      id: STUDENT_ID, schoolId: SCHOOL_ID, role: 'student', fullName: 'Student',
      username: 'student', passwordHash,
    });
    repository.add({
      id: OTHER_STUDENT_ID, schoolId: OTHER_SCHOOL_ID, role: 'student', fullName: 'Other Student',
      username: 'other-student', passwordHash,
    });
    app = createApp(new AuthService(repository), undefined, undefined, repository);
  });

  it('allows an owner to issue a reset link for an active same-school student', async () => {
    const response = await request(app)
      .post(`/api/v1/admin/users/${STUDENT_ID}/reset-code`)
      .set('authorization', `Bearer ${await token(OWNER_ID, 'owner')}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.link).toContain('/reset-password?token=');
    expect(repository.resetTokens).toHaveLength(1);
    expect(repository.resetTokens[0]?.userId).toBe(STUDENT_ID);
    expect(repository.resetTokens[0]?.issuedBy).toBe(OWNER_ID);
  });

  it('allows a teacher to issue a reset link only for a same-school student', async () => {
    const response = await request(app)
      .post(`/api/v1/admin/users/${STUDENT_ID}/reset-code`)
      .set('authorization', `Bearer ${await token(TEACHER_ID, 'teacher')}`)
      .send({});

    expect(response.status).toBe(200);
    expect(repository.resetTokens[0]?.issuedBy).toBe(TEACHER_ID);
  });

  it('does not let a teacher reset staff credentials', async () => {
    for (const targetId of [OWNER_ID, TEACHER_ID]) {
      const response = await request(app)
        .post(`/api/v1/admin/users/${targetId}/reset-code`)
        .set('authorization', `Bearer ${await token(TEACHER_ID, 'teacher')}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('teacher_reset_forbidden');
    }
    expect(repository.resetTokens).toHaveLength(0);
  });

  it('does not reveal or reset an active user from another school', async () => {
    const teacherResponse = await request(app)
      .post(`/api/v1/admin/users/${OTHER_STUDENT_ID}/reset-code`)
      .set('authorization', `Bearer ${await token(TEACHER_ID, 'teacher')}`)
      .send({});
    expect(teacherResponse.status).toBe(404);
    expect(teacherResponse.body.error.code).toBe('user_not_found');

    const ownerResponse = await request(app)
      .post(`/api/v1/admin/users/${OTHER_STUDENT_ID}/reset-code`)
      .set('authorization', `Bearer ${await token(OWNER_ID, 'owner')}`)
      .send({});
    expect(ownerResponse.status).toBe(404);
    expect(ownerResponse.body.error.code).toBe('user_not_found');
    expect(repository.resetTokens).toHaveLength(0);
  });

  it('does not disclose that an inactive user exists in another school', async () => {
    const inactiveId = randomUUID();
    repository.add({
      id: inactiveId, schoolId: OTHER_SCHOOL_ID, role: 'student', fullName: 'Other Suspended Student',
      username: 'other-suspended', passwordHash, status: 'suspended',
    });

    const response = await request(app)
      .post(`/api/v1/admin/users/${inactiveId}/reset-code`)
      .set('authorization', `Bearer ${await token(OWNER_ID, 'owner')}`)
      .send({});

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('user_not_found');
    expect(repository.resetTokens).toHaveLength(0);
  });

  it('returns the inactive-state response for a same-school suspended account without issuing a token', async () => {
    const inactiveId = randomUUID();
    repository.add({
      id: inactiveId, schoolId: SCHOOL_ID, role: 'student', fullName: 'Suspended Student',
      username: 'suspended', passwordHash, status: 'suspended',
    });

    const response = await request(app)
      .post(`/api/v1/admin/users/${inactiveId}/reset-code`)
      .set('authorization', `Bearer ${await token(OWNER_ID, 'owner')}`)
      .send({});

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('user_not_active');
    expect(repository.resetTokens).toHaveLength(0);
  });
});
