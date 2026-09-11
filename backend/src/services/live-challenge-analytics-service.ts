import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

/**
 * Live Challenge analytics deliberately reads the same canonical question,
 * taxonomy and released-round evidence used by the rest of the platform.
 * It does not create a parallel analytics store.
 */
export class LiveChallengeAnalyticsService{
  constructor(private readonly pool:Pool){}

  private staff(actor:Actor){
    if(actor.role==='student')throw new DomainError('staff_only',403);
  }

  async summary(actor:Actor,id:string){
    this.staff(actor);
    const access=await this.pool.query(
      `select lc.id,lc.status::text status,lc.paused_from_status::text paused_from_status,
         lc.state_version,lc.class_id,lc.syllabus_id,c.school_id
       from live_challenges lc
       join classes c on c.id=lc.class_id
       where lc.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or lc.teacher_id=$4
         or exists(select 1 from class_teachers ct where ct.class_id=lc.class_id and ct.teacher_id=$4)
       )`,
      [id,actor.role,actor.schoolId,actor.id],
    );
    if(!access.rowCount)throw new DomainError('not_found',404);
    const challenge=access.rows[0];
    const effectiveStatus=challenge.status==='PAUSED'?challenge.paused_from_status:challenge.status;
    if(!['ROUND_RESULTS','FINISHED'].includes(String(effectiveStatus)))throw new DomainError('live_challenge_analytics_unavailable',409);

    const questionStats=await this.pool.query(
      `with released as (
         select r.id round_id,r.round_number,r.locked_at,r.results_released_at,
           lcq.question_id,lcq.max_marks_snapshot,q.display_ref
         from live_challenge_rounds r
         join live_challenge_questions lcq on lcq.id=r.challenge_question_id
         join questions q on q.id=lcq.question_id
         where r.challenge_id=$1 and r.status='ROUND_RESULTS'
       ), eligible_participants as (
         select rr.round_id,p.student_id
         from released rr
         join live_challenge_participants p on p.challenge_id=$1 and p.status='JOINED'
         where p.joined_at<=coalesce(rr.locked_at,rr.results_released_at,now())
       ), scored as (
         select a.round_id,a.student_id,
           coalesce(
             (select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1),
             (select pm.awarded_marks
              from live_challenge_peer_assignments pa
              join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
              where pa.answer_id=a.id and pa.status='SUBMITTED'
              order by pm.submitted_at desc limit 1),
             0
           )::numeric effective_score
         from live_challenge_answers a
         where a.round_id in(select round_id from released)
       )
       select rr.round_id,rr.round_number,rr.question_id,rr.display_ref,rr.max_marks_snapshot,
         count(ep.student_id)::int participant_count,
         count(sc.student_id)::int answered_count,
         coalesce(sum(sc.effective_score),0)::numeric class_score,
         coalesce(round(
           100.0*coalesce(sum(sc.effective_score),0)
           /nullif(count(ep.student_id)*rr.max_marks_snapshot,0),1
         ),0)::numeric average_percentage
       from released rr
       left join eligible_participants ep on ep.round_id=rr.round_id
       left join scored sc on sc.round_id=rr.round_id and sc.student_id=ep.student_id
       group by rr.round_id,rr.round_number,rr.question_id,rr.display_ref,rr.max_marks_snapshot
       order by rr.round_number`,
      [id],
    );

    const loStats=await this.pool.query(
      `with released as (
         select r.id round_id,r.round_number,r.locked_at,r.results_released_at,
           lcq.question_id,lcq.max_marks_snapshot
         from live_challenge_rounds r
         join live_challenge_questions lcq on lcq.id=r.challenge_question_id
         where r.challenge_id=$1 and r.status='ROUND_RESULTS'
       ), eligible_participants as (
         select rr.round_id,p.student_id
         from released rr
         join live_challenge_participants p on p.challenge_id=$1 and p.status='JOINED'
         where p.joined_at<=coalesce(rr.locked_at,rr.results_released_at,now())
       ), scored as (
         select a.round_id,a.student_id,
           coalesce(
             (select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1),
             (select pm.awarded_marks
              from live_challenge_peer_assignments pa
              join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
              where pa.answer_id=a.id and pa.status='SUBMITTED'
              order by pm.submitted_at desc limit 1),
             0
           )::numeric effective_score
         from live_challenge_answers a
         where a.round_id in(select round_id from released)
       ), round_scores as (
         select rr.round_id,rr.question_id,rr.max_marks_snapshot,
           count(ep.student_id)::int participant_count,
           coalesce(sum(sc.effective_score),0)::numeric class_score
         from released rr
         left join eligible_participants ep on ep.round_id=rr.round_id
         left join scored sc on sc.round_id=rr.round_id and sc.student_id=ep.student_id
         group by rr.round_id,rr.question_id,rr.max_marks_snapshot
       ), mapped_los as (
         select distinct rs.round_id,lo.id lo_id,lo.code lo_code,lo.text lo_text,
           st.code subtopic_code,st.title subtopic_title,t.number topic_number,t.title topic_title
         from round_scores rs
         join question_learning_objectives qlo on qlo.question_id=rs.question_id
         join learning_objectives lo on lo.id=qlo.lo_id
         join subtopics st on st.id=lo.subtopic_id
         join topics t on t.id=st.topic_id and t.syllabus_id=$2
         union
         select distinct rs.round_id,target_lo.id lo_id,target_lo.code lo_code,target_lo.text lo_text,
           target_st.code subtopic_code,target_st.title subtopic_title,target_t.number topic_number,target_t.title topic_title
         from round_scores rs
         join question_learning_objectives qlo on qlo.question_id=rs.question_id
         join learning_objective_compatibility compat
           on compat.source_lo_id=qlo.lo_id and compat.relation in('equivalent','subtopic_compatible')
         join learning_objectives target_lo on target_lo.id=compat.target_lo_id
         join subtopics target_st on target_st.id=target_lo.subtopic_id
         join topics target_t on target_t.id=target_st.topic_id and target_t.syllabus_id=$2
       )
       select ml.lo_id,ml.lo_code,ml.lo_text,ml.subtopic_code,ml.subtopic_title,
         ml.topic_number,ml.topic_title,count(distinct ml.round_id)::int question_count,
         coalesce(sum(rs.participant_count),0)::int evidence_count,
         coalesce(sum(rs.class_score),0)::numeric marks_earned,
         coalesce(sum(rs.max_marks_snapshot*rs.participant_count),0)::numeric marks_possible,
         coalesce(round(
           100.0*sum(rs.class_score)/nullif(sum(rs.max_marks_snapshot*rs.participant_count),0),1
         ),0)::numeric percentage
       from mapped_los ml
       join round_scores rs on rs.round_id=ml.round_id
       group by ml.lo_id,ml.lo_code,ml.lo_text,ml.subtopic_code,ml.subtopic_title,ml.topic_number,ml.topic_title
       having sum(rs.participant_count)>0
       order by percentage desc,ml.topic_number,ml.subtopic_code,ml.lo_code`,
      [id,challenge.syllabus_id],
    );

    const markPoints=await this.pool.query(
      `select point->>'id' id,point->>'code' code,point->>'text' text,
         coalesce(nullif(point->>'marks','')::numeric,0)::numeric marks,
         q.display_ref,
         count(pm.id)::int total,
         count(pm.id) filter(where not(pm.mark_points_json ? (point->>'id')))::int missed,
         round(
           100.0*count(pm.id) filter(where not(pm.mark_points_json ? (point->>'id')))
           /nullif(count(pm.id),0),1
         )::numeric miss_pct
       from live_challenge_rounds r
       join live_challenge_questions lcq on lcq.id=r.challenge_question_id
       join questions q on q.id=lcq.question_id
       cross join lateral jsonb_array_elements(coalesce(lcq.mark_scheme_snapshot->'points','[]'::jsonb)) point
       join live_challenge_answers a on a.round_id=r.id
       join live_challenge_participants participant
         on participant.challenge_id=r.challenge_id and participant.student_id=a.student_id and participant.status='JOINED'
       join live_challenge_peer_assignments pa
         on pa.round_id=r.id and pa.answer_id=a.id and pa.status='SUBMITTED'
       join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
       where r.challenge_id=$1 and r.status='ROUND_RESULTS'
         and nullif(point->>'id','') is not null
         and nullif(point->>'text','') is not null
       group by point->>'id',point->>'code',point->>'text',point->>'marks',q.display_ref
       having count(pm.id)>0
       order by miss_pct desc,total desc,q.display_ref,point->>'code'
       limit 10`,
      [id],
    );

    const questions=questionStats.rows.map(row=>({
      roundId:row.round_id,
      roundNumber:Number(row.round_number),
      questionId:row.question_id,
      questionRef:row.display_ref,
      maxMarks:Number(row.max_marks_snapshot),
      participantCount:Number(row.participant_count??0),
      answeredCount:Number(row.answered_count??0),
      classScore:Number(row.class_score??0),
      averagePercentage:Number(row.average_percentage??0),
    }));
    const learningObjectives=loStats.rows.map(row=>({
      id:row.lo_id,
      code:row.lo_code,
      text:row.lo_text,
      subtopicCode:row.subtopic_code,
      subtopicTitle:row.subtopic_title,
      topicNumber:Number(row.topic_number),
      topicTitle:row.topic_title,
      questionCount:Number(row.question_count??0),
      evidenceCount:Number(row.evidence_count??0),
      marksEarned:Number(row.marks_earned??0),
      marksPossible:Number(row.marks_possible??0),
      percentage:Number(row.percentage??0),
    }));
    const missedMarkPoints=markPoints.rows.map(row=>({
      id:row.id,
      code:row.code,
      text:row.text,
      marks:Number(row.marks??0),
      questionRef:row.display_ref,
      missed:Number(row.missed??0),
      total:Number(row.total??0),
      missPercentage:Number(row.miss_pct??0),
    }));
    const totalEarned=questions.reduce((sum,item)=>sum+item.classScore,0);
    const totalPossible=questions.reduce((sum,item)=>sum+item.maxMarks*item.participantCount,0);
    return {
      challengeId:id,
      status:challenge.status,
      stateVersion:Number(challenge.state_version),
      releasedRounds:questions.length,
      classAveragePercentage:totalPossible>0?Math.round(totalEarned/totalPossible*1000)/10:0,
      questions,
      learningObjectives,
      strongestLearningObjectives:learningObjectives.slice(0,3),
      weakestLearningObjectives:[...learningObjectives].sort((a,b)=>a.percentage-b.percentage||a.code.localeCompare(b.code)).slice(0,3),
      missedMarkPoints,
    };
  }

