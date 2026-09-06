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

interface ApprovalInput {
  role: ManagedUserRole;
  classId?: string;
  groupId?: string;
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
const EPHEMERAL_USER_FKS = new Set([
  'email_verification_tokens.user_id',
  'password_reset_tokens.user_id',
  'password_reset_tokens.issued_by',
  'refresh_tokens.user_id',
  'idempotency_records.actor_id',
]);

// Only these required NO ACTION/RESTRICT references are semantically ownership
// pointers. Unknown future required FKs must fail closed instead of silently
// rewriting e.g. a future student_id to the acting owner.
const TRANSFERABLE_OWNER_FKS = new Set([
  'assignments.created_by',
  'classes.owner_id',
  'exports.requested_by',
  'invites.created_by',
]);

const DEPENDENT_LABELS: Record<string, string> = {
  'app_settings.updated_by': 'Sozlamalar',
  'assignments.created_by': 'Yaratgan vazifalar',
  'audit_log.actor_id': 'Jurnal yozuvlari',
  'class_teachers.teacher_id': 'O‘qituvchi sifatida sinflar',
  'classes.owner_id': 'Egalik qilgan sinflar',
  'content_items.reviewed_by': 'Tekshirgan kontent',
  'enrollments.student_id': 'Sinfga a’zolik',
  'error_patterns.student_id': 'Xato naqshlari',
  'exports.requested_by': 'Eksportlar',
  'flashcard_reviews.user_id': 'Flashcard tarixi',
  'grading_appeals.resolved_by': 'Yopgan apellyatsiyalar',
  'grading_appeals.student_id': 'Apellyatsiyalar',
  'gradings.graded_by': 'Qo‘ygan baholar',
  'invites.created_by': 'Yaratgan takliflar',
  'mark_schemes.reviewed_by': 'Tekshirgan mark scheme lar',
  'mastery.student_id': 'Mastery tarixi',
  'questions.reviewed_by': 'Tekshirgan savollar',
  'quiz_attempts.user_id': 'Quiz urinishlari',
  'selections.owner_id': 'Tanlovlar',
  'source_papers.uploaded_by': 'Yuklagan paperlar',
  'student_lesson_progress.student_id': 'Dars progressi',
  'submissions.student_id': 'Topshiriqlar',
  'users.approved_by': 'Tasdiqlagan foydalanuvchilar',
  'validation_findings.resolved_by': 'Yopgan validation findinglar',
};

export class AdminUsersService {
  constructor(private readonly pool: Pool) {}

  private owner(actor: Actor) {
    if (actor.role !== 'owner') throw new AdminUsersError('forbidden', 403);
  }

  private ownerSchool(actor: Actor) {
    this.owner(actor);
    if (!actor.schoolId) throw new AdminUsersError('owner_school_required', 409);
    return actor.schoolId;
  }

  /**
   * Owners administer their own school. An unassigned pending/rejected account is
   * accepted only while the installation has exactly one school. Once a second
   * school exists, tenant-less onboarding fails closed until registration has an
   * explicit school-selection/invite mechanism.
   */
  private async assertManageable(client: PoolClient, actor: Actor, userId: string, lock = false) {
    const schoolId = this.ownerSchool(actor);
    const result = await client.query(
      `select id, school_id, full_name, email, username, role, status, status_reason,
              email_verified_at, registration_note, created_at, last_login_at
       from users
       where id = $1 and is_active = true
         and (
           school_id = $2
           or (
             school_id is null and status in ('pending', 'rejected')
             and (select count(*) from schools) = 1
           )
         )
       ${lock ? 'for update' : ''}`,
      [userId, schoolId],
    );
    if (!result.rows[0]) throw new AdminUsersError('user_not_found', 404);
    return result.rows[0] as Record<string, unknown>;
  }

