import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { JobQueue } from '../jobs/job-queue.js';
import { PgQuestionsRepository } from '../repositories/questions-repository.js';
import { PgSelectionsRepository } from '../repositories/selections-repository.js';

interface ExportInput {
  kind: 'question_paper'|'mark_scheme'|'combined'|'feedback';
  refTable: 'assignments'|'submissions'|'selections';
  refId: string;
  format?: 'pdf'|'docx';
  title?: string;
}

export class ExportService {
  constructor(private readonly pool: Pool) {}

  async create(actor: Actor, input: ExportInput) {
    if((input.refTable==='assignments'&&input.kind==='feedback')||(input.refTable==='submissions'&&input.kind!=='feedback')||(input.refTable==='selections'&&input.kind==='feedback'))throw new DomainError('invalid_export_kind',400);

    let requestPayload: Record<string, unknown> | null = null;

    if (input.refTable === 'selections') {
      if (actor.role === 'student') throw new DomainError('staff_only', 403);
      const questions = new PgQuestionsRepository(this.pool);
      const selections = new PgSelectionsRepository(this.pool, questions);
      const review = await selections.review(actor, input.refId);
      if (!review) throw new DomainError('not_found', 404);
      if (!review.items.length) throw new DomainError('selection_empty', 400);
      if (!review.canPublish) throw new DomainError('selection_dependencies_unresolved', 409);
      const meta = await this.pool.query(
        `select name from selections where id=$1 and owner_id=$2 and school_id=$3`,
        [input.refId, actor.id, actor.schoolId],
      );
      if (!meta.rowCount) throw new DomainError('not_found', 404);
      requestPayload = {
        version: 1,
        title: input.title?.trim() || meta.rows[0].name || 'Cambridge 9618 practice',
        review,
      };
    } else if (input.refTable === 'submissions' && actor.role === 'student') {
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
    let created: { id:string;kind:string;status:string;error:string|null;expires_at:string|null;created_at:string;finished_at:string|null;file_format:string };
    try {
      await client.query('begin');
      await client.query(`select pg_advisory_xact_lock(hashtext('daily-export:'||$1))`, [actor.id]);
      const usage = await client.query(`select count(*)::int count from exports where requested_by=$1 and created_at>=date_trunc('day',now())`, [actor.id]);
      if (usage.rows[0].count >= 20) throw new DomainError('daily_export_limit', 429);
      const result = await client.query(
        `insert into exports(requested_by,kind,ref_table,ref_id,file_format,request_payload)values($1,$2,$3,$4,$5,$6)
         returning id,kind,status,error,expires_at,created_at,finished_at,file_format`,
        [actor.id, input.kind, input.refTable, input.refId, input.format ?? 'pdf', requestPayload],
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
    const result = await this.pool.query(`select id,kind,file_format,status,storage_path,error,expires_at,created_at,finished_at from exports where requested_by=$1 order by created_at desc limit 50`, [actor.id]);
    return result.rows;
  }

  async get(actor: Actor, id: string) {
    const result = await this.pool.query(`select id,kind,file_format,status,error,expires_at,created_at,finished_at from exports where id=$1 and requested_by=$2`, [id, actor.id]);
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0];
  }

  async file(actor:Actor,id:string){const result=await this.pool.query(`select kind,file_format,file_data from exports where id=$1 and requested_by=$2 and status='succeeded' and expires_at>now() and file_data is not null`,[id,actor.id]);if(!result.rowCount)throw new DomainError('not_found',404);return{kind:result.rows[0].kind,format:result.rows[0].file_format as 'pdf'|'docx',data:result.rows[0].file_data as Buffer}}
}
