import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { serializeQuestion } from '../services/question-serializer.js';
import type {
  DependencyKind,
  DependencyStrength,
  PortableAsset,
  PortableQuestion,
} from '../services/selection-review.js';

export interface QuestionFilters { q?: string; commandWord?: string; marksMin?: number; marksMax?: number; }

const normalizeDependencyKind = (value: string): DependencyKind =>
  value === 'answer' ? 'answer_ref' : value === 'text' ? 'text_ref' : value as DependencyKind;
const normalizeDependencyStrength = (value: string): DependencyStrength =>
  value === 'hard' ? 'required' : value as DependencyStrength;

export class PgQuestionsRepository {
  constructor(private readonly pool: Pool) {}

  async findVisible(actor: Actor, filters: QuestionFilters) {
    const values: unknown[] = [];
    const conditions = [`q.marks is not null`, `q.status = 'approved'`];
    if (filters.q) { values.push(filters.q); conditions.push(`to_tsvector('english', coalesce(q.stem_md,'')) @@ plainto_tsquery('english', $${values.length})`); }
    if (filters.commandWord) { values.push(filters.commandWord); conditions.push(`q.command_word::text = $${values.length}`); }
    if (filters.marksMin !== undefined) { values.push(filters.marksMin); conditions.push(`q.marks >= $${values.length}`); }
    if (filters.marksMax !== undefined) { values.push(filters.marksMax); conditions.push(`q.marks <= $${values.length}`); }
    if (actor.role === 'student') {
      values.push(actor.id);
      conditions.push(`exists (
        select 1 from assignment_questions aq join assignments a on a.id=aq.assignment_id
        join enrollments e on e.class_id=a.class_id
        where aq.question_id=q.id and e.student_id=$${values.length} and e.left_at is null and a.published_at is not null
      )`);
    }
    const result = await this.pool.query(
      `select q.id, q.display_ref, q.stem_md, q.context_md, q.command_word, q.marks, q.ao, q.answer_kind,
        json_build_object('id', p.id, 'displayRef', p.display_ref, 'contextMd', p.context_md) as parent
       from questions q left join questions p on p.id=q.parent_id
       where ${conditions.join(' and ')} order by q.sort_order limit 50`, values,
    );
    return result.rows.map((row) => ({
      id: row.id, displayRef: row.display_ref, stemMd: row.stem_md, contextMd: row.context_md,
      commandWord: row.command_word, marks: row.marks, ao: row.ao, answerKind: row.answer_kind, parent: row.parent,
    }));
  }

  async findOne(actor: Actor, id: string) {
    const result = await this.pool.query(
      `select q.id,q.display_ref,q.stem_md,q.context_md,q.command_word,q.marks,q.ao,q.answer_kind,
        json_build_object('id',p.id,'displayRef',p.display_ref,'contextMd',p.context_md) parent,
        case when $2<>'student' then true else exists(
          select 1 from submissions s join assignment_questions aq on aq.assignment_id=s.assignment_id
          where s.student_id=$3 and s.released_at is not null and aq.question_id=q.id
        ) end can_view_scheme,
        (select jsonb_build_object(
          'id',ms.id,'schemeType',ms.scheme_type,'maxMarks',ms.max_marks,'guidanceMd',ms.guidance_md,
          'points',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msp.id,'code',msp.code,'text',msp.text,'marks',msp.marks,'accept',msp.accept,
            'reject',msp.reject,'requires',msp.requires,'isBod',msp.is_bod
          ) order by msp.sort_order) from mark_scheme_points msp where msp.mark_scheme_id=ms.id),'[]'::jsonb),
          'groups',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msg.id,'label',msg.label,'nRequired',msg.n_required,
            'marksPerPoint',msg.marks_per_point,'maxMarks',msg.max_marks
          ) order by msg.id) from mark_scheme_groups msg where msg.mark_scheme_id=ms.id),'[]'::jsonb)
        ) from mark_schemes ms where ms.question_id=q.id and ms.status='approved' limit 1) mark_scheme
       from questions q left join questions p on p.id=q.parent_id
       where q.id=$1 and q.status='approved' and ($2<>'student' or exists(
         select 1 from assignment_questions aq join assignments a on a.id=aq.assignment_id
         join enrollments e on e.class_id=a.class_id
         where aq.question_id=q.id and e.student_id=$3 and e.left_at is null and a.published_at is not null
       ))`,
      [id, actor.role, actor.id],
    );
    return result.rows[0] ? serializeQuestion(result.rows[0]) : null;
  }

