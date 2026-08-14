import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';

export interface ClassSummary {
  id: string;
  name: string;
  grade: number | null;
  level: 'AS' | 'A2';
  academicYear: string;
  studentCount: number;
}

export interface ClassesRepository {
  findVisible(actor: Actor): Promise<ClassSummary[]>;
  findOne(actor:Actor,id:string):Promise<ClassSummary|null>;
}

const mapClass = (row: Record<string, unknown>): ClassSummary => ({
  id: String(row.id),
  name: String(row.name),
  grade: row.grade === null ? null : Number(row.grade),
  level: row.level as 'AS' | 'A2',
  academicYear: String(row.academic_year),
  studentCount: Number(row.student_count),
});

const SELECT_CLASSES = `
  select c.id, c.name, c.grade, c.level, c.academic_year,
    count(e.student_id) filter (where e.left_at is null) as student_count
  from classes c
  left join enrollments e on e.class_id = c.id
`;

export class PgClassesRepository implements ClassesRepository {
  constructor(private readonly pool: Pool) {}

  async findVisible(actor: Actor) {
    if (actor.role === 'owner') {
      if (!actor.schoolId) return [];
      const result = await this.pool.query(
        `${SELECT_CLASSES}
         where c.school_id = $1 and c.archived_at is null
         group by c.id order by c.name`,
        [actor.schoolId],
      );
      return result.rows.map(mapClass);
    }

    if (actor.role === 'teacher') {
      const result = await this.pool.query(
        `${SELECT_CLASSES}
         where c.archived_at is null and (
           c.owner_id = $1 or exists (
             select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $1
           )
         )
         group by c.id order by c.name`,
        [actor.id],
      );
      return result.rows.map(mapClass);
    }

    const result = await this.pool.query(
      `${SELECT_CLASSES}
       where c.archived_at is null and exists (
         select 1 from enrollments own
         where own.class_id = c.id and own.student_id = $1 and own.left_at is null
       )
       group by c.id order by c.name`,
      [actor.id],
    );
    return result.rows.map(mapClass);
  }

  async findOne(actor:Actor,id:string) {
    const scope=actor.role==='owner'
      ? 'c.school_id=$2'
      : actor.role==='teacher'
        ? '(c.owner_id=$2 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$2))'
        : 'exists(select 1 from enrollments own where own.class_id=c.id and own.student_id=$2 and own.left_at is null)';
    const value=actor.role==='owner'?actor.schoolId:actor.id;
    if(!value)return null;
    const result=await this.pool.query(
      `${SELECT_CLASSES} where c.id=$1 and c.archived_at is null and ${scope} group by c.id`,
      [id,value],
    );
    return result.rows[0]?mapClass(result.rows[0]):null;
  }
}
