import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface LiveExamBuilderSettings {
  questionOrder: 'fixed' | 'shuffled';
  timingMode: 'teacher' | 'per_question';
  defaultTimeLimitSeconds: number | null;
  allowLateJoin: boolean;
  autoCloseWhenAllSubmitted: boolean;
  peerMarkingEnabled: boolean;
  teacherOverrideEnabled: boolean;
  displayNameMode: 'first_name' | 'full_name' | 'anonymous';
}

export const DEFAULT_LIVE_EXAM_BUILDER_SETTINGS: LiveExamBuilderSettings = {
  questionOrder: 'fixed',
  timingMode: 'teacher',
  defaultTimeLimitSeconds: null,
  allowLateJoin: false,
  autoCloseWhenAllSubmitted: true,
  peerMarkingEnabled: true,
  teacherOverrideEnabled: true,
  displayNameMode: 'first_name',
};

export class LiveExamBuilderService {
  constructor(private readonly pool: Pool) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async controlledClasses(actor: Actor) {
    this.assertStaff(actor);
    return this.pool.query(
      `select c.id,c.name,c.grade,c.level::text level,c.academic_year,c.syllabus_id,
         s.code syllabus_code,s.subject
       from classes c
       join syllabi s on s.id=c.syllabus_id
       where c.archived_at is null and (
         ($1='owner' and c.school_id=$2)
         or ($1='teacher' and (c.owner_id=$3 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3
         )))
       )
       order by c.academic_year desc,c.name`,
      [actor.role,actor.schoolId,actor.id],
    );
  }

  async builderOptions(actor: Actor, syllabusId?: string) {
    const classes = await this.controlledClasses(actor);
    const syllabusIds = [...new Set(classes.rows.map((row) => String(row.syllabus_id)))];
    const selectedSyllabusId = syllabusId ?? syllabusIds[0] ?? null;
    if (syllabusId && !syllabusIds.includes(syllabusId)) throw new DomainError('not_found', 404);

    const taxonomy = selectedSyllabusId ? await this.pool.query(
      `select t.id topic_id,t.number topic_number,t.title topic_title,t.sort_order topic_sort,
         st.id subtopic_id,st.code subtopic_code,st.title subtopic_title,st.sort_order subtopic_sort
       from topics t
       left join subtopics st on st.topic_id=t.id
       where t.syllabus_id=$1
       order by t.sort_order,t.number,st.sort_order,st.code`,
      [selectedSyllabusId],
    ) : { rows: [] as Record<string,unknown>[] };

    const syllabi = [...new Map(classes.rows.map((row) => [String(row.syllabus_id), {
      id: String(row.syllabus_id),
      code: String(row.syllabus_code),
      subject: String(row.subject),
    }])).values()];

    const topicMap = new Map<string,{
      id:string;
      number:number;
      title:string;
      subtopics:Array<{id:string;code:string;title:string}>;
    }>();
    for (const row of taxonomy.rows) {
      const id = String(row.topic_id);
      if (!topicMap.has(id)) topicMap.set(id, {
        id,
        number:Number(row.topic_number),
        title:String(row.topic_title),
        subtopics:[],
      });
      if (row.subtopic_id) topicMap.get(id)!.subtopics.push({
        id:String(row.subtopic_id),
        code:String(row.subtopic_code),
        title:String(row.subtopic_title),
      });
    }

    return {
      syllabi,
      selectedSyllabusId,
      topics:[...topicMap.values()],
      classes:classes.rows.map((row) => ({
        id:String(row.id),
        name:String(row.name),
        grade:row.grade,
        level:row.level,
        academicYear:row.academic_year,
        syllabusId:String(row.syllabus_id),
        syllabusCode:String(row.syllabus_code),
      })),
      defaultSettings:DEFAULT_LIVE_EXAM_BUILDER_SETTINGS,
    };
  }

  async eligibleQuestions(
    actor: Actor,
    input: { syllabusId:string; topicId?:string; subtopicId?:string; limit:number },
  ) {
    const classes = await this.controlledClasses(actor);
    if (!classes.rows.some((row) => String(row.syllabus_id) === input.syllabusId)) {
      throw new DomainError('not_found', 404);
    }

    const scope = await this.pool.query(
      `select s.id syllabus_id,s.code syllabus_code,t.number topic_number,st.code subtopic_code
       from syllabi s
       left join topics t on t.syllabus_id=s.id and ($2::uuid is null or t.id=$2)
       left join subtopics st on st.topic_id=t.id and ($3::uuid is null or st.id=$3)
       where s.id=$1
         and ($2::uuid is null or t.id is not null)
         and ($3::uuid is null or st.id is not null)`,
      [input.syllabusId,input.topicId ?? null,input.subtopicId ?? null],
    );
    if (!scope.rowCount) throw new DomainError('live_builder_invalid_taxonomy', 400);
    if (input.subtopicId && !input.topicId) throw new DomainError('live_builder_invalid_taxonomy', 400);
    const taxonomy = scope.rows[0];

    const result = await this.pool.query(
      `select distinct q.id,q.display_ref,q.stem_md,q.command_word::text command_word,
         q.marks,q.answer_kind::text answer_kind,q.ao::text ao,
         sp.year,sp.series::text series,sp.variant,c.number component
       from questions q
       join mark_schemes ms on ms.question_id=q.id and ms.status='approved'
       join source_papers sp on sp.id=q.source_paper_id
       join syllabi source_syllabus on source_syllabus.id=sp.syllabus_id
       join components c on c.id=q.component_id
       where q.status='approved'
         and q.marks>0
         and q.parent_id is not null
         and source_syllabus.code=$1
         and not exists(select 1 from question_dependencies qd where qd.question_id=q.id)
         and ($2::int is null or exists(
           select 1 from question_subtopics qst
           join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
           join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
           join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
           where qst.question_id=q.id
             and mapped_syllabus.code=$1 and mapped_topic.number=$2
         ))
         and ($3::text is null or exists(
           select 1 from question_subtopics qst
           join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
           join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
           join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
           where qst.question_id=q.id
             and mapped_syllabus.code=$1 and mapped_topic.number=$2 and mapped_subtopic.code=$3
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
                 and compat.relation in('equivalent','subtopic_compatible')
                 and target_t.syllabus_id=$4::uuid
             )
           )
         )
       order by sp.year desc,sp.series,c.number,sp.variant,q.display_ref
       limit $5`,
      [taxonomy.syllabus_code,taxonomy.topic_number,taxonomy.subtopic_code,input.syllabusId,input.limit],
    );

    return result.rows.map((row) => ({
      id:String(row.id),
      displayRef:String(row.display_ref),
      stem:row.stem_md,
      commandWord:row.command_word,
      marks:Number(row.marks),
      answerKind:row.answer_kind,
      ao:row.ao,
      year:Number(row.year),
      series:row.series,
      variant:Number(row.variant),
      component:Number(row.component),
    }));
  }
}