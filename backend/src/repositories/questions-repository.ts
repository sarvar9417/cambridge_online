import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { serializeQuestion } from '../services/question-serializer.js';
import type {
  DependencyKind,
  DependencyStrength,
  PortableAsset,
  PortableQuestion,
} from '../services/selection-review.js';

export interface QuestionFilters {
  view?: 'parts' | 'families';
  q?: string;
  component?: number;
  commandWords?: string[];
  marksMin?: number;
  marksMax?: number;
  yearFrom?: number;
  yearTo?: number;
  series?: string[];
  aos?: string[];
  topicIds?: string[];
  subtopicIds?: string[];
  hasDiagram?: boolean;
  status?: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived';
  dependency?: 'any' | 'independent';
  difficulty?: 'easy' | 'medium' | 'hard';
  unusedInClassId?: string;
  limit?: number;
}

type QueryValues = unknown[];

const add = (values: QueryValues, value: unknown) => {
  values.push(value);
  return `$${values.length}`;
};

const normalizeDependencyKind = (value: string): DependencyKind =>
  value === 'answer' ? 'answer_ref' : value === 'text' ? 'text_ref' : value as DependencyKind;
const normalizeDependencyStrength = (value: string): DependencyStrength =>
  value === 'hard' ? 'required' : value as DependencyStrength;

const unavailableFilters = (filters: QuestionFilters) => [
  ...(filters.difficulty ? ['difficulty'] : []),
  ...(filters.unusedInClassId ? ['unusedInClassId'] : []),
];

const mapPart = (row: Record<string, unknown>) => ({
  id: row.id,
  rootId: row.root_id,
  rootRef: row.root_ref,
  displayRef: row.display_ref,
  stem: row.stem,
  // Backward compatibility for the existing dashboard/assignment form.
  stemMd: row.stem,
  contextMd: null,
  commandWord: row.command_word,
  marks: Number(row.marks),
  ao: row.ao,
  answerKind: row.answer_kind,
  component: Number(row.component),
  year: Number(row.year),
  series: row.series,
  variant: Number(row.variant),
  status: row.status,
  hasDiagram: Boolean(row.has_diagram),
  hasDependency: Boolean(row.has_dependency),
  subtopics: row.subtopics ?? [],
});

export class PgQuestionsRepository {
  constructor(private readonly pool: Pool) {}

