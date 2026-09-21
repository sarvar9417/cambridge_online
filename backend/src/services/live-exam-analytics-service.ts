import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

type LoRow={
  learning_objective_id:string;lo_code:string;lo_text:string;subtopic_code:string;subtopic_title:string;
  marks_earned:string|number;marks_possible:string|number;attempts:string|number;
};

export class LiveExamAnalyticsService{
  constructor(private readonly pool:Pool){}

  private assertStaff(actor:Actor){if(actor.role==='student')throw new DomainError('staff_only',403);}

  async summary(actor:Actor,sessionId:string){
    this.assertStaff(actor);
    const session=await this.pool.query(
      `select les.id,les.title,les.status::text,c.name class_name
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )`,
      [sessionId,actor.role,actor.schoolId,actor.id],
    );
    if(!session.rowCount)throw new DomainError('not_found',404);
    if(String(session.rows[0].status)!=='finished')throw new DomainError('live_results_not_ready',409);

    const [loResult,missedResult,metaResult]=await Promise.all([
      this.pool.query<LoRow>(
        `select lee.learning_objective_id,lo.code lo_code,lo.text lo_text,
           st.code subtopic_code,st.title subtopic_title,
           sum(lee.marks_earned) marks_earned,
           sum(lee.marks_possible) marks_possible,
           count(distinct lee.answer_id)::int attempts
         from live_exam_learning_evidence lee
         join learning_objectives lo on lo.id=lee.learning_objective_id
         join subtopics st on st.id=lee.subtopic_id
         where lee.session_id=$1
         group by lee.learning_objective_id,lo.code,lo.text,st.code,st.title
         order by lo.code`,
        [sessionId],
      ),
      this.pool.query(
        `select
           point->>'code' code,
           point->>'text' text,
           coalesce((point->>'marks')::numeric,0)::float8 marks,
           count(*)::int reviewed_count,
           count(*) filter(where rp.matched=false)::int missed_count
         from live_exam_review_points rp
         join live_exam_reviews r on r.id=rp.review_id
         join live_exam_answers a on a.id=r.answer_id
         join live_exam_questions leq on leq.id=r.session_question_id
         cross join lateral jsonb_array_elements(coalesce(leq.mark_scheme_snapshot->'points','[]'::jsonb)) point
         where leq.session_id=$1
           and r.status in ('submitted','moderated')
           and a.moderated_by is null
           and point->>'id'=rp.mark_scheme_point_id::text
         group by point->>'code',point->>'text',point->>'marks'
         having count(*)>0
         order by missed_count desc,reviewed_count desc,point->>'code'
         limit 8`,
        [sessionId],
      ),
      this.pool.query(
        `select
           count(*)::int evidence_rows,
           count(distinct answer_id)::int evidenced_answers,
           count(distinct answer_id) filter(where teacher_overridden)::int teacher_overridden_answers
         from live_exam_learning_evidence where session_id=$1`,
        [sessionId],
      ),
    ]);

    const objectives=loResult.rows.map((row)=>{
      const earned=Number(row.marks_earned),possible=Number(row.marks_possible);
      return {
        learningObjectiveId:String(row.learning_objective_id),
        code:String(row.lo_code),text:String(row.lo_text),
        subtopicCode:String(row.subtopic_code),subtopicTitle:String(row.subtopic_title),
        marksEarned:earned,marksPossible:possible,attempts:Number(row.attempts),
        mastery:possible>0?earned/possible:0,
      };
    });
    const ranked=[...objectives].sort((a,b)=>b.mastery-a.mastery||b.marksPossible-a.marksPossible||a.code.localeCompare(b.code));
    const weakest=[...objectives].sort((a,b)=>a.mastery-b.mastery||b.marksPossible-a.marksPossible||a.code.localeCompare(b.code));
    const meta=metaResult.rows[0]??{};

    return {
      session:{id:String(session.rows[0].id),title:String(session.rows[0].title),className:String(session.rows[0].class_name)},
      strongest:ranked.slice(0,3),
      weakest:weakest.slice(0,3),
      objectives,
      commonlyMissedMarkPoints:missedResult.rows.map((row)=>({
        code:String(row.code??''),text:String(row.text??''),marks:Number(row.marks??0),
        reviewedCount:Number(row.reviewed_count??0),missedCount:Number(row.missed_count??0),
      })),
      evidence:{
        rows:Number(meta.evidence_rows??0),
        answers:Number(meta.evidenced_answers??0),
        teacherOverriddenAnswers:Number(meta.teacher_overridden_answers??0),
        marksOnly:true,
        speedIncluded:false,
      },
      // Mark-point frequency deliberately excludes teacher-overridden answers:
      // their final score is authoritative, but the pre-override point ticks may
      // no longer describe the teacher's final judgement.
      missedPointCoverage:'unmoderated_review_evidence' as const,
    };
  }
}
