import type { Pool } from 'pg';
import type { ContentService } from './content-service.js';
import { describe, expect, it, vi } from 'vitest';
import { buildLiveQuizQuestions, drawTreasureReward, liveQuizPoints,
  LiveQuizService, settleTreasureBalance } from './live-quiz-service.js';

const verified=(number:number)=>({
  id:String(number),term:'Term '+number,definition:'Source-verified definition '+number,
  chapterNo:17,status:'approved',isOfficialKeyTerm:false,
  definitionEvidenceStatus:'supplementary_targeted_verified',
});

describe('Blooket-inspired Treasure Quest economics',()=>{
  it('keeps gold, multipliers, dragon tax and dragon treasure internally consistent',()=>{
    for(let i=0;i<20;i++){
      const gold=settleTreasureBalance('gold',500,100);
      expect(gold.balance).toBeGreaterThanOrEqual(600);
      expect(gold.balance).toBeLessThanOrEqual(1000);
      expect(gold.dragonPool).toBe(100);
    }
    expect(settleTreasureBalance('double',500,100)).toEqual({balance:1000,dragonPool:100});
    expect(settleTreasureBalance('triple',500,100)).toEqual({balance:1500,dragonPool:100});
    expect(settleTreasureBalance('empty',500,100)).toEqual({balance:500,dragonPool:100});
    expect(settleTreasureBalance('dragon_treasure',500,100)).toEqual({balance:600,dragonPool:0});
    for(let i=0;i<20;i++){
      const dragon=settleTreasureBalance('dragon',500,100);
      expect(dragon.balance+dragon.dragonPool).toBe(600);
      expect(dragon.balance).toBeLessThan(500);
    }
  });

  it('chooses rewards only from an explicit, bounded set',()=>{
    const allowed=new Set(['gold','double','triple','empty','take','swap','dragon','dragon_treasure']);
    for(let i=0;i<200;i++)expect(allowed.has(drawTreasureReward())).toBe(true);
  });

  it('preserves repeated question attempts and aggregates teacher question mistakes by source question',async()=>{
    const questions=Array.from({length:4},(_,index)=>({id:String(index),prompt:'Question '+index,
      options:['A','B','C','D'],answerIndex:2,explanation:'C is correct',sourceContext:'Chapter 17'}));
    const room={id:'room',host_id:'teacher',pin:'123456',course_code:'9618',game_mode:'treasure',
      questions,status:'finished',question_index:0,finished_at:'2026-11-20T10:00:00Z'};
    const rows=[
      {id:'aziza',room_id:'room',nickname:'Aziza',avatar:'🦊',score:1500,correct_count:2,
        turn_index:0,question_index:0,choice_index:2,correct:true,reward_type:'gold',reward_amount:300,elapsed_ms:1300},
      {id:'aziza',room_id:'room',nickname:'Aziza',avatar:'🦊',score:1500,correct_count:2,
        turn_index:1,question_index:1,choice_index:0,correct:false,reward_type:'none',reward_amount:0,elapsed_ms:2500},
      {id:'aziza',room_id:'room',nickname:'Aziza',avatar:'🦊',score:1500,correct_count:2,
        turn_index:4,question_index:0,choice_index:2,correct:true,reward_type:'double',reward_amount:500,elapsed_ms:1200},
      {id:'sardor',room_id:'room',nickname:'Sardor',avatar:'🐼',score:100,correct_count:0,
        turn_index:0,question_index:0,choice_index:1,correct:false,reward_type:'none',reward_amount:0,elapsed_ms:3800},
    ];
    const query=vi.fn(async(sql:string,_params?:unknown[])=>{
      if(sql.includes('from live_quiz_rooms where id'))return {rows:[room],rowCount:1};
      if(sql.includes('left join live_quiz_treasure_attempts'))return {rows,rowCount:rows.length};
      throw new Error('Unexpected SQL in report: '+sql.slice(0,50));
    });
    const service=new LiveQuizService({query} as unknown as Pool);
    const result=await service.teacherReport({id:'teacher',role:'teacher',schoolId:null,fullName:'Teacher'},'room');
    expect(result.mode).toBe('treasure');
    expect(result.answerKey).toHaveLength(4);
    expect(result.answerKey?.[0]).toMatchObject({number:1,correctIndex:2,
      options:['A','B','C','D'],sourceContext:'Chapter 17'});
    if(result.mode!=='treasure')throw new Error('Treasure report expected');
    expect(result.students[0]?.correct).toBe(2);
    expect(result.students[0]?.total).toBe(3);
    expect(result.students[0]?.averageResponseMs).toBe(1667);
    expect(result.students[1]?.correct).toBe(0);
    expect(result.questionSummary).toHaveLength(2);
    expect(result.questionSummary.find(q=>q.number===1)).toMatchObject({correct:2,wrong:1,total:3});
    expect(result.questionSummary.find(q=>q.number===2)?.wrongStudents[0]?.nickname).toBe('Aziza');
    expect(result.questionSummary.find(q=>q.number===2)?.wrongStudents[0]?.attemptNumber).toBe(2);
    expect(result.questionSummary.find(q=>q.number===1)?.wrongStudents[0]?.attemptNumber).toBe(1);
  });

  it('denies student access to private class reports without reaching the database',async()=>{
    const query=vi.fn();
    const service=new LiveQuizService({query} as unknown as Pool);
    await expect(service.teacherReport({id:'student',role:'student',schoolId:null,fullName:'Student'},'room'))
      .rejects.toMatchObject({code:'quiz_teacher_only',status:403});
    await expect(service.guestReport('some-player-id','not-a-valid-guest-token'))
      .rejects.toMatchObject({code:'quiz_player_not_found',status:404});
    expect(query).not.toHaveBeenCalled();
  });
});

