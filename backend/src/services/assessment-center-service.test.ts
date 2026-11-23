import { describe,it,expect,vi } from 'vitest';
import type { Pool } from 'pg';
import { AssessmentCenterService } from './assessment-center-service.js';

const teacher={id:'teacher-1',schoolId:'school-1',role:'teacher' as const,fullName:'Teacher'};
const student={id:'student-1',schoolId:'school-1',role:'student' as const,fullName:'Student'};
const q={prompt:'What is an operating system?',
  options:['A compiler','Software managing computer resources','A browser','A database'],
  correctIndex:1,topic:'Operating systems',maxMarks:1,sourceNumber:1};
function connectPool(impl:(sql:string,params?:unknown[])=>Promise<{rowCount:number;rows:any[]}>){
  const query=vi.fn(impl);
  const client={query,release:vi.fn()};
  return {query,client,pool:{query,connect:vi.fn(async()=>client)} as unknown as Pool};
}
const empty=async()=>({rowCount:1,rows:[]});
describe('Assessment Center server authorization, import and scoring',()=>{
  it('requires staff permission before creating a test',async()=>{
    const f=connectPool(async()=>{throw Error('DB must not be queried');});
    const service=new AssessmentCenterService(f.pool);
    await expect(service.create(student,{title:'Demo',courseCode:'school',
      gradeLabel:'Grade 6',kind:'diagnostic',durationMinutes:20,questions:[q]}))
      .rejects.toMatchObject({code:'staff_only',status:403});
    expect(f.query).not.toHaveBeenCalled();
  });
  it('imports a teacher test as a private draft with numbered questions',async()=>{
    const f=connectPool(async sql=>{
      if(sql.includes('insert into assessment_center_tests'))return {rowCount:1,rows:[{id:'test-1'}]};
      return {rowCount:1,rows:[]};
    });
    const result=await new AssessmentCenterService(f.pool).create(teacher,{
      title:'Grade 6 diagnostic',courseCode:'school',gradeLabel:'Grade 6',kind:'diagnostic',
      durationMinutes:20,questions:[q,{...q,correctIndex:null,sourceNumber:2}]});
    expect(result).toEqual({id:'test-1',status:'draft',questionCount:2,unkeyedCount:1});
    const rows=f.query.mock.calls.filter(([sql])=>sql.includes('insert into assessment_center_questions'));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.[1]?.[4]).toBe(1);
    expect(rows[1]?.[1]?.[4]).toBeNull();
    expect(f.query).toHaveBeenCalledWith('COMMIT');
  });
  it('refuses publishing a draft with missing keys before making it visible',async()=>{
    const f=connectPool(async sql=>{
      if(sql.includes('select t.* from assessment_center_tests'))
        return {rowCount:1,rows:[{status:'draft'}]};
      if(sql.includes('count(*)::int total'))
        return {rowCount:1,rows:[{total:10,missing:1}]};
      return {rowCount:1,rows:[]};
    });
    await expect(new AssessmentCenterService(f.pool).publish(teacher,'test-1',['class-1'],false))
      .rejects.toMatchObject({code:'test_answer_keys_missing',status:409});
    expect(f.query).toHaveBeenCalledWith('ROLLBACK');
    expect(f.query.mock.calls.some(([sql])=>sql.includes("set status='published'"))).toBe(false);
  });
  it('rejects publishing to an unauthorized classroom',async()=>{
    const f=connectPool(async sql=>{
      if(sql.includes('select t.* from assessment_center_tests'))
        return {rowCount:1,rows:[{status:'draft'}]};
      if(sql.includes('count(*)::int total'))
        return {rowCount:1,rows:[{total:10,missing:0}]};
      if(sql.includes('select id from classes'))
        return {rowCount:0,rows:[]};
      return {rowCount:1,rows:[]};
    });
    await expect(new AssessmentCenterService(f.pool).publish(teacher,'test-1',['class-1'],false))
      .rejects.toMatchObject({code:'test_class_forbidden',status:403});
    expect(f.query.mock.calls.some(([sql])=>sql.includes('insert into assessment_center_targets'))).toBe(false);
  });
  it('does not expose answer keys in student test listings',async()=>{
    const f=connectPool(async()=>({rowCount:1,rows:[{id:'t',title:'Diagnostic',course_code:'9618',
      grade_label:'Paper 1',kind:'diagnostic',duration_minutes:75,question_count:30,
      attempt_id:null,submitted_at:null,score:null,max_score:null,release_answers:false}]}));
    const result=await new AssessmentCenterService(f.pool).list(student);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('correctIndex');
    expect(f.query.mock.calls[0]?.[0]).toContain("t.status='published'");
    expect(f.query.mock.calls[0]?.[0]).toContain('e.left_at is null');
  });
  it('rejects saving answers after the server deadline',async()=>{
    const f=connectPool(async sql=>{
      if(sql.includes('from assessment_center_attempts a')&&sql.includes('for update'))
        return {rowCount:1,rows:[{test_id:'test-1',submitted_at:null,expired:true}]};
      return {rowCount:1,rows:[]};
    });
    await expect(new AssessmentCenterService(f.pool).saveAnswer(student,'attempt-1','question-1',1))
      .rejects.toMatchObject({code:'test_time_expired',status:409});
    expect(f.query.mock.calls.some(([sql])=>sql.includes('insert into assessment_center_answers'))).toBe(false);
    expect(f.query).toHaveBeenCalledWith('ROLLBACK');
  });
  it('requires own identity for student submission and never executes on behalf of another',async()=>{
    const f=connectPool(async sql=>{
      if(sql.includes('from assessment_center_attempts where id='))
        return {rowCount:0,rows:[]};
      return {rowCount:1,rows:[]};
    });
    await expect(new AssessmentCenterService(f.pool).submit(student,'other-attempt'))
      .rejects.toMatchObject({code:'attempt_not_found',status:404});
    expect(f.query).toHaveBeenCalledWith('ROLLBACK');
  });
  it('prevents a student from reading another student profile',async()=>{
    const f=connectPool(async()=>{throw Error('Database should never be touched');});
    await expect(new AssessmentCenterService(f.pool).profile(student,'another-student'))
      .rejects.toMatchObject({code:'not_found',status:404});
    expect(f.query).not.toHaveBeenCalled();
  });
  it('correct answer key can only change while the test is a draft',async()=>{
    const f=connectPool(async sql=>{
      if(sql.includes('select t.* from assessment_center_tests'))
        return {rowCount:1,rows:[{status:'published'}]};
      throw Error('Should not update a published test');
    });
    await expect(new AssessmentCenterService(f.pool).updateQuestion(teacher,'test-1','q-1',{correctIndex:2}))
      .rejects.toMatchObject({code:'test_already_published',status:409});
    expect(f.query.mock.calls.some(([sql])=>sql.includes('update assessment_center_questions'))).toBe(false);
  });
});
