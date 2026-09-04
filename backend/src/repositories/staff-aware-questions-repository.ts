import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { serializeQuestion } from '../services/question-serializer.js';
import { PgQuestionsRepository } from './questions-repository.js';

interface AssetUrlSigner {
  signStoragePath(storagePath: string, expiresInSeconds?: number): Promise<string | null>;
}

/**
 * Staff question detail is allowed to inspect a source-backed mark scheme that
 * is still waiting for corpus review. Approved schemes always win. Students
 * remain approved-only, so this does not relax assignment/grading visibility.
 */
export class PgStaffAwareQuestionsRepository extends PgQuestionsRepository {
  constructor(private readonly detailPool: Pool, assetUrlSigner?: AssetUrlSigner) {
    super(detailPool, assetUrlSigner);
  }

  override async findOne(actor: Actor, id: string) {
    const result = await this.detailPool.query(
      `select q.id,q.display_ref,q.stem_md,q.context_md,q.command_word,q.marks,q.ao,q.answer_kind,
        json_build_object('id',p.id,'displayRef',p.display_ref,'contextMd',p.context_md) parent,
        case when $2<>'student' then true else exists(
          select 1 from submissions s join assignment_questions aq on aq.assignment_id=s.assignment_id
          where s.student_id=$3 and s.released_at is not null and aq.question_id=q.id
        ) end can_view_scheme,
        (select jsonb_build_object(
          'id',ms.id,'status',ms.status,'schemeType',ms.scheme_type,'maxMarks',ms.max_marks,'guidanceMd',ms.guidance_md,
          'points',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msp.id,'code',msp.code,'text',msp.text,'marks',msp.marks,'accept',msp.accept,
            'reject',msp.reject,'requires',msp.requires,'isBod',msp.is_bod
          ) order by msp.sort_order) from mark_scheme_points msp where msp.mark_scheme_id=ms.id),'[]'::jsonb),
          'groups',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msg.id,'label',msg.label,'nRequired',msg.n_required,
            'marksPerPoint',msg.marks_per_point,'maxMarks',msg.max_marks
          ) order by msg.id) from mark_scheme_groups msg where msg.mark_scheme_id=ms.id),'[]'::jsonb)
        )
        from mark_schemes ms
        where ms.question_id=q.id
          and (
            ms.status='approved'
            or ($2<>'student' and ms.status='needs_review')
          )
        order by case when ms.status='approved' then 0 else 1 end,ms.updated_at desc,ms.id
        limit 1) mark_scheme
       from questions q left join questions p on p.id=q.parent_id
       where q.id=$1
         and (($2='student' and q.status='approved') or ($2<>'student' and q.status in ('approved','needs_review')))
         and ($2<>'student' or exists(
         select 1 from assignment_questions aq join assignments a on a.id=aq.assignment_id
         join enrollments e on e.class_id=a.class_id
         where aq.question_id=q.id and e.student_id=$3 and e.left_at is null and a.published_at is not null
       ))`,
      [id, actor.role, actor.id],
    );
    return result.rows[0] ? serializeQuestion(result.rows[0]) : null;
  }
}
