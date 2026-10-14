import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { AssetUrlSigner } from '../jobs/asset-store.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import type { PortableQuestion } from './selection-review.js';
import { DomainError } from './assignments-service.js';
import { computeScore, type Scheme } from '../lib/marking.js';
import { releasedPointFeedback, type ReleasedPointFeedback } from '../lib/live-point-feedback.js';
import { portableQuestionVisualReady, questionVisualIntegritySql } from '../lib/source-visual-readiness.js';
import { liveCoursebookQuestionFilter, resolveLiveCoursebookSections } from '../lib/live-coursebook-sections.js';
import { liveMarkSchemeCapabilityReady, liveMarkSchemeCapabilitySql } from '../lib/live-mark-scheme-capability.js';
import { sanitizeLiveProjectorSnapshot } from '../lib/live-projector-privacy.js';
import { assignPeerReviewersWithHistory, peerScoreDisagreement, selectPeerCalibrationAnswers, type PeerAnswer } from '../lib/peer-marking-quality.js';

export type LiveExamMarkingMode = 'teacher' | 'peer' | 'self';
export type LiveExamStatus = 'lobby' | 'question_open' | 'marking' | 'review' | 'finished' | 'cancelled';
export const QUESTION_DEADLINE_GRACE_S = 10;
// In many extracted Cambridge papers every leaf has sort_order=1 because that
// column describes its position within a root. Natural numeric Q ordering
// must precede this local part order (otherwise Q10 precedes Q2).
export const LIVE_FIXED_SOURCE_ORDER_SQL=
  "candidate.year desc,candidate.series,candidate.component,"
  +"substring(candidate.display_ref from '[Qq][[:space:]]*([0-9]+)')::int nulls last,"
  +"candidate.sort_order nulls last,candidate.display_ref,candidate.id";


export function resolveLiveQuestionTimeLimit(
  settings: unknown,
  questionId: string,
  fallback: number | null,
) {
  if (!settings || typeof settings !== 'object') return fallback;
  const raw=(settings as Record<string, unknown>).questionTimeLimits;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  if (!Object.prototype.hasOwnProperty.call(raw,questionId)) return fallback;
  const value=(raw as Record<string, unknown>)[questionId];
  if (value===null) return null;
  const numeric=Number(value);
  return Number.isInteger(numeric)&&numeric>=30&&numeric<=7200?numeric:fallback;
}

export interface CreateLiveExamInput {
  classId: string;
  syllabusCode?: '9618' | '0478';
  title: string;
  topicIds: string[];
  subtopicIds: string[];
  /** Hodder/coursebook section codes. Kept separate from official syllabus subtopic IDs. */
  coursebookSectionCodes?: string[];
  questionCount: number;
  questionTimeLimitS?: number;
  /** Manual per-question overrides in seconds; null means unlimited for that question. */
  questionTimeLimits?: Record<string, number | null>;
  markingMode: LiveExamMarkingMode;
  practiceMode?:'solo'|'group'|'collaborative';
  includeDiagrams: boolean;
  excludeSeen: boolean;
  /** Optional builder filters. Difficulty is a transparent marks-based band: easy 1–2, medium 3–4, hard 5+. */
  difficulty?: 'easy' | 'medium' | 'hard';
  marksMin?: number;
  marksMax?: number;
  yearFrom?: number;
  yearTo?: number;
  series?: Array<'FM' | 'MJ' | 'ON'>;
  components?: number[];
  questionIds?: string[];
  questionOrder?: 'fixed' | 'shuffled' | 'balanced';
  allowLateJoin?: boolean;
  autoCloseWhenAllSubmitted?: boolean;
  teacherOverrideEnabled?: boolean;
  leaderboardMode?: 'marks' | 'marks_speed_tiebreak';
  displayNameMode?: 'full' | 'first_name' | 'initials' | 'anonymous_alias';
  /** Percentage of peer answers also independently marked by the teacher for calibration. */
  peerCalibrationPercent?: number;
  /** Cambridge-mark difference that should surface as a peer-quality disagreement. */
  peerDisagreementThreshold?: number;
}

type MarkSchemePointSnapshot = {
  id: string;
  code: string;
  text: string;
  marks: number;
  accept: unknown;
  reject: unknown;
  requires: unknown;
  isBod: boolean;
  groupId: string | null;
};

type MarkSchemeSnapshot = {
  id: string;
  schemeType: string;
  maxMarks: number;
  guidanceMd: string | null;
  levels: Array<{
    id: string;
    levelNumber: number;
    minMarks: number;
    maxMarks: number;
    descriptorMd: string;
    indicativeContentMd: string | null;
  }>;
  points: MarkSchemePointSnapshot[];
  groups: Array<{
    id: string;
    label: string | null;
    nRequired: number;
    marksPerPoint: number;
    maxMarks: number;
    awardMode: 'fixed' | 'point_marks';
  }>;
};

type StoredQuestionSnapshot = Omit<PortableQuestion, 'dependencies'> & {
  dependencies: Array<Omit<PortableQuestion['dependencies'][number], 'evidence' | 'confidence'>>;
};

/**
 * Backward-compatible pure helper used by existing tests. Runtime peer rounds
 * additionally feed recent directed-pair history into the same allocator.
 */
export function assignPeerReviewers(answers: PeerAnswer[], seed: string) {
  return assignPeerReviewersWithHistory(answers, seed);
}

