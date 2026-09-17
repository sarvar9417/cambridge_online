import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export const DEFAULT_LIVE_EXAM_BUILDER_SETTINGS = {
  questionOrder: 'fixed' as const,
  timingMode: 'teacher' as const,
  defaultTimeLimitSeconds: null as number | null,
  allowLateJoin: false,
  autoCloseWhenAllSubmitted: true,
  peerMarkingEnabled: true,
  teacherOverrideEnabled: true,
  leaderboardMode: 'marks' as const,
  displayNameMode: 'first_name' as const,
};

export class LiveExamBuilderService {
  constructor(private readonly pool: Pool) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async validateTaxonomy(syllabusId: string, topicId?: string, subtopicId?: string) {
    if (!topicId && subtopicId) throw new DomainError('live_invalid_taxonomy', 400);
    const result = await this.pool.query(
      `select s.id syllabus_id,s.code syllabus_code,t.id topic_id,t.number topic_number,
         st.id subtopic_id,st.code subtopic_code
       from syllabi s
       left join topics t on t.syllabus_id=s.id and ($2::uuid is null or t.id=$2)
       left join subtopics st on st.topic_id=t.id and ($3::uuid is null or st.id=$3)
       where s.id=$1
         and ($2::uuid is null or t.id is not null)
         and ($3::uuid is null or st.id is not null)`,
      [syllabusId, topicId ?? null, subtopicId ?? null],
    );
    if (!result.rowCount) throw new DomainError('live_invalid_taxonomy', 400);
    return result.rows[0] as {
      syllabus_id: string;
      syllabus_code: string;
      topic_id: string | null;
      topic_number: number | null;
      subtopic_id: string | null;
      subtopic_code: string | null;
    };
  }