describe('Cambridge Live Quiz question selection',()=>{
  it('only includes approved and source-verified terminology, without ambiguous options',()=>{
    const rows=[...Array.from({length:9},(_,i)=>verified(i)),
      {...verified(10),status:'needs_review'},
      {...verified(11),definitionEvidenceStatus:'supplementary_manual_review_required'},
      {...verified(12),term:'Term 1'},
      {...verified(13),definition:'Source-verified definition 2'},
    ];
    const questions=buildLiveQuizQuestions(rows,30);
    expect(questions).toHaveLength(9);
    for(const question of questions){
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(4);
      expect(question.explanation).toContain(question.options[question.answerIndex]);
      expect(question.sourceContext).toContain('Chapter 17');
    }
    expect(new Set(questions.map(q=>q.prompt)).size).toBe(9);
  });

  it('does not offer visually duplicate answers, duplicate IDs or whitespace-only variants',()=>{
    const rows=[...Array.from({length:4},(_,i)=>verified(i)),
      {...verified(4),term:'  Term \\n   1  '},
      {...verified(5),definition:' Source-verified   definition 2 '},
      {...verified(6),id:'1'},
    ];
    const questions=buildLiveQuizQuestions(rows,30);
    expect(questions).toHaveLength(4);
    for(const question of questions){
      expect(new Set(question.options)).toHaveSize(4);
      expect(question.options[question.answerIndex]).toBeTruthy();
    }
  });

  it('blocks games with fewer than four verified options',()=>{
    expect(()=>buildLiveQuizQuestions([verified(1),verified(2),verified(3)],15))
      .toThrowError(expect.objectContaining({code:'quiz_question_pool_small',status:409}));
  });

  it('awards no points for wrong answers and rewards fast correct first attempts',()=>{
    expect(liveQuizPoints(false,0,20,7)).toBe(0);
    expect(liveQuizPoints(true,0,20,0)).toBe(900);
    expect(liveQuizPoints(true,20_000,20,0)).toBe(600);
    expect(liveQuizPoints(true,0,20,12)).toBe(1000);
    expect(liveQuizPoints(true,5_000,20,1)).toBeGreaterThan(liveQuizPoints(true,12_000,20,1));
  });
});