function words(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function storedPortable(portable: PortableQuestion): StoredQuestionSnapshot {
  return {
    ...portable,
    dependencies: portable.dependencies.map(({ evidence: _evidence, confidence: _confidence, ...dependency }) => dependency),
    contextBlocks: portable.contextBlocks.map((block) => ({
      ...block,
      assets: block.assets.map((asset) => ({ ...asset, url: null })),
    })),
  };
}

export class LiveExamService {
  private readonly signedAssetCache = new Map<string, { value: Promise<string | null>; expiresAt: number }>();

  constructor(
    private readonly pool: Pool,
    private readonly questions: PgQuestionsRepository,
    private readonly assetUrlSigner?: AssetUrlSigner,
  ) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  /** Current enrollment is mandatory for student-created practice. */
  private async requirePracticeClass(executor:Pick<Pool,'query'>|PoolClient,actor:Actor,classId:string){
    if(actor.role!=='student')return this.requireClassControl(executor,actor,classId);
    const result=await executor.query(
      `select c.id,c.name from classes c
       join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
       where c.id=$1 and c.archived_at is null and c.school_id=$3
       for share of e`,
      [classId,actor.id,actor.schoolId],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    return result.rows[0] as {id:string;name:string};
  }
  private validatePracticeMode(actor:Actor,input:CreateLiveExamInput){
    if(actor.role!=='student'){
      if(input.practiceMode!==undefined)throw new DomainError('live_practice_mode_staff',400);
      return;
    }
    if(!input.practiceMode || !['solo','group','collaborative'].includes(input.practiceMode)
      || input.questionCount<1 || input.questionCount>12
      || (input.practiceMode==='group'?input.markingMode!=='peer':input.markingMode!=='self')
      || input.teacherOverrideEnabled===true || Number(input.peerCalibrationPercent??0)!==0)
      throw new DomainError('live_student_practice_invalid',400);
  }
  private async requireClassControl(executor: Pick<Pool, 'query'> | PoolClient, actor: Actor, classId: string) {
    this.assertStaff(actor);
    const result = await executor.query(
      `select c.id,c.name
       from classes c
       where c.id=$1 and c.archived_at is null and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )`,
      [classId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0] as { id: string; name: string };
  }

  private async lockControlledSession(client: PoolClient, actor: Actor, sessionId: string) {
    const result = await client.query(
      `select les.*
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
         or ($2='student' and les.host_id=$4 and c.school_id=$3
           and les.settings->>'practiceMode' in ('solo','group','collaborative')
           and c.archived_at is null
           and exists(select 1 from enrollments host_membership
             where host_membership.class_id=les.class_id
               and host_membership.student_id=$4 and host_membership.left_at is null))
       )
       for update of les`,
      [sessionId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0] as Record<string, unknown>;
  }

  private assertExpectedVersion(session: Record<string, unknown>, expectedVersion?: number) {
    if (expectedVersion !== undefined && Number(session.version) !== expectedVersion) {
      throw new DomainError('live_state_conflict', 409, {
        currentVersion: Number(session.version),
        currentStatus: session.status,
      });
    }
  }

  private async bump(
    client: PoolClient,
    sessionId: string,
    actorId: string | null,
    eventType: string,
    payload: Record<string, unknown> = {},
  ) {
    const changed = await client.query(
      `update live_exam_sessions
       set version=version+1,updated_at=now()
       where id=$1
       returning version`,
      [sessionId],
    );
    const version = Number(changed.rows[0].version);
    await client.query(
      `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
       values($1,$2,$3,$4,$5::jsonb)`,
      [sessionId, actorId, eventType, version, JSON.stringify(payload)],
    );
    return version;
  }

  private async markScheme(questionId: string): Promise<MarkSchemeSnapshot> {
    const result = await this.pool.query(
      `select jsonb_build_object(
         'id',ms.id,'schemeType',ms.scheme_type,'maxMarks',ms.max_marks,'guidanceMd',ms.guidance_md,
         'levels',coalesce((select jsonb_agg(jsonb_build_object(
           'id',msl.id,'levelNumber',msl.level_number,'minMarks',msl.min_marks,
           'maxMarks',msl.max_marks,'descriptorMd',msl.descriptor_md,
           'indicativeContentMd',msl.indicative_content_md
         ) order by msl.level_number,msl.id) from mark_scheme_levels msl where msl.mark_scheme_id=ms.id),'[]'::jsonb),
         'points',coalesce((select jsonb_agg(jsonb_build_object(
           'id',msp.id,'code',msp.code,'text',msp.text,'marks',msp.marks,
           'accept',msp.accept,'reject',msp.reject,'requires',msp.requires,'isBod',msp.is_bod,
           'groupId',msp.group_id
         ) order by msp.sort_order,msp.id) from mark_scheme_points msp where msp.mark_scheme_id=ms.id),'[]'::jsonb),
         'groups',coalesce((select jsonb_agg(jsonb_build_object(
           'id',msg.id,'label',msg.label,'nRequired',msg.n_required,
           'marksPerPoint',msg.marks_per_point,'maxMarks',msg.max_marks,'awardMode',msg.award_mode
         ) order by msg.sort_order,msg.id) from mark_scheme_groups msg where msg.mark_scheme_id=ms.id),'[]'::jsonb)
       ) scheme
       from canonical_mark_schemes ms
       where ms.question_id=$1 and ms.status='approved'`,
      [questionId],
    );
    const scheme=result.rows[0]?.scheme as MarkSchemeSnapshot|undefined;
    if (!scheme || !liveMarkSchemeCapabilityReady(scheme)) throw new DomainError('live_question_not_ready', 409);
    return scheme;
  }

  private async countDatabaseQuestions(input: Pick<CreateLiveExamInput,
    'syllabusCode' | 'topicIds' | 'subtopicIds' | 'coursebookSectionCodes' | 'difficulty' | 'marksMin' | 'marksMax' |
    'yearFrom' | 'yearTo' | 'series' | 'components'
  >) {
    this.validateSyllabusSelection(input);
    const values: unknown[] = [input.syllabusCode??'9618'];
    const filters = [
      `q.status='approved'`,
      `q.marks>0`,
      `source_syllabus.code=$1`,
      ...(input.syllabusCode==='0478'?['source_component.number=2']:[]),
    ];
    const coursebookFilter=liveCoursebookQuestionFilter(values,input.coursebookSectionCodes??[],'q');
    if(coursebookFilter)filters.push(coursebookFilter);
    if (input.topicIds.length) {
      values.push(input.topicIds);
      const parameter = '$'+values.length;
      filters.push(`exists(
        select 1 from question_subtopics qst
        join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
        join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
        join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
        where qst.question_id=q.id and exists(
          select 1 from topics selected_topic
          join syllabi selected_syllabus on selected_syllabus.id=selected_topic.syllabus_id
          where selected_topic.id=any(${parameter}::uuid[])
            and selected_syllabus.code=mapped_syllabus.code
            and selected_topic.number=mapped_topic.number
        )
      )`);
    }
    if (input.subtopicIds.length) {
      values.push(input.subtopicIds);
      const parameter = '$'+values.length;
      filters.push(`exists(
        select 1 from question_subtopics qst
        join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
        join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
        join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
        where qst.question_id=q.id and exists(
          select 1 from subtopics selected_subtopic
          join topics selected_topic on selected_topic.id=selected_subtopic.topic_id
          join syllabi selected_syllabus on selected_syllabus.id=selected_topic.syllabus_id
          where selected_subtopic.id=any(${parameter}::uuid[])
            and selected_syllabus.code=mapped_syllabus.code
            and selected_topic.number=mapped_topic.number
            and selected_subtopic.code=mapped_subtopic.code
        )
      )`);
    }
    if (input.difficulty === 'easy') filters.push('q.marks between 1 and 2');
    if (input.difficulty === 'medium') filters.push('q.marks between 3 and 4');
    if (input.difficulty === 'hard') filters.push('q.marks>=5');
    if (input.marksMin !== undefined) {
      values.push(input.marksMin);
      filters.push(`q.marks>=$${values.length}`);
    }
    if (input.marksMax !== undefined) {
      values.push(input.marksMax);
      filters.push(`q.marks<=$${values.length}`);
    }
    if (input.yearFrom !== undefined) {
      values.push(input.yearFrom);
      filters.push(`sp.year>=$${values.length}`);
    }
    if (input.yearTo !== undefined) {
      values.push(input.yearTo);
      filters.push(`sp.year<=$${values.length}`);
    }
    if (input.series?.length) {
      values.push(input.series);
      filters.push(`sp.series::text=any($${values.length}::text[])`);
    }
    if (input.components?.length) {
      values.push(input.components);
      filters.push(`source_component.number=any($${values.length}::int[])`);
    }
    const result = await this.pool.query(
      `select count(distinct q.id)::int total
       from questions q
       join source_papers sp on sp.id=q.source_paper_id
       join syllabi source_syllabus on source_syllabus.id=sp.syllabus_id
       join components source_component on source_component.id=sp.component_id
       where ${filters.join(' and ')}`,
      values,
    );
    return Number(result.rows[0]?.total ?? 0);
  }

  /**
   * Keep parts of the same authentic source-paper question adjacent without
   * mixing papers or changing the teacher's deliberately fixed manual order.
   * The dependency closure still runs afterwards and keeps prerequisites
   * before the dependent part.
   */
  private groupSourceQuestionParts(rows:Array<{
    id:string;display_ref?:string|null;sort_order?:number|null;
  }>) {
    const groups=new Map<string,typeof rows>();
    for(const row of rows){
      const ref=String(row.display_ref??'');
      const match=ref.match(/^(.*?\bQ\s*\d+)(?=\s*(?:\(|$))/i);
      const key=match ? match[1]!.replace(/\s+/g,' ').toUpperCase() : row.id;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key)!.push(row);
    }
    return [...groups.values()].flatMap(group=>group.length===1?group:group.sort((a,b)=>{
      const left=a.sort_order,right=b.sort_order;
      if(left!=null&&right!=null&&left!==right)return left-right;
      return String(a.display_ref??'').localeCompare(String(b.display_ref??''),undefined,{numeric:true});
    })).map(row=>row.id);
  }

  private validateSyllabusSelection(input: Pick<CreateLiveExamInput,'syllabusCode'|'coursebookSectionCodes'|'components'>) {
    const code=input.syllabusCode??'9618';
    if(code!=='9618'&&code!=='0478')throw new DomainError('live_invalid_syllabus',400);
    if(code==='0478'&&(input.coursebookSectionCodes?.length||input.components?.some(value=>value!==2)))
      throw new DomainError('live_0478_paper2_only',400);
  }

  private async requireQuestionSourceScope(questionIds:string[],syllabusCode:'9618'|'0478') {
    if(!questionIds.length)return;
    const result=await this.pool.query(
      `select count(*)::int invalid
       from questions q join source_papers sp on sp.id=q.source_paper_id
       join syllabi sy on sy.id=sp.syllabus_id
       join components c on c.id=sp.component_id
       where q.id=any($1::uuid[])
         and (sy.code<>$2 or ($2='0478' and c.number<>2))`,
      [questionIds,syllabusCode],
    );
    if(Number(result.rows[0]?.invalid??0)!==0)
      throw new DomainError('live_question_syllabus_mismatch',409);
  }

  private async chooseQuestionIds(
    actor: Actor,
    input: CreateLiveExamInput,
    requireExact = true,
    countOnly = false,
    options: { offset?: number; search?: string; sort?: 'random' | 'source'; seed?: string } = {},
  ) {
    // Keep the random ordering seed first and bind the class ID for both
    // syllabus-safe readiness resolution and optional seen-question filtering.
    // Manual pool browsing uses deterministic source order while room creation
    // keeps the existing seeded random selection behavior.
    // Automatic Fixed uses source ordering and must not bind a random seed:
    // PostgreSQL rejects an unused $1 parameter (42P18).
    this.validateSyllabusSelection(input);
    const syllabusCode=input.syllabusCode??'9618';
    const automaticFixed=!input.questionIds?.length && input.questionOrder==='fixed';
    const sourceOrdered = !countOnly && (options.sort === 'source' || automaticFixed);
    const values: unknown[] = countOnly || sourceOrdered
      ? [input.classId]
      : [options.seed ?? randomUUID(), input.classId];
    const classParameter = countOnly || sourceOrdered ? '$1' : '$2';
    values.push(syllabusCode);
    const syllabusParameter='$'+values.length;
    // 0478 sessions can run in an existing 9618 class but MUST read from
    // 0478 source papers only, with 0478-specific readiness and no 9618 LO
    // fallback. The optional chapter bridge remains strictly 9618-only.
    const targetSyllabusSql=syllabusCode==='0478'?'sp.syllabus_id':'live_class.syllabus_id';
    const cachedSyllabusSql=syllabusCode==='0478'?'sp.syllabus_id':'readiness_class.syllabus_id';

    // Prefer the precomputed readiness cache when its revision matches the
    // current corpus. Any source mutation marks the cache stale, at which point
    // this query fails safely back to the original dynamic gate until the cache
    // is explicitly refreshed.
    const readinessCacheFresh = `coalesce((
      select state.cache_revision=state.corpus_revision
      from live_question_readiness_state state
      where state.singleton=true
    ),false)`;
    const cachedReadiness = `exists(
      select 1
      from classes readiness_class
      join live_question_readiness readiness
        on readiness.target_syllabus_id=${cachedSyllabusSql}
       and readiness.question_id=q.id
      where readiness_class.id=${classParameter}
        and readiness.live_ready
        and exists(
          select 1 from canonical_mark_schemes readiness_ms
          where readiness_ms.question_id=q.id
            and readiness_ms.status='approved'
            and ${liveMarkSchemeCapabilitySql('readiness_ms')}
        )
        ${input.includeDiagrams ? '' : 'and not readiness.has_visual'}
    )`;

    const dynamicReadinessFilters = [
      `q.status='approved'`,
      `q.marks>0`,
      `ms.status='approved'`,
      liveMarkSchemeCapabilitySql('ms'),
      questionVisualIntegritySql('q'),
      // Finished sessions publish mastery into the class syllabus. Prefer direct
      // or explicitly reviewed LO compatibility, but do not discard a valid
      // Cambridge question solely because an older syllabus split its LOs
      // differently. A high-confidence primary subtopic may fall back to the
      // same stable topic-number + subtopic-code in the class syllabus; the
      // learning-evidence trigger records that fallback as subtopic evidence,
      // never as an invented learning-objective match.
      `exists(
        select 1
        from classes live_class
        where live_class.id=${classParameter}
          and (
            exists(
              select 1
              from question_learning_objectives qlo
              join learning_objectives direct_lo on direct_lo.id=qlo.lo_id
              join subtopics direct_st on direct_st.id=direct_lo.subtopic_id
              join topics direct_t on direct_t.id=direct_st.topic_id
              where qlo.question_id=q.id
                and direct_t.syllabus_id=${targetSyllabusSql}
            )
            or exists(
              select 1
              from question_learning_objectives qlo
              join learning_objective_compatibility compat
                on compat.source_lo_id=qlo.lo_id
               and compat.relation in ('equivalent','subtopic_compatible')
              join learning_objectives target_lo on target_lo.id=compat.target_lo_id
              join subtopics target_st on target_st.id=target_lo.subtopic_id
              join topics target_t on target_t.id=target_st.topic_id
              where qlo.question_id=q.id
                and target_t.syllabus_id=${targetSyllabusSql}
            )
            or exists(
              select 1
              from question_subtopics qst
              join subtopics source_st on source_st.id=qst.subtopic_id
              join topics source_t on source_t.id=source_st.topic_id
              join topics target_t
                on target_t.syllabus_id=${targetSyllabusSql}
               and target_t.number=source_t.number
              join subtopics target_st
                on target_st.topic_id=target_t.id
               and target_st.code=source_st.code
              where qst.question_id=q.id
                and qst.is_primary
                and coalesce(qst.confidence,0)>=0.95
            )
          )
      )`,
    ];
    if (!input.includeDiagrams) {
      dynamicReadinessFilters.push(`not exists(
        with recursive ancestry as (
          select q.id,q.parent_id
          union all
          select parent.id,parent.parent_id
          from ancestry child join questions parent on parent.id=child.parent_id
        )
        select 1 from ancestry join question_assets qa on qa.question_id=ancestry.id
        where qa.kind in ('diagram','image')
      )`);
    }

    const filters: string[] = [
      `source_syllabus.code=${syllabusParameter}`,
      ...(syllabusCode==='0478'?['source_component.number=2']:[]),
    ];
    const coursebookFilter=liveCoursebookQuestionFilter(values,input.coursebookSectionCodes??[],'q');
    if(coursebookFilter)filters.push(coursebookFilter);
    if (input.topicIds.length) {
      values.push(input.topicIds);
      const parameter = `$${values.length}`;
      filters.push(`exists(
        select 1 from question_subtopics qst
        join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
        join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
        join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
        where qst.question_id=q.id and exists(
          select 1 from topics selected_topic
          join syllabi selected_syllabus on selected_syllabus.id=selected_topic.syllabus_id
          where selected_topic.id=any(${parameter}::uuid[])
            and selected_syllabus.code=mapped_syllabus.code
            and selected_topic.number=mapped_topic.number
        )
      )`);
    }
    if (input.subtopicIds.length) {
      values.push(input.subtopicIds);
      const parameter = `$${values.length}`;
      filters.push(`exists(
        select 1 from question_subtopics qst
        join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
        join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
        join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
        where qst.question_id=q.id and exists(
          select 1 from subtopics selected_subtopic
          join topics selected_topic on selected_topic.id=selected_subtopic.topic_id
          join syllabi selected_syllabus on selected_syllabus.id=selected_topic.syllabus_id
          where selected_subtopic.id=any(${parameter}::uuid[])
            and selected_syllabus.code=mapped_syllabus.code
            and selected_topic.number=mapped_topic.number
            and selected_subtopic.code=mapped_subtopic.code
        )
      )`);
    }
    if (input.questionIds?.length) {
      values.push(input.questionIds);
      filters.push(`q.id=any($${values.length}::uuid[])`);
    }
    if (input.difficulty === 'easy') filters.push('q.marks between 1 and 2');
    if (input.difficulty === 'medium') filters.push('q.marks between 3 and 4');
    if (input.difficulty === 'hard') filters.push('q.marks>=5');
    if (input.marksMin !== undefined) {
      values.push(input.marksMin);
      filters.push(`q.marks>=$${values.length}`);
    }
    if (input.marksMax !== undefined) {
      values.push(input.marksMax);
      filters.push(`q.marks<=$${values.length}`);
    }
    if (input.yearFrom !== undefined) {
      values.push(input.yearFrom);
      filters.push(`sp.year>=$${values.length}`);
    }
    if (input.yearTo !== undefined) {
      values.push(input.yearTo);
      filters.push(`sp.year<=$${values.length}`);
    }
    if (input.series?.length) {
      values.push(input.series);
      filters.push(`sp.series::text=any($${values.length}::text[])`);
    }
    if (input.components?.length) {
      values.push(input.components);
      filters.push(`source_component.number=any($${values.length}::int[])`);
    }
    if (options.search?.trim()) {
      values.push(options.search.trim());
      const parameter=`$${values.length}`;
      filters.push(`(q.display_ref ilike '%'||${parameter}||'%' or coalesce(q.stem_md,'') ilike '%'||${parameter}||'%')`);
    }
    if (input.excludeSeen) {
      filters.push(`not exists(
        select 1 from assignment_questions aq
        join assignments a on a.id=aq.assignment_id
        where aq.question_id=q.id and a.class_id=${classParameter}
      )`);
      filters.push(`not exists(
        select 1 from class_question_exposures exposure
        where exposure.class_id=${classParameter}
          and exposure.question_id=q.id
          and exposure.source_type='live'
      )`);
    }
    const candidateSql = `
         select distinct q.id,q.display_ref,sp.year,sp.series::text series,source_component.number component,q.sort_order
         from questions q
         join source_papers sp on sp.id=q.source_paper_id
         join syllabi source_syllabus on source_syllabus.id=sp.syllabus_id
         join components source_component on source_component.id=sp.component_id
         where ${readinessCacheFresh}
           and ${cachedReadiness}
           ${filters.length ? `and ${filters.join(' and ')}` : ''}
         union all
         select distinct q.id,q.display_ref,sp.year,sp.series::text series,source_component.number component,q.sort_order
         from questions q
         join source_papers sp on sp.id=q.source_paper_id
         join syllabi source_syllabus on source_syllabus.id=sp.syllabus_id
         join components source_component on source_component.id=sp.component_id
         join canonical_mark_schemes ms on ms.question_id=q.id
         where not ${readinessCacheFresh}
           and ${dynamicReadinessFilters.join(' and ')}
           ${filters.length ? `and ${filters.join(' and ')}` : ''}
    `;
    if (countOnly) {
      const result = await this.pool.query(
        `select count(*)::int total from (${candidateSql}) candidate`,
        values,
      );
      return { ids:[] as string[],total:Number(result.rows[0]?.total ?? 0) };
    }
    values.push(input.questionCount);
    const limitParameter='$'+values.length;
    let offsetClause='';
    if ((options.offset ?? 0) > 0) {
      values.push(options.offset);
      offsetClause=' offset $'+values.length;
    }
    const sourceOrder=LIVE_FIXED_SOURCE_ORDER_SQL;
    const orderClause=options.sort==='source' || automaticFixed
      ? sourceOrder
      : 'md5(candidate.id::text || $1::text)';
    const selectedSections=[...new Set(input.coursebookSectionCodes??[])];
    const balanced=!countOnly && options.sort!=='source' && !input.questionIds?.length
      && input.questionOrder==='balanced' && selectedSections.length>1;
    let query='select candidate.id,candidate.display_ref,candidate.sort_order,count(*) over()::int total_count from ('
      +candidateSql+') candidate order by '+orderClause+' limit '+limitParameter+offsetClause;
    if(balanced){
      // An isolated bucket for each selected Hodder section and a round-robin
      // selection across buckets prevents large sections dominating the game.
      // Shared questions are assigned to exactly one bucket. Rotate the bucket
      // priority by session seed to avoid favouring the first checkbox.
      const seed=String(values[0]);
      const sections=selectedSections.sort((a,b)=>{
        const hash=(code:string)=>createHash('sha256').update(seed).update(code).digest('hex');
        return hash(a).localeCompare(hash(b));
      });
      const chapterBySection=new Map(
        resolveLiveCoursebookSections(sections).map(section=>[section.code,section.chapterNumber]),
      );
      const conditions=sections.map((code,index)=>{
        const predicate=liveCoursebookQuestionFilter(values,[code],'bucket_question');
        return `when ${predicate} then ${index}`;
      });
      const chapterCases=sections.map((code,index)=>
        `when ${index} then ${chapterBySection.get(code)}`
      );
      // Chapter is the outer fairness unit: selecting more sections in one
      // chapter must not make that chapter dominate the challenge. Within each
      // chapter rotate among its ready sections; finally rotate chapters.
      // The one-section ownership CASE ensures an overlapping source question
      // never occupies two buckets or appears twice.
      query=`select ranked.id,ranked.display_ref,ranked.sort_order,count(*) over()::int total_count
        from (
          select sectioned.*,
            row_number() over (
              partition by sectioned.chapter_bucket
              order by sectioned.section_rank,md5(sectioned.id::text || $1::text)
            ) chapter_rank
          from (
            select bucketed.*,
              case bucketed.section_bucket ${chapterCases.join(' ')} else -1 end chapter_bucket,
              row_number() over (
                partition by bucketed.section_bucket
                order by md5(bucketed.id::text || $1::text)
              ) section_rank
            from (
              select candidate.*,
                case ${conditions.join(' ')} else ${sections.length} end section_bucket
              from (${candidateSql}) candidate
              join questions bucket_question on bucket_question.id=candidate.id
            ) bucketed
          ) sectioned
        ) ranked
        order by ranked.chapter_rank,md5(ranked.id::text || $1::text)
        limit ${limitParameter}${offsetClause}`;
    }
    const result = await this.pool.query(query,values);
    const total = Number(result.rows[0]?.total_count ?? result.rowCount ?? 0);
    if (requireExact && total < input.questionCount) throw new DomainError('live_question_pool_small', 409);
    const rows=result.rows.map((row)=>({
      id:String(row.id),display_ref:row.display_ref as string|null,
      sort_order:row.sort_order==null?null:Number(row.sort_order),
    }));
    if (input.questionIds?.length && input.questionOrder !== 'shuffled'
       && input.questionOrder !== 'balanced') {
      const available = new Set(rows.map(row=>row.id));
      return { ids:input.questionIds.filter((id) => available.has(id)),total };
    }
    return {
      ids:!countOnly && options.sort!=='source' && !automaticFixed
        ? this.groupSourceQuestionParts(rows) : rows.map(row=>row.id),
      total,
    };
  }

  private async expandRequiredDependencies(questionIds: string[]) {
    if (!questionIds.length) return [];
    const result = await this.pool.query(
      `with recursive closure(question_id) as (
         select unnest($1::uuid[])
         union
         select qd.depends_on_id
         from closure c
         join question_dependencies qd on qd.question_id=c.question_id
         where qd.strength::text='required'
       )
       select c.question_id,q.status::text status,q.marks,
         exists(
           select 1 from canonical_mark_schemes ms
           where ms.question_id=c.question_id and ms.status='approved'
         ) mark_scheme_ready,
         coalesce(
           array_agg(qd.depends_on_id order by target.sort_order,target.id)
             filter(where qd.depends_on_id is not null),
           '{}'::uuid[]
         ) dependencies
       from closure c
       join questions q on q.id=c.question_id
       left join question_dependencies qd
         on qd.question_id=c.question_id and qd.strength::text='required'
       left join questions target on target.id=qd.depends_on_id
       group by c.question_id,q.status,q.marks`,
      [questionIds],
    );

    const nodes = new Map<string, { status:string; marks:number|null; markSchemeReady:boolean; dependencies:string[] }>();
    for (const row of result.rows) {
      nodes.set(String(row.question_id), {
        status: String(row.status),
        marks: row.marks == null ? null : Number(row.marks),
        markSchemeReady: Boolean(row.mark_scheme_ready),
        dependencies: (row.dependencies ?? []).map(String),
      });
    }

    const ordered: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (questionId: string) => {
      if (visited.has(questionId)) return;
      if (visiting.has(questionId)) throw new DomainError('live_dependency_cycle', 409);
      const node = nodes.get(questionId);
      if (!node) throw new DomainError('live_dependency_target_missing', 409);
      if (node.status !== 'approved' || !node.marks || !node.markSchemeReady) {
        throw new DomainError('live_question_not_ready', 409);
      }
      visiting.add(questionId);
      for (const dependencyId of node.dependencies) visit(dependencyId);
      visiting.delete(questionId);
      visited.add(questionId);
      ordered.push(questionId);
    };
    for (const questionId of questionIds) visit(questionId);
    return ordered;
  }

  private async previewQuestions(questionIds:string[]) {
    if (!questionIds.length) return [];
    const result=await this.pool.query(
      `with recursive selected(question_id,ordinality) as (
         select question_id,ordinality
         from unnest($1::uuid[]) with ordinality picked(question_id,ordinality)
       ), ancestry(selected_id,ancestor_id,parent_id) as (
         select selected.question_id,q.id,q.parent_id
         from selected join questions q on q.id=selected.question_id
         union all
         select ancestry.selected_id,parent.id,parent.parent_id
         from ancestry join questions parent on parent.id=ancestry.parent_id
       )
       select q.id,q.display_ref,q.marks,q.command_word,coalesce(q.stem_md,'') stem,
         sp.year,sp.series::text series,source_component.number component,
         exists(
           select 1 from ancestry
           join question_assets asset on asset.question_id=ancestry.ancestor_id
           where ancestry.selected_id=q.id
         ) has_assets,
         (select count(*)::int from question_dependencies dependency
          where dependency.question_id=q.id and dependency.strength::text='required') dependency_count
       from selected
       join questions q on q.id=selected.question_id
       join source_papers sp on sp.id=q.source_paper_id
       join components source_component on source_component.id=sp.component_id
       order by selected.ordinality`,
      [questionIds],
    );
    return result.rows.map((row)=>({
      id:String(row.id),
      displayRef:String(row.display_ref),
      marks:Number(row.marks),
      commandWord:row.command_word == null ? null : String(row.command_word),
      stem:String(row.stem),
      year:Number(row.year),
      series:String(row.series),
      component:Number(row.component),
      difficulty:Number(row.marks)<=2?'easy':Number(row.marks)<=4?'medium':'hard',
      hasAssets:Boolean(row.has_assets),
      dependencyCount:Number(row.dependency_count),
    }));
  }

  async eligibleQuestions(
    actor: Actor,
    input: Omit<CreateLiveExamInput, 'title' | 'markingMode' | 'questionCount'> & {
      limit: number;
      offset?: number;
      search?: string;
      includeData?: boolean;
      includeCounts?: boolean;
    },
  ) {
    if(actor.role==='student' && input.limit>100)throw new DomainError('live_student_question_page_limit',400);
    await this.requirePracticeClass(this.pool, actor, input.classId);
    if ((input.syllabusCode??'9618')==='9618'&&!input.topicIds.length && !input.subtopicIds.length && !(input.coursebookSectionCodes?.length)) throw new DomainError('live_topic_required', 400);
    const selectionPromise = this.chooseQuestionIds(actor, {
      ...input,
      title: 'Question preview',
      markingMode: 'teacher',
      questionCount: input.limit,
      questionIds: undefined,
    }, false, false, {
      offset:input.offset ?? 0,
      search:input.search,
      sort:'source',
      seed:'live-builder-pool',
    });
    let selection;
    let databaseTotal: number | undefined;
    let liveReadyTotal: number | undefined;
    if (input.includeCounts === false) {
      selection = await selectionPromise;
    } else {
      // These counts are independent. Running them together removes two remote
      // database round trips from the full question-picker wait without
      // changing the authoritative selection rules.
      const liveReadyPromise = input.includeDiagrams && !input.excludeSeen
        ? selectionPromise.then((candidate) => candidate.total)
        : this.chooseQuestionIds(actor, {
            ...input,
            title: 'Question availability',
            markingMode: 'teacher',
            questionCount: 1,
            includeDiagrams: true,
            excludeSeen: false,
            questionIds: undefined,
          }, false, true).then((candidate) => candidate.total);
      [selection,databaseTotal,liveReadyTotal] = await Promise.all([
        selectionPromise,
        this.countDatabaseQuestions(input),
        liveReadyPromise,
      ]);
    }
    const rows = input.includeData === false ? [] : await this.previewQuestions(selection.ids);
    return {
      data:rows,
      total:selection.total,
      ...(databaseTotal === undefined || liveReadyTotal === undefined ? {} : { counts:{
        database:databaseTotal,
        liveReady:liveReadyTotal,
        available:selection.total,
      } }),
    };
  }

  async previewSelection(
    actor: Actor,
    input: Omit<CreateLiveExamInput, 'title' | 'markingMode' | 'questionCount'> & { questionIds: string[] },
  ) {
    await this.requirePracticeClass(this.pool, actor, input.classId);
    if(actor.role==='student' && input.questionIds.length>12)throw new DomainError('live_student_practice_invalid',400);
    if (!input.questionIds.length) throw new DomainError('live_question_selection_mismatch', 400);
    if ((input.syllabusCode??'9618')==='9618'&&!input.topicIds.length && !input.subtopicIds.length && !(input.coursebookSectionCodes?.length)) {
      throw new DomainError('live_topic_required', 400);
    }

    const selection=await this.chooseQuestionIds(actor,{
      ...input,
      title:'Selection preview',
      markingMode:'teacher',
      questionCount:input.questionIds.length,
      questionOrder:'fixed',
    },true);
    if(selection.ids.length!==input.questionIds.length) throw new DomainError('live_question_selection_mismatch',400);

    const expandedIds=await this.expandRequiredDependencies(selection.ids);
    if((input.syllabusCode??'9618')==='0478')await this.requireQuestionSourceScope(expandedIds,input.syllabusCode??'9618');
    const [selected,expanded]=await Promise.all([
      this.previewQuestions(selection.ids),
      this.previewQuestions(expandedIds),
    ]);
    const selectedSet=new Set(selection.ids);
    const dependencies=expanded.filter((row)=>!selectedSet.has(row.id));
    const selectedMarks=selected.reduce((sum,row)=>sum+row.marks,0);
    const expandedMarks=expanded.reduce((sum,row)=>sum+row.marks,0);
    return {
      selected,
      dependencies,
      requestedCount:selected.length,
      expandedCount:expanded.length,
      dependencyCount:dependencies.length,
      requestedMarks:selectedMarks,
      expandedMarks,
    };
  }

  async create(actor: Actor, input: CreateLiveExamInput) {
    if(input.questionIds?.length && input.questionOrder==='balanced')
      throw new DomainError('live_manual_balanced_unsupported',400);
    this.validatePracticeMode(actor,input);
    await this.requirePracticeClass(this.pool, actor, input.classId);
    if ((input.syllabusCode??'9618')==='9618'&&!input.topicIds.length && !input.subtopicIds.length && !(input.coursebookSectionCodes?.length)) throw new DomainError('live_topic_required', 400);
    if (input.questionIds?.length && input.questionIds.length !== input.questionCount) {
      throw new DomainError('live_question_selection_mismatch', 400);
    }

    const selection = await this.chooseQuestionIds(actor, input);
    const questionIds = selection.ids;
    const expandedQuestionIds = await this.expandRequiredDependencies(questionIds);
    if((input.syllabusCode??'9618')==='0478')await this.requireQuestionSourceScope(expandedQuestionIds,input.syllabusCode??'9618');
    // Bound the total frozen source payload for learner-owned rooms while
    // preserving the existing unrestricted staff/classroom builder.
    if(actor.role==='student' && expandedQuestionIds.length>36)
      throw new DomainError('live_student_dependency_limit',409);
    const snapshots = await Promise.all(expandedQuestionIds.map(async (questionId) => {
      const [portable, markScheme] = await Promise.all([
        this.questions.portable(actor.role==='student'?{...actor,role:'teacher'}:actor, questionId),
        this.markScheme(questionId),
      ]);
      if (!portable) throw new DomainError('live_question_not_ready', 409);
      const sourceAssets=portable.contextBlocks.flatMap((block)=>block.assets);
      if (!portableQuestionVisualReady(portable.leaf.contentJson,sourceAssets)) {
        throw new DomainError('live_assets_unavailable', 409);
      }
      return { questionId, portable: storedPortable(portable), markScheme };
    }));

    const client = await this.pool.connect();
    try {
      let session;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await client.query('begin');
        try {
          if(actor.role==='student'){
            await client.query('select pg_advisory_xact_lock(hashtext($1))',[actor.id]);
            // Re-check current membership within the same transaction that
            // creates the room, after serializing simultaneous host requests.
            await this.requirePracticeClass(client, actor, input.classId);
            const active=await client.query(
              `select count(*)::int count from live_exam_sessions
               where host_id=$1 and settings->>'practiceMode' in ('solo','group','collaborative')
                 and status not in ('finished','cancelled') and archived_at is null`,
              [actor.id],
            );
            if(Number(active.rows[0].count)>=3)throw new DomainError('live_student_practice_limit',409);
          } else {
            await this.requireClassControl(client, actor, input.classId);
          }
          const joinCode = String(randomInt(100000, 1000000));
          session = await client.query(
            `insert into live_exam_sessions(
               class_id,host_id,title,join_code,marking_mode,question_time_limit_s,settings
             ) values($1,$2,$3,$4,$5,$6,$7::jsonb)
             returning id,class_id,title,join_code,status,marking_mode,question_time_limit_s,version,created_at`,
            [input.classId, actor.id, input.title, joinCode, input.markingMode,
              input.questionTimeLimitS ?? null,
              JSON.stringify({
                syllabusCode: input.syllabusCode??'9618',
                topicIds: input.topicIds,
                subtopicIds: input.subtopicIds,
                coursebookSectionCodes: input.coursebookSectionCodes ?? [],
                includeDiagrams: input.includeDiagrams,
                excludeSeen: input.excludeSeen,
                difficulty: input.difficulty ?? null,
                marksMin: input.marksMin ?? null,
                marksMax: input.marksMax ?? null,
                yearFrom: input.yearFrom ?? null,
                yearTo: input.yearTo ?? null,
                series: input.series ?? [],
                components: input.components ?? [],
                questionOrder: input.questionOrder ?? 'shuffled',
                practiceMode:actor.role==='student'?input.practiceMode:null,
                // Learner-led practice locks its roster at Start. In-progress
                // late joins otherwise invalidate anonymous peer assignments.
                allowLateJoin:actor.role==='student'?false:(input.allowLateJoin ?? false),
                autoCloseWhenAllSubmitted: input.autoCloseWhenAllSubmitted ?? false,
                teacherOverrideEnabled:actor.role==='student'?false:(input.teacherOverrideEnabled ?? true),
                leaderboardMode: input.leaderboardMode ?? 'marks',
                displayNameMode:actor.role==='student'?'anonymous_alias':(input.displayNameMode??'anonymous_alias'),
                peerCalibrationPercent: Math.max(0, Math.min(100, Math.round(input.peerCalibrationPercent ?? 0))),
                peerDisagreementThreshold: Math.max(0, Number(input.peerDisagreementThreshold ?? 1)),
                defaultQuestionTimeLimitS: input.questionTimeLimitS ?? null,
                questionTimeLimits: Object.fromEntries(
                  Object.entries(input.questionTimeLimits ?? {})
                    .filter(([questionId])=>questionIds.includes(questionId))
                    .map(([questionId,value])=>[questionId,value]),
                ),
                requestedQuestionCount: questionIds.length,
                dependencyQuestionCount: Math.max(0, expandedQuestionIds.length - questionIds.length),
              })],
          );
          break;
        } catch (error) {
          await client.query('rollback');
          if (typeof error === 'object' && error && 'code' in error && error.code === '23505' && attempt < 4) continue;
          throw error;
        }
      }
      if (!session) throw new DomainError('live_join_code_conflict', 409);
       if(actor.role==='student')await client.query(
         `insert into live_exam_participants(session_id,student_id,last_seen_at)
          values($1,$2,now())`,[session.rows[0].id,actor.id],
       );
      for (const [position, snapshot] of snapshots.entries()) {
        await client.query(
          `insert into live_exam_questions(
             session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot
           ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
          [session.rows[0].id, snapshot.questionId, position, snapshot.portable.leaf.marks,
            JSON.stringify(snapshot.portable), JSON.stringify(snapshot.markScheme)],
        );
      }
      await client.query(
        `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
         values($1,$2,'session.created',1,$3::jsonb)`,
        [session.rows[0].id, actor.id, JSON.stringify({
          questionCount: snapshots.length,
          requestedQuestionCount: questionIds.length,
          dependencyQuestionCount: Math.max(0, expandedQuestionIds.length - questionIds.length),
        })],
      );
      await client.query('commit');
      return { ...this.mapSession(session.rows[0]), questionCount: snapshots.length };
    } catch (error) {
      await client.query('rollback');
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        throw new DomainError('live_join_code_conflict', 409);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async list(actor: Actor) {
    const result = await this.pool.query(
      `select les.id,les.class_id,les.title,les.join_code,les.status::text,les.marking_mode::text,
         les.question_time_limit_s,les.current_question_index,les.version,les.created_at,les.updated_at,
         les.paused_at,les.pause_remaining_s,les.settings,
         c.name class_name,
         (select count(*) from live_exam_questions leq where leq.session_id=les.id)::int question_count,
         (select count(*) from live_exam_participants lep where lep.session_id=les.id and lep.left_at is null)::int participant_count
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.archived_at is null and (
         ($1='student' and exists(
           select 1 from live_exam_participants lep
           where lep.session_id=les.id and lep.student_id=$2 and lep.left_at is null
         ))
         or ($1='owner' and c.school_id=$3)
         or ($1='teacher' and (c.owner_id=$2 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$2
         )))
       )
       order by (les.status not in ('finished','cancelled')) desc,les.updated_at desc
       limit 50`,
      [actor.role, actor.id, actor.schoolId],
    );
    return result.rows.map((row) => ({
      ...this.mapSession(row),
      className: row.class_name,
      questionCount: Number(row.question_count),
      participantCount: Number(row.participant_count),
    }));
  }

  async join(actor: Actor, code: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const room = await client.query(
        `select les.*
         from live_exam_sessions les
         where les.join_code=$1
           and (les.settings->>'practiceMode' is null
             or (les.settings->>'practiceMode'<>'solo' and exists(
               select 1 from classes practice_class
               where practice_class.id=les.class_id and practice_class.school_id=$3
                 and exists(select 1 from enrollments e
                   where e.student_id=$2 and e.left_at is null
                     and exists(select 1 from classes member_class
                       where member_class.id=e.class_id
                         and member_class.school_id=practice_class.school_id)))))
           and les.archived_at is null
           and coalesce(
             (to_jsonb(les)->>'join_code_expires_at')::timestamptz,
             'infinity'::timestamptz
           ) > now() and (
           les.status='lobby'
           or (les.status='question_open' and les.settings->>'practiceMode' is null
             and coalesce((les.settings->>'allowLateJoin')::boolean,false))
         )
         -- Concurrent learners may validate the same room together. Start,
         -- cancel and other state transitions still wait for every join to
         -- commit because they acquire FOR UPDATE on this session row.
         for key share of les`,
        [code,actor.id,actor.schoolId],
      );
      if (!room.rowCount) throw new DomainError('live_code_not_found', 404);
      const session = room.rows[0];
      const result = await client.query(
        `insert into live_exam_participants(session_id,student_id,left_at,last_seen_at)
         values($1,$2,null,now())
         on conflict(session_id,student_id) do update set left_at=null,last_seen_at=now()
         returning id,session_id,joined_at`,
        [session.id, actor.id],
      );
      const participant = result.rows[0];
      if (session.status === 'question_open') {
        await client.query(
          `insert into live_exam_answers(session_question_id,participant_id)
           select leq.id,$2 from live_exam_questions leq
           where leq.session_id=$1 and leq.position=$3
           on conflict(session_question_id,participant_id) do nothing`,
          [session.id, participant.id, session.current_question_index],
        );
      }
      await this.bump(client, String(session.id), actor.id, 'participant.joined', {
        participantId: participant.id,
        late: session.status !== 'lobby',
      });
      await client.query('commit');
      return { sessionId: participant.session_id, participantId: participant.id };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async heartbeat(actor: Actor, sessionId: string) {
    if (actor.role === 'student') {
      const result = await this.pool.query(
        `update live_exam_participants lep set last_seen_at=now()
         from live_exam_sessions les
         where lep.session_id=$1 and lep.student_id=$2 and lep.left_at is null
           and les.id=lep.session_id
         returning lep.id,(
           les.status='question_open' and les.paused_at is null
           and les.question_started_at is not null and les.question_time_limit_s is not null
           and now() > les.question_started_at + les.question_time_limit_s * interval '1 second'
             + $3::int * interval '1 second'
         ) deadline_expired`,
        [sessionId, actor.id, QUESTION_DEADLINE_GRACE_S],
      );
      if (!result.rowCount) throw new DomainError('not_found', 404);
      if (result.rows[0].deadline_expired) await this.reconcileExpired(sessionId);
    } else {
      await this.requireClassControlForSession(actor, sessionId);
      await this.reconcileExpired(sessionId);
    }
    return { serverNow: new Date() };
  }

  async reconcileExpired(sessionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        // At the deadline every browser can notice expiry together. Only one
        // request should perform the transition; the others must not queue and
        // exhaust the connection pool behind the same session-row lock.
        `select * from live_exam_sessions where id=$1 for update skip locked`, [sessionId],
      );
      const session = result.rows[0];
      if (!session || session.status !== 'question_open' || session.paused_at
        || !session.question_started_at || session.question_time_limit_s === null) {
        await client.query('commit');
        return false;
      }
      const expired = await client.query(
        `select now() > $1::timestamptz + $2::int * interval '1 second'
           + $3::int * interval '1 second' expired`,
        [session.question_started_at, session.question_time_limit_s, QUESTION_DEADLINE_GRACE_S],
      );
      if (!expired.rows[0].expired) {
        await client.query('commit');
        return false;
      }
      await this.revealWithinTransaction(client, session, null);
      await client.query('commit');
      return true;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async closeExpired(limit = 100) {
    const candidates = await this.pool.query(
      `select id
       from live_exam_sessions
       where status='question_open'
         and paused_at is null
         and question_started_at is not null
         and question_time_limit_s is not null
         and now() > question_started_at + question_time_limit_s * interval '1 second'
           + $1::int * interval '1 second'
       order by question_started_at
       limit $2`,
      [QUESTION_DEADLINE_GRACE_S, limit],
    );
    let closed = 0;
    for (const row of candidates.rows) {
      if (await this.reconcileExpired(String(row.id))) closed += 1;
    }
    return closed;
  }

  private async requireClassControlForSession(actor: Actor, sessionId: string) {
    const result = await this.pool.query('select class_id from live_exam_sessions where id=$1', [sessionId]);
    if (!result.rowCount) throw new DomainError('not_found', 404);
    await this.requireClassControl(this.pool, actor, String(result.rows[0].class_id));
  }

  private async hydratePortable(snapshot: StoredQuestionSnapshot) {
    if (!this.assetUrlSigner) return snapshot;
    const contextBlocks = await Promise.all(snapshot.contextBlocks.map(async (block) => ({
      ...block,
      assets: await Promise.all(block.assets.map(async (asset) => {
        if (!asset.storagePath) return asset;
        const now = Date.now();
        const cached = this.signedAssetCache.get(asset.storagePath);
        let value = cached && cached.expiresAt > now ? cached.value : undefined;
        if (!value) {
          value = this.assetUrlSigner!.signStoragePath(asset.storagePath, 300);
          this.signedAssetCache.set(asset.storagePath, { value, expiresAt: now + 240_000 });
          value.catch(() => this.signedAssetCache.delete(asset.storagePath!));
          if (this.signedAssetCache.size > 500) {
            for (const [path, entry] of this.signedAssetCache) {
              if (entry.expiresAt <= now) this.signedAssetCache.delete(path);
            }
          }
        }
        const url = await value;
        return { ...asset, url };
      })),
    })));
    return { ...snapshot, contextBlocks };
  }

  private async releasedPointFeedbackForAnswers(answerIds:string[]):Promise<Map<string,ReleasedPointFeedback>> {
    const byAnswer=new Map<string,ReleasedPointFeedback>();
    if(!answerIds.length)return byAnswer;
    // Only call this after the room enters review/finished. The caller must
    // obtain answer IDs from a student-scoped snapshot or report query.
    const result=await this.pool.query(
      `select a.id::text answer_id,a.final_score,a.moderated_at,leq.mark_scheme_snapshot,
         selected_review.id review_id,
         coalesce((
           select array_agg(rp.mark_scheme_point_id::text) filter(where rp.matched)
           from live_exam_review_points rp where rp.review_id=selected_review.id
         ),'{}'::text[]) matched_ids,
         (select count(*)::int from live_exam_review_points rp
          where rp.review_id=selected_review.id) recorded_count
       from live_exam_answers a
       join live_exam_questions leq on leq.id=a.session_question_id
       left join lateral (
         select r.id
         from live_exam_reviews r
         where r.answer_id=a.id and r.session_question_id=a.session_question_id
           and r.status in ('submitted','moderated')
           and r.kind::text=a.score_source::text
           and r.awarded_marks=a.final_score
         order by case r.kind when 'teacher' then 0 when 'peer' then 1 else 2 end,
           r.created_at,r.id
         limit 1
       ) selected_review on true
       where a.id=any($1::uuid[])`,
      [answerIds],
    );
    for(const row of result.rows){
      byAnswer.set(String(row.answer_id),releasedPointFeedback(
        row.mark_scheme_snapshot as MarkSchemeSnapshot,
        row.final_score===null?null:Number(row.final_score),
        row.moderated_at!==null,
        row.review_id?{
          matchedPointIds:(row.matched_ids??[]).map(String),
          recordedCount:Number(row.recorded_count),
        }:null,
      ));
    }
    return byAnswer;
  }

  async snapshot(actor: Actor, sessionId: string, projector = false): Promise<Record<string, unknown>> {
    const access = await this.pool.query(
      `select les.*,c.name class_name,u.full_name host_name,
         ($2<>'student') is_staff,
          ($2='student' and les.host_id=$3
             and les.settings->>'practiceMode' in ('solo','group','collaborative')
             and c.archived_at is null
             and exists(select 1 from enrollments host_membership
               where host_membership.class_id=les.class_id
                 and host_membership.student_id=$3 and host_membership.left_at is null)) is_practice_host,
         lep.id participant_id,
         lep.joined_at participant_joined_at,
         (
           les.status='question_open' and les.paused_at is null
           and les.question_started_at is not null and les.question_time_limit_s is not null
           and now() > les.question_started_at + les.question_time_limit_s * interval '1 second'
             + $5::int * interval '1 second'
         ) deadline_expired
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       join users u on u.id=les.host_id
       left join live_exam_participants lep on lep.session_id=les.id and lep.student_id=$3 and lep.left_at is null
       where les.id=$1 and les.archived_at is null and (
         ($2='student' and lep.id is not null)
         or ($2='owner' and c.school_id=$4)
         or ($2='teacher' and (c.owner_id=$3 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3
         )))
       )`,
      [sessionId, actor.role, actor.id, actor.schoolId, QUESTION_DEADLINE_GRACE_S],
    );
    if (!access.rowCount) throw new DomainError('not_found', 404);
    const session = access.rows[0];
    if (session.deadline_expired && await this.reconcileExpired(sessionId)) {
      return this.snapshot(actor, sessionId, projector);
    }
    const isStaff = Boolean(session.is_staff);
    if (projector && !isStaff) throw new DomainError('staff_only', 403);
    const detailedStaff = isStaff && !projector;
    const participantId = session.participant_id ? String(session.participant_id) : null;

    const [questionRows, participantRows] = await Promise.all([
      this.pool.query(
        `select id,question_id,position,marks,
           case when position=$2 then question_snapshot end question_snapshot,
           case when position=$2 then mark_scheme_snapshot end mark_scheme_snapshot,
           coalesce(question_snapshot->>'sourceRef',question_snapshot->'leaf'->>'displayRef','') display_ref
         from live_exam_questions where session_id=$1 order by position`,
        [sessionId, Number(session.current_question_index)],
      ),
      detailedStaff
        ? this.pool.query(
          `select lep.id,lep.student_id,u.full_name,lep.joined_at,lep.last_seen_at,
             a.id answer_id,a.submitted_at,a.final_score,a.score_source,a.moderated_at
           from live_exam_participants lep
           join users u on u.id=lep.student_id
           left join live_exam_questions leq on leq.session_id=lep.session_id and leq.position=$2
           left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
           where lep.session_id=$1 and lep.left_at is null
           order by u.full_name`,
          [sessionId, Number(session.current_question_index)],
        )
        : this.pool.query(
          `select count(*)::int participant_count,
             count(*) filter(where a.submitted_at is not null)::int submitted_count
           from live_exam_participants lep
           left join live_exam_questions leq on leq.session_id=lep.session_id and leq.position=$2
           left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
           where lep.session_id=$1 and lep.left_at is null`,
          [sessionId, Number(session.current_question_index)],
        ),
    ]);
    const currentRow = questionRows.rows.find((row) => Number(row.position) === Number(session.current_question_index));
    const reveal = ['marking', 'review', 'finished'].includes(String(session.status));
    const dependencyWork = currentRow ? await this.pool.query(
      `select qd.depends_on_id question_id,qd.kind::text kind,qd.strength::text strength,
         target.display_ref,leq.position,
         case when $4::uuid is null then null else a.answer_text end own_answer,
         a.submitted_at
       from question_dependencies qd
       join questions target on target.id=qd.depends_on_id
       left join live_exam_questions leq
         on leq.session_id=$1
        and leq.question_id=qd.depends_on_id
        and leq.position<$2
       left join live_exam_answers a
         on a.session_question_id=leq.id
        and a.participant_id=$4::uuid
       where qd.question_id=$3 and qd.strength::text='required'
       order by leq.position nulls last,target.sort_order,target.id`,
      [sessionId, Number(session.current_question_index), currentRow.question_id, participantId],
    ) : { rows: [] };
    const question = currentRow ? {
      id: currentRow.id,
      sourceQuestionId: currentRow.question_id,
      position: Number(currentRow.position),
      marks: Number(currentRow.marks),
      portable: await this.hydratePortable(currentRow.question_snapshot as StoredQuestionSnapshot),
      dependencyWork: dependencyWork.rows.map((row) => ({
        questionId: String(row.question_id),
        displayRef: String(row.display_ref),
        kind: String(row.kind),
        strength: String(row.strength),
        position: row.position == null ? null : Number(row.position),
        ownAnswer: row.own_answer == null ? null : String(row.own_answer),
        submittedAt: row.submitted_at ?? null,
      })),
    } : null;

    let ownAnswer: Record<string, unknown> | null = null;
    let review: Record<string, unknown> | null = null;
    let teacherAnswers: Record<string, unknown>[] = [];
    let peerQualityQueue: Array<Record<string, unknown>> = [];
    if (currentRow && participantId) {
      const answerResult = await this.pool.query(
        `select id,answer_text,word_count,submitted_at,final_score,final_feedback_md,score_source,moderated_at,updated_at
         from live_exam_answers where session_question_id=$1 and participant_id=$2`,
        [currentRow.id, participantId],
      );
      if (answerResult.rows[0]) ownAnswer = this.mapAnswer(answerResult.rows[0]);
      if (reveal) review = await this.reviewFor(actor, sessionId, String(currentRow.id));
    }
    const ownPointFeedback=actor.role==='student' && session.status==='review' && ownAnswer?.id
      ? (await this.releasedPointFeedbackForAnswers([String(ownAnswer.id)])).get(String(ownAnswer.id))??null
      : null;
    if (currentRow && detailedStaff && reveal) {
      const answerResult = await this.pool.query(
        `select a.id,a.answer_text,a.word_count,a.submitted_at,a.final_score,a.final_feedback_md,
           a.score_source,a.moderated_at,a.updated_at,u.full_name student_name,lep.student_id,
           r.id review_id,r.status::text review_status,r.kind::text review_kind,
           r.awarded_marks review_awarded_marks,r.feedback_md review_feedback_md,
           exists(
             select 1 from live_exam_reviews peer_review
             where peer_review.answer_id=a.id
               and peer_review.session_question_id=a.session_question_id
               and peer_review.kind='peer'
           ) review_is_calibration,
           coalesce((
             select array_agg(rp.mark_scheme_point_id order by rp.mark_scheme_point_id)
             from live_exam_review_points rp
             where rp.review_id=r.id and rp.matched
           ),'{}'::uuid[]) review_matched_point_ids
         from live_exam_answers a
         join live_exam_participants lep on lep.id=a.participant_id
         join users u on u.id=lep.student_id
         left join lateral (
           select candidate.*
           from live_exam_reviews candidate
           where candidate.answer_id=a.id and candidate.session_question_id=a.session_question_id
           order by case candidate.kind when 'teacher' then 0 when 'peer' then 1 else 2 end,
             candidate.created_at,candidate.id
           limit 1
         ) r on true
         where a.session_question_id=$1
         order by u.full_name`,
        [currentRow.id],
      );
      teacherAnswers = answerResult.rows.map((row) => ({
        ...this.mapAnswer(row),
        studentName: row.student_name,
        studentId: row.student_id,
        reviewId: row.review_id,
        reviewStatus: row.review_status,
        reviewKind: row.review_kind,
        reviewPurpose: row.review_kind==='teacher' && row.review_is_calibration ? 'calibration' : 'primary',
        provisionalScore: row.review_awarded_marks === null ? null : Number(row.review_awarded_marks),
        provisionalFeedback: row.review_feedback_md,
        reviewMatchedPointIds: (row.review_matched_point_ids ?? []).map(String),
      }));
      if (String(session.marking_mode)==='peer') {
        const qualitySettings=this.settings(session.settings);
        const qualityRows=await this.pool.query(
          `select
             a.id answer_id,u.full_name student_name,
             peer.awarded_marks peer_score,teacher.awarded_marks teacher_score
           from live_exam_answers a
           join live_exam_participants lep on lep.id=a.participant_id
           join users u on u.id=lep.student_id
           join live_exam_reviews peer on peer.answer_id=a.id
             and peer.session_question_id=a.session_question_id
             and peer.kind='peer' and peer.status in ('submitted','moderated')
           join live_exam_reviews teacher on teacher.answer_id=a.id
             and teacher.session_question_id=a.session_question_id
             and teacher.kind='teacher' and teacher.status in ('submitted','moderated')
           where a.session_question_id=$1
             and peer.awarded_marks is not null
             and teacher.awarded_marks is not null
           order by u.full_name,a.id`,
          [currentRow.id],
        );
        peerQualityQueue=qualityRows.rows
          .map((row)=>{
            const disagreement=peerScoreDisagreement(Number(row.peer_score),Number(row.teacher_score));
            return {
              answerId:String(row.answer_id),
              studentName:String(row.student_name),
              peerScore:Number(row.peer_score),
              teacherScore:Number(row.teacher_score),
              disagreement,
              threshold:qualitySettings.peerDisagreementThreshold,
              needsTeacherReview:disagreement>qualitySettings.peerDisagreementThreshold,
            };
          })
          .filter((row)=>row.needsTeacherReview);
      }
    }

    let report: {
      rows: Array<Record<string, unknown>>;
      earned: number;
      possible: number;
    } | null = null;
    if (session.status === 'finished' && !projector) {
      const reportRows = await this.pool.query(
        `select leq.position,leq.marks,
           coalesce(leq.question_snapshot->>'sourceRef',leq.question_snapshot->'leaf'->>'displayRef','') display_ref,
           a.id answer_id,coalesce(a.answer_text,'') answer_text,a.final_score,a.final_feedback_md,a.score_source::text,lep.student_id,u.full_name student_name
         from live_exam_questions leq
         join live_exam_participants lep on lep.session_id=leq.session_id and lep.left_at is null
         join users u on u.id=lep.student_id
         left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
         where leq.session_id=$1 and ($2::boolean or lep.student_id=$3)
         order by leq.position,u.full_name`,
        [sessionId, isStaff, actor.id],
      );
      const reportPointFeedback=isStaff?new Map<string,ReleasedPointFeedback>():
        await this.releasedPointFeedbackForAnswers(
          reportRows.rows.filter((row)=>row.answer_id).map((row)=>String(row.answer_id)),
        );
      const rows = reportRows.rows.map((row) => ({
        questionPosition: Number(row.position),
        displayRef: row.display_ref,
        marks: Number(row.marks),
        answerText: row.answer_text,
        score: row.final_score === null ? null : Number(row.final_score),
        scoreSource: row.score_source,
        feedback: row.final_feedback_md,
        ...(!isStaff ? {pointFeedback:row.answer_id?reportPointFeedback.get(String(row.answer_id))??null:null}:{}),
        ...(isStaff ? { studentId: row.student_id, studentName: row.student_name } : {}),
      }));
      report = {
        rows,
        earned: rows.reduce((sum, row) => sum + Number(row.score ?? 0), 0),
        possible: rows.reduce((sum, row) => sum + Number(row.marks), 0),
      };
    }

    const participants = detailedStaff ? participantRows.rows : [];
    const participantCount = detailedStaff
      ? participants.length
      : Number(participantRows.rows[0]?.participant_count ?? 0);
    const submittedCount = detailedStaff
      ? participants.filter((row) => row.submitted_at).length
      : Number(participantRows.rows[0]?.submitted_count ?? 0);
    const reviewCounts = currentRow ? await this.pool.query(
      `select count(*)::int total,count(*) filter(where status in('submitted','moderated'))::int completed
       from live_exam_reviews where session_question_id=$1`, [currentRow.id],
    ) : { rows: [{ total: 0, completed: 0 }] };
    const deadline = session.paused_at
      ? null
      : session.question_started_at && session.question_time_limit_s
      ? new Date(new Date(session.question_started_at).getTime() + Number(session.question_time_limit_s) * 1000)
      : null;

    // The DTO is assembled from several queries. A join, submit, or teacher
    // action may advance the session between the first query and the roster or
    // review queries, producing a torn snapshot (new counts with an old
    // expectedVersion). Retry rather than hand the UI a state that cannot be
    // acted on.
    const latest = await this.pool.query(
      `select version,status::text from live_exam_sessions where id=$1`,
      [sessionId],
    );
    if (!latest.rowCount
      || Number(latest.rows[0].version) !== Number(session.version)
      || String(latest.rows[0].status) !== String(session.status)) {
      return this.snapshot(actor, sessionId, projector);
    }

    const response = {
      session: {
        ...this.mapSession(session),
        className: session.class_name,
        hostName: session.host_name,
        isHost:Boolean(session.is_practice_host),
        currentQuestionIndex: Number(session.current_question_index),
        startedAt: session.started_at,
        finishedAt: session.finished_at,
        questionStartedAt: session.question_started_at,
        joinedLate: actor.role==='student'
          && Boolean(session.participant_joined_at)
          && Boolean(session.question_started_at)
          && new Date(session.participant_joined_at).getTime()>new Date(session.question_started_at).getTime(),
        pausedAt: session.paused_at,
        pauseRemainingS: session.pause_remaining_s === null ? null : Number(session.pause_remaining_s),
        deadline,
        serverNow: new Date(),
        participantCount,
        submittedCount,
        reviewCount: Number(reviewCounts.rows[0].total),
        reviewedCount: Number(reviewCounts.rows[0].completed),
        questionCount: questionRows.rowCount ?? 0,
      },
      questions: detailedStaff ? questionRows.rows.map((row) => ({
        id: row.id,
        position: Number(row.position),
        marks: Number(row.marks),
        displayRef: row.display_ref,
      })) : [],
      participants: detailedStaff ? participants.map((row) => ({
        id: row.id,
        studentId: row.student_id,
        fullName: row.full_name,
        joinedAt: row.joined_at,
        lastSeenAt: row.last_seen_at,
        online: Date.now() - new Date(row.last_seen_at).getTime() < 30_000,
        submitted: Boolean(row.submitted_at),
        score: row.final_score === null ? null : Number(row.final_score),
        scoreSource: row.score_source,
      })) : [],
      question,
      markScheme: reveal && currentRow ? currentRow.mark_scheme_snapshot : null,
      ownAnswer,
      ownPointFeedback,
      review,
      teacherAnswers,
      peerQualityQueue,
      report,
    };
    return projector ? sanitizeLiveProjectorSnapshot(response) : response;
  }


  async detailedReport(actor: Actor, sessionId: string) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    await this.requireClassControlForSession(actor, sessionId);
    const meta = await this.pool.query(
      `select les.id,les.title,les.status::text,c.name class_name
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and les.archived_at is null`,
      [sessionId],
    );
    if (!meta.rowCount) throw new DomainError('not_found', 404);
    if (meta.rows[0].status !== 'finished') throw new DomainError('live_report_not_ready', 409);

    const [answerRows, subtopicRows, pointRows] = await Promise.all([
      this.pool.query(
        `select
           leq.id session_question_id,leq.position,leq.marks,
           coalesce(leq.question_snapshot->>'sourceRef',leq.question_snapshot->'leaf'->>'displayRef','') display_ref,
           lep.student_id,u.full_name student_name,
           coalesce(a.answer_text,'') answer_text,
           a.final_score,a.score_source::text,a.final_feedback_md
         from live_exam_questions leq
         join live_exam_participants lep on lep.session_id=leq.session_id and lep.left_at is null
         join users u on u.id=lep.student_id
         left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
         where leq.session_id=$1
         order by u.full_name,leq.position`,
        [sessionId],
      ),
      this.pool.query(
        `select
           e.student_id,u.full_name student_name,e.session_question_id,
           st.id subtopic_id,st.code subtopic_code,st.title subtopic_title,
           t.number topic_number,t.title topic_title,
           sum(e.marks_earned)::numeric marks_earned,
           sum(e.marks_possible)::numeric marks_possible,
           count(distinct e.answer_id)::int attempts
         from live_exam_learning_evidence e
         join users u on u.id=e.student_id
         join subtopics st on st.id=e.subtopic_id
         join topics t on t.id=st.topic_id
         where e.session_id=$1
         group by e.student_id,u.full_name,e.session_question_id,st.id,st.code,st.title,t.number,t.title
         order by t.number,st.code,u.full_name`,
        [sessionId],
      ),
      this.pool.query(
        `select
           leq.position,
           coalesce(leq.question_snapshot->>'sourceRef',leq.question_snapshot->'leaf'->>'displayRef','') display_ref,
           point.value->>'id' point_id,
           point.value->>'code' code,
           point.value->>'text' text,
           coalesce((point.value->>'marks')::numeric,0) marks,
           count(*)::int assessed_count,
           count(*) filter(where coalesce(rp.matched,false)=false)::int missed_count
         from live_exam_questions leq
         cross join lateral jsonb_array_elements(coalesce(leq.mark_scheme_snapshot->'points','[]'::jsonb)) point(value)
         join live_exam_answers a on a.session_question_id=leq.id and a.final_score is not null
         join live_exam_reviews r on r.answer_id=a.id and r.session_question_id=leq.id
           and r.status in ('submitted','moderated')
         left join live_exam_review_points rp
           on rp.review_id=r.id and rp.mark_scheme_point_id=(point.value->>'id')::uuid
         where leq.session_id=$1
         group by leq.position,display_ref,point.value
         order by missed_count desc,assessed_count desc,leq.position,code`,
        [sessionId],
      ),
    ]);

    const answerRowsMapped = answerRows.rows.map((row) => ({
      sessionQuestionId:String(row.session_question_id),
      questionPosition:Number(row.position),
      displayRef:String(row.display_ref),
      marks:Number(row.marks),
      studentId:String(row.student_id),
      studentName:String(row.student_name),
      answerText:String(row.answer_text ?? ''),
      score:row.final_score == null ? null : Number(row.final_score),
      scoreSource:row.score_source == null ? null : String(row.score_source),
      feedback:row.final_feedback_md == null ? null : String(row.final_feedback_md),
    }));

    const studentMap = new Map<string,{studentId:string;studentName:string;earned:number;possible:number}>();
    for (const row of answerRowsMapped) {
      const current=studentMap.get(row.studentId) ?? {studentId:row.studentId,studentName:row.studentName,earned:0,possible:0};
      current.earned += Number(row.score ?? 0);
      current.possible += row.marks;
      studentMap.set(row.studentId,current);
    }
    const students=[...studentMap.values()].map((row)=>({
      ...row,
      percentage:row.possible>0?row.earned/row.possible:0,
    })).sort((left,right)=>right.percentage-left.percentage||left.studentName.localeCompare(right.studentName));

    const questionMap = new Map<string,{
      sessionQuestionId:string;questionPosition:number;displayRef:string;marks:number;
      earned:number;possible:number;attempts:number;
    }>();
    for (const row of answerRowsMapped) {
      const current=questionMap.get(row.sessionQuestionId) ?? {
        sessionQuestionId:row.sessionQuestionId,questionPosition:row.questionPosition,displayRef:row.displayRef,marks:row.marks,
        earned:0,possible:0,attempts:0,
      };
      current.earned += Number(row.score ?? 0);
      current.possible += row.marks;
      current.attempts += 1;
      questionMap.set(row.sessionQuestionId,current);
    }

    const evidenceRows=subtopicRows.rows.map((row)=>({
      studentId:String(row.student_id),
      studentName:String(row.student_name),
      sessionQuestionId:String(row.session_question_id),
      subtopicId:String(row.subtopic_id),
      subtopicCode:String(row.subtopic_code),
      subtopicTitle:String(row.subtopic_title),
      topicNumber:Number(row.topic_number),
      topicTitle:String(row.topic_title),
      marksEarned:Number(row.marks_earned),
      marksPossible:Number(row.marks_possible),
      attempts:Number(row.attempts),
    }));
    const questionSubtopics=new Map<string,Array<{subtopicId:string;subtopicCode:string;subtopicTitle:string;topicNumber:number;topicTitle:string}>>();
    for (const row of evidenceRows) {
      const list=questionSubtopics.get(row.sessionQuestionId) ?? [];
      if(!list.some((item)=>item.subtopicId===row.subtopicId)) list.push({
        subtopicId:row.subtopicId,subtopicCode:row.subtopicCode,subtopicTitle:row.subtopicTitle,
        topicNumber:row.topicNumber,topicTitle:row.topicTitle,
      });
      questionSubtopics.set(row.sessionQuestionId,list);
    }
    const questions=[...questionMap.values()].sort((a,b)=>a.questionPosition-b.questionPosition).map((row)=>({
      ...row,
      percentage:row.possible>0?row.earned/row.possible:0,
      subtopics:questionSubtopics.get(row.sessionQuestionId) ?? [],
    }));

    const subtopicMap=new Map<string,{
      subtopicId:string;subtopicCode:string;subtopicTitle:string;topicNumber:number;topicTitle:string;
      earned:number;possible:number;attempts:number;
    }>();
    for (const row of evidenceRows) {
      const current=subtopicMap.get(row.subtopicId) ?? {
        subtopicId:row.subtopicId,subtopicCode:row.subtopicCode,subtopicTitle:row.subtopicTitle,
        topicNumber:row.topicNumber,topicTitle:row.topicTitle,earned:0,possible:0,attempts:0,
      };
      current.earned+=row.marksEarned;
      current.possible+=row.marksPossible;
      current.attempts+=row.attempts;
      subtopicMap.set(row.subtopicId,current);
    }
    const subtopics=[...subtopicMap.values()].map((row)=>({
      ...row,
      percentage:row.possible>0?row.earned/row.possible:0,
    })).sort((a,b)=>a.percentage-b.percentage||a.topicNumber-b.topicNumber||a.subtopicCode.localeCompare(b.subtopicCode));

    const mostMissedPoints=pointRows.rows.map((row)=>({
      questionPosition:Number(row.position),
      displayRef:String(row.display_ref),
      pointId:String(row.point_id),
      code:String(row.code ?? ''),
      text:String(row.text ?? ''),
      marks:Number(row.marks),
      assessedCount:Number(row.assessed_count),
      missedCount:Number(row.missed_count),
      missRate:Number(row.assessed_count)>0?Number(row.missed_count)/Number(row.assessed_count):0,
    })).filter((row)=>row.assessedCount>0&&row.missedCount>0);

    const totalEarned=students.reduce((sum,row)=>sum+row.earned,0);
    const totalPossible=students.reduce((sum,row)=>sum+row.possible,0);
    const averageScore=students.length?students.reduce((sum,row)=>sum+row.earned,0)/students.length:0;
    const averagePossible=students.length?students.reduce((sum,row)=>sum+row.possible,0)/students.length:0;
    const reteachRecommendations=subtopics
      .filter((row)=>row.attempts>0&&row.percentage<0.6)
      .slice(0,5)
      .map((row)=>({
        subtopicId:row.subtopicId,
        code:row.subtopicCode,
        title:row.subtopicTitle,
        topicNumber:row.topicNumber,
        topicTitle:row.topicTitle,
        percentage:row.percentage,
        attempts:row.attempts,
        marksEarned:row.earned,
        marksPossible:row.possible,
        reason:`${row.subtopicCode} bo‘yicha sinf ${row.earned}/${row.possible} ball oldi (${Math.round(row.percentage*100)}%).`,
      }));

    return {
      session:{id:String(meta.rows[0].id),title:String(meta.rows[0].title),className:String(meta.rows[0].class_name),status:'finished' as const},
      aggregate:{
        studentCount:students.length,
        totalEarned,
        totalPossible,
        averageScore,
        averagePossible,
        averagePercentage:averagePossible>0?averageScore/averagePossible:0,
      },
      students,
      questions,
      subtopics,
      mostMissedPoints,
      reteachRecommendations,
      rows:answerRowsMapped,
    };
  }

  async detailedReportCsv(actor: Actor, sessionId: string) {
    const report=await this.detailedReport(actor,sessionId);
    const evidenceByQuestion=new Map(report.questions.map((question)=>[
      question.sessionQuestionId,
      question.subtopics.map((subtopic)=>subtopic.subtopicCode).join(' | '),
    ]));
    const escape=(value:unknown)=>{
      const text=value==null?'':String(value);
      return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
    };
    const header=['Student','Question','Source ref','Subtopics','Score','Possible','Percentage','Score source','Feedback'];
    const lines=[header.map(escape).join(',')];
    for(const row of report.rows){
      const pct=row.marks>0?Number(row.score??0)/row.marks:0;
      lines.push([
        row.studentName,
        row.questionPosition+1,
        row.displayRef,
        evidenceByQuestion.get(row.sessionQuestionId)??'',
        row.score??'',
        row.marks,
        (pct*100).toFixed(1)+'%',
        row.scoreSource??'',
        row.feedback??'',
      ].map(escape).join(','));
    }
    return lines.join('\r\n')+'\r\n';
  }

  private async reviewFor(actor: Actor, sessionId: string, sessionQuestionId: string) {
    const result = await this.pool.query(
      `select r.id,r.answer_id,r.kind::text,r.status::text,r.awarded_marks,r.feedback_md,r.submitted_at,
         a.answer_text,
         coalesce((
           select jsonb_agg(point.value || jsonb_build_object('matched',coalesce(lrp.matched,false))
             order by point.ordinality)
           from jsonb_array_elements(coalesce(leq.mark_scheme_snapshot->'points','[]'::jsonb))
             with ordinality point(value,ordinality)
           left join live_exam_review_points lrp
             on lrp.review_id=r.id and lrp.mark_scheme_point_id=(point.value->>'id')::uuid
         ),'[]'::jsonb) points
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_questions leq on leq.id=r.session_question_id
       where r.session_question_id=$1 and (
         ($2='student' and r.reviewer_id=$3)
         or ($2<>'student' and exists(
           select 1 from live_exam_sessions les join classes c on c.id=les.class_id
           where les.id=$4 and (($2='owner' and c.school_id=$5) or ($2='teacher' and(
             c.owner_id=$3 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3)
           )))
         ))
       )
       order by r.created_at
       limit 1`,
      [sessionQuestionId, actor.role, actor.id, sessionId, actor.schoolId],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      answerId: row.answer_id,
      kind: row.kind,
      status: row.status,
      answerText: row.answer_text,
      awardedMarks: row.awarded_marks === null ? null : Number(row.awarded_marks),
      feedback: row.feedback_md,
      submittedAt: row.submitted_at,
      points: row.points,
    };
  }

  async start(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      // Joining advances the roster version. Starting remains safe with an
      // older lobby version because the row lock observes the final committed
      // roster and the status check prevents duplicate transitions.
      void expectedVersion;
      if (session.status !== 'lobby') throw new DomainError('live_invalid_state', 409);
      const count = await client.query(
        `select count(*)::int count from live_exam_participants where session_id=$1 and left_at is null`,
        [sessionId],
      );
      if(Number(count.rows[0].count)<1
          || ((session.settings as {practiceMode?:string}|null)?.practiceMode==='group'
           && Number(count.rows[0].count)<2))throw new DomainError('live_no_participants',409);
      const question = await client.query(
        `select id,question_id from live_exam_questions where session_id=$1 and position=0`, [sessionId]);
      if (!question.rowCount) throw new DomainError('live_no_questions', 409);
      const settings=this.settings(session.settings);
      const questionTimeLimitS=resolveLiveQuestionTimeLimit(
        session.settings,
        String(question.rows[0].question_id),
        settings.defaultQuestionTimeLimitS ?? (session.question_time_limit_s == null ? null : Number(session.question_time_limit_s)),
      );
      await client.query(
        `insert into live_exam_answers(session_question_id,participant_id)
         select $2,lep.id from live_exam_participants lep
         where lep.session_id=$1 and lep.left_at is null on conflict do nothing`,
        [sessionId, question.rows[0].id],
      );
      await client.query(
        `update live_exam_sessions set status='question_open',current_question_index=0,
           started_at=coalesce(started_at,now()),question_started_at=now(),answers_locked_at=null,
           mark_scheme_revealed_at=null,question_time_limit_s=$2
         where id=$1`,
        [sessionId,questionTimeLimitS],
      );
      const version = await this.bump(client, sessionId, actor.id, 'question.opened', { position: 0 });
      await client.query('commit');
      return { sessionId, status: 'question_open' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async setLateJoin(actor: Actor, sessionId: string, allowLateJoin: boolean, expectedVersion?: number) {
    // Fixed-roster practice must never gain in-progress participants.
    this.assertStaff(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      if((session.settings as {practiceMode?:string}|null)?.practiceMode)
        throw new DomainError('live_practice_roster_locked',409);
      this.assertExpectedVersion(session, expectedVersion);
      if (!['lobby','question_open','marking','review'].includes(String(session.status))) {
        throw new DomainError('live_invalid_state', 409);
      }
      await client.query(
        `update live_exam_sessions set settings=jsonb_set(
           coalesce(settings,'{}'::jsonb),'{allowLateJoin}',to_jsonb($2::boolean),true
         ) where id=$1`,
        [sessionId, allowLateJoin],
      );
      const version = await this.bump(client, sessionId, actor.id, 'session.late_join_changed', {allowLateJoin});
      await client.query('commit');
      return {sessionId,allowLateJoin,version};
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {client.release();}
  }

  async saveAnswer(actor: Actor, sessionId: string, text: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    // A late write is also a reconciliation signal. Close the round first so
    // it cannot remain question_open merely because every browser went away.
    await this.reconcileExpired(sessionId);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // SHARE permits classmates to autosave together, but makes reveal wait
      // until every in-flight save has committed. No answer can cross the
      // question_open -> marking boundary.
      const state = await client.query(
        `select status::text,paused_at from live_exam_sessions where id=$1 for share`, [sessionId]);
      if (state.rows[0]?.status !== 'question_open' || state.rows[0]?.paused_at) throw new DomainError('live_answer_locked', 409);
      const result = await client.query(
        `update live_exam_answers a set answer_text=$3,word_count=$4,updated_at=now()
         from live_exam_participants lep,live_exam_questions leq,live_exam_sessions les
         where les.id=$1 and les.status='question_open' and les.paused_at is null
           and leq.session_id=les.id and leq.position=les.current_question_index
           and lep.session_id=les.id and lep.student_id=$2 and lep.left_at is null
           and a.session_question_id=leq.id and a.participant_id=lep.id and a.submitted_at is null
             and (les.question_time_limit_s is null or now() <= les.question_started_at
             + les.question_time_limit_s * interval '1 second' + $5::int * interval '1 second')
         returning a.id,a.updated_at`,
           [sessionId, actor.id, text, words(text), QUESTION_DEADLINE_GRACE_S],
      );
      if (!result.rowCount) throw new DomainError('live_answer_locked', 409);
      await client.query('commit');
      return { savedAt: result.rows[0].updated_at };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async submitAnswer(actor: Actor, sessionId: string, text?: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    await this.reconcileExpired(sessionId);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const state = await client.query(
        `select * from live_exam_sessions where id=$1 for update`, [sessionId]);
      if (state.rows[0]?.status !== 'question_open' || state.rows[0]?.paused_at) throw new DomainError('live_answer_locked', 409);
      const result = await client.query(
        `update live_exam_answers a set
           answer_text=coalesce($3,a.answer_text),
           word_count=case when $3::text is null then a.word_count else $4 end,
           submitted_at=now(),updated_at=now()
         from live_exam_participants lep,live_exam_questions leq,live_exam_sessions les
         where les.id=$1 and les.status='question_open' and les.paused_at is null
           and leq.session_id=les.id and leq.position=les.current_question_index
           and lep.session_id=les.id and lep.student_id=$2 and lep.left_at is null
           and a.session_question_id=leq.id and a.participant_id=lep.id and a.submitted_at is null
           and (les.question_time_limit_s is null or now() <= les.question_started_at
             + les.question_time_limit_s * interval '1 second' + $5::int * interval '1 second')
         returning a.id,leq.id session_question_id`,
        [sessionId, actor.id, text ?? null, text === undefined ? 0 : words(text), QUESTION_DEADLINE_GRACE_S],
      );
      if (!result.rowCount) throw new DomainError('live_answer_locked', 409);
      let version = await this.bump(client, sessionId, actor.id, 'answer.submitted', { answerId: result.rows[0].id });
      let autoRevealed = false;
      const settings = this.settings(state.rows[0].settings);
      if (settings.autoCloseWhenAllSubmitted) {
        const pending = await client.query(
          `select count(*)::int count
           from live_exam_participants lep
           join live_exam_questions leq on leq.session_id=lep.session_id
             and leq.position=$2
           left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
           where lep.session_id=$1 and lep.left_at is null and a.submitted_at is null`,
          [sessionId, state.rows[0].current_question_index],
        );
        if (Number(pending.rows[0].count) === 0) {
          const revealed = await this.revealWithinTransaction(client, state.rows[0], actor.id);
          version = revealed.version;
          autoRevealed = true;
        }
      }
      await client.query('commit');
      return { submittedAt: new Date(), version, autoRevealed };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  private async revealWithinTransaction(client: PoolClient, session: Record<string, unknown>, actorId: string | null) {
    const sessionId = String(session.id);
    const question = await client.query(
      `select id,mark_scheme_snapshot from live_exam_questions
       where session_id=$1 and position=$2`,
      [sessionId, session.current_question_index],
    );
    if (!question.rowCount) throw new DomainError('live_no_questions', 409);
    const sessionQuestionId = String(question.rows[0].id);
    await client.query(
      `insert into live_exam_answers(session_question_id,participant_id,submitted_at)
       select $2,lep.id,now() from live_exam_participants lep
       where lep.session_id=$1 and lep.left_at is null
       on conflict(session_question_id,participant_id) do update set
         submitted_at=coalesce(live_exam_answers.submitted_at,now()),updated_at=now()`,
      [sessionId, sessionQuestionId],
    );
    const answers = await client.query(
      `select a.id answer_id,lep.student_id
       from live_exam_answers a
       join live_exam_participants lep on lep.id=a.participant_id
       where a.session_question_id=$1 and lep.left_at is null order by lep.student_id`,
      [sessionQuestionId],
    );
    const mode = String(session.marking_mode) as LiveExamMarkingMode;
    if(mode==='peer' && (session.settings as {practiceMode?:string}|null)?.practiceMode==='group'
      && answers.rows.length<2)throw new DomainError('live_peer_assignment_impossible',409);
    const peerAnswers = answers.rows.map((row) => ({
      answerId: String(row.answer_id),
      studentId: String(row.student_id),
    }));
    let peerHistory: Array<{answerStudentId:string;reviewerId:string;count:number}> = [];
    if (mode === 'peer' && peerAnswers.length >= 3) {
      const history = await client.query(
        `select answer_owner.student_id::text answer_student_id,r.reviewer_id::text,count(*)::int pair_count
         from live_exam_reviews r
         join live_exam_answers prior_answer on prior_answer.id=r.answer_id
         join live_exam_participants answer_owner on answer_owner.id=prior_answer.participant_id
         join live_exam_questions prior_question on prior_question.id=r.session_question_id
         join live_exam_sessions prior_session on prior_session.id=prior_question.session_id
         where prior_session.class_id=$1
           and prior_session.id<>$2
           and r.kind='peer'
           and r.reviewer_id is not null
           and r.created_at>=now()-interval '30 days'
           and answer_owner.student_id=any($3::uuid[])
           and r.reviewer_id=any($3::uuid[])
         group by answer_owner.student_id,r.reviewer_id`,
        [session.class_id, sessionId, peerAnswers.map((item)=>item.studentId)],
      );
      peerHistory = history.rows.map((row)=>({
        answerStudentId:String(row.answer_student_id),
        reviewerId:String(row.reviewer_id),
        count:Number(row.pair_count),
      }));
    }
    const peerAssignments = mode === 'peer' && peerAnswers.length >= 2
      ? assignPeerReviewersWithHistory(peerAnswers, `${sessionId}:${sessionQuestionId}`, peerHistory)
      : [];
    const assignments = mode === 'teacher'
      ? answers.rows.map((row) => ({ answerId: String(row.answer_id), reviewerId: String(session.host_id), kind: 'teacher' as const }))
      : mode === 'self'
        ? answers.rows.map((row) => ({ answerId: String(row.answer_id), reviewerId: String(row.student_id), kind: 'self' as const }))
        : peerAnswers.length < 2
          ? answers.rows.map((row) => ({ answerId: String(row.answer_id), reviewerId: String(session.host_id), kind: 'teacher' as const }))
          : peerAssignments;
    const settings=this.settings(session.settings);
    const calibrationAnswerIds = mode==='peer'
      ? selectPeerCalibrationAnswers(peerAssignments, `${sessionId}:${sessionQuestionId}`, settings.peerCalibrationPercent)
      : [];
    const calibrationAssignments = calibrationAnswerIds.map((answerId)=>({
      answerId,
      reviewerId:String(session.host_id),
      kind:'teacher' as const,
    }));
    const reviewAssignments=[...assignments,...calibrationAssignments];
    const scheme = question.rows[0].mark_scheme_snapshot as MarkSchemeSnapshot;
    // One round can have dozens of learners and mark-scheme points. Insert the
    // whole assignment matrix in two statements instead of one network round
    // trip per review and per point.
    await client.query(
      `insert into live_exam_reviews(session_question_id,answer_id,reviewer_id,kind)
       select $1,input.answer_id::uuid,input.reviewer_id::uuid,input.kind::live_exam_marking_mode
       from jsonb_to_recordset($2::jsonb) input(answer_id text,reviewer_id text,kind text)
       on conflict(session_question_id,answer_id,kind) do update
         set reviewer_id=excluded.reviewer_id`,
      [sessionQuestionId, JSON.stringify(reviewAssignments.map((assignment)=>({
        answer_id:assignment.answerId,
        reviewer_id:assignment.reviewerId,
        kind:assignment.kind,
      })))],
    );
    if (scheme.points.length) {
      await client.query(
        `insert into live_exam_review_points(review_id,mark_scheme_point_id)
         select review.id,point.value::uuid
         from live_exam_reviews review
         cross join jsonb_array_elements_text($2::jsonb) point(value)
         where review.session_question_id=$1
         on conflict do nothing`,
        [sessionQuestionId, JSON.stringify(scheme.points.map((point) => point.id))],
      );
    }
    await client.query(
      `update live_exam_sessions set status='marking',answers_locked_at=now(),mark_scheme_revealed_at=now()
       where id=$1`, [sessionId],
    );
    session.status = 'marking';
    const version = await this.bump(client, sessionId, actorId, 'mark_scheme.revealed', {
      markingMode: mode,
      reviewCount: reviewAssignments.length,
      peerHistoryPairs: peerHistory.length,
      calibrationCount: calibrationAssignments.length,
    });
    return { sessionId, status: 'marking' as const, version };
  }

  async revealMarkScheme(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'question_open' || session.paused_at) throw new DomainError('live_invalid_state', 409);
      if(actor.role==='student'){
        // Never open the Mark Scheme early in a student-owned practice round.
        const pending=await client.query(
          `select count(*)::int count from live_exam_participants lep
           left join live_exam_questions leq on leq.session_id=lep.session_id and leq.position=$2
           left join live_exam_answers a on a.participant_id=lep.id and a.session_question_id=leq.id
           where lep.session_id=$1 and lep.left_at is null and a.submitted_at is null`,
          [sessionId,session.current_question_index],
        );
        if(Number(pending.rows[0].count)>0)throw new DomainError('live_students_pending',409);
      }
      const result = await this.revealWithinTransaction(client, session, actor.id);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async submitReview(
    actor: Actor,
    sessionId: string,
    reviewId: string,
    input: { matchedPointIds: string[]; score?: number; levelNumber?: number; feedback?: string },
    expectedVersion?: number,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const state = await client.query(
        `select status::text,paused_at,version from live_exam_sessions where id=$1 for update`, [sessionId]);
      if(actor.role!=='student')this.assertExpectedVersion(state.rows[0] as Record<string,unknown>,expectedVersion);
      if (state.rows[0]?.status !== 'marking' || state.rows[0]?.paused_at) throw new DomainError('live_invalid_state', 409);
      const target = await client.query(
        `select r.id,r.answer_id,r.reviewer_id,r.kind::text,r.status::text,leq.marks,leq.mark_scheme_snapshot,
           (select count(*) from live_exam_review_points where review_id=r.id)::int point_count
         from live_exam_reviews r
         join live_exam_questions leq on leq.id=r.session_question_id
         join live_exam_sessions les on les.id=leq.session_id
         join classes c on c.id=les.class_id
         where r.id=$1 and les.id=$2 and les.status='marking' and (
           ($3='student' and r.reviewer_id=$4)
           or ($3='owner' and c.school_id=$5)
           or ($3='teacher' and (c.owner_id=$4 or exists(
             select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
           )))
         )
         for update of r`,
        [reviewId, sessionId, actor.role, actor.id, actor.schoolId],
      );
      if (!target.rowCount) throw new DomainError('not_found', 404);
      const row = target.rows[0];
      if (actor.role !== 'student' && row.kind !== 'teacher') {
        throw new DomainError('live_review_not_assigned_to_staff', 403);
      }
      if (row.status !== 'assigned') throw new DomainError('live_review_submitted', 409);
      if (input.matchedPointIds.length) {
        const allowed = await client.query(
          `select mark_scheme_point_id from live_exam_review_points
           where review_id=$1 and mark_scheme_point_id=any($2::uuid[])`,
          [reviewId, input.matchedPointIds],
        );
        if (allowed.rowCount !== new Set(input.matchedPointIds).size) throw new DomainError('live_invalid_mark_points', 400);
      }
      const pointCount = Number(row.point_count);
      const snapshot = row.mark_scheme_snapshot as MarkSchemeSnapshot;
      const selectedLevel = input.levelNumber === undefined
        ? undefined
        : snapshot.levels.find((level) => level.levelNumber === input.levelNumber);
      if (snapshot.schemeType === 'levels_of_response' && !selectedLevel) {
        throw new DomainError('invalid_level', 400);
      }
      const selectedIds = new Set(input.matchedPointIds);
      const computed = computeScore({
        type: snapshot.schemeType as Scheme['type'],
        maxMarks: snapshot.maxMarks,
        points: snapshot.points.map((point) => ({
          code: point.code,
          marks: point.marks,
          groupId: point.groupId,
          requires: Array.isArray(point.requires) ? point.requires.map(String) : [],
        })),
        groups: snapshot.groups.map((group) => ({
          id: group.id,
          nRequired: group.nRequired,
          marksPerPoint: group.marksPerPoint,
          maxMarks: group.maxMarks,
          awardMode: group.awardMode,
        })),
        levels: [],
      }, snapshot.points.map((point) => ({
        code: point.code,
        matched: selectedIds.has(point.id),
        confidence: 1,
      })));
      await client.query(
        `update live_exam_review_points set matched=false,awarded_marks=0 where review_id=$1`, [reviewId]);
      for (const point of snapshot.points) {
        const matched = computed.effectiveMatched[point.code] === true;
        await client.query(
          `update live_exam_review_points set matched=$3,awarded_marks=$4
           where review_id=$1 and mark_scheme_point_id=$2`,
          [reviewId, point.id, matched, matched ? point.marks : 0],
        );
      }
      const score = pointCount > 0 && computed.score !== null ? computed.score : input.score;
      if (score === undefined || score < 0 || score > Number(row.marks)) throw new DomainError('invalid_score', 400);
      if (selectedLevel && (score < selectedLevel.minMarks || score > selectedLevel.maxMarks)) {
        throw new DomainError('score_outside_level', 400);
      }
      const feedback=(input.feedback ?? '').trim();
      if (row.kind === 'peer' && snapshot.points.length === 0 && score < Number(row.marks) && feedback.length < 2) {
        throw new DomainError('live_peer_feedback_required', 400);
      }
      await client.query(
        `update live_exam_reviews set status='submitted',awarded_marks=$2,feedback_md=$3,
           reviewer_id=$4,submitted_at=now() where id=$1`,
        [reviewId, score, feedback || null, actor.id],
      );
      if (row.kind === 'teacher') {
        await client.query(
          `update live_exam_answers set final_score=$2,final_feedback_md=$3,score_source='teacher'
           where id=$1`,
          [row.answer_id, score, feedback || null],
        );
      }
      let version = await this.bump(client, sessionId, actor.id, 'review.submitted', {
        reviewId,
        kind: row.kind,
      });
      // Finalize only when every assigned review is submitted. The session row is
      // locked above, so the last reviewer releases a single atomic result.
      const remaining = await client.query(
        `select count(*)::int count
         from live_exam_reviews r
         join live_exam_questions leq on leq.id=r.session_question_id
         join live_exam_sessions les on les.id=leq.session_id
         where les.id=$1 and leq.position=les.current_question_index and r.status='assigned'`,
        [sessionId],
      );
      let resultsReleased = false;
      if (Number(remaining.rows[0].count) === 0) {
        await client.query(
          `with candidates as (
             select
               r.answer_id,
               r.awarded_marks,
               r.feedback_md,
               r.kind,
               row_number() over(
                 partition by r.answer_id
                 order by case r.kind when 'teacher' then 0 when 'peer' then 1 else 2 end,r.created_at,r.id
               ) priority
             from live_exam_reviews r
             join live_exam_questions leq on leq.id=r.session_question_id
             join live_exam_sessions les on les.id=leq.session_id
             where les.id=$1
               and leq.position=les.current_question_index
               and r.status in ('submitted','moderated')
               and r.awarded_marks is not null
           )
           update live_exam_answers a set
             final_score=c.awarded_marks,
             final_feedback_md=c.feedback_md,
             score_source=c.kind
           from candidates c
           where c.answer_id=a.id and c.priority=1
             and a.moderated_at is null and a.final_score is null`,
          [sessionId],
        );
        await client.query(`update live_exam_sessions set status='review' where id=$1`, [sessionId]);
        version = await this.bump(client, sessionId, actor.id, 'marking.completed', {automatic:true,pending:0});
        resultsReleased = true;
      }
      await client.query('commit');
      return { reviewId, score, version, resultsReleased };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async moderateAnswer(
    actor: Actor,
    sessionId: string,
    answerId: string,
    input: { score: number; feedback?: string; levelNumber?: number },
    expectedVersion?: number,
  ) {
    this.assertStaff(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (!['marking', 'review'].includes(String(session.status)) || session.paused_at) throw new DomainError('live_invalid_state', 409);
      const settings = this.settings(session.settings);
      if (session.marking_mode !== 'teacher' && !settings.teacherOverrideEnabled) {
        throw new DomainError('live_teacher_override_disabled', 409);
      }
      const result = await client.query(
        `update live_exam_answers a set final_score=$3,final_feedback_md=$4,score_source='teacher',
           moderated_by=$5,moderated_at=now()
         from live_exam_questions leq
         where a.id=$1 and leq.id=a.session_question_id and leq.session_id=$2
           and $3 between 0 and leq.marks
         returning a.id,leq.mark_scheme_snapshot`,
        [answerId, sessionId, input.score, input.feedback ?? null, actor.id],
      );
      if (!result.rowCount) throw new DomainError('invalid_score', 400);
      const scheme = result.rows[0].mark_scheme_snapshot as MarkSchemeSnapshot;
      if (scheme.schemeType === 'levels_of_response') {
        const selectedLevel = input.levelNumber === undefined
          ? undefined
          : scheme.levels.find((level) => level.levelNumber === input.levelNumber);
        if (!selectedLevel) throw new DomainError('invalid_level', 400);
        if (input.score < selectedLevel.minMarks || input.score > selectedLevel.maxMarks) {
          throw new DomainError('score_outside_level', 400);
        }
      }
      await client.query(
        `update live_exam_reviews set status='moderated',moderated_by=$2,moderated_at=now()
         where answer_id=$1`, [answerId, actor.id]);
      const version = await this.bump(client, sessionId, actor.id, 'answer.moderated', { answerId });
      await client.query('commit');
      return { answerId, score: input.score, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async completeMarking(actor: Actor, sessionId: string, force = false, expectedVersion?: number) {
    if(actor.role==='student'&&force)throw new DomainError('staff_only',403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'marking' || session.paused_at) throw new DomainError('live_invalid_state', 409);
      const pending = await client.query(
        `select count(*)::int count
         from live_exam_reviews r join live_exam_questions leq on leq.id=r.session_question_id
         where leq.session_id=$1 and leq.position=$2 and r.status='assigned'`,
        [sessionId, session.current_question_index],
      );
      const pendingCount = Number(pending.rows[0].count);
      if (pendingCount > 0 && !force) throw new DomainError('live_reviews_pending', 409);
      if (pendingCount > 0) {
        if (String(session.marking_mode) === 'teacher') {
          throw new DomainError('live_reviews_pending', 409);
        }
        const superseded = await client.query(
          `update live_exam_reviews r set
             status='moderated',moderated_by=$3,moderated_at=now(),
             feedback_md=coalesce(r.feedback_md,'Teacher calibration superseded unfinished peer review.')
           from live_exam_questions leq
           where leq.id=r.session_question_id and leq.session_id=$1 and leq.position=$2
             and r.status='assigned' and r.kind<>'teacher'
             and exists(
               select 1 from live_exam_reviews teacher_review
               where teacher_review.session_question_id=r.session_question_id
                 and teacher_review.answer_id=r.answer_id
                 and teacher_review.kind='teacher'
             )
           returning r.id`,
          [sessionId, session.current_question_index, session.host_id],
        );
        const fallback = await client.query(
          `update live_exam_reviews r set reviewer_id=$3,kind='teacher'
           from live_exam_questions leq
           where leq.id=r.session_question_id and leq.session_id=$1 and leq.position=$2
             and r.status='assigned'
             and not exists(
               select 1 from live_exam_reviews teacher_review
               where teacher_review.session_question_id=r.session_question_id
                 and teacher_review.answer_id=r.answer_id
                 and teacher_review.kind='teacher'
                 and teacher_review.id<>r.id
             )
           returning r.id`,
          [sessionId, session.current_question_index, session.host_id],
        );
        const version = await this.bump(client, sessionId, actor.id, 'review.fallback_assigned', {
          count: (fallback.rowCount ?? 0)+(superseded.rowCount ?? 0),
          reassigned: fallback.rowCount ?? 0,
          calibrationSuperseded: superseded.rowCount ?? 0,
          fromMode: session.marking_mode,
        });
        await client.query('commit');
        return {
          sessionId,
          status: 'marking' as const,
          version,
          fallbackAssigned: fallback.rowCount ?? 0,
        };
      }

      // Peer/self marks become official only when the teacher releases the round.
      // A moderated answer is already authoritative and must never be overwritten
      // by the provisional peer/self review that preceded it.
      await client.query(
        `with candidates as (
           select
             r.answer_id,
             r.awarded_marks,
             r.feedback_md,
             r.kind,
             row_number() over(
               partition by r.answer_id
               order by case r.kind when 'teacher' then 0 when 'peer' then 1 else 2 end,r.created_at,r.id
             ) priority
           from live_exam_reviews r
           join live_exam_questions leq on leq.id=r.session_question_id
           where leq.session_id=$1 and leq.position=$2
             and r.status in ('submitted','moderated')
             and r.awarded_marks is not null
         )
         update live_exam_answers a set
           final_score=c.awarded_marks,
           final_feedback_md=c.feedback_md,
           score_source=c.kind
         from candidates c
         where c.answer_id=a.id and c.priority=1
           and a.moderated_at is null and a.final_score is null`,
        [sessionId, session.current_question_index],
      );
      await client.query(`update live_exam_sessions set status='review' where id=$1`, [sessionId]);
      const version = await this.bump(client, sessionId, actor.id, 'marking.completed', {
        forced: false,
        pending: 0,
      });
      await client.query('commit');
      return { sessionId, status: 'review' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async nextQuestion(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'review' || session.paused_at) throw new DomainError('live_invalid_state', 409);
      const nextPosition = Number(session.current_question_index) + 1;
      const next = await client.query(
        `select id,question_id from live_exam_questions where session_id=$1 and position=$2`,
        [sessionId, nextPosition],
      );
      if (!next.rowCount) {
        await client.query(
          `update live_exam_sessions set status='finished',finished_at=now() where id=$1`, [sessionId]);
        const version = await this.bump(client, sessionId, actor.id, 'session.finished');
        await client.query('commit');
        return { sessionId, status: 'finished' as const, version };
      }
      await client.query(
        `insert into live_exam_answers(session_question_id,participant_id)
         select $2,lep.id from live_exam_participants lep
         where lep.session_id=$1 and lep.left_at is null on conflict do nothing`,
        [sessionId, next.rows[0].id],
      );
      const settings=this.settings(session.settings);
      const questionTimeLimitS=resolveLiveQuestionTimeLimit(
        session.settings,
        String(next.rows[0].question_id),
        settings.defaultQuestionTimeLimitS ?? (session.question_time_limit_s == null ? null : Number(session.question_time_limit_s)),
      );
      await client.query(
        `update live_exam_sessions set status='question_open',current_question_index=$2,
           question_started_at=now(),answers_locked_at=null,mark_scheme_revealed_at=null,
           question_time_limit_s=$3
         where id=$1`,
        [sessionId, nextPosition, questionTimeLimitS],
      );
      const version = await this.bump(client, sessionId, actor.id, 'question.opened', { position: nextPosition });
      await client.query('commit');
      return { sessionId, status: 'question_open' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async pause(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (!['question_open', 'marking', 'review'].includes(String(session.status)) || session.paused_at) {
        throw new DomainError('live_invalid_state', 409);
      }
      const paused = await client.query(
        `update live_exam_sessions set paused_at=now(),pause_remaining_s=case
           when status='question_open' and question_started_at is not null and question_time_limit_s is not null
             then greatest(0,ceil(extract(epoch from (
               question_started_at+question_time_limit_s*interval '1 second'-now()
             )))::int)
           else null
         end
         where id=$1 and (
           status<>'question_open' or question_started_at is null or question_time_limit_s is null
           or now()<question_started_at+question_time_limit_s*interval '1 second'
         )
         returning pause_remaining_s`,
        [sessionId],
      );
      if (!paused.rowCount) throw new DomainError('live_answer_locked', 409);
      const remaining = paused.rows[0].pause_remaining_s === null ? null : Number(paused.rows[0].pause_remaining_s);
      const version = await this.bump(client, sessionId, actor.id, 'session.paused', { remainingSeconds: remaining });
      await client.query('commit');
      return { sessionId, status: session.status as LiveExamStatus, paused: true, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async resume(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (!session.paused_at || !['question_open', 'marking', 'review'].includes(String(session.status))) {
        throw new DomainError('live_invalid_state', 409);
      }
      if (session.status === 'question_open' && session.question_time_limit_s !== null
        && session.pause_remaining_s !== null && Number(session.pause_remaining_s) <= 0) {
        await client.query(
          `update live_exam_sessions set paused_at=null,pause_remaining_s=null where id=$1`,
          [sessionId],
        );
        session.paused_at = null;
        session.pause_remaining_s = null;
        const result = await this.revealWithinTransaction(client, session, actor.id);
        await client.query('commit');
        return result;
      }
      await client.query(
        `update live_exam_sessions set
           question_started_at=case
             when status='question_open' and question_time_limit_s is not null and pause_remaining_s is not null
               then now()-(question_time_limit_s-pause_remaining_s)*interval '1 second'
             else question_started_at
           end,
           paused_at=null,pause_remaining_s=null
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'session.resumed');
      await client.query('commit');
      return { sessionId, status: session.status as LiveExamStatus, paused: false, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async removeParticipant(actor: Actor, sessionId: string, studentId: string, expectedVersion?: number) {
    if(actor.role==='student'&&actor.id===studentId)throw new DomainError('live_host_cannot_leave',409);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'lobby') throw new DomainError('live_invalid_state', 409);
      const removed = await client.query(
        `update live_exam_participants set left_at=now(),last_seen_at=now()
         where session_id=$1 and student_id=$2 and left_at is null returning id`,
        [sessionId, studentId],
      );
      if (!removed.rowCount) throw new DomainError('not_found', 404);
      const version = await this.bump(client, sessionId, actor.id, 'participant.removed', { studentId });
      await client.query('commit');
      return { sessionId, studentId, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async leave(actor: Actor, sessionId: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await client.query(
        `select status::text,host_id,settings from live_exam_sessions where id=$1 for update`,
        [sessionId],
      );
      if (!session.rowCount) throw new DomainError('not_found', 404);
      if (session.rows[0].status !== 'lobby') throw new DomainError('live_invalid_state', 409);
      if(String(session.rows[0].host_id)===actor.id
        && ['solo','group','collaborative'].includes(String(session.rows[0].settings?.practiceMode)))
        throw new DomainError('live_host_cannot_leave',409);
      const result = await client.query(
        `update live_exam_participants set left_at=now(),last_seen_at=now()
         where session_id=$1 and student_id=$2 and left_at is null returning id`,
        [sessionId, actor.id],
      );
      if (!result.rowCount) throw new DomainError('not_found', 404);
      const version = await this.bump(client, sessionId, actor.id, 'participant.left');
      await client.query('commit');
      return { sessionId, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async archiveHistory(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session,expectedVersion);
      if (session.archived_at) throw new DomainError('not_found', 404);
      if (!['finished','cancelled'].includes(String(session.status))) {
        throw new DomainError('live_archive_active_session', 409);
      }
      const version = await this.bump(client, sessionId, actor.id, 'session.history_archived');
      await client.query(
        `update live_exam_sessions
         set archived_at=now(),archived_by=$2,updated_at=now()
         where id=$1`,
        [sessionId, actor.id],
      );
      await client.query('commit');
      return { sessionId, archived:true, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async cancel(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (['finished', 'cancelled'].includes(String(session.status))) throw new DomainError('live_invalid_state', 409);
      await client.query(
        `update live_exam_sessions set status='cancelled',finished_at=now() where id=$1`, [sessionId]);
      const version = await this.bump(client, sessionId, actor.id, 'session.cancelled');
      await client.query('commit');
      return { sessionId, status: 'cancelled' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  private settings(value: unknown) {
    const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
      questionOrder:raw.questionOrder==='balanced'||raw.questionOrder==='fixed'?raw.questionOrder:'shuffled',
      practiceMode:raw.practiceMode==='solo'||raw.practiceMode==='group'||raw.practiceMode==='collaborative'?raw.practiceMode:null,
      allowLateJoin: raw.allowLateJoin === true,
      autoCloseWhenAllSubmitted: raw.autoCloseWhenAllSubmitted === true,
      teacherOverrideEnabled: raw.teacherOverrideEnabled !== false,
      leaderboardMode: raw.leaderboardMode === 'marks_speed_tiebreak'
        ? 'marks_speed_tiebreak' as const
        : 'marks' as const,
      displayNameMode: raw.displayNameMode === 'full'
        || raw.displayNameMode === 'first_name'
        || raw.displayNameMode === 'initials'
        ? raw.displayNameMode
        : 'anonymous_alias' as const,
      peerCalibrationPercent: Number.isFinite(Number(raw.peerCalibrationPercent))
        ? Math.max(0,Math.min(100,Math.round(Number(raw.peerCalibrationPercent))))
        : 0,
      peerDisagreementThreshold: Number.isFinite(Number(raw.peerDisagreementThreshold))
        ? Math.max(0,Number(raw.peerDisagreementThreshold))
        : 1,
      defaultQuestionTimeLimitS: raw.defaultQuestionTimeLimitS === null
        ? null
        : Number.isInteger(Number(raw.defaultQuestionTimeLimitS))
          ? Math.max(30,Math.min(7200,Number(raw.defaultQuestionTimeLimitS)))
          : null,
    };
  }

  private mapSession(row: Record<string, unknown>) {
    const settings = this.settings(row.settings);
    return {
      id: row.id,
      classId: row.class_id,
      title: row.title,
      joinCode: row.join_code,
      status: row.status as LiveExamStatus,
      markingMode: row.marking_mode as LiveExamMarkingMode,
      questionTimeLimitS: row.question_time_limit_s === null ? null : Number(row.question_time_limit_s),
      pausedAt: row.paused_at ?? null,
      pauseRemainingS: row.pause_remaining_s === null || row.pause_remaining_s === undefined
        ? null
        : Number(row.pause_remaining_s),
      settings,
      version: Number(row.version),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAnswer(row: Record<string, unknown>) {
    return {
      id: row.id,
      text: row.answer_text,
      wordCount: Number(row.word_count),
      submittedAt: row.submitted_at,
      score: row.final_score === null ? null : Number(row.final_score),
      feedback: row.final_feedback_md,
      scoreSource: row.score_source,
      moderatedAt: row.moderated_at,
      updatedAt: row.updated_at,
    };
  }
}
