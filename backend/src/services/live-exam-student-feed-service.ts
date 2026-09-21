import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export type LiveChallengeStudentFeedItem={
  id:string;
  title:string;
  className:string;
  status:string;
  markingMode:string;
  currentQuestionIndex:number;
  questionCount:number;
  participantCount:number;
  publishedAt:string|null;
  updatedAt:string;
  joined:boolean;
  canJoinWithCode:boolean;
  earned:number|null;
  possible:number|null;
};

export class LiveExamStudentFeedService{
  constructor(private readonly pool:Pool){}

  async feed(actor:Actor){
    if(actor.role!=='student')throw new DomainError('students_only',403);
    const result=await this.pool.query(
      `select les.id,les.title,les.status::text,les.marking_mode::text,
         les.current_question_index,les.published_at,les.updated_at,c.name class_name,
         lep.id participant_id,
         (select count(*)::int from live_exam_questions leq where leq.session_id=les.id) question_count,
         (select count(*)::int from live_exam_participants allp where allp.session_id=les.id and allp.left_at is null) participant_count,
         case when lep.id is null then null else coalesce((
           select sum(coalesce(a.final_score,0))::float8
           from live_exam_answers a
           join live_exam_questions leq on leq.id=a.session_question_id
           where leq.session_id=les.id and a.participant_id=lep.id
         ),0) end earned,
         case when lep.id is null then null else coalesce((
           select sum(leq.marks)::float8 from live_exam_questions leq where leq.session_id=les.id
         ),0) end possible,
         coalesce((les.settings->>'allowLateJoin')::boolean,false) allow_late_join
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       join enrollments e on e.class_id=les.class_id and e.student_id=$1 and e.left_at is null
       left join live_exam_participants lep on lep.session_id=les.id and lep.student_id=$1 and lep.left_at is null
       where les.status<>'draft' and (
         lep.id is not null
         or les.status in ('published','lobby')
         or (les.status='question_open' and coalesce((les.settings->>'allowLateJoin')::boolean,false))
       )
       order by
         case
           when lep.id is not null and les.status not in ('finished','cancelled') then 0
           when lep.id is null and les.status in ('published','lobby','question_open') then 1
           else 2
         end,
         les.updated_at desc
       limit 100`,
      [actor.id],
    );

    const items:LiveChallengeStudentFeedItem[]=result.rows.map((row)=>{
      const joined=Boolean(row.participant_id);
      const status=String(row.status);
      return {
        id:String(row.id),
        title:String(row.title),
        className:String(row.class_name),
        status,
        markingMode:String(row.marking_mode),
        currentQuestionIndex:Number(row.current_question_index??0),
        questionCount:Number(row.question_count??0),
        participantCount:Number(row.participant_count??0),
        publishedAt:row.published_at?new Date(row.published_at).toISOString():null,
        updatedAt:new Date(row.updated_at).toISOString(),
        joined,
        canJoinWithCode:!joined&&(status==='lobby'||(status==='question_open'&&Boolean(row.allow_late_join))),
        earned:joined&&row.earned!==null?Number(row.earned):null,
        possible:joined&&row.possible!==null?Number(row.possible):null,
      };
    });

    return {
      active:items.filter((item)=>item.joined&&!['finished','cancelled'].includes(item.status)),
      upcoming:items.filter((item)=>!item.joined),
      history:items.filter((item)=>item.joined&&['finished','cancelled'].includes(item.status)),
    };
  }
}
