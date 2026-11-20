import type { Pool } from 'pg';
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
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from live_quiz_rooms where id'))return {rows:[room],rowCount:1};
      if(sql.includes('left join live_quiz_treasure_attempts'))return {rows,rowCount:rows.length};
      throw new Error('Unexpected SQL in report: '+sql.slice(0,50));
    });
    const service=new LiveQuizService({query} as unknown as Pool);
    const result=await service.teacherReport({id:'teacher',role:'teacher',schoolId:null,fullName:'Teacher'},'room');
    expect(result.mode).toBe('treasure');
    if(result.mode!=='treasure')throw new Error('Treasure report expected');
    expect(result.students[0]?.correct).toBe(2);
    expect(result.students[0]?.total).toBe(3);
    expect(result.students[0]?.averageResponseMs).toBe(1667);
    expect(result.students[1]?.correct).toBe(0);
    expect(result.questionSummary).toHaveLength(2);
    expect(result.questionSummary.find(q=>q.number===1)).toMatchObject({correct:2,wrong:1,total:3});
    expect(result.questionSummary.find(q=>q.number===2)?.wrongStudents[0]?.nickname).toBe('Aziza');
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
