import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export type UserStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface AuthUser {
  id: string;
  schoolId: string | null;
  role: 'owner' | 'teacher' | 'student';
  fullName: string;
  passwordHash: string;
  tokenVersion: number;
  isActive: boolean;
  status: UserStatus;
  statusReason: string | null;
}

/** A registration waiting on a decision, as the approver needs to see it. */
export interface PendingUser {
  id: string;
  fullName: string;
  email: string | null;
  username: string | null;
  status: UserStatus;
  statusReason: string | null;
  createdAt: Date;
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
  storeRefreshToken(userId: string, rawToken: string, expiresAt: Date, deviceLabel?: string): Promise<void>;
  findRefreshToken(rawToken: string): Promise<RefreshRecord | null>;
  rotateRefreshToken(recordId: string, userId: string, rawToken: string, expiresAt: Date): Promise<void>;
  revokeRefreshToken(rawToken: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  redeemInvite(input: { code:string; fullName:string; username:string; passwordHash:string }): Promise<AuthUser>;
  changePassword(userId:string,passwordHash:string):Promise<void>;
  updateProfile(userId:string,input:{fullName?:string;locale?:'uz'|'en'|'ru'}):Promise<AuthUser>;

  register(input: { fullName:string; email:string; username:string; passwordHash:string; note?:string }): Promise<PendingUser>;
  findByEmail(email: string): Promise<{ id:string; fullName:string; status:UserStatus } | null>;

  createResetToken(input: { userId:string; tokenHash:string; expiresAt:Date; issuedBy?:string }): Promise<void>;
  consumeResetToken(tokenHash: string, passwordHash: string): Promise<{ userId:string } | null>;

  listUsers(filter: { status?: UserStatus }): Promise<PendingUser[]>;
  approveUser(input: { userId:string; role:AuthUser['role']; classId?:string; approvedBy:string }): Promise<PendingUser>;
  rejectUser(input: { userId:string; reason:string; approvedBy:string }): Promise<PendingUser>;
  setUserStatus(input: { userId:string; status:'active'|'suspended'; reason?:string }): Promise<PendingUser>;
  setUserRole(input: { userId:string; role:AuthUser['role'] }): Promise<PendingUser>;
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
  // Rows written before the column existed default to 'active', which is right:
  // they got in through an invite, which was an approval.
  status: (row.status as UserStatus | undefined) ?? 'active',
  statusReason: row.status_reason ? String(row.status_reason) : null,
});

const mapPending = (row: Record<string, unknown>): PendingUser => ({
  id: String(row.id),
  fullName: String(row.full_name),
  email: row.email ? String(row.email) : null,
  username: row.username ? String(row.username) : null,
  status: (row.status as UserStatus | undefined) ?? 'active',
  statusReason: row.status_reason ? String(row.status_reason) : null,
  createdAt: new Date(String(row.created_at)),
});

