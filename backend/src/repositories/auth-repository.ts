import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

import type { UserStatus } from '../lib/actor.js';

export interface AuthUser {
  id: string;
  schoolId: string | null;
  role: 'owner' | 'teacher' | 'student';
  fullName: string;
  passwordHash: string;
  tokenVersion: number;
  isActive: boolean;
  status: UserStatus;
}

export interface RefreshRecord {
  id: string;
  userId: string;
  tokenVersion: number;
  revokedAt: Date | null;
  expiresAt: Date;
  user: AuthUser;
}

export interface AuthRepository {
  findByIdentifier(identifier: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  storeRefreshToken(
    userId: string,
    rawToken: string,
    expiresAt: Date,
    deviceLabel?: string,
  ): Promise<void>;
  findRefreshToken(rawToken: string): Promise<RefreshRecord | null>;
  rotateRefreshToken(
    recordId: string,
    userId: string,
    rawToken: string,
    expiresAt: Date,
  ): Promise<void>;
  revokeRefreshToken(rawToken: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  redeemInvite(input: {
    code: string;
    fullName: string;
    username: string;
    passwordHash: string;
  }): Promise<AuthUser>;
  createPendingStudent(input: {
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<AuthUser>;
  changePassword(userId: string, passwordHash: string): Promise<void>;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const mapUser = (row: Record<string, unknown>): AuthUser => ({
  id: String(row.id),
  schoolId: row.school_id ? String(row.school_id) : null,
  role: row.role as AuthUser['role'],
  fullName: String(row.full_name),
  passwordHash: String(row.password_hash),
  tokenVersion: Number(row.token_version),
  isActive: Boolean(row.is_active),
  status: (row.status as UserStatus) ?? 'active',
});

export class PgAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async findByIdentifier(identifier: string) {
    const result = await this.pool.query(
      `select * from users
       where is_active = true and (lower(email) = lower($1) or lower(username) = lower($1))
       limit 1`,
      [identifier],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findById(id: string) {
    const result = await this.pool.query(
      'select * from users where id = $1 and is_active = true limit 1',
      [id],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async storeRefreshToken(userId: string, rawToken: string, expiresAt: Date, deviceLabel?: string) {
    await this.pool.query(
      `insert into refresh_tokens (user_id, token_hash, expires_at, device_label)
       values ($1, $2, $3, $4)`,
      [userId, hashToken(rawToken), expiresAt, deviceLabel ?? null],
    );
  }

  async findRefreshToken(rawToken: string) {
    const result = await this.pool.query(
      `select rt.id as refresh_id, rt.user_id, rt.revoked_at, rt.expires_at, u.*
       from refresh_tokens rt join users u on u.id = rt.user_id
       where rt.token_hash = $1 limit 1`,
      [hashToken(rawToken)],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.refresh_id),
      userId: String(row.user_id),
      tokenVersion: Number(row.token_version),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
      expiresAt: new Date(row.expires_at),
      user: mapUser(row),
    };
  }

  async rotateRefreshToken(recordId: string, userId: string, rawToken: string, expiresAt: Date) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const revoked = await client.query(
        'update refresh_tokens set revoked_at = now() where id = $1 and revoked_at is null returning id',
        [recordId],
      );
      if (!revoked.rowCount) throw new Error('refresh_already_used');
      await this.insertRefresh(client, userId, rawToken, expiresAt);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeRefreshToken(rawToken: string) {
    await this.pool.query(
      'update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where token_hash = $1',
      [hashToken(rawToken)],
    );
  }

  async revokeAllSessions(userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        'update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1',
        [userId],
      );
      await client.query('update users set token_version = token_version + 1 where id = $1', [
        userId,
      ]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLastLogin(userId: string) {
    await this.pool.query('update users set last_login_at = now() where id = $1', [userId]);
  }

  async redeemInvite(input: {
    code: string;
    fullName: string;
    username: string;
    passwordHash: string;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const invite = await client.query(
        `select i.*, c.school_id from invites i join classes c on c.id=i.class_id
         where i.code=$1 and i.expires_at>now() and i.used_count<i.max_uses for update`,
        [input.code],
      );
      if (!invite.rowCount) throw new Error('invite_invalid');
      const row = invite.rows[0];
      const created = await client.query(
        `insert into users(school_id,role,full_name,username,password_hash)
         values($1,$2,$3,$4,$5) returning *`,
        [row.school_id, row.role, input.fullName, input.username, input.passwordHash],
      );
      await client.query(
        `insert into enrollments(class_id,student_id) select $1,$2 where $3='student'`,
        [row.class_id, created.rows[0].id, row.role],
      );
      await client.query(
        `insert into class_teachers(class_id,teacher_id) select $1,$2 where $3='teacher'`,
        [row.class_id, created.rows[0].id, row.role],
      );
      await client.query('update invites set used_count=used_count+1 where id=$1', [row.id]);
      await client.query('commit');
      return mapUser(created.rows[0]);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Self-registered students carry no school and no enrollment until a teacher
   * assigns them, so every class-scoped query returns nothing for them meanwhile.
   */
  async createPendingStudent(input: { fullName: string; email: string; passwordHash: string }) {
    const result = await this.pool.query(
      `insert into users (role, full_name, email, password_hash, status)
       values ('student', $1, $2, $3, 'pending')
       returning *`,
      [input.fullName, input.email, input.passwordHash],
    );
    return mapUser(result.rows[0]);
  }

  async changePassword(userId: string, passwordHash: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `update users set password_hash=$2,token_version=token_version+1,updated_at=now()where id=$1`,
        [userId, passwordHash],
      );
      await client.query(
        `update refresh_tokens set revoked_at=coalesce(revoked_at,now())where user_id=$1`,
        [userId],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertRefresh(
    client: PoolClient,
    userId: string,
    rawToken: string,
    expiresAt: Date,
  ) {
    await client.query(
      'insert into refresh_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)',
      [userId, hashToken(rawToken), expiresAt],
    );
  }
}