  async findVisible(actor: Actor, filters: QuestionFilters) {
    const values: QueryValues = [];
    const conditions = [`q.marks is not null`];

    if (actor.role === 'owner' && filters.status) {
      conditions.push(`q.status::text=${add(values, filters.status)}`);
    } else {
      conditions.push(`q.status='approved'`);
    }

    if (filters.component !== undefined) {
      conditions.push(`component.number=${add(values, filters.component)}`);
    }
    if (filters.topicIds?.length) {
      conditions.push(
        `exists(
          select 1 from question_subtopics qst
          join subtopics st on st.id=qst.subtopic_id
          where qst.question_id=q.id and st.topic_id=any(${add(values, filters.topicIds)}::uuid[])
        )`,
      );
    }
    if (filters.subtopicIds?.length) {
      conditions.push(
        `exists(
          select 1 from question_subtopics qst
          where qst.question_id=q.id and qst.subtopic_id=any(${add(values, filters.subtopicIds)}::uuid[])
        )`,
      );
    }
    if (filters.commandWords?.length) {
      conditions.push(`q.command_word::text=any(${add(values, filters.commandWords)}::text[])`);
    }
    if (filters.marksMin !== undefined) {
      conditions.push(`q.marks>=${add(values, filters.marksMin)}`);
    }
    if (filters.marksMax !== undefined) {
      conditions.push(`q.marks<=${add(values, filters.marksMax)}`);
    }
    if (filters.aos?.length) {
      conditions.push(`q.ao::text=any(${add(values, filters.aos)}::text[])`);
    }
    if (filters.yearFrom !== undefined) {
      conditions.push(`sp.year>=${add(values, filters.yearFrom)}`);
    }
    if (filters.yearTo !== undefined) {
      conditions.push(`sp.year<=${add(values, filters.yearTo)}`);
    }
    if (filters.series?.length) {
      conditions.push(`sp.series::text=any(${add(values, filters.series)}::text[])`);
    }
    if (filters.hasDiagram !== undefined) {
      const predicate = `exists(
        select 1 from question_assets qa
        where qa.question_id=q.id and qa.kind in ('diagram','image')
      )`;
      conditions.push(filters.hasDiagram ? predicate : `not ${predicate}`);
    }
    if (filters.q) {
      const parameter = add(values, filters.q);
      conditions.push(`(
        to_tsvector('english',coalesce(q.stem_md,'')) @@ websearch_to_tsquery('english',${parameter})
        or q.stem_md ilike '%' || ${parameter} || '%'
      )`);
    }
    if (filters.dependency === 'independent') {
      conditions.push(`not exists(select 1 from question_dependencies qd where qd.question_id=q.id)`);
    }

    // Preserve the old student safety rule even though the new bank UI is staff-only.
    if (actor.role === 'student') {
      const studentId = add(values, actor.id);
      conditions.push(`exists (
        select 1 from assignment_questions aq
        join assignments a on a.id=aq.assignment_id
        join enrollments e on e.class_id=a.class_id
        where aq.question_id=q.id
          and e.student_id=${studentId}
          and e.left_at is null
          and a.published_at is not null
      )`);
    }

    const limit = add(values, filters.limit ?? 80);
    const matching = await this.pool.query(
      `with recursive matching as (
         select q.id,q.parent_id,q.label,q.path,q.display_ref,q.depth,q.sort_order,
           coalesce(q.stem_md,'') stem,q.command_word,q.marks,q.ao,q.answer_kind,q.status,
           component.number component,sp.year,sp.series,sp.variant,
           exists(
             select 1 from question_assets qa
             where qa.question_id=q.id and qa.kind in ('diagram','image')
           ) has_diagram
         from questions q
         join source_papers sp on sp.id=q.source_paper_id
         join components component on component.id=q.component_id
         where ${conditions.join(' and ')}
         order by sp.year desc,sp.series,component.number,sp.variant,q.sort_order
         limit ${limit}
       ), chain as (
         select m.id leaf_id,m.id node_id,m.parent_id,m.display_ref,m.depth
         from matching m
         union all
         select c.leaf_id,p.id,p.parent_id,p.display_ref,p.depth
         from chain c join questions p on p.id=c.parent_id
       ), roots as (
         select distinct on (leaf_id) leaf_id,node_id root_id,display_ref root_ref
         from chain order by leaf_id,depth
       )
       select m.*,r.root_id,r.root_ref,
         coalesce((
           select jsonb_agg(
             jsonb_build_object('id',st.id,'code',st.code,'title',st.title)
             order by st.sort_order
           )
           from question_subtopics qs
           join subtopics st on st.id=qs.subtopic_id
           where qs.question_id=m.id
         ),'[]'::jsonb) subtopics,
         exists(select 1 from question_dependencies qd where qd.question_id=m.id) has_dependency
       from matching m
       join roots r on r.leaf_id=m.id
       order by m.year desc,m.series,m.component,m.variant,m.sort_order`,
      values,
    );

    const parts = matching.rows.map(mapPart);
    if ((filters.view ?? 'parts') === 'parts') {
      return {
        data: parts,
        view: 'parts' as const,
        unavailableFilters: unavailableFilters(filters),
        nextCursor: null,
      };
    }

    const rootIds = [...new Set(parts.map((part) => String(part.rootId)))];
    if (!rootIds.length) {
      return {
        data: [],
        view: 'families' as const,
        unavailableFilters: unavailableFilters(filters),
        nextCursor: null,
      };
    }

    const familyRows = await this.pool.query(
      `with recursive descendants as (
         select q.id root_id,q.id,q.parent_id,q.label,q.display_ref,q.depth,q.sort_order,q.marks,
           coalesce(q.stem_md,'') stem,q.command_word,q.ao,q.answer_kind,q.status
         from questions q where q.id=any($1::uuid[])
         union all
         select d.root_id,q.id,q.parent_id,q.label,q.display_ref,q.depth,q.sort_order,q.marks,
           coalesce(q.stem_md,'') stem,q.command_word,q.ao,q.answer_kind,q.status
         from descendants d join questions q on q.parent_id=d.id
       )
       select * from descendants
       where marks is not null and status='approved'
       order by root_id,sort_order`,
      [rootIds],
    );
    const matchIds = new Set(parts.map((part) => String(part.id)));

    return {
      view: 'families' as const,
      unavailableFilters: unavailableFilters(filters),
      nextCursor: null,
      data: rootIds.map((rootId) => {
        const matchingParts = parts.filter((part) => part.rootId === rootId);
        const allParts = familyRows.rows
          .filter((row) => row.root_id === rootId)
          .map((row) => ({
            id: row.id,
            rootId,
            rootRef: matchingParts[0]?.rootRef ?? row.display_ref,
            displayRef: row.display_ref,
            stem: row.stem,
            stemMd: row.stem,
            marks: Number(row.marks),
            commandWord: row.command_word,
            ao: row.ao,
            answerKind: row.answer_kind,
            status: row.status,
            matches: matchIds.has(row.id),
          }));
        return {
          rootId,
          rootRef: matchingParts[0]?.rootRef ?? allParts[0]?.rootRef ?? '',
          matchCount: matchingParts.length,
          totalCount: allParts.length,
          parts: allParts,
        };
      }),
    };
  }

  async filterOptions(actor: Actor) {
    if (actor.role === 'student') return { topics: [], classes: [] };
    const topics = await this.pool.query(
      `select distinct t.id topic_id,t.number topic_number,t.title topic_title,
         st.id subtopic_id,st.code,st.title subtopic_title,st.sort_order,
         c.number component
       from classes cl
       join topics t on t.syllabus_id=cl.syllabus_id
       join subtopics st on st.topic_id=t.id
       left join components c on c.id=t.component_id
       where cl.archived_at is null
         and (
           ($1='owner' and cl.school_id=$2)
           or ($1='teacher' and (
             cl.owner_id=$3
             or exists(
               select 1 from class_teachers ct
               where ct.class_id=cl.id and ct.teacher_id=$3
             )
           ))
         )
       order by t.number,st.sort_order`,
      [actor.role, actor.schoolId, actor.id],
    );
    const classes = await this.pool.query(
      `select distinct cl.id,cl.name
       from classes cl
       where cl.archived_at is null
         and (
           ($1='owner' and cl.school_id=$2)
           or ($1='teacher' and (
             cl.owner_id=$3
             or exists(
               select 1 from class_teachers ct
               where ct.class_id=cl.id and ct.teacher_id=$3
             )
           ))
         )
       order by cl.name`,
      [actor.role, actor.schoolId, actor.id],
    );
    return { topics: topics.rows, classes: classes.rows };
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
