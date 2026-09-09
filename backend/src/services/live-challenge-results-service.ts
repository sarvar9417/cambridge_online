import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export class LiveChallengeResultsService{
  constructor(private readonly pool:Pool){}

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
