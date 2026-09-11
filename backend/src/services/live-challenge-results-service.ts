import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export class LiveChallengeResultsService{
  constructor(private readonly pool:Pool){}

  async history(actor:Actor,limit=10){
    if(actor.role!=='student')throw new DomainError('students_only',403);
    const safeLimit=Math.max(1,Math.min(25,Math.trunc(limit)||10));
    const result=await this.pool.query(
      `select lc.id,lc.title,lc.class_id,c.name class_name,u.full_name teacher_name,
         s.code syllabus_code,t.title topic_title,st.title subtopic_title,lc.finished_at,
         count(r.id)::int round_count,
         coalesce(sum(lcq.max_marks_snapshot),0)::numeric total_max,
         coalesce(sum(coalesce(
           (select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1),
           (select pm.awarded_marks
            from live_challenge_peer_assignments pa
            join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
            where pa.answer_id=a.id and pa.status='SUBMITTED'
            order by pm.submitted_at desc limit 1),
           0
         )),0)::numeric total_score
       from live_challenges lc
       join classes c on c.id=lc.class_id and c.archived_at is null
       join enrollments e on e.class_id=c.id and e.student_id=$1 and e.left_at is null
       join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$1 and p.status='JOINED'
       join users u on u.id=lc.teacher_id
       join syllabi s on s.id=lc.syllabus_id
       left join topics t on t.id=lc.topic_id
       left join subtopics st on st.id=lc.subtopic_id
       join live_challenge_rounds r
         on r.challenge_id=lc.id and r.status='ROUND_RESULTS' and p.joined_at <= r.locked_at
       join live_challenge_questions lcq on lcq.id=r.challenge_question_id
       left join live_challenge_answers a on a.round_id=r.id and a.student_id=$1
       where lc.status='FINISHED'
       group by lc.id,c.name,u.full_name,s.code,t.title,st.title
       order by lc.finished_at desc nulls last,lc.updated_at desc
       limit $2`,
      [actor.id,safeLimit],
    );
    return result.rows.map(row=>{
      const totalScore=Number(row.total_score??0),totalMax=Number(row.total_max??0);
      return {
        id:row.id,title:row.title,classId:row.class_id,className:row.class_name,status:'FINISHED' as const,
        teacherName:row.teacher_name,syllabusCode:row.syllabus_code,topicTitle:row.topic_title,subtopicTitle:row.subtopic_title,
        finishedAt:row.finished_at,roundCount:Number(row.round_count??0),totalScore,totalMax,
        overallPercentage:totalMax>0?Math.round(totalScore/totalMax*1000)/10:0,
      };
    });
  }

  async student(actor:Actor,id:string){
    if(actor.role!=='student')throw new DomainError('students_only',403);
    const result=await this.pool.query(
      `select lc.status::text challenge_status,lc.state_version,lc.syllabus_id,r.id round_id,r.round_number,
         q.display_ref,lcq.max_marks_snapshot,a.id answer_id,
         coalesce(
           (select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1),
           (select pm.awarded_marks
            from live_challenge_peer_assignments pa
            join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
            where pa.answer_id=a.id and pa.status='SUBMITTED'
            order by pm.submitted_at desc limit 1),
           0
         ) effective_score,
         exists(select 1 from live_challenge_score_overrides so where so.answer_id=a.id) teacher_overridden
       from live_challenges lc
       join classes c on c.id=lc.class_id and c.archived_at is null
       join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
       join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$2 and p.status='JOINED'
       join live_challenge_rounds r
         on r.challenge_id=lc.id and r.status='ROUND_RESULTS' and p.joined_at <= r.locked_at
       join live_challenge_questions lcq on lcq.id=r.challenge_question_id
       join questions q on q.id=lcq.question_id
       left join live_challenge_answers a on a.round_id=r.id and a.student_id=$2
       where lc.id=$1 and lc.status in ('ROUND_RESULTS','FINISHED')
       order by r.round_number`,
      [id,actor.id],
    );
    if(!result.rowCount)throw new DomainError('live_challenge_result_unavailable',409);
    const rows=result.rows;
    const rounds=rows.map(row=>{
      const score=Number(row.effective_score??0),maxMarks=Number(row.max_marks_snapshot);
      return {
        roundId:row.round_id,roundNumber:Number(row.round_number),questionRef:row.display_ref,
        answered:Boolean(row.answer_id),score,maxMarks,
        percentage:maxMarks>0?Math.round(score/maxMarks*1000)/10:0,
        teacherOverridden:row.teacher_overridden===true,
      };
    });
    const totalScore=rounds.reduce((sum,round)=>sum+round.score,0);
    const totalMax=rounds.reduce((sum,round)=>sum+round.maxMarks,0);
    const latest=rounds[rounds.length-1]!;

    const loResult=await this.pool.query(
      `with scored_rounds as (
         select r.id round_id,lcq.question_id,lcq.max_marks_snapshot,
           coalesce(
             (select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1),
             (select pm.awarded_marks
              from live_challenge_peer_assignments pa
              join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
              where pa.answer_id=a.id and pa.status='SUBMITTED'
              order by pm.submitted_at desc limit 1),
             0
           )::numeric effective_score
         from live_challenges lc
         join classes c on c.id=lc.class_id and c.archived_at is null
         join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
         join live_challenge_participants participant
           on participant.challenge_id=lc.id and participant.student_id=$2 and participant.status='JOINED'
         join live_challenge_rounds r
           on r.challenge_id=lc.id and r.status='ROUND_RESULTS' and participant.joined_at <= r.locked_at
         join live_challenge_questions lcq on lcq.id=r.challenge_question_id
         left join live_challenge_answers a on a.round_id=r.id and a.student_id=$2
         where lc.id=$1 and lc.status in ('ROUND_RESULTS','FINISHED')
       ), mapped_los as (
         select distinct sr.round_id,lo.id lo_id,lo.code lo_code,lo.text lo_text,
           st.code subtopic_code,st.title subtopic_title,t.number topic_number,t.title topic_title
         from scored_rounds sr
         join question_learning_objectives qlo on qlo.question_id=sr.question_id
         join learning_objectives lo on lo.id=qlo.lo_id
         join subtopics st on st.id=lo.subtopic_id
         join topics t on t.id=st.topic_id and t.syllabus_id=$3
         union
         select distinct sr.round_id,target_lo.id lo_id,target_lo.code lo_code,target_lo.text lo_text,
           target_st.code subtopic_code,target_st.title subtopic_title,target_t.number topic_number,target_t.title topic_title
         from scored_rounds sr
         join question_learning_objectives qlo on qlo.question_id=sr.question_id
         join learning_objective_compatibility compat
           on compat.source_lo_id=qlo.lo_id and compat.relation in('equivalent','subtopic_compatible')
         join learning_objectives target_lo on target_lo.id=compat.target_lo_id
         join subtopics target_st on target_st.id=target_lo.subtopic_id
         join topics target_t on target_t.id=target_st.topic_id and target_t.syllabus_id=$3
       )
       select ml.lo_id,ml.lo_code,ml.lo_text,ml.subtopic_code,ml.subtopic_title,
         ml.topic_number,ml.topic_title,count(distinct ml.round_id)::int question_count,
         coalesce(sum(sr.effective_score),0)::numeric marks_earned,
         coalesce(sum(sr.max_marks_snapshot),0)::numeric marks_possible,
         coalesce(round(100.0*sum(sr.effective_score)/nullif(sum(sr.max_marks_snapshot),0),1),0)::numeric percentage
       from mapped_los ml
       join scored_rounds sr on sr.round_id=ml.round_id
       group by ml.lo_id,ml.lo_code,ml.lo_text,ml.subtopic_code,ml.subtopic_title,ml.topic_number,ml.topic_title
       order by percentage desc,ml.topic_number,ml.subtopic_code,ml.lo_code`,
      [id,actor.id,rows[0].syllabus_id],
    );
    const learningObjectives=loResult.rows.map(row=>({
      id:row.lo_id,code:row.lo_code,text:row.lo_text,
      subtopicCode:row.subtopic_code,subtopicTitle:row.subtopic_title,
      topicNumber:Number(row.topic_number),topicTitle:row.topic_title,
      questionCount:Number(row.question_count??0),marksEarned:Number(row.marks_earned??0),
      marksPossible:Number(row.marks_possible??0),percentage:Number(row.percentage??0),
    }));
    const strengthCount=Math.min(3,Math.max(1,Math.ceil(learningObjectives.length/2)));
    const strengths=learningObjectives.slice(0,strengthCount);
    const strengthIds=new Set(strengths.map(item=>item.id));
    const reviewAreas=[...learningObjectives]
      .sort((a,b)=>a.percentage-b.percentage||a.code.localeCompare(b.code))
      .filter(item=>!strengthIds.has(item.id))
      .slice(0,3);

    return {
      challengeId:id,status:rows[0].challenge_status,stateVersion:Number(rows[0].state_version),
      roundId:latest.roundId,roundNumber:latest.roundNumber,questionRef:latest.questionRef,
      score:latest.score,maxMarks:latest.maxMarks,percentage:latest.percentage,teacherOverridden:latest.teacherOverridden,
      rounds,totalScore,totalMax,overallPercentage:totalMax>0?Math.round(totalScore/totalMax*1000)/10:0,
      learningObjectives,strengths,reviewAreas,
    };
  }
}