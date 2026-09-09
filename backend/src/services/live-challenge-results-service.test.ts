import { describe,expect,it,vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveChallengeResultsService } from './live-challenge-results-service.js';

const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student'};
const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';

describe('LiveChallengeResultsService',()=>{
  it('returns cumulative released-round totals and counts a missed round as zero',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(!sql.includes("r.status='ROUND_RESULTS'"))throw new Error(`Unexpected SQL: ${sql}`);
      return{rowCount:2,rows:[
        {challenge_status:'FINISHED',state_version:20,round_id:'r1',round_number:1,display_ref:'Q1',max_marks_snapshot:4,answer_id:'a1',effective_score:'3',teacher_overridden:true},
        {challenge_status:'FINISHED',state_version:20,round_id:'r2',round_number:2,display_ref:'Q2',max_marks_snapshot:6,answer_id:null,effective_score:'0',teacher_overridden:false},
      ]};
    });
    const service=new LiveChallengeResultsService({query} as unknown as Pool);
    const result=await service.student(student,challengeId);
    expect(result).toMatchObject({status:'FINISHED',totalScore:3,totalMax:10,overallPercentage:30});
    expect(result.rounds).toEqual([
      expect.objectContaining({roundNumber:1,answered:true,score:3,maxMarks:4,teacherOverridden:true}),
      expect.objectContaining({roundNumber:2,answered:false,score:0,maxMarks:6,teacherOverridden:false}),
    ]);
    expect(JSON.stringify(result)).not.toContain('answer_text');
  });

  it('returns only joined finished challenge history without answer or mark-scheme payloads',async()=>{
    const finishedAt=new Date('2026-09-09T18:30:00Z');
    const query=vi.fn(async(sql:string,params:unknown[])=>{
      expect(sql).toContain("p.status='JOINED'");
      expect(sql).toContain("lc.status='FINISHED'");
      expect(sql).toContain('e.student_id=$1');
      expect(params).toEqual([student.id,10]);
      return{rowCount:1,rows:[{
        id:challengeId,title:'CPU Live',class_id:'class-1',class_name:'11-A',teacher_name:'Teacher',
        syllabus_code:'9618',topic_title:'Processor fundamentals',subtopic_title:'CPU architecture',finished_at:finishedAt,
        round_count:2,total_score:'7',total_max:'10',answer_text:'secret',mark_scheme_snapshot:{secret:true},
      }]};
    });
    const service=new LiveChallengeResultsService({query} as unknown as Pool);
    const result=await service.history(student);
    expect(result).toEqual([expect.objectContaining({
      id:challengeId,status:'FINISHED',roundCount:2,totalScore:7,totalMax:10,overallPercentage:70,
    })]);
    const serialized=JSON.stringify(result);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('answer_text');
    expect(serialized).not.toContain('mark_scheme');
  });

  it('blocks staff from student history before any database read',async()=>{
    const query=vi.fn();
    const service=new LiveChallengeResultsService({query} as unknown as Pool);
    await expect(service.history(teacher)).rejects.toMatchObject({code:'students_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });

  it('fails closed when no released result is authorised for the student',async()=>{
    const service=new LiveChallengeResultsService({query:vi.fn().mockResolvedValue({rowCount:0,rows:[]})} as unknown as Pool);
    await expect(service.student(student,challengeId)).rejects.toMatchObject({code:'live_challenge_result_unavailable',status:409});
  });
});