describe('Live Quiz host lifecycle and permanent deletion',()=>{
  const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};

  it('lets the host finish an unstarted waiting room without any joined players',async()=>{
    const query=vi.fn(async(sql:string,_params?:unknown[])=>{
      if(sql.includes('select * from live_quiz_rooms'))return {rowCount:1,rows:[{
        id:'room-1',host_id:teacher.id,status:'waiting',question_index:-1,
        game_mode:'classic',duration_seconds:420,questions:[{},{},{},{}],
      }]};
      if(sql.includes('update live_quiz_rooms'))return {rowCount:1,rows:[]};
      if(['begin','commit','rollback'].includes(sql))return {rowCount:0,rows:[]};
      throw new Error('Unexpected SQL '+sql);
    });
    const client={query,release:vi.fn()};
    const service=new LiveQuizService({connect:vi.fn(async()=>client)} as unknown as Pool);
    await expect(service.command(teacher,'room-1','finish',-1)).resolves.toEqual({status:'finished',questionIndex:-1});
    expect(query).toHaveBeenCalledWith(expect.stringContaining('update live_quiz_rooms'),
      ['room-1','finished',-1,'classic',420]);
    expect(query).toHaveBeenCalledWith('commit');
  });

  it('deletes only finished games owned by the requester',async()=>{
    const query=vi.fn(async(sql:string,_params?:unknown[])=>{
      if(sql.startsWith('delete from live_quiz_rooms'))return {rowCount:1,rows:[{id:'room-1'}]};
      throw new Error('Unexpected query');
    });
    const service=new LiveQuizService({query} as unknown as Pool);
    await expect(service.deleteFinished(teacher,'room-1')).resolves.toEqual({deleted:true});
    expect(query).toHaveBeenCalledWith(expect.stringContaining("status='finished'"),['room-1',teacher.id]);
    await expect(service.deleteFinished({...teacher,role:'student'},'room-1'))
      .rejects.toMatchObject({code:'quiz_teacher_only',status:403});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects deletion of an unfinished room and conceals other hosts’ room IDs',async()=>{
    const query=vi.fn(async(sql:string,params?:unknown[])=>{
      if(sql.startsWith('delete from live_quiz_rooms'))return {rowCount:0,rows:[]};
      if(sql.includes('select * from live_quiz_rooms'))return params?.[1]===teacher.id
        ?{rowCount:1,rows:[{id:'room-1',host_id:teacher.id,status:'active'}]}
        :{rowCount:0,rows:[]};
      throw new Error('Unexpected query');
    });
    const service=new LiveQuizService({query} as unknown as Pool);
    await expect(service.deleteFinished(teacher,'room-1'))
      .rejects.toMatchObject({code:'quiz_must_finish_before_delete',status:409});
    await expect(service.deleteFinished({...teacher,id:'another-teacher'},'room-1'))
      .rejects.toMatchObject({code:'quiz_room_not_found',status:404});
  });
});

