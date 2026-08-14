import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgSelectionsRepository } from '../repositories/selections-repository.js';
import { DomainError } from './assignments-service.js';

export interface SelectionAssignmentInput {
  classId: string;
  title: string;
  instructions?: string;
  dueAt?: string;
  timeLimitMin?: number;
  mode?: 'online' | 'pdf' | 'mock';
  publish?: boolean;
}

/**
 * Converts a reviewed server-side question basket into an assignment without
 * losing Question Bank v2 semantics (graded/context_only, source refs and fresh
 * generated numbering).
 *
 * The selection timestamp is checked again under a row lock before anything is
 * written. If the basket changed while portable questions were being resolved,
 * the handoff is rejected instead of creating a mixed-version assignment.
 */
export class SelectionAssignmentService {
  constructor(
    private readonly pool: Pool,
    private readonly selections: PgSelectionsRepository,
  ) {}

  async create(actor: Actor, selectionId: string, input: SelectionAssignmentInput) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    if (!actor.schoolId) throw new DomainError('school_required', 403);

    const stamp = await this.pool.query(
      `select updated_at from selections where id=$1 and owner_id=$2 and school_id=$3`,
      [selectionId, actor.id, actor.schoolId],
    );
    if (!stamp.rowCount) throw new DomainError('not_found', 404);

    const review = await this.selections.review(actor, selectionId);
    if (!review) throw new DomainError('not_found', 404);
    if (!review.items.length || !review.items.some((item) => item.role === 'graded')) {
      throw new DomainError('invalid_questions', 400);
    }
    if (!review.canPublish) throw new DomainError('selection_dependencies_unresolved', 409);

    const client = await this.pool.connect();
    try {
      await client.query('begin');

      const selection = await client.query(
        `select updated_at from selections
         where id=$1 and owner_id=$2 and school_id=$3
         for update`,
        [selectionId, actor.id, actor.schoolId],
      );
      if (!selection.rowCount) throw new DomainError('not_found', 404);
      if (new Date(selection.rows[0].updated_at).getTime() !== new Date(stamp.rows[0].updated_at).getTime()) {
        throw new DomainError('selection_changed', 409);
      }

      const visible = await client.query(
        `select 1 from classes c
         where c.id=$1 and c.archived_at is null
           and (
             ($2='owner' and c.school_id=$3)
             or ($2='teacher' and (
               c.owner_id=$4
               or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
             ))
           )`,
        [input.classId, actor.role, actor.schoolId, actor.id],
      );
      if (!visible.rowCount) throw new DomainError('not_found', 404);

      // Portable review only exposes approved, visible leaves. Re-check them in
      // the write transaction so a concurrent archive/review action cannot be
      // published accidentally.
      const ids = review.items.map((item) => item.portable.leaf.id);
      const validQuestions = await client.query(
        `select count(*)::int count from questions
         where id=any($1::uuid[]) and status='approved' and marks is not null`,
        [ids],
      );
      if (Number(validQuestions.rows[0]?.count ?? 0) !== ids.length) {
        throw new DomainError('selection_changed', 409);
      }

      const publish = input.publish ?? false;
      const mode = input.mode ?? 'online';
      const assignment = await client.query(
        `insert into assignments(
           class_id,created_by,title,instructions_md,mode,total_marks,opens_at,due_at,time_limit_min,published_at
         ) values($1,$2,$3,$4,$5,$6,now(),$7,$8,case when $9 then now() else null end)
         returning id,title,mode,total_marks,published_at`,
        [
          input.classId,
          actor.id,
          input.title,
          input.instructions ?? null,
          mode,
          review.totalMarks,
          input.dueAt ?? null,
          input.timeLimitMin ?? null,
          publish,
        ],
      );
      const assignmentId = assignment.rows[0].id as string;

      for (const [index, item] of review.items.entries()) {
        await client.query(
          `insert into assignment_questions(
             assignment_id,question_id,sort_order,marks_override,role,source_ref,fresh_ref
           ) values($1,$2,$3,$4,$5,$6,$7)`,
          [
            assignmentId,
            item.portable.leaf.id,
            index + 1,
            item.effectiveMarks,
            item.role,
            item.sourceRef,
            item.freshRef,
          ],
        );
      }

      if (publish && mode !== 'pdf') {
        await client.query(
          `insert into submissions(assignment_id,student_id)
           select $1,e.student_id from enrollments e
           where e.class_id=$2 and e.left_at is null
           on conflict do nothing`,
          [assignmentId, input.classId],
        );
      }

      await client.query('commit');
      return {
        id: assignmentId,
        title: assignment.rows[0].title,
        mode: assignment.rows[0].mode,
        totalMarks: Number(assignment.rows[0].total_marks),
        publishedAt: assignment.rows[0].published_at,
        selectionId,
        itemCount: review.items.length,
        gradedCount: review.items.filter((item) => item.role === 'graded').length,
        contextOnlyCount: review.items.filter((item) => item.role === 'context_only').length,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
