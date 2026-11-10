import {describe,expect,it,vi} from 'vitest';
import {LiveExamService} from './live-exam-service.js';

const owner={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'owner' as const,schoolId:'school',fullName:'Owner'};
const student={...owner,role:'student' as const};

function harness(){
  const seen:Array<{sql:string;params:unknown[]}>=[];
  const query=vi.fn(async(sql:string,params:unknown[]=[])=>{
    seen.push({sql,params});
    if(sql.includes('select les.*'))return {rowCount:1,rows:[{
      id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',status:'question_open',version:8,settings:{},class_id:'class',
    }]};
    if(sql.includes('returning version'))return {rowCount:1,rows:[{version:9}]};
    return {rowCount:1,rows:[]};
  });
  const client={query,release:vi.fn()};
  const pool={connect:vi.fn().mockResolvedValue(client)};
  const service=new LiveExamService(pool as never,{} as never);
  return {service,seen};
}
const effects={animations:true,sound:false,intensity:'spectacular' as const,publicCelebrations:false};

describe('teacher-wide Live Challenge effects',()=>{
  it('rejects students before opening any database transaction',async()=>{
    const {service,seen}=harness();
    await expect(service.setLiveEffects(student,'session',effects,8))
      .rejects.toMatchObject({code:'staff_only',status:403});
    expect(seen).toHaveLength(0);
  });
  it('stores only presentation policy and emits a versioned safe event',async()=>{
    const {service,seen}=harness();
    const result=await service.setLiveEffects(owner,'session',effects,8);
    expect(result).toMatchObject({version:9,liveEffects:effects});
    const update=seen.find(item=>item.sql.includes("'{liveEffects}'"))!;
    expect(JSON.parse(String(update.params[1]))).toEqual(effects);
    const event=seen.find(item=>item.sql.includes('insert into live_exam_events'))!;
    expect(event.params[3]).toBe(9);
    expect(event.params[2]).toBe('session.effects_changed');
    expect(JSON.stringify(event.params)).not.toMatch(/final_score|answer_text|student_name/);
  });
  it('protects optimistic concurrency against stale teacher tabs',async()=>{
    const {service,seen}=harness();
    await expect(service.setLiveEffects(owner,'session',effects,7))
      .rejects.toMatchObject({code:'live_state_conflict',status:409});
    expect(seen.some(item=>item.sql.includes("'{liveEffects}'"))).toBe(false);
    expect(seen.some(item=>item.sql==='rollback')).toBe(true);
  });
});
