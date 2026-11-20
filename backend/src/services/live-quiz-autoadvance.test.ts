import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { CLASSIC_REVIEW_SECONDS, LiveQuizService } from './live-quiz-service.js';

const teacher={id:'teacher',role:'teacher' as const,schoolId:null,fullName:'Teacher'};
const questions=Array.from({length:4},(_,index)=>({id:`q${index}`,
  prompt:`Question ${index+1}`,options:['A','B','C','D'],answerIndex:2,
  explanation:'C is the correct answer',sourceContext:'Chapter 17'}));

/** The actual state transitions remain SQL-authoritative. This fake connection
 * exercises the service's three-step reconciliation and private results shape
 * without applying a migration to the real school database. */
function roomFixture(input:{status:'active'|'review';questionIndex:number;
  elapsedReviewMs?:number;allAnswered?:boolean;timeExpired?:boolean}){
  let simulatedNow=Date.now();
  const room={id:'room',host_id:teacher.id,pin:'123456',course_code:'9618',
    game_mode:'classic',status:input.status as 'active'|'review'|'finished',
    questions,question_index:input.questionIndex,
    question_seconds:20,question_started_at:new Date(simulatedNow-2000).toISOString(),
    updated_at:new Date(simulatedNow-(input.elapsedReviewMs??0)).toISOString(),
    finished_at:null as string|null,allow_late_join:false,show_correctness:true,
    random_names:false};
  const history:string[]=[];
  const query=vi.fn(async(sql:string,params?:unknown[])=>{
    history.push(sql);
    if(sql.includes("set status='finished',finished_at=now()")&&sql.includes("game_mode='treasure'"))
      return {rows:[],rowCount:0};
    if(sql.includes("set status='review',updated_at=now()")){
      if(room.status==='active'&&(input.allAnswered||input.timeExpired)){
        room.status='review';room.updated_at=new Date(simulatedNow).toISOString();
      }
      return {rows:[],rowCount:1};
    }
    if(sql.includes('r.updated_at<=now()-')){
      expect(params).toEqual([room.id,CLASSIC_REVIEW_SECONDS]);
      if(room.status==='review'&&simulatedNow-new Date(room.updated_at).getTime()>=5000){
        if(room.question_index+1===questions.length){
          room.status='finished';room.finished_at=new Date(simulatedNow).toISOString();
        }else{
          room.status='active';room.question_index++;room.question_started_at=new Date(simulatedNow).toISOString();
        }
        room.updated_at=new Date(simulatedNow).toISOString();
      }
      return {rows:[],rowCount:1};
    }
    if(sql.includes('select * from live_quiz_rooms where id='))return {rows:[{...room}],rowCount:1};
    if(sql.includes('from live_quiz_players p left join live_quiz_answers'))return {rows:[
      {id:'aziza',nickname:'Aziza',avatar:'🦊',score:900,answered_now:1},
      {id:'sardor',nickname:'Sardor',avatar:'🐼',score:0,answered_now:1},
    ],rowCount:2};
    if(sql.includes('select a.choice_index,count(*)::int total'))return {rows:[
      {choice_index:0,total:1},{choice_index:2,total:1},
    ],rowCount:2};
    throw Error('Unexpected SQL: '+sql.slice(0,90));
  });
  const service=new LiveQuizService({query} as unknown as Pool);
  return {room,history,service,advance:(ms:number)=>{simulatedNow+=ms;}};
}

describe('Blooket-style automatic Classic question transitions',()=>{
  it('reveals correct answers and vote distribution as soon as everyone responds, then advances after five seconds',async()=>{
    const {service,room,advance,history}=roomFixture({status:'active',questionIndex:0,allAnswered:true});
    const first=await service.teacherSnapshot(teacher,'room');
    expect(first.status).toBe('review');
    if(first.mode!=='classic')throw Error('Classic snapshot expected');
    expect(first.question?.correctIndex).toBe(2);
    expect(first.answerCounts).toEqual([1,0,1,0]);
    expect(new Date(first.reviewEndsAt!).getTime()-new Date(room.updated_at).getTime()).toBe(5000);
    advance(4000);
    expect((await service.teacherSnapshot(teacher,'room')).status).toBe('review');
    advance(1100);
    const next=await service.teacherSnapshot(teacher,'room');
    expect(next.status).toBe('active');
    expect(next.questionIndex).toBe(1);
    if(next.mode!=='classic')throw Error('Classic snapshot expected');
    expect(next.question?.correctIndex).toBeUndefined();
    expect('answerCounts' in next).toBe(false);
    expect(history.some(sql=>sql.includes('r.updated_at<=now()-'))).toBe(true);
  });

  it('finishes the final question automatically after displaying its review period',async()=>{
    const {service,advance}=roomFixture({status:'review',questionIndex:3,elapsedReviewMs:3000});
    expect((await service.teacherSnapshot(teacher,'room')).status).toBe('review');
    advance(2200);
    const final=await service.teacherSnapshot(teacher,'room');
    expect(final.status).toBe('finished');
    expect(final.questionIndex).toBe(3);
    expect(final.question).toBeNull();
  });

  it('starts the same review when time expires even if some learners have not answered',async()=>{
    const {service}=roomFixture({status:'active',questionIndex:1,allAnswered:false,timeExpired:true});
    const state=await service.teacherSnapshot(teacher,'room');
    expect(state.status).toBe('review');
    expect(state.questionIndex).toBe(1);
  });
});

describe('Classic host controls during automatic transition',()=>{
  function fixture(){
    const queries:string[]=[];
    const query=vi.fn(async(sql:string)=>{
      queries.push(sql);
      if(['begin','commit','rollback'].includes(sql))return {rows:[],rowCount:0};
      if(sql.includes('select * from live_quiz_rooms where id='))return {rows:[{
        id:'room',host_id:teacher.id,status:'review',game_mode:'classic',
        question_index:1,questions,question_seconds:20,duration_seconds:420,
      }],rowCount:1};
      if(sql.includes('update live_quiz_rooms set status='))return {rows:[],rowCount:1};
      throw Error('Unexpected SQL '+sql);
    });
    const pool={connect:vi.fn(async()=>({query,release:vi.fn()}))} as unknown as Pool;
    return {service:new LiveQuizService(pool),queries};
  }

  it('rejects a stale Next click that would otherwise skip a newly started question',async()=>{
    const {service,queries}=fixture();
    await expect(service.command(teacher,'room','next',0))
      .rejects.toMatchObject({code:'quiz_invalid_state',status:409});
    expect(queries).toContain('rollback');
    expect(queries.some(sql=>sql.startsWith('update live_quiz_rooms'))).toBe(false);
  });

  it('does not restart the automatic review countdown if Reveal is clicked again',async()=>{
    const {service,queries}=fixture();
    expect(await service.command(teacher,'room','reveal',1)).toEqual({status:'review',questionIndex:1});
    expect(queries).toContain('commit');
    expect(queries.some(sql=>sql.startsWith('update live_quiz_rooms'))).toBe(false);
  });
});
