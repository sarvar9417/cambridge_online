import { describe, expect, it } from 'vitest';
import type { MasteryItem } from '../lib/api';
import { buildMasteryTopics } from './StudentMasteryMap';

const item=(code:string,earned:number,possible:number,attempts=1):MasteryItem=>({
  subtopic_id:code,code,title:`Subtopic ${code}`,score:possible?earned/possible:0,attempts,
  marksEarned:earned,marksPossible:possible,practiceReady:true,
});

describe('hierarchical mastery map',()=>{
  it('groups subtopics by Cambridge topic prefix and weights topic score by marks',()=>{
    const topics=buildMasteryTopics([item('2.2',9,10),item('1.2',1,10),item('1.1',8,10)]);
    expect(topics.map((topic)=>topic.key)).toEqual(['1','2']);
    expect(topics[0]?.items.map((entry)=>entry.code)).toEqual(['1.1','1.2']);
    expect(topics[0]?.score).toBeCloseTo(.45);
    expect(topics[1]?.score).toBeCloseTo(.9);
  });
});
