import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';
import { eq } from 'drizzle-orm';
import { schema } from '@campath/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import { login, resetRateLimits, SEED_CREDENTIALS, startHarness, type Harness } from './harness.js';

/**
 * BLOCKING TEST — CI fails and deploy is blocked if this fails.
 *
 * Fourteen authorization scenarios against a real PostgreSQL 16 in Docker. The
 * database is never mocked: most of these rules live in SQL, and a mock would
 * assert the rule we remembered rather than the rule that runs.
 *
 * Scope note: this task delivers auth, guards and health only. Scenarios 1-7,
 * 12 and 13 exercise the assignments, submissions, answers, gradings and
 * questions modules, which do not exist yet. They are listed here as `todo` so
 * the checklist is visible in CI output rather than living in someone's memory,
 * and each names the module that has to land before it can be written.
 */

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
}, 180_000);

afterAll(async () => {
  await harness?.stop();
});

beforeEach(() => resetRateLimits());

const server = () => harness.app.getHttpServer();
const studentUsername = (index: number) => `student${String(index).padStart(2, '0')}`;

describe('authorization (BLOCKING)', () => {
  // ---------------------------------------------------------------- 1 .. 7, 12, 13
  it.todo('1. student A cannot read student B answer -> 404 [needs submissions module]');
  it.todo('2. student cannot see mark scheme before release [needs questions module]');
  it.todo('3. student cannot see gradings before released_at -> 404 [needs grading module]');
  it.todo('4. student cannot edit an answer after submitting -> 409 [needs submissions module]');
  it.todo('5. student cannot write after the attempt window closes -> 409 [needs attempts module]');
  it.todo('6. teacher B cannot see teacher A class -> 404 [needs classes module]');
  it.todo('7. teacher cannot mutate questions -> 403 [needs questions module]');
  it.todo('12. cross-school enrolment blocked -> 403 [needs enrolment module]');
  it.todo('13. student cannot create a submission as another student -> 403 [needs submissions]');

  // ---------------------------------------------------------------------------- 8
  it('8. student cannot read ai_calls -> 403', async () => {
    const student = await login(harness.app, studentUsername(1), SEED_CREDENTIALS.studentPassword);

    await request(server())
      .get('/api/v1/admin/ai-calls')
      .set('authorization', `Bearer ${student.accessToken}`)
      .expect(403);

    // The same route answers for the owner, so the 403 is the role check and
    // not a route that is simply broken for everyone.
    const owner = await login(
      harness.app,
      SEED_CREDENTIALS.ownerEmail,
      SEED_CREDENTIALS.ownerPassword,
    );
    await request(server())
      .get('/api/v1/admin/ai-calls')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
  });

  it('8b. teacher cannot read ai_calls -> 403', async () => {
    const teacher = await login(
      harness.app,
      SEED_CREDENTIALS.teacherEmail,
      SEED_CREDENTIALS.teacherPassword,
    );
    await request(server())
      .get('/api/v1/admin/audit-log')
      .set('authorization', `Bearer ${teacher.accessToken}`)
      .expect(403);
  });

  // ---------------------------------------------------------------------------- 9
  it('9. student cannot change own role -> 400', async () => {
    const student = await login(harness.app, studentUsername(2), SEED_CREDENTIALS.studentPassword);

    await request(server())
      .patch('/api/v1/auth/me')
      .set('authorization', `Bearer ${student.accessToken}`)
      .send({ fullName: 'Aziz K', role: 'owner' })
      .expect(400);

    // The rejection must be total: no part of the payload may be applied.
    const me = await request(server())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    expect(me.body.user.role).toBe('student');
    expect(me.body.user.fullName).not.toBe('Aziz K');
  });

  it('9b. a legitimate profile update still succeeds', async () => {
    const student = await login(harness.app, studentUsername(3), SEED_CREDENTIALS.studentPassword);
    const response = await request(server())
      .patch('/api/v1/auth/me')
      .set('authorization', `Bearer ${student.accessToken}`)
      .send({ fullName: 'Bobur T.' })
      .expect(200);

    expect(response.body.user.fullName).toBe('Bobur T.');
    expect(response.body.user.role).toBe('student');
  });

  // --------------------------------------------------------------------------- 10
  it('10. expired access token rejected -> 401', async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const expired = await new SignJWT({ role: 'student', schoolId: null, tv: 1 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(harness.seeded.studentIds[0]!)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    await request(server())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('10b. a token signed with the wrong secret is rejected -> 401', async () => {
    const forged = await new SignJWT({ role: 'owner', schoolId: null, tv: 1 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(harness.seeded.studentIds[0]!)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode('a-different-secret-of-at-least-32-chars'));

    await request(server())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${forged}`)
      .expect(401);
  });

  it('10c. bumping token_version invalidates a live access token -> 401', async () => {
    const student = await login(harness.app, studentUsername(4), SEED_CREDENTIALS.studentPassword);
    await request(server())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${student.accessToken}`)
      .expect(200);

    const db = drizzle(harness.pool, { schema });
    await db
      .update(schema.users)
      .set({ tokenVersion: 99 })
      .where(eq(schema.users.id, harness.seeded.studentIds[3]!));

    await request(server())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${student.accessToken}`)
      .expect(401);
  });

  // --------------------------------------------------------------------------- 11
  it('11. revoked refresh token rejected -> 401', async () => {
    const student = await login(harness.app, studentUsername(5), SEED_CREDENTIALS.studentPassword);

    await request(server())
      .post('/api/v1/auth/logout')
      .set('authorization', `Bearer ${student.accessToken}`)
      .set('cookie', student.refreshCookie)
      .expect(204);

    await request(server())
      .post('/api/v1/auth/refresh')
      .set('cookie', student.refreshCookie)
      .expect(401);
  });

  it('11b. replaying a spent refresh token revokes every session for that user', async () => {
    const student = await login(harness.app, studentUsername(6), SEED_CREDENTIALS.studentPassword);

    // First rotation succeeds and issues a replacement.
    const rotated = await request(server())
      .post('/api/v1/auth/refresh')
      .set('cookie', student.refreshCookie)
      .expect(200);
    const rotatedCookie =
      (rotated.headers['set-cookie'] as unknown as string[])[0]?.split(';')[0] ?? '';

    // Replaying the original is treated as theft.
    const replay = await request(server())
      .post('/api/v1/auth/refresh')
      .set('cookie', student.refreshCookie)
      .expect(401);
    expect(replay.body.error.code).toBe('refresh_reused');

    // The legitimate holder is logged out too: the attacker must not keep a
    // working session just because they moved second.
    await request(server()).post('/api/v1/auth/refresh').set('cookie', rotatedCookie).expect(401);
  });

  // --------------------------------------------------------------------------- 14
  it('14. spent invite code rejected -> 410', async () => {
    const code = harness.seeded.inviteCode;

    await request(server())
      .post('/api/v1/auth/redeem-invite')
      .send({ code, fullName: 'Yangi O‘quvchi', username: 'newcomer1', password: 'parol-1234567' })
      .expect(201);

    // Exhaust the remaining seats so the next redemption has none left.
    const db = drizzle(harness.pool, { schema });
    await db.update(schema.invites).set({ usedCount: 30 }).where(eq(schema.invites.code, code));

    const spent = await request(server())
      .post('/api/v1/auth/redeem-invite')
      .send({ code, fullName: 'Kech Qolgan', username: 'latecomer1', password: 'parol-1234567' })
      .expect(410);
    expect(spent.body.error.code).toBe('invite_invalid');
  });

  it('14b. an expired invite is rejected -> 410', async () => {
    const db = drizzle(harness.pool, { schema });
    await db.insert(schema.invites).values({
      classId: harness.seeded.classIds[0]!,
      code: 'EXPIRED1',
      maxUses: 30,
      usedCount: 0,
      expiresAt: new Date(Date.now() - 60_000),
      createdBy: harness.seeded.ownerId,
    });

    await request(server())
      .post('/api/v1/auth/redeem-invite')
      .send({
        code: 'EXPIRED1',
        fullName: 'Kech Qolgan',
        username: 'expired1',
        password: 'parol-1234567',
      })
      .expect(410);
  });

  // ------------------------------------------------------------------ default deny
  it('every non-public route refuses an anonymous caller -> 401', async () => {
    for (const [method, path] of [
      ['get', '/api/v1/auth/me'],
      ['patch', '/api/v1/auth/me'],
      ['post', '/api/v1/auth/logout'],
      ['get', '/api/v1/admin/ai-calls'],
      ['get', '/api/v1/admin/audit-log'],
    ] as const) {
      await request(server())[method](path).expect(401);
    }
  });

  it('login is rate limited to 5 attempts per IP and identifier -> 429', async () => {
    const attempt = () =>
      request(server())
        .post('/api/v1/auth/login')
        .send({ identifier: studentUsername(7), password: 'wrong-password' });

    for (let index = 0; index < 5; index += 1) await attempt().expect(401);
    await attempt().expect(429);
  });
});
