import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { JobQueue } from '../jobs/job-queue.js';

interface ExportInput {
  kind: 'question_paper'|'mark_scheme'|'combined'|'feedback';
  refTable: 'assignments'|'submissions';
  refId: string;
}

export class ExportService {
  constructor(private readonly pool: Pool) {}

  async create(actor: Actor, input: ExportInput) {
    if (input.refTable === 'submissions' && actor.role === 'student') {
      const own = await this.pool.query(`select 1 from submissions where id=$1 and student_id=$2 and released_at is not null`, [input.refId, actor.id]);
      if (!own.rowCount) throw new DomainError('not_found', 404);
    } else if (actor.role === 'student') {
      throw new DomainError('staff_only', 403);
    } else {
      const visible = await this.pool.query(
        `select 1 from ${input.refTable === 'assignments' ? 'assignments a join classes c on c.id=a.class_id' : 'submissions s join assignments a on a.id=s.assignment_id join classes c on c.id=a.class_id'}
         where ${input.refTable === 'assignments' ? 'a.id' : 's.id'}=$1 and (($2='owner'and c.school_id=$3)or
         ($2='teacher'and(c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4))))`,
        [input.refId, actor.role, actor.schoolId, actor.id],
      );
      if (!visible.rowCount) throw new DomainError('not_found', 404);
    }

    const client = await this.pool.connect();
    let created: { id:string;kind:string;status:string;error:string|null;expires_at:string|null;created_at:string;finished_at:string|null };
    try {
      await client.query('begin');
      await client.query(`select pg_advisory_xact_lock(hashtext('daily-export:'||$1))`, [actor.id]);
      const usage = await client.query(`select count(*)::int count from exports where requested_by=$1 and created_at>=date_trunc('day',now())`, [actor.id]);
      if (usage.rows[0].count >= 20) throw new DomainError('daily_export_limit', 429);
      const result = await client.query(
        `insert into exports(requested_by,kind,ref_table,ref_id)values($1,$2,$3,$4)
         returning id,kind,status,error,expires_at,created_at,finished_at`,
        [actor.id, input.kind, input.refTable, input.refId],
      );
      created = result.rows[0];
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }

    await new JobQueue(this.pool).enqueue({ kind:'export-pdf',payload:{exportId:created.id},idempotencyKey:`export:${created.id}`,refTable:'exports',refId:created.id });
    return created;
  }

  async list(actor: Actor) {
    const result = await this.pool.query(`select id,kind,status,storage_path,error,expires_at,created_at,finished_at from exports where requested_by=$1 order by created_at desc limit 50`, [actor.id]);
    return result.rows;
  }

  async get(actor: Actor, id: string) {
    const result = await this.pool.query(`select id,kind,status,error,expires_at,created_at,finished_at from exports where id=$1 and requested_by=$2`, [id, actor.id]);
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0];
  }
}
