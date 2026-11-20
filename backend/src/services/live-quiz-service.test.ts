import { describe, expect, it } from 'vitest';
import { buildLiveQuizQuestions, liveQuizPoints } from './live-quiz-service.js';

const verified=(number:number)=>({
  id:String(number),term:'Term '+number,definition:'Source-verified definition '+number,
  chapterNo:17,status:'approved',isOfficialKeyTerm:false,
  definitionEvidenceStatus:'supplementary_targeted_verified',
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
