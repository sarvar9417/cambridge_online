import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { parseLiveExamSettings } from './live-exam-settings.js';

export interface LiveExamStanding {
  rank:number;
  studentId?:string;
  studentName:string;
  score:number;
  possible:number;
}

export interface LiveExamScoreBucket {
  score:number;
  count:number;
}

type SummaryAudience='teacher'|'board';

export class LiveExamRoundSummaryService {
  constructor(private readonly pool:Pool){}

  private assertStaff(actor:Actor){
    if(actor.role==='student')throw new DomainError('staff_only',403);
  }

  private async controlledSession(actor:Actor,sessionId:string){
    this.assertStaff(actor);
    const result=await this.pool.query(
      `select les.id,les.status::text,les.current_question_index,les.settings
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (
           c.owner_id=$4 or exists(
             select 1 from class_teachers ct
             where ct.class_id=c.id and ct.teacher_id=$4
           )
         ))
       )`,
      [sessionId,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    return result.rows[0] as {id:string;status:string;current_question_index:number;settings:unknown};
  }

  async summary(actor:Actor,sessionId:string,audience:SummaryAudience='teacher'){
    const session=await this.controlledSession(actor,sessionId);
    if(!['review','finished'].includes(session.status))throw new DomainError('live_results_not_ready',409);

    const currentPosition=Number(session.current_question_index);
    const [roundResult,overallResult,possibleResult]=await Promise.all([
      this.pool.query(
        `select lep.student_id,u.full_name,coalesce(a.final_score,0)::float8 score,leq.marks,
           rank() over(order by coalesce(a.final_score,0) desc)::int rank
         from live_exam_questions leq
         join live_exam_sessions les on les.id=leq.session_id
         join live_exam_participants lep on lep.session_id=les.id
         join users u on u.id=lep.student_id
         left join live_exam_answers a
           on a.session_question_id=leq.id and a.participant_id=lep.id
         where leq.session_id=$1 and leq.position=$2
         order by score desc,u.full_name,lep.student_id`,
        [sessionId,currentPosition],
      ),
      this.pool.query(
        `select lep.student_id,u.full_name,
           coalesce(sum(coalesce(a.final_score,0)),0)::float8 score,
           rank() over(order by coalesce(sum(coalesce(a.final_score,0)),0) desc)::int rank
         from live_exam_participants lep
         join users u on u.id=lep.student_id
         join live_exam_questions leq
           on leq.session_id=lep.session_id and leq.position<=$2
         left join live_exam_answers a
           on a.session_question_id=leq.id and a.participant_id=lep.id
         where lep.session_id=$1
         group by lep.student_id,u.full_name
         order by score desc,u.full_name,lep.student_id`,
        [sessionId,currentPosition],
      ),
      this.pool.query(
        `select coalesce(sum(marks),0)::int possible
         from live_exam_questions
         where session_id=$1 and position<=$2`,
        [sessionId,currentPosition],
      ),
    ]);

    const settings=parseLiveExamSettings(session.settings);
    const allStudentIds=[...new Set([...roundResult.rows,...overallResult.rows].map(row=>String(row.student_id)))].sort();
    const anonymousNames=new Map(allStudentIds.map((id,index)=>[id,`Learner ${index+1}`]));
    const boardName=(row:Record<string,unknown>)=>{
      const full=String(row.full_name??'').trim();
      if(settings.displayNameMode==='anonymous')return anonymousNames.get(String(row.student_id))??'Learner';
      if(settings.displayNameMode==='first_name')return full.split(/\s+/)[0]||'Learner';
      return full||'Learner';
    };
    const standing=(row:Record<string,unknown>,possible:number):LiveExamStanding=>{
      const base={rank:Number(row.rank),studentName:audience==='board'?boardName(row):String(row.full_name),score:Number(row.score),possible};
      return audience==='teacher'?{...base,studentId:String(row.student_id)}:base;
    };

    const roundPossible=Number(roundResult.rows[0]?.marks??0);
    const overallPossible=Number(possibleResult.rows[0]?.possible??0);
    const roundStandings=roundResult.rows.map(row=>standing(row,roundPossible));
    const overallStandings=overallResult.rows.map(row=>standing(row,overallPossible));

    const buckets=new Map<number,number>();
    for(const item of roundStandings)buckets.set(item.score,(buckets.get(item.score)??0)+1);
    const distribution:LiveExamScoreBucket[]=[...buckets.entries()]
      .sort(([left],[right])=>right-left)
      .map(([score,count])=>({score,count}));
    const average=roundStandings.length
      ?roundStandings.reduce((total,item)=>total+item.score,0)/roundStandings.length
      :0;

    return {
      sessionId,
      questionPosition:currentPosition,
      marksFirst:true,
      audience,
      round:{possible:roundPossible,average,distribution,standings:roundStandings},
      overall:{possible:overallPossible,standings:overallStandings},
    };
  }
}