export class PgAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Deliberately does not filter on status. A pending or suspended account has
   * to come back so the service can verify the password first and only then say
   * why sign-in is refused -- telling someone "awaiting approval" before they
   * have proved the password would confirm the account exists to anyone typing
   * in email addresses.
   */
  async findByIdentifier(identifier: string) {
    const result = await this.pool.query(
      `select * from users
       where is_active = true and (lower(email) = lower($1) or lower(username) = lower($1))
       limit 1`,
      [identifier],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  /**
   * Used to resolve an access token on every request, so the status check
   * belongs here: suspending an account has to end its live sessions within the
   * access token's lifetime, not at its next login.
   */
  async findById(id: string) {
    const result = await this.pool.query(
      `select * from users where id = $1 and is_active = true and status = 'active' limit 1`, [id]);
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
      'delete from refresh_tokens where token_hash = $1',
      [hashToken(rawToken)],
    );
  }

  async revokeAllSessions(userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1', [userId]);
      await client.query('update users set token_version = token_version + 1 where id = $1', [userId]);
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

  async redeemInvite(input: { code:string; fullName:string; username:string; passwordHash:string }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const invite = await client.query(
        `select i.*, c.school_id from invites i join classes c on c.id=i.class_id
         where i.code=$1 and i.expires_at>now() and i.used_count<i.max_uses for update`, [input.code],
      );
      if (!invite.rowCount) throw new Error('invite_invalid');
      const row = invite.rows[0];
      const created = await client.query(
        `insert into users(school_id,role,full_name,username,password_hash)
         values($1,$2,$3,$4,$5) returning *`,
        [row.school_id,row.role,input.fullName,input.username,input.passwordHash],
      );
      await client.query(`insert into enrollments(class_id,student_id) select $1,$2 where $3='student'`,[row.class_id,created.rows[0].id,row.role]);
      await client.query(`insert into class_teachers(class_id,teacher_id) select $1,$2 where $3='teacher'`,[row.class_id,created.rows[0].id,row.role]);
      await client.query('update invites set used_count=used_count+1 where id=$1',[row.id]);
      await client.query('commit');
      return mapUser(created.rows[0]);
    } catch(error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async changePassword(userId:string,passwordHash:string){const client=await this.pool.connect();try{await client.query('begin');await client.query(`update users set password_hash=$2,token_version=token_version+1,updated_at=now()where id=$1`,[userId,passwordHash]);await client.query(`update refresh_tokens set revoked_at=coalesce(revoked_at,now())where user_id=$1`,[userId]);await client.query('commit')}catch(error){await client.query('rollback');throw error}finally{client.release()}}

  async updateProfile(userId:string,input:{fullName?:string;locale?:'uz'|'en'|'ru'}) {
    const result=await this.pool.query(
      `update users set full_name=coalesce($2,full_name),locale=coalesce($3,locale),updated_at=now()
       where id=$1 and is_active=true returning *`,
      [userId,input.fullName??null,input.locale??null],
    );
    if(!result.rows[0])throw new Error('user_not_found');
    return mapUser(result.rows[0]);
  }

  async register(input: { fullName:string; email:string; username:string; passwordHash:string; note?:string }) {
    // status is spelled out rather than left to the column default, which is
    // 'active' for the invite path. A self-registered account must never be
    // usable before someone decides it should be.
    const result = await this.pool.query(
      `insert into users (role, status, full_name, email, username, password_hash, registration_note)
       values ('student', 'pending', $1, $2, $3, $4, $5)
       returning *`,
      [input.fullName, input.email, input.username, input.passwordHash, input.note ?? null],
    );
    return mapPending(result.rows[0]);
  }

  async findByEmail(email: string) {
    const result = await this.pool.query(
      `select id, full_name, status from users where lower(email) = lower($1) and is_active = true limit 1`,
      [email],
    );
    const row = result.rows[0];
    return row ? { id: String(row.id), fullName: String(row.full_name), status: (row.status ?? 'active') as UserStatus } : null;
  }

  async createResetToken(input: { userId:string; tokenHash:string; expiresAt:Date; issuedBy?:string }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // One live token at a time. Issuing a new one has to invalidate the old,
      // or a link from an hour ago still works after the user asked for another
      // because the first went astray.
      await client.query(
        `update password_reset_tokens set used_at = now()
         where user_id = $1 and used_at is null`, [input.userId]);
      await client.query(
        `insert into password_reset_tokens (user_id, token_hash, expires_at, issued_by)
         values ($1, $2, $3, $4)`,
        [input.userId, input.tokenHash, input.expiresAt, input.issuedBy ?? null]);
      await client.query('commit');
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  /**
   * Claims the token and sets the password in one transaction, so two people
   * racing the same link cannot both succeed. Bumping token_version and clearing
   * refresh tokens signs out every existing session -- whoever forced the reset
   * loses their access along with the legitimate owner's old devices.
   */
  async consumeResetToken(tokenHash: string, passwordHash: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const claimed = await client.query(
        `update password_reset_tokens set used_at = now()
         where token_hash = $1 and used_at is null and expires_at > now()
         returning user_id`, [tokenHash]);
      if (!claimed.rowCount) { await client.query('rollback'); return null; }
      const userId = String(claimed.rows[0].user_id);
      await client.query(
        `update users set password_hash = $2, token_version = token_version + 1, updated_at = now()
         where id = $1`, [userId, passwordHash]);
      await client.query(
        `update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1`, [userId]);
      await client.query('commit');
      return { userId };
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async listUsers(filter: { status?: UserStatus }) {
    const result = await this.pool.query(
      `select id, full_name, email, username, status, status_reason, registration_note, created_at
       from users
       where is_active = true and ($1::user_status is null or status = $1)
       order by case when status = 'pending' then 0 else 1 end, created_at desc
       limit 500`,
      [filter.status ?? null],
    );
    return result.rows.map((row) => ({
      ...mapPending(row),
      note: row.registration_note ? String(row.registration_note) : null,
    }));
  }

  async approveUser(input: { userId:string; role:AuthUser['role']; classId?:string; approvedBy:string }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // Only a pending row may be approved, so a second approver clicking the
      // same row cannot re-enrol someone or silently change a live user's role.
      const updated = await client.query(
        `update users set status = 'active', role = $2, approved_at = now(), approved_by = $3,
                status_reason = null, updated_at = now()
         where id = $1 and status = 'pending'
         returning *`,
        [input.userId, input.role, input.approvedBy],
      );
      if (!updated.rowCount) throw new Error('user_not_pending');

      if (input.classId) {
        const klass = await client.query('select school_id from classes where id = $1', [input.classId]);
        if (!klass.rowCount) throw new Error('class_not_found');
        // The class decides the school; a self-registered user has none yet.
        await client.query('update users set school_id = $2 where id = $1',
          [input.userId, klass.rows[0].school_id]);
        if (input.role === 'student') {
          await client.query(
            `insert into enrollments (class_id, student_id) values ($1, $2)
             on conflict (class_id, student_id) do update set left_at = null`,
            [input.classId, input.userId]);
        } else {
          await client.query(
            `insert into class_teachers (class_id, teacher_id) values ($1, $2)
             on conflict do nothing`, [input.classId, input.userId]);
        }
      }
      await client.query('commit');
      return mapPending(updated.rows[0]);
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async rejectUser(input: { userId:string; reason:string; approvedBy:string }) {
    const result = await this.pool.query(
      `update users set status = 'rejected', status_reason = $2, approved_at = now(), approved_by = $3,
              updated_at = now()
       where id = $1 and status = 'pending' returning *`,
      [input.userId, input.reason, input.approvedBy],
    );
    if (!result.rowCount) throw new Error('user_not_pending');
    return mapPending(result.rows[0]);
  }

  async setUserStatus(input: { userId:string; status:'active'|'suspended'; reason?:string }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `update users set status = $2, status_reason = $3, updated_at = now()
         where id = $1 and status in ('active', 'suspended') returning *`,
        [input.userId, input.status, input.reason ?? null],
      );
      if (!result.rowCount) throw new Error('user_not_found');
      if (input.status === 'suspended') {
        // findById already refuses a suspended user, but ending the sessions
        // outright means no access token survives even for its remaining minutes.
        await client.query('update users set token_version = token_version + 1 where id = $1', [input.userId]);
        await client.query(
          `update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1`, [input.userId]);
      }
      await client.query('commit');
      return mapPending(result.rows[0]);
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async setUserRole(input: { userId:string; role:AuthUser['role'] }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        // token_version moves so the old access token, which carries the old
        // role in its claims, stops being accepted immediately.
        `update users set role = $2, token_version = token_version + 1, updated_at = now()
         where id = $1 and is_active = true returning *`,
        [input.userId, input.role],
      );
      if (!result.rowCount) throw new Error('user_not_found');
      await client.query('commit');
      return mapPending(result.rows[0]);
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  private async insertRefresh(client: PoolClient, userId: string, rawToken: string, expiresAt: Date) {
    await client.query(
      'insert into refresh_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)',
      [userId, hashToken(rawToken), expiresAt],
    );
  }
}
