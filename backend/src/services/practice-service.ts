import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

/**
 * Creates private remediation practice without rewriting historical question
 * taxonomy to the student's current syllabus. A historical question is eligible
 * only when one of its source LOs has an explicit reviewed-safe compatibility
 * row to an LO in the selected current subtopic.
 *
 * Practice deliberately uses only standalone, asset-free questions. The legacy
 * attempt payload does not carry selection dependency/context-asset snapshots,
 * so dependent or asset-backed questions fail closed instead of becoming
 * incomplete student tasks.
 */
export class PracticeService {
  constructor(private readonly pool: Pool) {}

  async create(actor: Actor, input: { subtopicId: string; commandWord?: string }) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);

    const client = await this.pool.connect();
    try {
      await client.query('begin');

      const context = await client.query(
        `select c.id class_id,st.code,st.title
         from enrollments e
         join classes c on c.id=e.class_id
         join topics t on t.syllabus_id=c.syllabus_id
         join subtopics st on st.topic_id=t.id
         where e.student_id=$1
           and e.left_at is null
           and c.archived_at is null
           and st.id=$2
         order by c.academic_year desc,c.created_at
         limit 1`,
        [actor.id, input.subtopicId],
      );
      if (!context.rowCount) throw new DomainError('not_found', 404);

      const questions = await client.query(
        `select distinct q.id,q.marks
         from questions q
         join question_learning_objectives qlo on qlo.question_id=q.id
         join learning_objective_compatibility compat
           on compat.source_lo_id=qlo.lo_id
          and compat.relation='equivalent'
         join learning_objectives target_lo
           on target_lo.id=compat.target_lo_id
          and target_lo.subtopic_id=$1
         join mark_schemes ms on ms.question_id=q.id and ms.status='approved'
         join components source_component on source_component.id=q.component_id
         where q.status='approved'
           and q.parent_id is not null
           and q.marks is not null
           and q.answer_kind not in('diagram','image')
           and ($2::text is null or q.command_word::text=$2)
           and exists (
             select 1
             from component_learning_objectives target_coverage
             join components target_component on target_component.id=target_coverage.component_id
             where target_coverage.learning_objective_id=target_lo.id
               and target_component.number=source_component.number
           )
           and not exists (
             select 1 from question_dependencies dep where dep.question_id=q.id
           )
           and not exists (
             with recursive context_chain as (
               select q.id,q.parent_id
               union all
               select parent.id,parent.parent_id
               from questions parent
               join context_chain chain on parent.id=chain.parent_id
             )
             select 1
             from context_chain chain
             join question_assets asset on asset.question_id=chain.id
           )
         order by md5(q.id::text||$3||current_date::text)
         limit 5`,
        [input.subtopicId, input.commandWord ?? null, actor.id],
      );

      // A five-question practice is the product contract. Returning a smaller
      // silently degraded set would make mastery evidence inconsistent across
      // subtopics, so insufficient compatibility remains unavailable.
      if ((questions.rowCount ?? questions.rows.length) < 5) {
        throw new DomainError('practice_pool_empty', 409);
      }

      const meta = context.rows[0];
      const selected = questions.rows.slice(0, 5);
      const total = selected.reduce((sum, row) => sum + Number(row.marks), 0);
      const assignment = await client.query(
        `insert into assignments(
           class_id,created_by,title,mode,total_marks,opens_at,
           counts_towards_grade,mastery_weight,published_at
         ) values($1,$2,$3,'practice',$4,now(),false,0.5,now())
         returning id,title,total_marks`,
        [meta.class_id, actor.id, `Mashq · ${meta.code} ${meta.title}`, total],
      );

      for (const [index, question] of selected.entries()) {
        await client.query(
          `insert into assignment_questions(assignment_id,question_id,sort_order)
           values($1,$2,$3)`,
          [assignment.rows[0].id, question.id, index + 1],
        );
      }

      await client.query(
        `insert into submissions(assignment_id,student_id) values($1,$2)`,
        [assignment.rows[0].id, actor.id],
      );
      await client.query('commit');

      return {
        id: assignment.rows[0].id,
        title: assignment.rows[0].title,
        totalMarks: Number(assignment.rows[0].total_marks),
        questionCount: selected.length,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
