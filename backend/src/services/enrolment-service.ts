import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface PendingStudent {
  id: string;
  fullName: string;
  email: string | null;
  createdAt: string;
}

export interface GroupSummary {
  id: string;
  classId: string;
  name: string;
  sortOrder: number;
  studentCount: number;
}

export interface RosterEntry {
  id: string;
  fullName: string;
  email: string | null;
  status: string;
  groupId: string | null;
  groupName: string | null;
}

/**
 * Approval and placement of self-registered students.
 *
 * Registration is open, but it grants nothing on its own: a `pending` account is
 * enrolled in no class, so every class-scoped query already returns empty for it.
 * Placement into a class and group is what activates the account, and only staff
 * can do it.
 */
export class EnrolmentService {
  constructor(private readonly pool: Pool) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private assertOwner(actor: Actor) {
    if (actor.role !== 'owner') throw new DomainError('owner_only', 403);
  }

  /** Classes the actor may place a student into. */
  private classScopeSql(actor: Actor, classParam: string, actorParam: string, schoolParam: string) {
    if (actor.role === 'owner') {
      return `select id, school_id from classes where id = ${classParam} and school_id = ${schoolParam} and archived_at is null`;
    }
    return `select id, school_id from classes
            where id = ${classParam} and archived_at is null and (
              owner_id = ${actorParam} or exists (
                select 1 from class_teachers ct where ct.class_id = classes.id and ct.teacher_id = ${actorParam}
              )
            )`;
  }

  async pendingStudents(actor: Actor): Promise<PendingStudent[]> {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select id, full_name, email, created_at
       from users
       where role = 'student' and status = 'pending' and is_active = true
       order by created_at`,
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      fullName: String(row.full_name),
      email: row.email ? String(row.email) : null,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  async groups(actor: Actor, classId: string): Promise<GroupSummary[]> {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select g.id, g.class_id, g.name, g.sort_order,
              count(e.student_id) filter (where e.left_at is null) as student_count
       from groups g
       left join enrollments e on e.group_id = g.id
       where g.class_id = $1 and g.archived_at is null
         and exists (${this.classScopeSql(actor, '$1', '$2', '$3')})
       group by g.id
       order by g.sort_order, g.name`,
      [classId, actor.id, actor.schoolId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      classId: String(row.class_id),
      name: String(row.name),
      sortOrder: Number(row.sort_order),
      studentCount: Number(row.student_count),
    }));
  }

  async createGroup(actor: Actor, classId: string, name: string, sortOrder = 0) {
    this.assertStaff(actor);
    const allowed = await this.pool.query(this.classScopeSql(actor, '$1', '$2', '$3'), [
      classId,
      actor.id,
      actor.schoolId,
    ]);
    if (!allowed.rowCount) throw new DomainError('not_found', 404);

    try {
      const result = await this.pool.query(
        `insert into groups (class_id, name, sort_order) values ($1, $2, $3)
         returning id, class_id, name, sort_order`,
        [classId, name, sortOrder],
      );
      const row = result.rows[0];
      return {
        id: String(row.id),
        classId: String(row.class_id),
        name: String(row.name),
        sortOrder: Number(row.sort_order),
        studentCount: 0,
      };
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        throw new DomainError('group_name_taken', 409);
      }
      throw error;
    }
  }

  /**
   * Place a student into a class and optionally a group, and activate the
   * account. Everything happens in one transaction: a half-applied assignment
   * would leave an active student enrolled nowhere.
   */
  async assignStudent(
    actor: Actor,
    studentId: string,
    input: { classId: string; groupId?: string | null },
  ) {
    this.assertStaff(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');

      const klass = await client.query(this.classScopeSql(actor, '$1', '$2', '$3'), [
        input.classId,
        actor.id,
        actor.schoolId,
      ]);
      if (!klass.rowCount) throw new DomainError('not_found', 404);
      const schoolId = klass.rows[0].school_id;

      const student = await client.query(
        `select id, status from users where id = $1 and role = 'student' and is_active = true for update`,
        [studentId],
      );
      if (!student.rowCount) throw new DomainError('not_found', 404);

      if (input.groupId) {
        // The composite foreign key already rejects a cross-class group, but a
        // clear 404 beats a constraint error surfacing as a 500.
        const group = await client.query(
          `select 1 from groups where id = $1 and class_id = $2 and archived_at is null`,
          [input.groupId, input.classId],
        );
        if (!group.rowCount) throw new DomainError('not_found', 404);
      }

      await client.query(
        `insert into enrollments (class_id, student_id, group_id) values ($1, $2, $3)
         on conflict (class_id, student_id)
         do update set group_id = excluded.group_id, left_at = null`,
        [input.classId, studentId, input.groupId ?? null],
      );

      await client.query(
        `update users
         set status = 'active', school_id = coalesce(school_id, $2),
             approved_by = $3, approved_at = now(), updated_at = now()
         where id = $1`,
        [studentId, schoolId, actor.id],
      );

      await client.query(
        `insert into audit_log (actor_id, action, ref_table, ref_id, after)
         values ($1, 'student.assign', 'users', $2, $3)`,
        [actor.id, studentId, JSON.stringify(input)],
      );

      await client.query('commit');
      return {
        studentId,
        classId: input.classId,
        groupId: input.groupId ?? null,
        status: 'active',
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Move an already-enrolled student between groups of the same class. */
  async moveToGroup(actor: Actor, studentId: string, classId: string, groupId: string | null) {
    return this.assignStudent(actor, studentId, { classId, groupId });
  }

  async setStatus(actor: Actor, studentId: string, status: 'active' | 'suspended') {
    this.assertOwner(actor);
    const result = await this.pool.query(
      `update users set status = $2, updated_at = now(),
         token_version = case when $2 = 'suspended' then token_version + 1 else token_version end
       where id = $1 and role = 'student' and is_active = true
       returning id, status`,
      [studentId, status],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    await this.pool.query(
      `insert into audit_log (actor_id, action, ref_table, ref_id, after)
       values ($1, 'student.status', 'users', $2, $3)`,
      [actor.id, studentId, JSON.stringify({ status })],
    );
    return result.rows[0];
  }

  async roster(actor: Actor, classId: string): Promise<RosterEntry[]> {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select u.id, u.full_name, u.email, u.status, e.group_id, g.name as group_name
       from enrollments e
       join users u on u.id = e.student_id
       left join groups g on g.id = e.group_id
       where e.class_id = $1 and e.left_at is null
         and exists (${this.classScopeSql(actor, '$1', '$2', '$3')})
       order by g.sort_order nulls last, u.full_name`,
      [classId, actor.id, actor.schoolId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      fullName: String(row.full_name),
      email: row.email ? String(row.email) : null,
      status: String(row.status),
      groupId: row.group_id ? String(row.group_id) : null,
      groupName: row.group_name ? String(row.group_name) : null,
    }));
  }
}
