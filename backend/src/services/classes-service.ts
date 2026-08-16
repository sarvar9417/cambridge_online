import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface ClassInput {
  name: string;
  level: 'AS' | 'A2';
  academicYear: string;
  grade?: number | null;
}

export interface ClassRoster {
  id: string;
  name: string;
  grade: number | null;
  level: 'AS' | 'A2';
  academicYear: string;
  archivedAt: string | null;
  ownerId: string;
  teachers: Array<{ id: string; fullName: string }>;
  students: Array<{
    id: string; fullName: string; email: string | null; joinedAt: string;
    submitted: number; assigned: number; averagePercentage: number | null;
  }>;
}

/**
 * Creating and running a class.
 *
 * Until now nothing in the product could create one: the two in the database
 * arrived with the seed, and every screen downstream -- enrol a student, set
 * homework, mark it -- was waiting on a class that could not be made.
 *
 * A student belongs to one class at a time, enforced by a partial unique index
 * on the open enrolments. Moving is therefore a real operation rather than a
 * second insert: it closes the old row and opens a new one in one transaction,
 * so the work they did in the old class stays attached to it.
 */
export class ClassesService {
  constructor(private readonly pool: Pool) {}

  private staff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  /**
   * May this actor change this class?
   *
   * An owner may touch any class in their school. A teacher may touch one they
   * own or teach -- which is why creating a class also enrols the creator as a
   * teacher of it, or they would lose it the moment they made it.
   */
  private async requireControl(actor: Actor, classId: string) {
    this.staff(actor);
    const result = await this.pool.query(
      `select c.id, c.owner_id, c.school_id from classes c
       where c.id = $1 and (
         ($2 = 'owner' and c.school_id = $3)
         or c.owner_id = $4
         or exists (select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $4)
       )`,
      [classId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0] as { id: string; owner_id: string; school_id: string };
  }

  async create(actor: Actor, input: ClassInput) {
    this.staff(actor);
    if (!actor.schoolId) throw new DomainError('no_school', 409);

    const syllabus = await this.pool.query(
      `select id from syllabi where is_active order by valid_from desc limit 1`);
    if (!syllabus.rowCount) throw new DomainError('no_active_syllabus', 409);

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const created = await client.query(
        `insert into classes (school_id, name, grade, level, syllabus_id, academic_year, owner_id)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, name, grade, level::text level, academic_year, owner_id, archived_at`,
        [actor.schoolId, input.name, input.grade ?? null, input.level,
          syllabus.rows[0].id, input.academicYear, actor.id],
      );
      const klass = created.rows[0];
      // The creator teaches it. Without this a teacher would create a class and
      // immediately lose access to it, since visibility runs through this table.
      await client.query(
        `insert into class_teachers (class_id, teacher_id) values ($1, $2) on conflict do nothing`,
        [klass.id, actor.id]);
      await client.query(
        `insert into audit_log (actor_id, action, ref_table, ref_id, after)
         values ($1, 'class.create', 'classes', $2, $3)`,
        [actor.id, klass.id, JSON.stringify(input)]);
      await client.query('commit');
      return klass;
    } catch (error) {
      await client.query('rollback');
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        throw new DomainError('class_name_taken', 409);
      }
      throw error;
    } finally { client.release(); }
  }

  async update(actor: Actor, classId: string, input: Partial<ClassInput>) {
    await this.requireControl(actor, classId);
    const result = await this.pool.query(
      `update classes set name = coalesce($2, name), grade = coalesce($3, grade),
              level = coalesce($4::level_type, level), academic_year = coalesce($5, academic_year)
       where id = $1
       returning id, name, grade, level::text level, academic_year, owner_id, archived_at`,
      [classId, input.name ?? null, input.grade ?? null, input.level ?? null, input.academicYear ?? null],
    );
    return result.rows[0];
  }

  /**
   * Archived, never deleted. Assignments, submissions and marks hang off a
   * class; removing it would either take a year of student work with it or fail
   * on a constraint nobody can read.
   */
  async setArchived(actor: Actor, classId: string, archived: boolean) {
    await this.requireControl(actor, classId);
    const result = await this.pool.query(
      `update classes set archived_at = $2 where id = $1
       returning id, name, grade, level::text level, academic_year, owner_id, archived_at`,
      [classId, archived ? new Date() : null],
    );
    return result.rows[0];
  }

  async addTeacher(actor: Actor, classId: string, teacherId: string) {
    await this.requireControl(actor, classId);
    const teacher = await this.pool.query(
      `select id from users where id = $1 and is_active and status = 'active'
         and role in ('teacher', 'owner') and school_id = (select school_id from classes where id = $2)`,
      [teacherId, classId]);
    if (!teacher.rowCount) throw new DomainError('teacher_not_found', 404);
    await this.pool.query(
      `insert into class_teachers (class_id, teacher_id) values ($1, $2) on conflict do nothing`,
      [classId, teacherId]);
    return { classId, teacherId };
  }

  async removeTeacher(actor: Actor, classId: string, teacherId: string) {
    const klass = await this.requireControl(actor, classId);
    // The owner of a class is the one account that must keep access to it.
    if (klass.owner_id === teacherId) throw new DomainError('cannot_remove_class_owner', 409);
    await this.pool.query(
      'delete from class_teachers where class_id = $1 and teacher_id = $2', [classId, teacherId]);
    return { classId, teacherId };
  }

  /**
   * Puts a student in a class, moving them out of whichever one they were in.
   *
   * One transaction, because the unique index allows exactly one open enrolment:
   * inserting before closing the old row would fail, and closing without
   * inserting would leave the student in no class at all.
   */
  async placeStudent(actor: Actor, classId: string, studentId: string) {
    const klass = await this.requireControl(actor, classId);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const student = await client.query(
        `select id, school_id from users
         where id = $1 and role = 'student' and is_active and status = 'active' for update`,
        [studentId]);
      if (!student.rowCount) throw new DomainError('student_not_found', 404);

      const school = student.rows[0].school_id;
      if (school && school !== klass.school_id) throw new DomainError('cross_school_enrollment', 403);
      // A student approved without a class has no school yet; the class gives
      // them one.
      if (!school) {
        await client.query('update users set school_id = $2 where id = $1', [studentId, klass.school_id]);
      }

      const previous = await client.query(
        `update enrollments set left_at = now()
         where student_id = $1 and left_at is null and class_id <> $2
         returning class_id`,
        [studentId, classId]);

      await client.query(
        `insert into enrollments (class_id, student_id) values ($1, $2)
         on conflict (class_id, student_id) do update set left_at = null`,
        [classId, studentId]);

      await client.query(
        `insert into audit_log (actor_id, action, ref_table, ref_id, before, after)
         values ($1, 'class.place_student', 'enrollments', $2, $3, $4)`,
        [actor.id, studentId,
          JSON.stringify({ from: previous.rows[0]?.class_id ?? null }),
          JSON.stringify({ to: classId })]);
      await client.query('commit');
      return { classId, studentId, movedFrom: previous.rows[0]?.class_id ?? null };
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  /** Leaves the enrolment row closed rather than deleted, so past work keeps its class. */
  async removeStudent(actor: Actor, classId: string, studentId: string) {
    await this.requireControl(actor, classId);
    const result = await this.pool.query(
      `update enrollments set left_at = now()
       where class_id = $1 and student_id = $2 and left_at is null returning student_id`,
      [classId, studentId]);
    if (!result.rowCount) throw new DomainError('not_enrolled', 404);
    return { classId, studentId };
  }

  /**
   * Starts next year's copy of a class and moves its students into it.
   *
   * The old class is archived rather than renamed, so last year's assignments
   * and marks stay where they were done and the new year starts empty.
   */
  async rollover(actor: Actor, classId: string, input: { academicYear: string; name?: string; grade?: number | null }) {
    const klass = await this.requireControl(actor, classId);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const source = await client.query(
        `select name, grade, level, syllabus_id, school_id from classes where id = $1 for update`, [classId]);
      const row = source.rows[0];

      const created = await client.query(
        `insert into classes (school_id, name, grade, level, syllabus_id, academic_year, owner_id)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, name, grade, level::text level, academic_year, owner_id, archived_at`,
        [row.school_id, input.name ?? row.name, input.grade ?? row.grade, row.level,
          row.syllabus_id, input.academicYear, klass.owner_id],
      );
      const next = created.rows[0];

      await client.query(
        `insert into class_teachers (class_id, teacher_id)
         select $1, teacher_id from class_teachers where class_id = $2
         on conflict do nothing`, [next.id, classId]);

      const moved = await client.query(
        `update enrollments set left_at = now()
         where class_id = $1 and left_at is null returning student_id`, [classId]);
      for (const student of moved.rows) {
        await client.query(
          `insert into enrollments (class_id, student_id) values ($1, $2)
           on conflict (class_id, student_id) do update set left_at = null`,
          [next.id, student.student_id]);
      }

      await client.query('update classes set archived_at = now() where id = $1', [classId]);
      await client.query(
        `insert into audit_log (actor_id, action, ref_table, ref_id, before, after)
         values ($1, 'class.rollover', 'classes', $2, $3, $4)`,
        [actor.id, next.id, JSON.stringify({ from: classId }),
          JSON.stringify({ to: next.id, students: moved.rowCount })]);
      await client.query('commit');
      return { ...next, movedStudents: moved.rowCount ?? 0 };
    } catch (error) {
      await client.query('rollback');
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        throw new DomainError('class_name_taken', 409);
      }
      throw error;
    } finally { client.release(); }
  }

  /** The class as a place: who teaches it, who is in it, and how they are doing. */
  async roster(actor: Actor, classId: string): Promise<ClassRoster> {
    await this.requireControl(actor, classId);

    const [klass, teachers, students] = await Promise.all([
      this.pool.query(
        `select id, name, grade, level::text level, academic_year, owner_id, archived_at
         from classes where id = $1`, [classId]),
      this.pool.query(
        `select u.id, u.full_name from class_teachers ct join users u on u.id = ct.teacher_id
         where ct.class_id = $1 order by u.full_name`, [classId]),
      this.pool.query(`
        select u.id, u.full_name, u.email, e.joined_at,
               count(distinct a.id)::int assigned,
               count(distinct s.id) filter (where s.submitted_at is not null)::int submitted,
               round(avg(s.percentage) filter (where s.released_at is not null)::numeric, 0) average
        from enrollments e
        join users u on u.id = e.student_id
        left join assignments a on a.class_id = e.class_id and a.published_at is not null
        left join submissions s on s.assignment_id = a.id and s.student_id = u.id
        where e.class_id = $1 and e.left_at is null
        group by u.id, u.full_name, u.email, e.joined_at
        order by u.full_name`, [classId]),
    ]);

    if (!klass.rowCount) throw new DomainError('not_found', 404);
    const row = klass.rows[0];

    return {
      id: String(row.id),
      name: String(row.name),
      grade: row.grade === null ? null : Number(row.grade),
      level: row.level as 'AS' | 'A2',
      academicYear: String(row.academic_year),
      archivedAt: row.archived_at ? String(row.archived_at) : null,
      ownerId: String(row.owner_id),
      teachers: teachers.rows.map((teacher) => ({ id: String(teacher.id), fullName: String(teacher.full_name) })),
      students: students.rows.map((student) => ({
        id: String(student.id),
        fullName: String(student.full_name),
        email: student.email ? String(student.email) : null,
        joinedAt: String(student.joined_at),
        assigned: Number(student.assigned),
        submitted: Number(student.submitted),
        averagePercentage: student.average === null ? null : Number(student.average),
      })),
    };
  }

  /** Students with no open enrolment, which is who the roster can add. */
  async unassignedStudents(actor: Actor) {
    this.staff(actor);
    const result = await this.pool.query(
      `select u.id, u.full_name, u.email from users u
       where u.role = 'student' and u.is_active and u.status = 'active'
         and (u.school_id = $1 or u.school_id is null)
         and not exists (select 1 from enrollments e where e.student_id = u.id and e.left_at is null)
       order by u.full_name limit 200`,
      [actor.schoolId]);
    return result.rows.map((row) => ({
      id: String(row.id), fullName: String(row.full_name), email: row.email ? String(row.email) : null,
    }));
  }
}
