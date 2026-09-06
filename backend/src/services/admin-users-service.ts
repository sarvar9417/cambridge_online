import argon2 from 'argon2';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';

export type ManagedUserRole = 'owner' | 'teacher' | 'student';
export type ManagedUserStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface UserMembership {
  classId: string;
  className: string;
  kind: 'student' | 'teacher';
  groupId: string | null;
  groupName: string | null;
}

export interface ManagedUser {
  id: string;
  schoolId: string | null;
  fullName: string;
  email: string | null;
  username: string | null;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  statusReason: string | null;
  emailVerified: boolean;
  note: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  memberships: UserMembership[];
}

export class AdminUsersError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: 400 | 403 | 404 | 409,
    public readonly detail?: string,
  ) {
    super(code);
  }
}

interface ListInput {
  status?: ManagedUserStatus;
  role?: ManagedUserRole;
  q?: string;
  limit?: number;
  offset?: number;
}

interface CreateInput {
  fullName: string;
  email?: string | null;
  username?: string | null;
  password: string;
  role: ManagedUserRole;
  classId?: string;
  groupId?: string;
}

interface UpdateInput {
  fullName?: string;
  email?: string | null;
  username?: string | null;
}

const managedSelect = `
  select
    u.id, u.school_id, u.full_name, u.email, u.username, u.role, u.status,
    u.status_reason, u.email_verified_at, u.registration_note, u.created_at,
    u.last_login_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'classId', m.class_id,
        'className', m.class_name,
        'kind', m.kind,
        'groupId', m.group_id,
        'groupName', m.group_name
      ) order by m.class_name)
      from (
        select c.id class_id, c.name class_name, 'student'::text kind,
               g.id group_id, g.name group_name
        from enrollments e
        join classes c on c.id = e.class_id
        left join groups g on g.id = e.group_id
        where e.student_id = u.id and e.left_at is null
        union all
        select c.id class_id, c.name class_name, 'teacher'::text kind,
               null::uuid group_id, null::text group_name
        from class_teachers ct
        join classes c on c.id = ct.class_id
        where ct.teacher_id = u.id
      ) m
    ), '[]'::jsonb) memberships
  from users u`;

const mapUser = (row: Record<string, unknown>): ManagedUser => ({
  id: String(row.id),
  schoolId: row.school_id ? String(row.school_id) : null,
  fullName: String(row.full_name),
  email: row.email ? String(row.email) : null,
  username: row.username ? String(row.username) : null,
  role: row.role as ManagedUserRole,
  status: row.status as ManagedUserStatus,
  statusReason: row.status_reason ? String(row.status_reason) : null,
  emailVerified: Boolean(row.email_verified_at),
  note: row.registration_note ? String(row.registration_note) : null,
  createdAt: new Date(String(row.created_at)),
  lastLoginAt: row.last_login_at ? new Date(String(row.last_login_at)) : null,
  memberships: Array.isArray(row.memberships) ? row.memberships as UserMembership[] : [],
});

const quoteIdent = (value: string) => `"${value.replaceAll('"', '""')}"`;

export class AdminUsersService {
  constructor(private readonly pool: Pool) {}

  private owner(actor: Actor) {
    if (actor.role !== 'owner') throw new AdminUsersError('forbidden', 403);
  }

  private async audit(
    client: PoolClient,
    actorId: string,
    action: string,
    targetId: string,
    before?: unknown,
    after?: unknown,
  ) {
    await client.query(
      `insert into audit_log (actor_id, action, ref_table, ref_id, before, after)
       values ($1, $2, 'users', $3, $4::jsonb, $5::jsonb)`,
      [
        actorId,
        action,
        targetId,
        before === undefined ? null : JSON.stringify(before),
        after === undefined ? null : JSON.stringify(after),
      ],
    );
  }

