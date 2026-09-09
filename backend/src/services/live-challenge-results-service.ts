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
       join live_challenge_rounds r on r.challenge_id=lc.id and r.status='ROUND_RESULTS'
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
      `select lc.status::text challenge_status,lc.state_version,r.id round_id,r.round_number,
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
       join live_challenge_rounds r on r.challenge_id=lc.id and r.status='ROUND_RESULTS'
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
    return {
      challengeId:id,status:rows[0].challenge_status,stateVersion:Number(rows[0].state_version),
      roundId:latest.roundId,roundNumber:latest.roundNumber,questionRef:latest.questionRef,
      score:latest.score,maxMarks:latest.maxMarks,percentage:latest.percentage,teacherOverridden:latest.teacherOverridden,
      rounds,totalScore,totalMax,overallPercentage:totalMax>0?Math.round(totalScore/totalMax*1000)/10:0,
    };
  }
}