  private async userFromClient(client: PoolClient, actor: Actor, userId: string) {
    const schoolId = this.ownerSchool(actor);
    const result = await client.query(
      `${managedSelect}
       where u.id = $1 and u.is_active = true
         and (
           u.school_id = $2
           or (
             u.school_id is null and u.status in ('pending', 'rejected')
             and (select count(*) from schools) = 1
           )
         )`,
      [userId, schoolId],
    );
    if (!result.rows[0]) throw new AdminUsersError('user_not_found', 404);
    return mapUser(result.rows[0]);
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
    const client = await this.pool.connect();
    try {
      await this.assertManageable(client, actor, targetId);
      await this.audit(client, actor.id, action, targetId, before, after);
    } finally {
      client.release();
    }
  }

  async listUsers(actor: Actor, input: ListInput = {}) {
    const schoolId = this.ownerSchool(actor);
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
    const offset = Math.max(input.offset ?? 0, 0);
    const q = input.q?.trim() ?? '';
    const result = await this.pool.query(
      `${managedSelect}
       where u.is_active = true
         and (
           u.school_id = $6
           or (
             u.school_id is null and u.status in ('pending', 'rejected')
             and (select count(*) from schools) = 1
           )
         )
         and ($1::user_status is null or u.status = $1)
         and ($2::user_role is null or u.role = $2)
         and ($3::text = '' or u.full_name ilike '%' || $3 || '%'
              or coalesce(u.email, '') ilike '%' || $3 || '%'
              or coalesce(u.username, '') ilike '%' || $3 || '%')
       order by case when u.status = 'pending' then 0 else 1 end,
                lower(u.full_name), u.created_at desc, u.id
       limit $4 offset $5`,
      [input.status ?? null, input.role ?? null, q, limit, offset, schoolId],
    );
    const count = await this.pool.query(
      `select count(*)::int total
       from users u
       where u.is_active = true
         and (
           u.school_id = $4
           or (
             u.school_id is null and u.status in ('pending', 'rejected')
             and (select count(*) from schools) = 1
           )
         )
         and ($1::user_status is null or u.status = $1)
         and ($2::user_role is null or u.role = $2)
         and ($3::text = '' or u.full_name ilike '%' || $3 || '%'
              or coalesce(u.email, '') ilike '%' || $3 || '%'
              or coalesce(u.username, '') ilike '%' || $3 || '%')`,
      [input.status ?? null, input.role ?? null, q, schoolId],
    );
    return { users: result.rows.map(mapUser), total: Number(count.rows[0]?.total ?? 0) };
  }

  async getUser(actor: Actor, userId: string) {
    const client = await this.pool.connect();
    try {
      await this.assertManageable(client, actor, userId);
      return await this.userFromClient(client, actor, userId);
    } finally {
      client.release();
    }
  }

  async listGroups(actor: Actor, classId: string) {
    const schoolId = this.ownerSchool(actor);
    const result = await this.pool.query(
      `select g.id, g.name
       from groups g
       join classes c on c.id = g.class_id
       where g.class_id = $1 and c.school_id = $2
         and g.archived_at is null and c.archived_at is null
       order by g.sort_order, g.name`,
      [classId, schoolId],
    );
    return result.rows.map((row) => ({ id: String(row.id), name: String(row.name) }));
  }