  /**
   * Finalizes challenge-level analytics after the last round is complete.
   * Learning evidence is already written transactionally when each round is
   * released, so this finalizer only owns the durable completion marker.
   */
  async finalize(actor:Actor,id:string){
    this.staff(actor);
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const access=await client.query(
        `select lc.id,lc.status::text status,lc.analytics_recorded_at,c.school_id
         from live_challenges lc join classes c on c.id=lc.class_id
         where lc.id=$1 and (($2='owner' and c.school_id=$3) or lc.teacher_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=lc.class_id and ct.teacher_id=$4
         )) for update of lc`,
        [id,actor.role,actor.schoolId,actor.id],
      );
      if(!access.rowCount)throw new DomainError('not_found',404);
      const challenge=access.rows[0];
      if(challenge.status!=='FINISHED')throw new DomainError('live_challenge_invalid_transition',409);
      if(challenge.analytics_recorded_at){
        await client.query('commit');
        return {challengeId:id,recorded:false,recordedAt:challenge.analytics_recorded_at,masteryRows:0};
      }

      const rounds=await client.query(
        `select count(*)::int released_rounds
         from live_challenge_rounds
         where challenge_id=$1 and status='ROUND_RESULTS'`,
        [id],
      );
      const releasedRounds=Number(rounds.rows[0]?.released_rounds??0);
      const marked=await client.query(
        `update live_challenges set analytics_recorded_at=now(),updated_at=now()
         where id=$1 and analytics_recorded_at is null returning analytics_recorded_at`,
        [id],
      );
      if(!marked.rowCount)throw new DomainError('live_challenge_state_conflict',409);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'analytics.finalized',jsonb_build_object(
           'releasedRounds',$3,'masterySource','round_release'
         ))`,
        [id,actor.id,releasedRounds],
      );
      await client.query('commit');
      return {challengeId:id,recorded:true,recordedAt:marked.rows[0].analytics_recorded_at,masteryRows:0,releasedRounds};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }
}
