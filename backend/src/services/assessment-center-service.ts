import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export type CenterQuestionInput = {
  prompt:string; options:string[]; correctIndex?:number|null; topic:string;
  maxMarks:number; sourceNumber?:number;
};
export type CenterCreateInput = {
  title:string; courseCode:'school'|'0478'|'9618'; gradeLabel:string;
  kind:'practice'|'diagnostic'|'monitoring'|'summative'; sourceFilename?:string;
  durationMinutes:number; questions:CenterQuestionInput[];
};
const fail=(code:string,status:400|403|404|409)=>new DomainError(code,status);
const number=(value:unknown)=>Number(value??0);

export class AssessmentCenterService {
  constructor(private readonly pool:Pool) {}
  private staff(actor:Actor){
    if(actor.role==='student'||!actor.schoolId)throw fail('staff_only',403);
  }
  private async ownTest(actor:Actor,id:string,db:Pool|PoolClient=this.pool){
    this.staff(actor);
    const result=await db.query(
      `select t.* from assessment_center_tests t
       where t.id=$1 and t.school_id=$2 and t.created_by=$3`,
      [id,actor.schoolId,actor.id]);
    if(!result.rowCount)throw fail('test_not_found',404);
    return result.rows[0];
  }
  private async studentAccess(actor:Actor,testId:string,db:Pool|PoolClient=this.pool){
    if(actor.role!=='student')throw fail('students_only',403);
    const rows=await db.query(
      `select t.* from assessment_center_tests t
       where t.id=$1 and t.status='published' and t.school_id=$3
       and exists(
         select 1 from assessment_center_targets at
         join classes c on c.id=at.class_id
         join enrollments e on e.class_id=c.id
         where at.test_id=t.id and e.student_id=$2 and e.left_at is null
           and c.school_id=t.school_id and c.archived_at is null
       )`,[testId,actor.id,actor.schoolId]);
    if(!rows.rowCount)throw fail('test_not_found',404);
    return rows.rows[0];
  }

  async list(actor:Actor){
    if(actor.role==='student'){
      const result=await this.pool.query(
        `select t.id,t.title,t.course_code,t.grade_label,t.kind,t.duration_minutes,
          t.created_at,t.release_answers,
          (select count(*)::int from assessment_center_questions q where q.test_id=t.id) question_count,
          a.id attempt_id,a.submitted_at,a.score,a.max_score
         from assessment_center_tests t
         left join assessment_center_attempts a on a.test_id=t.id and a.student_id=$1
         where t.school_id=$2 and t.status='published'
         and exists(
           select 1 from assessment_center_targets at
           join classes c on c.id=at.class_id
           join enrollments e on e.class_id=c.id
           where at.test_id=t.id and e.student_id=$1 and e.left_at is null
             and c.archived_at is null and c.school_id=t.school_id)
         order by t.published_at desc limit 100`,[actor.id,actor.schoolId]);
      return result.rows.map(r=>({id:r.id,title:r.title,courseCode:r.course_code,
        gradeLabel:r.grade_label,kind:r.kind,durationMinutes:number(r.duration_minutes),
        questionCount:number(r.question_count),attemptId:r.attempt_id??null,
        submittedAt:r.submitted_at??null,score:r.score==null?null:number(r.score),
        maxScore:r.max_score==null?null:number(r.max_score),releaseAnswers:r.release_answers}));
    }
    this.staff(actor);
    const result=await this.pool.query(
      `select t.id,t.title,t.course_code,t.grade_label,t.kind,t.duration_minutes,
         t.source_filename,t.status,t.created_at,t.published_at,
         (select count(*)::int from assessment_center_questions q where q.test_id=t.id) question_count,
         (select count(*)::int from assessment_center_questions q where q.test_id=t.id and q.correct_index is null) unkeyed_count,
         (select count(*)::int from assessment_center_attempts a where a.test_id=t.id and a.submitted_at is not null) submitted_count
       from assessment_center_tests t where t.created_by=$1 and t.school_id=$2
       order by t.created_at desc limit 200`,[actor.id,actor.schoolId]);
    return result.rows.map(r=>({id:r.id,title:r.title,courseCode:r.course_code,
      gradeLabel:r.grade_label,kind:r.kind,durationMinutes:number(r.duration_minutes),
      sourceFilename:r.source_filename,status:r.status,createdAt:r.created_at,publishedAt:r.published_at,
      questionCount:number(r.question_count),unkeyedCount:number(r.unkeyed_count),
      submittedCount:number(r.submitted_count)}));
  }