  async recordAction(actor: Actor, action: string, targetId: string, before?: unknown, after?: unknown) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await this.audit(client, actor.id, action, targetId, before, after);
    } finally {
      client.release();
    }
  }

  async listUsers(actor: Actor, input: ListInput = {}) {
    this.owner(actor);
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
    const offset = Math.max(input.offset ?? 0, 0);
    const q = input.q?.trim() ?? '';
    const result = await this.pool.query(
      `${managedSelect}
       where u.is_active = true
         and ($1::user_status is null or u.status = $1)
         and ($2::user_role is null or u.role = $2)
         and ($3::text = '' or u.full_name ilike '%' || $3 || '%'
              or coalesce(u.email, '') ilike '%' || $3 || '%'
              or coalesce(u.username, '') ilike '%' || $3 || '%')
       order by case when u.status = 'pending' then 0 else 1 end,
                lower(u.full_name), u.created_at desc
       limit $4 offset $5`,
      [input.status ?? null, input.role ?? null, q, limit, offset],
    );
    const count = await this.pool.query(
      `select count(*)::int total
       from users u
       where u.is_active = true
         and ($1::user_status is null or u.status = $1)
         and ($2::user_role is null or u.role = $2)
         and ($3::text = '' or u.full_name ilike '%' || $3 || '%'
              or coalesce(u.email, '') ilike '%' || $3 || '%'
              or coalesce(u.username, '') ilike '%' || $3 || '%')`,
      [input.status ?? null, input.role ?? null, q],
    );
    return { users: result.rows.map(mapUser), total: Number(count.rows[0]?.total ?? 0) };
  }

  async getUser(actor: Actor, userId: string) {
    this.owner(actor);
    const result = await this.pool.query(`${managedSelect} where u.id = $1 and u.is_active = true`, [userId]);
    if (!result.rows[0]) throw new AdminUsersError('user_not_found', 404);
    return mapUser(result.rows[0]);
  }

  async createUser(actor: Actor, input: CreateInput) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const passwordHash = await argon2.hash(input.password);
      let created;
      try {
        created = await client.query(
          `insert into users (
             school_id, role, status, full_name, email, username, password_hash,
             email_verified_at, approved_at, approved_by
           ) values ($1, $2, 'active', $3, $4, $5, $6, now(), now(), $7)
           returning id, school_id, role, status, full_name, email, username, created_at`,
          [
            actor.schoolId,
            input.role,
            input.fullName,
            input.email ?? null,
            input.username ?? null,
            passwordHash,
            actor.id,
          ],
        );
      } catch (error) {
        this.rethrowUnique(error);
      }
      const userId = String(created!.rows[0].id);
      if (input.classId) {
        await this.assignClassTx(client, userId, input.role, input.classId, input.groupId);
      }
      await this.audit(client, actor.id, 'admin.user_create', userId, undefined, {
        fullName: input.fullName,
        email: input.email ?? null,
        username: input.username ?? null,
        role: input.role,
        classId: input.classId ?? null,
        groupId: input.groupId ?? null,
      });
      await client.query('commit');
      return await this.getUser(actor, userId);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUser(actor: Actor, userId: string, input: UpdateInput) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await client.query(
        `select id, full_name, email, username from users where id = $1 and is_active = true for update`,
        [userId],
      );
      if (!before.rowCount) throw new AdminUsersError('user_not_found', 404);

      const current = before.rows[0] as Record<string, unknown>;
      const nextEmail = input.email !== undefined ? input.email : current.email as string | null;
      const nextUsername = input.username !== undefined ? input.username : current.username as string | null;
      if (!nextEmail && !nextUsername) {
        throw new AdminUsersError('identifier_required', 409, 'Email yoki username dan kamida bittasi qolishi kerak.');
      }

      try {
        await client.query(
          `update users
           set full_name = coalesce($2, full_name),
               email = case when $3::boolean then $4::text else email end,
               username = case when $5::boolean then $6::text else username end,
               email_verified_at = case when $3::boolean then now() else email_verified_at end,
               updated_at = now()
           where id = $1 and is_active = true`,
          [
            userId,
            input.fullName ?? null,
            input.email !== undefined,
            input.email ?? null,
            input.username !== undefined,
            input.username ?? null,
          ],
        );
      } catch (error) {
        this.rethrowUnique(error);
      }

      await this.audit(client, actor.id, 'admin.user_profile_update', userId, {
        fullName: current.full_name,
        email: current.email,
        username: current.username,
      }, input);
      await client.query('commit');
      return await this.getUser(actor, userId);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async setPassword(actor: Actor, userId: string, password: string) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const exists = await client.query('select id from users where id = $1 and is_active = true for update', [userId]);
      if (!exists.rowCount) throw new AdminUsersError('user_not_found', 404);
      const passwordHash = await argon2.hash(password);
      await client.query(
        `update users set password_hash = $2, token_version = token_version + 1, updated_at = now()
         where id = $1`,
        [userId, passwordHash],
      );
      await client.query(
        `update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1`,
        [userId],
      );
      await this.audit(client, actor.id, 'admin.user_password_set', userId, undefined, { sessionsRevoked: true });
      await client.query('commit');
      return { ok: true };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeSessions(actor: Actor, userId: string) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const updated = await client.query(
        `update users set token_version = token_version + 1, updated_at = now()
         where id = $1 and is_active = true returning id`,
        [userId],
      );
      if (!updated.rowCount) throw new AdminUsersError('user_not_found', 404);
      await client.query(
        `update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1`,
        [userId],
      );
      await this.audit(client, actor.id, 'admin.user_sessions_revoked', userId, undefined, { allSessions: true });
      await client.query('commit');
      return { ok: true };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async setStatus(actor: Actor, userId: string, status: 'active' | 'suspended', reason?: string) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await client.query(
        `select status, status_reason from users where id = $1 and is_active = true for update`,
        [userId],
      );
      if (!before.rowCount) throw new AdminUsersError('user_not_found', 404);
      if (!['active', 'suspended'].includes(String(before.rows[0].status))) {
        throw new AdminUsersError('invalid_user_state', 409);
      }
      await client.query(
        `update users set status = $2, status_reason = $3, updated_at = now()
         where id = $1`,
        [userId, status, reason ?? null],
      );
      if (status === 'suspended') {
        await client.query('update users set token_version = token_version + 1 where id = $1', [userId]);
        await client.query(
          `update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1`,
          [userId],
        );
      }
      await this.audit(client, actor.id, `admin.user_${status === 'suspended' ? 'suspend' : 'activate'}`, userId,
        { status: before.rows[0].status, reason: before.rows[0].status_reason },
        { status, reason: reason ?? null });
      await client.query('commit');
      return await this.getUser(actor, userId);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async setRole(actor: Actor, userId: string, role: ManagedUserRole) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await client.query(
        `select role from users where id = $1 and is_active = true for update`,
        [userId],
      );
      if (!before.rowCount) throw new AdminUsersError('user_not_found', 404);
      const previous = before.rows[0].role as ManagedUserRole;
      if (previous !== role) {
        if (previous === 'student' && role !== 'student') {
          await client.query(
            `update enrollments set left_at = coalesce(left_at, now())
             where student_id = $1 and left_at is null`,
            [userId],
          );
        }
        if (role === 'student') {
          await client.query('delete from class_teachers where teacher_id = $1', [userId]);
          // A student cannot remain the administrative owner of a class. Preserve
          // the class by transferring ownership to the owner making this change.
          await client.query('update classes set owner_id = $2 where owner_id = $1', [userId, actor.id]);
        }
        await client.query(
          `update users set role = $2, token_version = token_version + 1, updated_at = now()
           where id = $1`,
          [userId, role],
        );
        await client.query(
          `update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1`,
          [userId],
        );
      }
      await this.audit(client, actor.id, 'admin.user_role_change', userId,
        { role: previous }, { role, sessionsRevoked: previous !== role });
      await client.query('commit');
      return await this.getUser(actor, userId);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async assignClass(actor: Actor, userId: string, classId: string, groupId?: string) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const target = await client.query(
        `select role from users where id = $1 and is_active = true for update`, [userId]);
      if (!target.rowCount) throw new AdminUsersError('user_not_found', 404);
      const role = target.rows[0].role as ManagedUserRole;
      await this.assignClassTx(client, userId, role, classId, groupId);
      await this.audit(client, actor.id, 'admin.user_class_assign', userId, undefined, {
        classId, groupId: groupId ?? null, role,
      });
      await client.query('commit');
      return await this.getUser(actor, userId);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeClass(actor: Actor, userId: string, classId: string) {
    this.owner(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const target = await client.query(`select role from users where id = $1 and is_active = true`, [userId]);
      if (!target.rowCount) throw new AdminUsersError('user_not_found', 404);
      const role = target.rows[0].role as ManagedUserRole;
      if (role === 'student') {
        await client.query(
          `update enrollments set left_at = coalesce(left_at, now())
           where class_id = $1 and student_id = $2 and left_at is null`,
          [classId, userId],
        );
      } else {
        await client.query('delete from class_teachers where class_id = $1 and teacher_id = $2', [classId, userId]);
      }
      await this.audit(client, actor.id, 'admin.user_class_remove', userId, { classId, role }, undefined);
      await client.query('commit');
      return await this.getUser(actor, userId);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async listAudit(actor: Actor, userId: string) {
    this.owner(actor);
    const exists = await this.pool.query('select 1 from users where id = $1', [userId]);
    if (!exists.rowCount) throw new AdminUsersError('user_not_found', 404);
    const result = await this.pool.query(
      `select a.id, a.action, a.before, a.after, a.created_at, a.actor_id,
              coalesce(u.full_name, 'Tizim') actor_name
       from audit_log a
       left join users u on u.id = a.actor_id
       where a.ref_table = 'users' and a.ref_id = $1
       order by a.created_at desc
       limit 100`,
      [userId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      action: String(row.action),
      before: row.before ?? null,
      after: row.after ?? null,
      actorId: row.actor_id ? String(row.actor_id) : null,
      actorName: String(row.actor_name),
      createdAt: new Date(String(row.created_at)),
    }));
  }

  /**
   * Irreversible account purge.
   *
   * User-owned rows with ON DELETE CASCADE disappear with the account. Historical
   * rows that deliberately do not cascade are preserved: nullable user pointers
   * become NULL, required ownership pointers transfer to the owner performing the
   * purge. This makes the operation complete without destroying unrelated class,
   * assessment or audit history.
   */
  async purgeUser(actor: Actor, userId: string) {
    this.owner(actor);
    if (actor.id === userId) throw new AdminUsersError('cannot_delete_self', 409);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await client.query(
        `select id, school_id, full_name, email, username, role, status, created_at
         from users where id = $1 and is_active = true for update`,
        [userId],
      );
      if (!before.rowCount) throw new AdminUsersError('user_not_found', 404);

      const foreignKeys = await client.query(`
        select ns.nspname schema_name, tbl.relname table_name, att.attname column_name,
               att.attnotnull, con.confdeltype
        from pg_constraint con
        join pg_class tbl on tbl.oid = con.conrelid
        join pg_namespace ns on ns.oid = tbl.relnamespace
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
        where con.contype = 'f'
          and con.confrelid = 'users'::regclass
          and cardinality(con.conkey) = 1
      `);

      let cleared = 0;
      let transferred = 0;
      for (const row of foreignKeys.rows) {
        const behavior = String(row.confdeltype);
        // PostgreSQL handles CASCADE, SET NULL and SET DEFAULT when the user row
        // is deleted. Only NO ACTION / RESTRICT need preparation here.
        if (!['a', 'r'].includes(behavior)) continue;
        const schema = quoteIdent(String(row.schema_name));
        const table = quoteIdent(String(row.table_name));
        const column = quoteIdent(String(row.column_name));
        if (Boolean(row.attnotnull)) {
          const changed = await client.query(
            `update ${schema}.${table} set ${column} = $2 where ${column} = $1`,
            [userId, actor.id],
          );
          transferred += changed.rowCount ?? 0;
        } else {
          const changed = await client.query(
            `update ${schema}.${table} set ${column} = null where ${column} = $1`,
            [userId],
          );
          cleared += changed.rowCount ?? 0;
        }
      }

      await this.audit(client, actor.id, 'admin.user_purge', userId, before.rows[0], {
        purged: true,
        requiredReferencesTransferredTo: actor.id,
        transferredReferences: transferred,
        clearedReferences: cleared,
      });
      try {
        const deleted = await client.query('delete from users where id = $1 returning id', [userId]);
        if (!deleted.rowCount) throw new AdminUsersError('user_not_found', 404);
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === '23503') {
          throw new AdminUsersError('user_purge_blocked', 409, String((error as { constraint?: string }).constraint ?? 'foreign_key'));
        }
        throw error;
      }
      await client.query('commit');
      return { deleted: true, transferredReferences: transferred, clearedReferences: cleared };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async assignClassTx(
    client: PoolClient,
    userId: string,
    role: ManagedUserRole,
    classId: string,
    groupId?: string,
  ) {
    const klass = await client.query('select school_id from classes where id = $1 and archived_at is null', [classId]);
    if (!klass.rowCount) throw new AdminUsersError('class_not_found', 404);

    if (role === 'student') {
      if (groupId) {
        const group = await client.query(
          `select 1 from groups where id = $1 and class_id = $2 and archived_at is null`,
          [groupId, classId],
        );
        if (!group.rowCount) throw new AdminUsersError('group_not_in_class', 409);
      }
      await client.query(
        `update enrollments set left_at = coalesce(left_at, now())
         where student_id = $1 and class_id <> $2 and left_at is null`,
        [userId, classId],
      );
      await client.query(
        `insert into enrollments (class_id, student_id, group_id, left_at)
         values ($1, $2, $3, null)
         on conflict (class_id, student_id)
         do update set left_at = null, group_id = excluded.group_id`,
        [classId, userId, groupId ?? null],
      );
    } else {
      await client.query(
        `insert into class_teachers (class_id, teacher_id) values ($1, $2)
         on conflict do nothing`,
        [classId, userId],
      );
    }
    await client.query('update users set school_id = $2, updated_at = now() where id = $1', [userId, klass.rows[0].school_id]);
  }

  private rethrowUnique(error: unknown): never {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      const constraint = String((error as { constraint?: string }).constraint ?? '');
      if (constraint.toLowerCase().includes('email')) throw new AdminUsersError('email_taken', 409);
      if (constraint.toLowerCase().includes('username')) throw new AdminUsersError('username_taken', 409);
      throw new AdminUsersError('duplicate_user', 409, constraint);
    }
    throw error;
  }
}