  /**
   * Return a leaf as a portable unit for worksheet/assignment selection.
   * Context is recursive: root -> intermediate parents -> leaf. Sibling answer
   * dependencies are reported separately because an answer_ref cannot be made
   * portable by copying printed context.
   */
  async portable(actor: Actor, id: string): Promise<PortableQuestion | null> {
    if (actor.role === 'student' || !actor.schoolId) return null;

    const result = await this.pool.query(
      `with recursive chain as (
         select q.*
         from questions q
         join source_papers sp on sp.id=q.source_paper_id
         where q.id=$1 and q.marks is not null and q.status='approved'
           and exists (
             select 1 from classes visible
             where visible.syllabus_id=sp.syllabus_id
               and visible.school_id=$2
               and visible.archived_at is null
               and (
                 $3='owner'
                 or ($3='teacher' and (
                   visible.owner_id=$4
                   or exists (
                     select 1 from class_teachers ct
                     where ct.class_id=visible.id and ct.teacher_id=$4
                   )
                 ))
               )
           )
         union all
         select parent.* from chain child join questions parent on parent.id=child.parent_id
       )
       select c.id,c.parent_id,c.label,c.path,c.display_ref,c.depth,c.marks,c.command_word,
         c.answer_kind,c.answer_lines,coalesce(c.stem_md,'') stem,c.context_md context,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'id',qa.id,'kind',qa.kind,'storagePath',qa.storage_path,'contentMd',qa.content_md,
             'altText',qa.alt_text,'sortOrder',qa.sort_order,'sourcePage',qa.source_page
           ) order by qa.sort_order,qa.id)
           from question_assets qa where qa.question_id=c.id
         ),'[]'::jsonb) assets
       from chain c order by c.depth`,
      [id, actor.schoolId, actor.role, actor.id],
    );
    if (!result.rowCount) return null;

    const rows = result.rows;
    const leaf = rows[rows.length - 1]!;
    const dependencies = await this.pool.query(
      `select qd.id,qd.question_id,qd.depends_on_id,qd.kind,qd.strength,qd.evidence,qd.confidence,
        target.display_ref, target.stem_md stem
       from question_dependencies qd
       join questions target on target.id=qd.depends_on_id
       where qd.question_id=$1
       order by target.sort_order,target.id`,
      [id],
    );

    return {
      leaf: {
        id: leaf.id,
        rootId: rows[0]!.id,
        label: leaf.label,
        path: leaf.path,
        displayRef: leaf.display_ref,
        stem: leaf.stem,
        commandWord: leaf.command_word,
        marks: Number(leaf.marks),
        answerKind: leaf.answer_kind,
        answerLines: leaf.answer_lines,
      },
      chain: rows.map((row) => ({ id: row.id, label: row.label, depth: row.depth })),
      contextBlocks: rows
        .filter((row) => row.context || row.assets.length)
        .map((row) => ({
          id: row.id,
          label: row.label,
          displayRef: row.display_ref,
          depth: row.depth,
          context: row.context,
          assets: row.assets as PortableAsset[],
        })),
      dependencies: dependencies.rows.map((row) => ({
        id: row.id,
        questionId: row.question_id,
        dependsOnId: row.depends_on_id,
        displayRef: row.display_ref,
        stem: row.stem,
        kind: normalizeDependencyKind(row.kind),
        strength: normalizeDependencyStrength(row.strength),
        evidence: row.evidence,
        confidence: row.confidence === null ? null : Number(row.confidence),
      })),
      sourceRef: leaf.display_ref,
    };
  }

  async approve(actor: Actor, id: string) {
    if (actor.role !== 'owner') return null;
    const result = await this.pool.query(
      `update questions set status='approved',reviewed_by=$2,reviewed_at=now(),updated_at=now()
       where id=$1 returning id,status`, [id, actor.id],
    );
    return result.rows[0] ?? null;
  }
}
