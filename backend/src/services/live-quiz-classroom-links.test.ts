import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { LiveQuizService } from './live-quiz-service.js';

const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Aziza'};
const staff={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};

describe('Live Quiz classroom invitation isolation',()=>{
  it('only allows student actors to discover their own class invitations',async()=>{
    const query=vi.fn(async(sql:string,params?:unknown[])=>{
      expect(sql).toContain('c.school_id=$2');
      expect(sql).toContain('e.student_id=$1 and e.left_at is null');
      expect(sql).toContain("r.status='waiting'");
      expect(sql).toContain("r.status in ('active','review')");
      expect(sql).toContain('r.allow_late_join=true');
      expect(params).toEqual(['student-1','school-1']);
      return {rows:[{id:'room-1',pin:'482915',class_name:'11-A',course_code:'9618',
        status:'waiting',game_mode:'classic',created_at:new Date('2026-11-20T07:00:00Z'),player_count:'3'}],rowCount:1};
    });
    const service=new LiveQuizService({query} as unknown as Pool);
    const links=await service.availableForStudent(student);
    expect(links).toMatchObject([{id:'room-1',pin:'482915',className:'11-A',playerCount:3}]);
    expect(query).toHaveBeenCalledTimes(1);
    await expect(service.availableForStudent(staff)).rejects.toMatchObject({status:403});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns no invitations for students without a school, without querying other schools',async()=>{
    const query=vi.fn();
    const service=new LiveQuizService({query} as unknown as Pool);
    expect(await service.availableForStudent({...student,schoolId:null})).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a class outside the teacher roster before collecting questions',async()=>{
    const query=vi.fn(async()=>({rows:[],rowCount:0}));
    const interactiveGameCollection=vi.fn();
    const service=new LiveQuizService({query} as unknown as Pool,
      {interactiveGameCollection} as unknown as ConstructorParameters<typeof LiveQuizService>[1]);
    await expect(service.create(staff,{classId:'another-class',courseCode:'9618',
      scopes:[{chapterNo:17,kind:'chapter'}],count:15,seconds:20}))
      .rejects.toMatchObject({status:404,code:'quiz_class_not_found'});
    expect(interactiveGameCollection).not.toHaveBeenCalled();
  });

  it('creates a game with a six-digit PIN and no class assignment when the host chooses code-only mode',async()=>{
    const query=vi.fn(async(sql:string,params?:unknown[])=>{
      expect(sql).toContain('insert into live_quiz_rooms');
      expect(params?.[1]).toBeNull();
      return {rows:[{id:'new-room'}],rowCount:1};
    });
    const interactiveGameCollection=vi.fn(async()=>({
      scopes:[{chapterNo:17,kind:'chapter'}],
      pairs:Array.from({length:4},(_,index)=>({id:String(index),term:`Term ${index}`,
        definition:`Definition ${index}`,status:'approved',isOfficialKeyTerm:true,
        definitionEvidenceStatus:'official_textbook_definition',chapterNo:17})),
    }));
    const service=new LiveQuizService({query} as unknown as Pool,
      {interactiveGameCollection} as unknown as ConstructorParameters<typeof LiveQuizService>[1]);
    const result=await service.create(staff,{courseCode:'9618',
      scopes:[{chapterNo:17,kind:'chapter'}],count:4,seconds:20});
    expect(result).toMatchObject({id:'new-room',questionCount:4});
    expect(result.pin).toMatch(/^\d{6}$/);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
