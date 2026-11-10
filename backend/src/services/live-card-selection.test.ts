import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import { LiveExamService } from './live-exam-service.js';

const SESSION='11111111-1111-4111-8111-111111111111';
const STUDENT='22222222-2222-4222-8222-222222222222';
const TEACHER='44444444-4444-4444-8444-444444444444';
const SCHOOL='33333333-3333-4333-8333-333333333333';
const actor={id:TEACHER,role:'teacher',schoolId:SCHOOL} as Actor;
const learner={id:STUDENT,role:'student',schoolId:SCHOOL} as Actor;
const cards=[
  {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',question_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',position:0,marks:1},
  {id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',question_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',position:1,marks:2},
  {id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',question_id:'ffffffff-ffff-4fff-8fff-ffffffffffff',position:2,marks:5},
];

function fixture(options:{status?:string;currentIndex?:number;version?:number;authorized?:boolean}={}) {
  const session={
    id:SESSION,
    status:options.status??'lobby',
    current_question_index:options.currentIndex??-1,
    version:options.version??5,
    settings:{
      playMode:'cards',cardColumns:5,practiceMode:null,rehearsalMode:false,
      defaultQuestionTimeLimitS:240,
      questionTimeLimits:{[cards[2]!.question_id]:90},
    },
    question_time_limit_s:240,
    paused_at:null,
  };
  const positions=cards.map((card)=>({...card}));
  const queries:Array<{sql:string;params:unknown[]}>=[];
  const query=vi.fn(async (sql:string,params:unknown[] = [])=>{
    const normalized=sql.replace(/\s+/g,' ').toLowerCase();
    queries.push({sql:normalized,params});
    if(normalized==='begin'||normalized==='commit'||normalized==='rollback')
      return {rowCount:0,rows:[]};
    if(normalized.includes('from live_exam_sessions les join classes c'))
      return options.authorized===false?{rowCount:0,rows:[]}:{rowCount:1,rows:[{...session}]};
    if(normalized.includes('from live_exam_participants')&&normalized.includes('count(*)'))
      return {rowCount:1,rows:[{count:2}]};
    if(normalized.includes('from live_exam_questions')&&normalized.includes('for update'))
      return {rowCount:positions.length,rows:positions.map((row)=>({...row}))};
    if(normalized.startsWith('update live_exam_questions set position=')){
      const target=positions.find((row)=>row.id===params[1]);
      if(!target)throw Error('unknown card');
      if(positions.some((row)=>row.id!==target.id&&row.position===params[2]))
        throw Error('UNIQUE(session_id,position) violated');
      target.position=Number(params[2]);
      return {rowCount:1,rows:[]};
    }
    if(normalized.startsWith('insert into live_exam_answers'))
      return {rowCount:2,rows:[]};
    if(normalized.includes("set status='question_open'")){
      session.status='question_open';
      session.current_question_index=Number(params[1]);
      return {rowCount:1,rows:[]};
    }
    if(normalized.includes('set version=version+1')){
      session.version+=1;
      return {rowCount:1,rows:[{version:session.version}]};
    }
    if(normalized.startsWith('insert into live_exam_events'))
      return {rowCount:1,rows:[]};
    throw Error(`Unexpected query: ${normalized}`);
  });
  const client={query,release:vi.fn()};
  const pool={connect:vi.fn(async()=>client)} as unknown as Pool;
  const service=new LiveExamService(pool,{} as PgQuestionsRepository);
  return {service,positions,session,queries,client};
}

describe('Live Challenge teacher-controlled card mode',()=>{
  it('rejects student card picks before opening a database transaction',async()=>{
    const {service,positions,queries,client}=fixture();
    await expect(service.openCard(learner,SESSION,cards[1]!.id,5))
      .rejects.toMatchObject({code:'staff_only',status:403});
    expect(client.query).not.toHaveBeenCalled();
    expect(queries).toHaveLength(0);
    expect(positions.map((row)=>row.position)).toEqual([0,1,2]);
  });

  it('rejects learner-created Card Mode rooms; Random practice remains available',async()=>{
    const {service,client}=fixture();
    await expect(service.create(learner,{
      classId:SESSION,syllabusCode:'9618',title:'Learner card room',
      topicIds:[],subtopicIds:[],coursebookSectionCodes:['7.1'],
      questionCount:3,markingMode:'self',practiceMode:'solo',playMode:'cards',
    } as Parameters<LiveExamService['create']>[1]))
      .rejects.toMatchObject({code:'live_card_teacher_only',status:403});
    expect(client.query).not.toHaveBeenCalled();
  });
  it('opens a selected 5-point card at position zero without changing its scoring marks',async()=>{
    const {service,positions,queries,session,client}=fixture();
    const result=await service.openCard(actor,SESSION,cards[2]!.id,5);
    expect(result).toMatchObject({status:'question_open',version:6});
    expect(session.current_question_index).toBe(0);
    expect(positions.find((row)=>row.id===cards[2]!.id)?.position).toBe(0);
    expect(positions.find((row)=>row.id===cards[0]!.id)?.position).toBe(2);
    expect(positions.find((row)=>row.id===cards[2]!.id)?.marks).toBe(5);
    const opening=queries.find((item)=>item.sql.includes("set status='question_open'"));
    expect(opening?.params).toEqual([SESSION,0,90]);
    expect(queries.some((item)=>item.sql.includes('insert into live_exam_answers'))).toBe(true);
    expect(queries.some((item)=>item.sql.includes("insert into live_exam_events"))).toBe(true);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('does not reopen a used card or alter an already reviewed question',async()=>{
    const {service,positions,queries}=fixture({status:'review',currentIndex:0});
    await expect(service.openCard(actor,SESSION,cards[0]!.id,5))
      .rejects.toMatchObject({code:'live_card_unavailable',status:409});
    expect(positions.map((row)=>row.position)).toEqual([0,1,2]);
    expect(queries.some((item)=>item.sql.includes('update live_exam_questions'))).toBe(false);
    expect(queries.at(-1)?.sql).toBe('rollback');
  });

  it('lets a teacher open a remaining card after review',async()=>{
    const {service,session}=fixture({status:'review',currentIndex:0});
    const result=await service.openCard(actor,SESSION,cards[1]!.id,5);
    expect(result.status).toBe('question_open');
    expect(session.current_question_index).toBe(1);
  });

  it('rejects stale concurrent claims before any card is mutated',async()=>{
    const {service,queries}=fixture({version:6});
    await expect(service.openCard(actor,SESSION,cards[2]!.id,5))
      .rejects.toMatchObject({code:'live_state_conflict',status:409});
    expect(queries.some((item)=>item.sql.includes('update live_exam_questions'))).toBe(false);
  });

  it('rejects users not authorized for the session',async()=>{
    const {service,queries}=fixture({authorized:false});
    await expect(service.openCard(actor,SESSION,cards[2]!.id,5))
      .rejects.toMatchObject({code:'not_found',status:404});
    expect(queries.some((item)=>item.sql.includes('from live_exam_questions'))).toBe(false);
  });

  it('does not allow card opening during answer or marking states',async()=>{
    const {service}=fixture({status:'marking',currentIndex:0});
    await expect(service.openCard(actor,SESSION,cards[2]!.id,5))
      .rejects.toMatchObject({code:'live_invalid_state',status:409});
  });
});