  async create(actor:Actor,input:CenterCreateInput){
    this.staff(actor);
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const t=await client.query<{id:string}>(
        `insert into assessment_center_tests(school_id,created_by,title,course_code,
           grade_label,kind,source_filename,duration_minutes)
         values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [actor.schoolId,actor.id,input.title,input.courseCode,input.gradeLabel,
         input.kind,input.sourceFilename??null,input.durationMinutes]);
      const id=t.rows[0]!.id;
      for(const [position,q] of input.questions.entries()){
        await client.query(
          `insert into assessment_center_questions(test_id,position,prompt,options,
             correct_index,topic,marks,source_number)
           values($1,$2,$3,$4::jsonb,$5,$6,$7,$8)`,
          [id,position+1,q.prompt,JSON.stringify(q.options),q.correctIndex??null,q.topic,
           q.maxMarks,q.sourceNumber??position+1]);
      }
      await client.query('COMMIT');
      return {id,status:'draft',questionCount:input.questions.length,
        unkeyedCount:input.questions.filter(q=>q.correctIndex==null).length};
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  async detail(actor:Actor,id:string){
    const t=await this.ownTest(actor,id);
    const [qs,target]=await Promise.all([
      this.pool.query(
        `select id,position,prompt,options,correct_index,topic,marks,source_number
         from assessment_center_questions where test_id=$1 order by position`,[id]),
      this.pool.query(`select class_id from assessment_center_targets where test_id=$1`,[id]),
    ]);
    return {...t,questions:qs.rows.map(q=>({
      id:q.id,position:q.position,prompt:q.prompt,options:q.options,
      correctIndex:q.correct_index,topic:q.topic,maxMarks:q.marks,sourceNumber:q.source_number,
    })),classIds:target.rows.map(r=>r.class_id)};
  }
  /** Answer keys may only be corrected while a test is unpublished. */
  async updateQuestion(actor:Actor,testId:string,questionId:string,update:{
    prompt?:string;options?:string[];correctIndex?:number|null;topic?:string;maxMarks?:number;
  }){
    const t=await this.ownTest(actor,testId);
    if(t.status!=='draft')throw fail('test_already_published',409);
    const hasCorrect=Object.prototype.hasOwnProperty.call(update,'correctIndex');
    const result=await this.pool.query(
      `update assessment_center_questions set
          prompt=coalesce($3,prompt),options=coalesce($4::jsonb,options),
          correct_index=case when $5 then $6::int else correct_index end,
          topic=coalesce($7,topic),marks=coalesce($8,marks)
       where test_id=$1 and id=$2 returning id`,
      [testId,questionId,update.prompt??null,update.options?JSON.stringify(update.options):null,
       hasCorrect,update.correctIndex??null,update.topic??null,update.maxMarks??null]);
    if(!result.rowCount)throw fail('question_not_found',404);
    return {saved:true};
  }

  async publish(actor:Actor,id:string,classIds:string[],releaseAnswers:boolean){
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const t=await this.ownTest(actor,id,client);
      if(t.status!=='draft')throw fail('test_already_published',409);
      const q=await client.query(
        `select count(*)::int total,count(*) filter(where correct_index is null)::int missing
         from assessment_center_questions where test_id=$1`,[id]);
      if(!number(q.rows[0]?.total)||number(q.rows[0]?.missing))throw fail('test_answer_keys_missing',409);
      const ids=[...new Set(classIds)];
      const authorized=await client.query(
        `select id from classes c where c.id=any($1::uuid[]) and c.archived_at is null
           and c.school_id=$2 and (
             ($3='owner') or ($3='teacher' and
               (c.owner_id=$4 or exists(select 1 from class_teachers ct
                 where ct.class_id=c.id and ct.teacher_id=$4))))`,
        [ids,actor.schoolId,actor.role,actor.id]);
      if(!ids.length||authorized.rowCount!==ids.length)throw fail('test_class_forbidden',403);
      for(const classId of ids){
        await client.query(
          `insert into assessment_center_targets(test_id,class_id)
           values($1,$2) on conflict do nothing`,[id,classId]);
      }
      await client.query(
        `update assessment_center_tests
         set status='published',published_at=now(),release_answers=$2 where id=$1`,
        [id,releaseAnswers]);
      await client.query('COMMIT');
      return {id,status:'published',classes:ids.length};
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  async start(actor:Actor,testId:string){
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const test=await this.studentAccess(actor,testId,client);
      await client.query(
        `insert into assessment_center_attempts(test_id,student_id,deadline_at)
         values($1,$2,now()+($3::int*interval '1 minute'))
         on conflict (test_id,student_id) do nothing`,
        [testId,actor.id,test.duration_minutes]);
      const result=await client.query(
        `select id from assessment_center_attempts where test_id=$1 and student_id=$2`,
        [testId,actor.id]);
      await client.query('COMMIT');
      return this.attempt(actor,result.rows[0].id);
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  async attempt(actor:Actor,id:string){
    if(actor.role!=='student')throw fail('students_only',403);
    const result=await this.pool.query(
      `select a.*,t.title,t.kind,t.course_code,t.grade_label,t.release_answers
       from assessment_center_attempts a
       join assessment_center_tests t on t.id=a.test_id
       where a.id=$1 and a.student_id=$2`,[id,actor.id]);
    if(!result.rowCount)throw fail('attempt_not_found',404);
    const a=result.rows[0];
    const rows=await this.pool.query(
      `select q.id,q.position,q.prompt,q.options,q.topic,q.marks,
              ans.choice_index,q.correct_index
       from assessment_center_questions q
       left join assessment_center_answers ans on ans.question_id=q.id and ans.attempt_id=$2
       where q.test_id=$1 order by q.position`,[a.test_id,id]);
    const reveal=Boolean(a.submitted_at&&a.release_answers);
    return {id:a.id,testId:a.test_id,title:a.title,kind:a.kind,courseCode:a.course_code,
      gradeLabel:a.grade_label,startedAt:a.started_at,deadlineAt:a.deadline_at,
      submittedAt:a.submitted_at,serverNow:new Date().toISOString(),
      score:a.submitted_at?number(a.score):null,maxScore:a.submitted_at?number(a.max_score):null,
      questions:rows.rows.map(q=>({id:q.id,position:q.position,prompt:q.prompt,
        options:q.options,topic:q.topic,maxMarks:q.marks,
        choiceIndex:q.choice_index==null?null:number(q.choice_index),
        ...(reveal?{correctIndex:q.correct_index}:{}),
      }))};
  }
  async saveAnswer(actor:Actor,attemptId:string,questionId:string,choiceIndex:number){
    if(actor.role!=='student')throw fail('students_only',403);
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const a=await client.query(
        `select a.id,a.test_id,a.submitted_at,a.deadline_at,now()>=a.deadline_at expired
         from assessment_center_attempts a
         where a.id=$1 and a.student_id=$2 for update`,[attemptId,actor.id]);
      if(!a.rowCount)throw fail('attempt_not_found',404);
      if(a.rows[0].submitted_at||a.rows[0].expired)
        throw fail('test_time_expired',409);
      const result=await client.query(
        `insert into assessment_center_answers(attempt_id,question_id,choice_index)
         select $1,q.id,$3 from assessment_center_questions q
         where q.id=$2 and q.test_id=$4
         on conflict (attempt_id,question_id) do update
          set choice_index=excluded.choice_index,answered_at=now()
         returning question_id`,
        [attemptId,questionId,choiceIndex,a.rows[0].test_id]);
      if(!result.rowCount)throw fail('question_not_found',404);
      await client.query('COMMIT');return {saved:true};
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  async submit(actor:Actor,id:string){
    if(actor.role!=='student')throw fail('students_only',403);
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      const a=await client.query(
        `select * from assessment_center_attempts where id=$1 and student_id=$2 for update`,
        [id,actor.id]);
      if(!a.rowCount)throw fail('attempt_not_found',404);
      if(!a.rows[0].submitted_at){
        const score=await client.query(
          `select coalesce(sum(q.marks) filter(where ans.choice_index=q.correct_index),0)::int score,
             coalesce(sum(q.marks),0)::int maximum
           from assessment_center_questions q
           left join assessment_center_answers ans
             on ans.question_id=q.id and ans.attempt_id=$2
           where q.test_id=$1`,[a.rows[0].test_id,id]);
        await client.query(
          `update assessment_center_attempts set submitted_at=now(),score=$2,max_score=$3
           where id=$1`,[id,number(score.rows[0].score),number(score.rows[0].maximum)]);
      }
      await client.query('COMMIT');
      return this.attempt(actor,id);
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  async report(actor:Actor,testId:string){
    const t=await this.ownTest(actor,testId);
    const [students,topics,items]=await Promise.all([
      this.pool.query(
        `select u.id student_id,u.full_name student_name,a.id attempt_id,
           a.started_at,a.submitted_at,a.score,a.max_score
         from users u join enrollments e on e.student_id=u.id and e.left_at is null
         join assessment_center_targets at on at.class_id=e.class_id and at.test_id=$1
         join classes c on c.id=e.class_id and c.archived_at is null
         left join assessment_center_attempts a on a.test_id=$1 and a.student_id=u.id
         where c.school_id=$2
         group by u.id,u.full_name,a.id,a.started_at,a.submitted_at,a.score,a.max_score
         order by u.full_name`,[testId,actor.schoolId]),
      this.pool.query(
        `select q.topic,count(distinct a.id)::int students,
             coalesce(sum(q.marks),0)::int max_marks,
             coalesce(sum(case when ans.choice_index=q.correct_index then q.marks else 0 end),0)::int earned_marks
         from assessment_center_questions q
         join assessment_center_attempts a on a.test_id=q.test_id and a.submitted_at is not null
         left join assessment_center_answers ans on ans.attempt_id=a.id and ans.question_id=q.id
         where q.test_id=$1 group by q.topic order by q.topic`,[testId]),
      this.pool.query(
        `select q.id,q.position,q.topic,q.prompt,q.correct_index,
           count(a.id)::int submitted,
           count(ans.choice_index)::int answered,
           count(*) filter(where ans.choice_index=q.correct_index)::int correct
         from assessment_center_questions q
         left join assessment_center_attempts a on a.test_id=q.test_id and a.submitted_at is not null
         left join assessment_center_answers ans on ans.attempt_id=a.id and ans.question_id=q.id
         where q.test_id=$1
         group by q.id,q.position,q.topic,q.prompt,q.correct_index order by q.position`,[testId]),
    ]);
    return {test:{id:t.id,title:t.title,kind:t.kind,courseCode:t.course_code,
      gradeLabel:t.grade_label},
      students:students.rows.map(r=>({studentId:r.student_id,name:r.student_name,
        status:r.submitted_at?'submitted':r.started_at?'in_progress':'not_started',
        score:r.score==null?null:number(r.score),maxScore:r.max_score==null?null:number(r.max_score),
        percent:r.max_score?Math.round(100*number(r.score)/number(r.max_score)):null,
        submittedAt:r.submitted_at??null})),
      topics:topics.rows.map(r=>({topic:r.topic,students:number(r.students),
        maxMarks:number(r.max_marks),earnedMarks:number(r.earned_marks),
        percent:r.max_marks?Math.round(100*number(r.earned_marks)/number(r.max_marks)):null})),
      questions:items.rows.map(r=>({id:r.id,number:r.position,topic:r.topic,prompt:r.prompt,
        correctIndex:r.correct_index,submitted:number(r.submitted),answered:number(r.answered),
        correct:number(r.correct)}))};
  }
  async profile(actor:Actor,studentId:string){
    if(actor.role==='student'&&studentId!==actor.id)throw fail('not_found',404);
    if(actor.role!=='student'){
      this.staff(actor);
      const visible=await this.pool.query(
        `select 1 from enrollments e join classes c on c.id=e.class_id
         where e.student_id=$1 and e.left_at is null and c.archived_at is null
         and c.school_id=$2 and (c.owner_id=$3 or $4='owner' or
           exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3))
         limit 1`,[studentId,actor.schoolId,actor.id,actor.role]);
      if(!visible.rowCount)throw fail('not_found',404);
    }
    const data=await this.pool.query(
      `select t.id test_id,t.title,t.kind,t.course_code,t.grade_label,
         a.submitted_at,a.score,a.max_score
       from assessment_center_attempts a
       join assessment_center_tests t on t.id=a.test_id
       where a.student_id=$1 and a.submitted_at is not null
         and t.school_id=$2
         and ($3='student' or t.created_by=$4)
       order by a.submitted_at desc limit 100`,
      [studentId,actor.schoolId,actor.role,actor.id]);
    const tests=data.rows.map(r=>({testId:r.test_id,title:r.title,kind:r.kind,
      courseCode:r.course_code,gradeLabel:r.grade_label,submittedAt:r.submitted_at,
      score:number(r.score),maxScore:number(r.max_score),
      percent:r.max_score?Math.round(100*number(r.score)/number(r.max_score)):null}));
    const topicRows=await this.pool.query(
      `select q.topic,
         count(*)::int questions,
         coalesce(sum(q.marks),0)::int max_marks,
         coalesce(sum(case when ans.choice_index=q.correct_index then q.marks else 0 end),0)::int earned_marks
       from assessment_center_attempts a
       join assessment_center_tests t on t.id=a.test_id
       join assessment_center_questions q on q.test_id=t.id
       left join assessment_center_answers ans on ans.attempt_id=a.id and ans.question_id=q.id
       where a.student_id=$1 and a.submitted_at is not null and t.school_id=$2
         and ($3='student' or t.created_by=$4)
       group by q.topic order by q.topic`,
      [studentId,actor.schoolId,actor.role,actor.id]);
    return {studentId,tests,
      averagePercent:tests.length?Math.round(tests.reduce((s,t)=>s+(t.percent??0),0)/tests.length):null,
      topics:topicRows.rows.map(r=>({topic:r.topic,questions:number(r.questions),
        maxMarks:number(r.max_marks),earnedMarks:number(r.earned_marks),
        percent:r.max_marks?Math.round(100*number(r.earned_marks)/number(r.max_marks)):null}))};
  }
}