describe('Treasure Quest transactional answer and reward protection',()=>{
  const playerId='2bbcc2fa-38c9-4ebd-8120-111111111111';
  const rivalId='d01122a2-c3b5-4ac2-a860-333333333333';
  const token='a'.repeat(64);
  const question={id:'question-1',prompt:'What does the definition describe?',
    options:['A','B','C','D'],answerIndex:2,explanation:'C is correct',sourceContext:'Chapter 18'};
  function fixture(options:{rewardType?:string|null;rewardAmount?:number;
    score?:number;goal?:number;blockedUntil?:string|null;endsAt?:string|null;
    noPendingReward?:boolean}={}){
    const room={id:'room-1',pin:'123456',game_mode:'treasure',status:'active',
      questions:[question,question,question,question],question_order:'random',
      treasure_goal:options.goal??10000,dragon_pool:10,
      show_correctness:true,incorrect_penalty_seconds:2,ends_at:options.endsAt??new Date(Date.now()+300000).toISOString()};
    const joined={...room,player_id:playerId,room_id:room.id,nickname:'Aziza',avatar:'🦊',
      score:options.score??100,streak:0,correct_count:0,next_turn:0,
      player_started_at:new Date(Date.now()-1500).toISOString(),
      blocked_until:options.blockedUntil??null};
    const pending={reward_type:options.rewardType??'double',reward_amount:options.rewardAmount??0};
    const query=vi.fn(async(sql:string,_params?:unknown[])=>{
      if(sql==='begin'||sql==='commit'||sql==='rollback')return {rows:[],rowCount:0};
      if(sql.includes('from live_quiz_players p join live_quiz_rooms'))return {rows:[joined],rowCount:1};
      if(sql.includes('from live_quiz_treasure_attempts')&&sql.includes('for update'))
        return options.noPendingReward?{rows:[],rowCount:0}:{rows:[pending],rowCount:1};
      if(sql.includes('insert into live_quiz_treasure_attempts'))return {rows:[{player_id:playerId}],rowCount:1};
      if(sql.includes('select * from live_quiz_players where id='))
        return {rows:[{id:rivalId,score:400}],rowCount:1};
      if(sql.includes('update live_quiz_players')||sql.includes('update live_quiz_rooms')||
        sql.includes('update live_quiz_treasure_attempts'))return {rows:[],rowCount:1};
      throw new Error('Unexpected SQL: '+sql.slice(0,100));
    });
    const pool={query,connect:vi.fn(async()=>({query,release:vi.fn()}))} as unknown as Pool;
    return {service:new LiveQuizService(pool),query};
  }

  it('validates a guest answer on the server, locks the turn and records the actual chosen option',async()=>{
    const {service,query}=fixture();
    const result=await service.answer(playerId,token,0,2);
    expect(result).toMatchObject({submitted:true,turnIndex:0,correct:true,rewardPending:true,
      correctIndex:2});
    const insert=query.mock.calls.find(([sql])=>sql.includes('insert into live_quiz_treasure_attempts'))!;
    expect(insert[1]?.slice(0,5)).toEqual([playerId,0,0,2,true]);
    expect(query).toHaveBeenCalledWith('commit');
  });

  it('rejects an answer during the wrong-answer cooldown without inserting a new attempt',async()=>{
    const {service,query}=fixture({blockedUntil:new Date(Date.now()+20000).toISOString()});
    await expect(service.answer(playerId,token,0,2))
      .rejects.toMatchObject({code:'quiz_penalty_active',status:409});
    expect(query.mock.calls.some(([sql])=>sql.includes('insert into live_quiz_treasure_attempts'))).toBe(false);
    expect(query).toHaveBeenCalledWith('rollback');
  });

  it('settles a sealed double-gold reward exactly once and finishes on the configured goal',async()=>{
    const {service,query}=fixture({rewardType:'double',score:500,goal:900});
    const result=await service.treasureReward(playerId,token,{turnIndex:0});
    expect(result).toEqual({rewardType:'double',needsTarget:false,delta:500,newScore:1000,
      gameFinished:true});
    const playerUpdate=query.mock.calls.find(([sql])=>sql.includes('set score=$2,next_turn=next_turn+1'))!;
    expect(playerUpdate[1]).toEqual([playerId,1000]);
    expect(query.mock.calls.some(([sql])=>sql.includes("set status='finished'"))).toBe(true);
    expect(query).toHaveBeenCalledWith('commit');
  });

  it('subtracts taken gold from the chosen rival and credits the attacker atomically',async()=>{
    const {service,query}=fixture({rewardType:'take',rewardAmount:25,score:100});
    const result=await service.treasureReward(playerId,token,{turnIndex:0,targetId:rivalId});
    expect(result).toMatchObject({rewardType:'take',needsTarget:false,delta:100,newScore:200});
    const rivalUpdate=query.mock.calls.find(([sql])=>sql.includes('set score=score-$2'))!;
    expect(rivalUpdate[1]).toEqual([rivalId,100]);
  });

  it('blocks a second chest claim once the reward has already resolved',async()=>{
    const {service,query}=fixture({noPendingReward:true});
    await expect(service.treasureReward(playerId,token,{turnIndex:0}))
      .rejects.toMatchObject({code:'quiz_reward_closed',status:409});
    expect(query).toHaveBeenCalledWith('rollback');
    expect(query.mock.calls.some(([sql])=>sql.includes('set score=$2,next_turn=next_turn+1'))).toBe(false);
  });

  it('blocks claiming a reward after the server-set game deadline',async()=>{
    const {service,query}=fixture({endsAt:new Date(Date.now()-1000).toISOString()});
    await expect(service.treasureReward(playerId,token,{turnIndex:0}))
      .rejects.toMatchObject({code:'quiz_reward_closed',status:409});
    expect(query).toHaveBeenCalledWith('rollback');
  });
  it('creates 0478 rooms using only 0478 curriculum scopes and verified answers',async()=>{
    const actor={id:'teacher-0478',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
    const selected=[{chapterNo:1,kind:'chapter' as const}];
    const collection=vi.fn(async()=>({
      courseCode:'0478',scopes:selected,
      pairs:Array.from({length:8},(_,i)=>({...verified(i),chapterNo:1,
        definitionEvidenceStatus:'official_textbook_definition'})),
    }));
    const query=vi.fn(async(sql:string,_params?:unknown[])=>{
      if(sql.includes('insert into live_quiz_rooms'))
        return {rowCount:1,rows:[{id:'0478-room-id'}]};
      throw new Error('Unexpected 0478 SQL: '+sql.slice(0,120));
    });
    const service=new LiveQuizService({query} as unknown as Pool,
      {interactiveGameCollection:collection} as unknown as ContentService);
    const result=await service.create(actor,{courseCode:'0478',scopes:selected,
      count:15,seconds:20,mode:'classic'});
    expect(result.questionCount).toBe(8);
    expect(collection).toHaveBeenCalledWith(actor,{courseCode:'0478',scopes:selected});
    const insert=query.mock.calls.find(([sql])=>sql.includes('insert into live_quiz_rooms'))!;
    expect(insert[1]?.[3]).toBe('0478');
    const questions=JSON.parse(String(insert[1]?.[5])) as Array<{sourceContext:string}>;
    expect(questions).toHaveLength(8);
    expect(questions.every(question=>question.sourceContext.includes('Chapter 1'))).toBe(true);
  });
});