  async createUser(actor: Actor, input: CreateInput) {
    const schoolId = this.ownerSchool(actor);
    if (input.groupId && input.role !== 'student') {
      throw new AdminUsersError('group_student_only', 409);
    }
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const passwordHash = await argon2.hash(input.password);
      let userId = '';
      try {
        const created = await client.query(
          `insert into users (
             school_id, role, status, full_name, email, username, password_hash,
             email_verified_at, approved_at, approved_by
           ) values ($1, $2, 'active', $3, $4, $5, $6, now(), now(), $7)
           returning id`,
          [schoolId, input.role, input.fullName, input.email ?? null, input.username ?? null, passwordHash, actor.id],
        );
        userId = String(created.rows[0].id);
      } catch (error) {
        this.rethrowUnique(error);
      }
      if (input.classId) {
        await this.assignClassTx(client, userId, input.role, input.classId, input.groupId, schoolId);
      }
      await this.audit(client, actor.id, 'admin.user_create', userId, undefined, {
        fullName: input.fullName,
        email: input.email ?? null,
        username: input.username ?? null,
        role: input.role,
        classId: input.classId ?? null,
        groupId: input.groupId ?? null,
      });
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async approveUser(actor: Actor, userId: string, input: ApprovalInput) {
    const schoolId = this.ownerSchool(actor);
    if (input.groupId && input.role !== 'student') {
      throw new AdminUsersError('group_student_only', 409);
    }
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await this.assertManageable(client, actor, userId, true);
      if (before.status !== 'pending') throw new AdminUsersError('user_not_pending', 409);
      if (input.classId) {
        await this.assertClass(client, input.classId, schoolId);
        if (input.role === 'student' && input.groupId) {
          await this.assertGroup(client, input.groupId, input.classId);
        }
      }
      const updated = await client.query(
        `update users
         set status = 'active', role = $2, school_id = $3, approved_at = now(), approved_by = $4,
             status_reason = null, updated_at = now()
         where id = $1 and status = 'pending' returning id`,
        [userId, input.role, schoolId, actor.id],
      );
      if (!updated.rowCount) throw new AdminUsersError('user_not_pending', 409);
      if (input.classId) {
        await this.assignClassTx(client, userId, input.role, input.classId, input.groupId, schoolId);
      }
      await this.audit(client, actor.id, 'admin.user_approve', userId, {
        status: before.status,
        schoolId: before.school_id ?? null,
      }, {
        status: 'active', role: input.role, schoolId,
        classId: input.classId ?? null, groupId: input.groupId ?? null,
      });
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectUser(actor: Actor, userId: string, reason: string) {
    const schoolId = this.ownerSchool(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await this.assertManageable(client, actor, userId, true);
      if (before.status !== 'pending') throw new AdminUsersError('user_not_pending', 409);
      await client.query(
        `update users
         set status = 'rejected', status_reason = $2, school_id = coalesce(school_id, $3),
             approved_at = now(), approved_by = $4, updated_at = now()
         where id = $1`,
        [userId, reason, schoolId, actor.id],
      );
      await this.audit(client, actor.id, 'admin.user_reject', userId,
        { status: 'pending' }, { status: 'rejected', reason });
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async reinstateUser(actor: Actor, userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await this.assertManageable(client, actor, userId, true);
      if (before.status !== 'rejected') throw new AdminUsersError('user_not_rejected', 409);
      await client.query(
        `update users set status = 'pending', status_reason = null, approved_at = null,
                approved_by = null, updated_at = now()
         where id = $1`,
        [userId],
      );
      await this.audit(client, actor.id, 'admin.user_reinstate', userId,
        { status: 'rejected' }, { status: 'pending' });
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async verifyEmail(actor: Actor, userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await this.assertManageable(client, actor, userId, true);
      if (!before.email) throw new AdminUsersError('email_required', 409);
      await client.query(
        `update users set email_verified_at = coalesce(email_verified_at, now()), updated_at = now()
         where id = $1`,
        [userId],
      );
      await this.audit(client, actor.id, 'admin.user_email_verify', userId,
        { verified: Boolean(before.email_verified_at) }, { verified: true });
      await client.query('commit');
      return { ok: true };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUser(actor: Actor, userId: string, input: UpdateInput) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const current = await this.assertManageable(client, actor, userId, true);
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
               email_verified_at = case
                 when $3::boolean and $4::text is distinct from email then null
                 else email_verified_at
               end,
               updated_at = now()
           where id = $1 and is_active = true`,
          [userId, input.fullName ?? null, input.email !== undefined, input.email ?? null,
            input.username !== undefined, input.username ?? null],
        );
      } catch (error) {
        this.rethrowUnique(error);
      }
      await this.audit(client, actor.id, 'admin.user_profile_update', userId, {
        fullName: current.full_name, email: current.email, username: current.username,
      }, input);
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async setPassword(actor: Actor, userId: string, password: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await this.assertManageable(client, actor, userId, true);
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
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await this.assertManageable(client, actor, userId, true);
      await client.query(
        `update users set token_version = token_version + 1, updated_at = now() where id = $1`,
        [userId],
      );
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
    if (actor.id === userId) throw new AdminUsersError('cannot_change_self', 409);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await this.assertManageable(client, actor, userId, true);
      if (!['active', 'suspended'].includes(String(before.status))) {
        throw new AdminUsersError('invalid_user_state', 409);
      }
      await client.query(
        `update users set status = $2, status_reason = $3, updated_at = now() where id = $1`,
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
        { status: before.status, reason: before.status_reason }, { status, reason: reason ?? null });
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async setRole(actor: Actor, userId: string, role: ManagedUserRole) {
    if (actor.id === userId) throw new AdminUsersError('cannot_change_self', 409);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await this.assertManageable(client, actor, userId, true);
      if (!['active', 'suspended'].includes(String(before.status))) {
        throw new AdminUsersError('invalid_user_state', 409);
      }
      const previous = before.role as ManagedUserRole;
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
          await client.query('update classes set owner_id = $2 where owner_id = $1', [userId, actor.id]);
        }
        await client.query(
          `update users set role = $2, token_version = token_version + 1, updated_at = now() where id = $1`,
          [userId, role],
        );
        await client.query(
          `update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1`,
          [userId],
        );
      }
      await this.audit(client, actor.id, 'admin.user_role_change', userId,
        { role: previous }, { role, sessionsRevoked: previous !== role });
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async assignClass(actor: Actor, userId: string, classId: string, groupId?: string) {
    const schoolId = this.ownerSchool(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const target = await this.assertManageable(client, actor, userId, true);
      if (!['active', 'suspended'].includes(String(target.status))) {
        throw new AdminUsersError('invalid_user_state', 409);
      }
      const role = target.role as ManagedUserRole;
      if (groupId && role !== 'student') throw new AdminUsersError('group_student_only', 409);
      await this.assignClassTx(client, userId, role, classId, groupId, schoolId);
      await this.audit(client, actor.id, 'admin.user_class_assign', userId, undefined, {
        classId, groupId: groupId ?? null, role,
      });
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeClass(actor: Actor, userId: string, classId: string) {
    const schoolId = this.ownerSchool(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const target = await this.assertManageable(client, actor, userId, true);
      await this.assertClass(client, classId, schoolId);
      const role = target.role as ManagedUserRole;
      let changed = 0;
      if (role === 'student') {
        const result = await client.query(
          `update enrollments set left_at = coalesce(left_at, now())
           where class_id = $1 and student_id = $2 and left_at is null`,
          [classId, userId],
        );
        changed = result.rowCount ?? 0;
      } else {
        const result = await client.query(
          'delete from class_teachers where class_id = $1 and teacher_id = $2',
          [classId, userId],
        );
        changed = result.rowCount ?? 0;
      }
      if (!changed) throw new AdminUsersError('membership_not_found', 404);
      await this.audit(client, actor.id, 'admin.user_class_remove', userId, { classId, role }, undefined);
      const user = await this.userFromClient(client, actor, userId);
      await client.query('commit');
      return user;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async listAudit(actor: Actor, userId: string) {
    const client = await this.pool.connect();
    try {
      await this.assertManageable(client, actor, userId);
    } finally {
      client.release();
    }
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

  /** Safe delete refuses whenever meaningful data still points at the account. */
  async safeDeleteUser(actor: Actor, userId: string) {
    if (actor.id === userId) throw new AdminUsersError('cannot_delete_self', 409);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await this.assertManageable(client, actor, userId, true);
      const foreignKeys = await this.userForeignKeys(client);
      const blockers: Array<{ what: string; count: number }> = [];
      for (const row of foreignKeys) {
        const key = `${String(row.table_name)}.${String(row.column_name)}`;
        if (EPHEMERAL_USER_FKS.has(key)) continue;
        const schema = quoteIdent(String(row.schema_name));
        const table = quoteIdent(String(row.table_name));
        const column = quoteIdent(String(row.column_name));
        const count = await client.query(
          `select count(*)::int n from ${schema}.${table} where ${column} = $1`,
          [userId],
        );
        const n = Number(count.rows[0]?.n ?? 0);
        if (n > 0) blockers.push({ what: DEPENDENT_LABELS[key] ?? key, count: n });
      }
      if (blockers.length) {
        throw new AdminUsersError(
          'user_has_data',
          409,
          blockers.map((row) => `${row.what}: ${row.count}`).join(', '),
        );
      }
      await this.audit(client, actor.id, 'admin.user_delete', userId, before, { deleted: true });
      const deleted = await client.query('delete from users where id = $1 returning id', [userId]);
      if (!deleted.rowCount) throw new AdminUsersError('user_not_found', 404);
      await client.query('commit');
      return { deleted: true };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Irreversible account purge. CASCADE relations disappear; nullable historical
   * pointers are cleared. Only an explicit allowlist of required ownership
   * pointers may transfer to the acting owner; unknown required references fail
   * closed so future schema additions cannot silently rewrite academic identity.
   */
  async purgeUser(actor: Actor, userId: string) {
    if (actor.id === userId) throw new AdminUsersError('cannot_delete_self', 409);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await this.assertManageable(client, actor, userId, true);
      const foreignKeys = await this.userForeignKeys(client);
      let cleared = 0;
      let transferred = 0;
      for (const row of foreignKeys) {
        const behavior = String(row.confdeltype);
        if (!['a', 'r'].includes(behavior)) continue;
        const key = `${String(row.table_name)}.${String(row.column_name)}`;
        const schema = quoteIdent(String(row.schema_name));
        const table = quoteIdent(String(row.table_name));
        const column = quoteIdent(String(row.column_name));
        if (Boolean(row.attnotnull)) {
          if (!TRANSFERABLE_OWNER_FKS.has(key)) {
            const count = await client.query(
              `select count(*)::int n from ${schema}.${table} where ${column} = $1`,
              [userId],
            );
            if (Number(count.rows[0]?.n ?? 0) > 0) {
              throw new AdminUsersError('user_purge_blocked', 409, key);
            }
            continue;
          }
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
      await this.audit(client, actor.id, 'admin.user_purge', userId, before, {
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
          throw new AdminUsersError(
            'user_purge_blocked',
            409,
            String((error as { constraint?: string }).constraint ?? 'foreign_key'),
          );
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

  private async assertClass(client: PoolClient, classId: string, schoolId: string) {
    const klass = await client.query(
      'select school_id from classes where id = $1 and school_id = $2 and archived_at is null',
      [classId, schoolId],
    );
    if (!klass.rowCount) throw new AdminUsersError('class_not_found', 404);
    return klass.rows[0];
  }

  private async assertGroup(client: PoolClient, groupId: string, classId: string) {
    const group = await client.query(
      `select 1 from groups where id = $1 and class_id = $2 and archived_at is null`,
      [groupId, classId],
    );
    if (!group.rowCount) throw new AdminUsersError('group_not_in_class', 409);
  }

  private async assignClassTx(
    client: PoolClient,
    userId: string,
    role: ManagedUserRole,
    classId: string,
    groupId: string | undefined,
    schoolId: string,
  ) {
    await this.assertClass(client, classId, schoolId);
    if (role === 'student') {
      if (groupId) await this.assertGroup(client, groupId, classId);
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
    await client.query(
      'update users set school_id = $2, updated_at = now() where id = $1',
      [userId, schoolId],
    );
  }

  private async userForeignKeys(client: PoolClient) {
    const result = await client.query(`
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
    return result.rows as Array<Record<string, unknown>>;
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
