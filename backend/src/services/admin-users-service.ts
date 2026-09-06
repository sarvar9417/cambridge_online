import argon2 from 'argon2';
import type { Pool, PoolClient } from 'pg';
import type { AdminCreateUserInput, AdminSetClassesInput, AdminUpdateUserInput } from '../lib/auth-schemas.js';
import type { AuthUser, UserStatus } from '../repositories/auth-repository.js';

export type ManagedRole = AuthUser['role'];

export interface ManagedUserSummary {
  id: string;
  schoolId: string | null;
  role: ManagedRole;
  fullName: string;
  email: string | null;
  username: string | null;
  status: UserStatus;
  statusReason: string | null;
  emailVerified: boolean;
  note: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagedMembership {
  classId: string;
  className: string;
  groupId: string | null;
  groupName: string | null;
  kind: 'student' | 'teacher';
}

const mapSummary = (row: Record<string, unknown>): ManagedUserSummary => ({
  id: String(row.id),
  schoolId: row.school_id ? String(row.school_id) : null,
  role: row.role as ManagedRole,
  fullName: String(row.full_name),
  email: row.email ? String(row.email) : null,
  username: row.username ? String(row.username) : null,
  status: (row.status as UserStatus | undefined) ?? 'active',
  statusReason: row.status_reason ? String(row.status_reason) : null,
  emailVerified: Boolean(row.email_verified_at),
  note: row.registration_note ? String(row.registration_note) : null,
  lastLoginAt: row.last_login_at ? new Date(String(row.last_login_at)) : null,
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

const unique = (values: string[]) => [...new Set(values)];

/**
 * Owner-facing account lifecycle operations that are intentionally kept out of
 * AuthService. AuthService proves identity; this service administrates identity.
 */
export class AdminUsersService {
  constructor(private readonly pool: Pool) {}

  async list(filter: { status?: UserStatus; role?: ManagedRole; q?: string }) {
    const q = filter.q?.trim() || null;
    const result = await this.pool.query(
      `select id,school_id,role,full_name,email,username,status,status_reason,registration_note,
              email_verified_at,last_login_at,created_at,updated_at
       from users
       where is_active=true
         and ($1::user_status is null or status=$1)
         and ($2::user_role is null or role=$2)
         and ($3::text is null or full_name ilike '%'||$3||'%'
              or email ilike '%'||$3||'%' or username ilike '%'||$3||'%')
       order by case when status='pending' then 0 else 1 end, created_at desc
       limit 1000`,
      [filter.status ?? null, filter.role ?? null, q],
    );
    return result.rows.map(mapSummary);
  }

  async detail(userId: string) {
    const profile = await this.pool.query(
      `select id,school_id,role,full_name,email,username,status,status_reason,registration_note,
              email_verified_at,last_login_at,created_at,updated_at
       from users where id=$1 and is_active=true`, [userId]);
    if (!profile.rowCount) throw new Error('user_not_found');

    const memberships = await this.pool.query(
      `select c.id class_id,c.name class_name,e.group_id,g.name group_name,'student' kind
       from enrollments e join classes c on c.id=e.class_id
       left join groups g on g.id=e.group_id
       where e.student_id=$1 and e.left_at is null and c.archived_at is null
       union all
       select c.id,c.name,null::uuid,null::text,'teacher'
       from class_teachers ct join classes c on c.id=ct.class_id
       where ct.teacher_id=$1 and c.archived_at is null
       order by class_name`, [userId]);

    const audit = await this.audit(userId, 40);
    return {
      user: mapSummary(profile.rows[0]),
      memberships: memberships.rows.map((row) => ({
        classId: String(row.class_id), className: String(row.class_name),
        groupId: row.group_id ? String(row.group_id) : null,
        groupName: row.group_name ? String(row.group_name) : null,
        kind: String(row.kind) as ManagedMembership['kind'],
      })),
      audit,
    };
  }

  async create(actorId: string, input: AdminCreateUserInput) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const passwordHash = await argon2.hash(input.password);
      const created = await client.query(
        `insert into users(role,status,full_name,email,username,password_hash,email_verified_at,
                           approved_at,approved_by)
         values($1,'active',$2,$3,$4,$5,case when $6 then now() else null end,now(),$7)
         returning *`,
        [input.role, input.fullName, input.email ?? null, input.username ?? null, passwordHash,
          input.emailVerified, actorId],
      );
      const userId = String(created.rows[0].id);
      await this.applyClasses(client, userId, input.role, input.classIds, input.groupId ?? null);
      await this.auditTx(client, actorId, 'user.created', userId, null, this.safeSnapshot(created.rows[0]));
      await client.query('commit');
      return mapSummary(created.rows[0]);
    } catch (error) {
      await client.query('rollback');
      this.translateUnique(error);
      throw error;
    } finally { client.release(); }
  }

  async updateIdentity(actorId: string, userId: string, input: AdminUpdateUserInput) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const locked = await client.query('select * from users where id=$1 and is_active=true for update', [userId]);
      if (!locked.rowCount) throw new Error('user_not_found');
      const before = locked.rows[0];
      const nextEmail = Object.prototype.hasOwnProperty.call(input, 'email') ? input.email ?? null : before.email;
      const nextUsername = Object.prototype.hasOwnProperty.call(input, 'username') ? input.username ?? null : before.username;
      if (!nextEmail && !nextUsername) throw new Error('identifier_required');

      const result = await client.query(
        `update users set
           full_name=case when $2 then $3 else full_name end,
           email=case when $4 then $5 else email end,
           username=case when $6 then $7 else username end,
           updated_at=now()
         where id=$1 returning *`,
        [userId,
          Object.prototype.hasOwnProperty.call(input, 'fullName'), input.fullName ?? null,
          Object.prototype.hasOwnProperty.call(input, 'email'), input.email ?? null,
          Object.prototype.hasOwnProperty.call(input, 'username'), input.username ?? null],
      );
      await this.auditTx(client, actorId, 'user.profile_updated', userId,
        this.safeSnapshot(before), this.safeSnapshot(result.rows[0]));
      await client.query('commit');
      return mapSummary(result.rows[0]);
    } catch (error) {
      await client.query('rollback');
      this.translateUnique(error);
      throw error;
    } finally { client.release(); }
  }

  async setPassword(actorId: string, userId: string, password: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const exists = await client.query('select id from users where id=$1 and is_active=true for update', [userId]);
      if (!exists.rowCount) throw new Error('user_not_found');
      const passwordHash = await argon2.hash(password);
      await client.query(
        `update users set password_hash=$2,token_version=token_version+1,updated_at=now() where id=$1`,
        [userId, passwordHash]);
      await client.query(`update refresh_tokens set revoked_at=coalesce(revoked_at,now()) where user_id=$1`, [userId]);
      await client.query(`update password_reset_tokens set used_at=coalesce(used_at,now()) where user_id=$1`, [userId]);
      await this.auditTx(client, actorId, 'user.password_set', userId, null, { sessionsRevoked: true });
      await client.query('commit');
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async revokeSessions(actorId: string, userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `update users set token_version=token_version+1,updated_at=now()
         where id=$1 and is_active=true returning id`, [userId]);
      if (!result.rowCount) throw new Error('user_not_found');
      await client.query(`update refresh_tokens set revoked_at=coalesce(revoked_at,now()) where user_id=$1`, [userId]);
      await this.auditTx(client, actorId, 'user.sessions_revoked', userId, null, { revoked: true });
      await client.query('commit');
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async setRole(actorId: string, userId: string, role: ManagedRole) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const current = await client.query('select * from users where id=$1 and is_active=true for update', [userId]);
      if (!current.rowCount) throw new Error('user_not_found');
      const before = current.rows[0];
      const result = await client.query(
        `update users set role=$2,token_version=token_version+1,updated_at=now() where id=$1 returning *`,
        [userId, role]);
      await client.query(`update refresh_tokens set revoked_at=coalesce(revoked_at,now()) where user_id=$1`, [userId]);
      // Memberships from the old role must not continue to grant access.
      if (role === 'student') {
        await client.query('delete from class_teachers where teacher_id=$1', [userId]);
      } else {
        await client.query('update enrollments set left_at=coalesce(left_at,now()) where student_id=$1 and left_at is null', [userId]);
      }
      await this.auditTx(client, actorId, 'user.role_changed', userId,
        { role: before.role }, { role });
      await client.query('commit');
      return mapSummary(result.rows[0]);
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async setClasses(actorId: string, userId: string, input: AdminSetClassesInput) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const current = await client.query('select role from users where id=$1 and is_active=true for update', [userId]);
      if (!current.rowCount) throw new Error('user_not_found');
      const role = current.rows[0].role as ManagedRole;
      const before = await this.membershipsTx(client, userId);
      await this.applyClasses(client, userId, role, input.classIds, input.groupId ?? null);
      const after = await this.membershipsTx(client, userId);
      await this.auditTx(client, actorId, 'user.classes_changed', userId, before, after);
      await client.query('commit');
      return after;
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async record(actorId: string, action: string, userId: string, before?: unknown, after?: unknown) {
    await this.pool.query(
      `insert into audit_log(actor_id,action,ref_table,ref_id,before,after)
       values($1,$2,'users',$3,$4::jsonb,$5::jsonb)`,
      [actorId, action, userId, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after)],
    );
  }

  async audit(userId: string, limit = 40) {
    const result = await this.pool.query(
      `select a.id,a.action,a.before,a.after,a.created_at,a.actor_id,u.full_name actor_name
       from audit_log a left join users u on u.id=a.actor_id
       where a.ref_table='users' and a.ref_id=$1
       order by a.created_at desc limit $2`, [userId, Math.max(1, Math.min(limit, 100))]);
    return result.rows.map((row) => ({
      id: String(row.id), action: String(row.action),
      actorId: row.actor_id ? String(row.actor_id) : null,
      actorName: row.actor_name ? String(row.actor_name) : null,
      before: row.before ?? null, after: row.after ?? null,
      createdAt: new Date(String(row.created_at)),
    }));
  }

  /**
   * Privacy-safe erasure for an account whose academic/ownership references make
   * a hard DELETE unsafe. The row remains only as a referential anchor.
   */
  async anonymize(actorId: string, userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const target = await client.query('select * from users where id=$1 and is_active=true for update', [userId]);
      if (!target.rowCount) throw new Error('user_not_found');
      const before = this.safeSnapshot(target.rows[0]);
      await client.query(`update refresh_tokens set revoked_at=coalesce(revoked_at,now()) where user_id=$1`, [userId]);
      await client.query(`update password_reset_tokens set used_at=coalesce(used_at,now()) where user_id=$1`, [userId]);
      await client.query(
        `update users set full_name='O''chirilgan foydalanuvchi',email=null,
                username='deleted-'||id::text,avatar_url=null,is_active=false,status='suspended',
                status_reason='Admin tomonidan anonimlashtirilgan',token_version=token_version+1,
                last_login_at=null,updated_at=now() where id=$1`, [userId]);
      await this.auditTx(client, actorId, 'user.anonymized', userId, before, { anonymized: true });
      await client.query('commit');
      return { id: userId, anonymized: true };
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  private async applyClasses(
    client: PoolClient, userId: string, role: ManagedRole, rawClassIds: string[], groupId: string | null,
  ) {
    const classIds = unique(rawClassIds);
    if (role === 'student' && classIds.length > 1) throw new Error('student_one_class');
    if (role !== 'student' && groupId) throw new Error('group_student_only');

    let classes: Array<{ id:string; school_id:string }> = [];
    if (classIds.length) {
      const result = await client.query(
        `select id,school_id from classes where id=any($1::uuid[]) and archived_at is null`, [classIds]);
      if (result.rowCount !== classIds.length) throw new Error('class_not_found');
      classes = result.rows as Array<{ id:string; school_id:string }>;
      await client.query('update users set school_id=$2,updated_at=now() where id=$1', [userId, classes[0].school_id]);
    }

    if (role === 'student') {
      await client.query('delete from class_teachers where teacher_id=$1', [userId]);
      await client.query('update enrollments set left_at=coalesce(left_at,now()) where student_id=$1 and left_at is null', [userId]);
      if (!classIds.length) return;
      if (groupId) {
        const group = await client.query(
          'select 1 from groups where id=$1 and class_id=$2 and archived_at is null', [groupId, classIds[0]]);
        if (!group.rowCount) throw new Error('group_not_in_class');
      }
      await client.query(
        `insert into enrollments(class_id,student_id,group_id,left_at)
         values($1,$2,$3,null)
         on conflict(class_id,student_id) do update set left_at=null,group_id=excluded.group_id`,
        [classIds[0], userId, groupId]);
      return;
    }

    await client.query('update enrollments set left_at=coalesce(left_at,now()) where student_id=$1 and left_at is null', [userId]);
    await client.query('delete from class_teachers where teacher_id=$1', [userId]);
    for (const classId of classIds) {
      await client.query(
        `insert into class_teachers(class_id,teacher_id) values($1,$2) on conflict do nothing`, [classId, userId]);
    }
  }

  private async membershipsTx(client: PoolClient, userId: string) {
    const result = await client.query(
      `select c.id class_id,c.name class_name,e.group_id,g.name group_name,'student' kind
       from enrollments e join classes c on c.id=e.class_id left join groups g on g.id=e.group_id
       where e.student_id=$1 and e.left_at is null and c.archived_at is null
       union all
       select c.id,c.name,null::uuid,null::text,'teacher'
       from class_teachers ct join classes c on c.id=ct.class_id
       where ct.teacher_id=$1 and c.archived_at is null order by class_name`, [userId]);
    return result.rows.map((row) => ({
      classId: String(row.class_id), className: String(row.class_name),
      groupId: row.group_id ? String(row.group_id) : null,
      groupName: row.group_name ? String(row.group_name) : null,
      kind: String(row.kind),
    }));
  }

  private safeSnapshot(row: Record<string, unknown>) {
    return {
      id: String(row.id), role: row.role, fullName: row.full_name,
      email: row.email ?? null, username: row.username ?? null,
      status: row.status, schoolId: row.school_id ?? null,
    };
  }

  private async auditTx(
    client: PoolClient, actorId: string, action: string, userId: string, before: unknown, after: unknown,
  ) {
    await client.query(
      `insert into audit_log(actor_id,action,ref_table,ref_id,before,after)
       values($1,$2,'users',$3,$4::jsonb,$5::jsonb)`,
      [actorId, action, userId, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after)],
    );
  }

  private translateUnique(error: unknown): never | void {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      throw new Error('identifier_taken');
    }
  }
}