  async builderOptions(actor: Actor, syllabusId?: string) {
    this.assertStaff(actor);
    const classes = await this.pool.query(
      `select c.id,c.name,c.grade,c.level::text level,c.academic_year,c.syllabus_id,
         s.code syllabus_code,s.subject
       from classes c
       join syllabi s on s.id=c.syllabus_id
       where c.archived_at is null and (
         ($1='owner' and c.school_id=$2)
         or ($1='teacher' and (
           c.owner_id=$3
           or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3)
         ))
       )
       order by c.academic_year desc,c.name`,
      [actor.role, actor.schoolId, actor.id],
    );

    const controlledSyllabusIds = [...new Set(classes.rows.map((row) => String(row.syllabus_id)))];
    const selectedSyllabusId = syllabusId ?? controlledSyllabusIds[0] ?? null;
    if (syllabusId && !controlledSyllabusIds.includes(syllabusId)) throw new DomainError('not_found', 404);

    const taxonomy = selectedSyllabusId
      ? await this.pool.query(
          `select t.id topic_id,t.number topic_number,t.title topic_title,t.sort_order topic_sort,
             st.id subtopic_id,st.code subtopic_code,st.title subtopic_title,st.sort_order subtopic_sort
           from topics t
           left join subtopics st on st.topic_id=t.id
           where t.syllabus_id=$1
           order by t.sort_order,t.number,st.sort_order,st.code`,
          [selectedSyllabusId],
        )
      : { rows: [] as Record<string, unknown>[] };

    const syllabi = [...new Map(classes.rows.map((row) => [String(row.syllabus_id), {
      id: String(row.syllabus_id),
      code: String(row.syllabus_code),
      subject: String(row.subject),
    }])).values()];

    const topicMap = new Map<string, {
      id: string;
      number: number;
      title: string;
      subtopics: Array<{ id:string; code:string; title:string }>;
    }>();
    for (const row of taxonomy.rows) {
      const id = String(row.topic_id);
      if (!topicMap.has(id)) topicMap.set(id, {
        id,
        number: Number(row.topic_number),
        title: String(row.topic_title),
        subtopics: [],
      });
      if (row.subtopic_id) topicMap.get(id)!.subtopics.push({
        id: String(row.subtopic_id),
        code: String(row.subtopic_code),
        title: String(row.subtopic_title),
      });
    }

    return {
      syllabi,
      selectedSyllabusId,
      topics: [...topicMap.values()],
      classes: classes.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        grade: row.grade === null ? null : Number(row.grade),
        level: String(row.level),
        academicYear: String(row.academic_year),
        syllabusId: String(row.syllabus_id),
        syllabusCode: String(row.syllabus_code),
      })),
      defaultSettings: DEFAULT_LIVE_EXAM_BUILDER_SETTINGS,
    };
  }

  async eligibleQuestions(actor: Actor, input: {
    syllabusId: string;
    topicId?: string;
    subtopicId?: string;
    limit?: number;
  }) {
    this.assertStaff(actor);
    const taxonomy = await this.validateTaxonomy(input.syllabusId, input.topicId, input.subtopicId);
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);

    const result = await this.pool.query(
      `select q.id,q.display_ref,q.stem_md,q.command_word::text command_word,q.marks,
         q.answer_kind::text answer_kind,q.ao::text ao,sp.year,sp.series::text series,
         sp.variant,c.number component
       from questions q
       join source_papers sp on sp.id=q.source_paper_id and sp.kind='QP'::paper_kind
       join syllabi sy on sy.id=sp.syllabus_id and sy.code=$1
       join components c on c.id=q.component_id
       join mark_schemes ms on ms.question_id=q.id
         and ms.status='approved'::review_status and ms.max_marks=q.marks
       join source_papers ms_sp on ms_sp.id=ms.source_paper_id and ms_sp.kind='MS'::paper_kind
       join question_source_occurrences occ on occ.question_id=q.id and occ.is_primary
         and occ.source_paper_id=sp.id and occ.mark_scheme_source_paper_id=ms_sp.id
       where q.status='approved'::review_status
         and q.marks>0
         and q.parent_id is not null
         and q.answer_kind in ('text','pseudocode','code')
         and sp.source_url is not null
         and lower(coalesce(sp.sha256,'')) ~ '^[0-9a-f]{64}$'
         and ms_sp.source_url is not null
         and lower(coalesce(ms_sp.sha256,'')) ~ '^[0-9a-f]{64}$'
         and q.content_version=1 and q.content_json is not null
         and q.content_json->'source'->>'paperId'=sp.id::text
         and lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(sp.sha256)
         and ($2::int is null or exists(
           select 1 from question_subtopics qst
           join subtopics mapped_st on mapped_st.id=qst.subtopic_id
           join topics mapped_t on mapped_t.id=mapped_st.topic_id
           join syllabi mapped_sy on mapped_sy.id=mapped_t.syllabus_id
           where qst.question_id=q.id and mapped_sy.code=$1 and mapped_t.number=$2
         ))
         and ($3::text is null or exists(
           select 1 from question_subtopics qst
           join subtopics mapped_st on mapped_st.id=qst.subtopic_id
           join topics mapped_t on mapped_t.id=mapped_st.topic_id
           join syllabi mapped_sy on mapped_sy.id=mapped_t.syllabus_id
           where qst.question_id=q.id and mapped_sy.code=$1
             and mapped_t.number=$2 and mapped_st.code=$3
         ))
         and exists(
           select 1
           from question_learning_objectives qlo
           join learning_objectives source_lo on source_lo.id=qlo.lo_id
           join subtopics source_st on source_st.id=source_lo.subtopic_id
           join topics source_t on source_t.id=source_st.topic_id
           where qlo.question_id=q.id and (
             source_t.syllabus_id=$4::uuid
             or exists(
               select 1
               from learning_objective_compatibility compat
               join learning_objectives target_lo on target_lo.id=compat.target_lo_id
               join subtopics target_st on target_st.id=target_lo.subtopic_id
               join topics target_t on target_t.id=target_st.topic_id
               where compat.source_lo_id=qlo.lo_id
                 and compat.relation in ('equivalent','subtopic_compatible')
                 and target_t.syllabus_id=$4::uuid
             )
           )
         )
         and not exists(
           select 1 from validation_findings vf
           where vf.ref_table='questions' and vf.ref_id=q.id
             and vf.severity='error' and vf.resolved_at is null
         )
         and not exists(select 1 from question_dependencies qd where qd.question_id=q.id)
         and not exists(
           select 1
           from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block
           where block->>'type'='asset'
             and not exists(
               select 1 from question_assets qa
               where qa.id::text=block->>'assetId'
                 and qa.question_id=q.id
                 and (
                   nullif(btrim(coalesce(qa.storage_path,'')),'') is not null
                   or nullif(btrim(coalesce(qa.svg_markup,'')),'') is not null
                   or nullif(btrim(coalesce(qa.content_md,'')),'') is not null
                 )
             )
         )
       order by sp.year desc,sp.series,c.number,sp.variant,q.sort_order
       limit $5`,
      [
        taxonomy.syllabus_code,
        taxonomy.topic_number,
        taxonomy.subtopic_code,
        taxonomy.syllabus_id,
        limit,
      ],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      displayRef: String(row.display_ref),
      stemMd: row.stem_md === null ? null : String(row.stem_md),
      commandWord: row.command_word === null ? null : String(row.command_word),
      marks: Number(row.marks),
      answerKind: String(row.answer_kind),
      ao: row.ao === null ? null : String(row.ao),
      year: Number(row.year),
      series: String(row.series),
      variant: Number(row.variant),
      component: Number(row.component),
    }));
  }
}
