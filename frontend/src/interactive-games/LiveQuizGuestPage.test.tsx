import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveQuizGuestPage } from './LiveQuizGuestPage';
import type { LiveQuizSnapshot } from './live-quiz-api';

const playerId='2bbcc2fa-38c9-4ebd-8120-111111111111';
const token='a'.repeat(64);
const roomId='a8918dd9-6325-4e32-a602-222222222222';
const rivalId='d01122a2-c3b5-4ac2-a860-333333333333';
const snapshot=(pendingType:string|null):LiveQuizSnapshot=>({
  id:roomId,pin:'123456',courseCode:'9618',mode:'treasure',status:'active',
  questionCount:15,questionIndex:0,questionSeconds:20,
  questionStartedAt:new Date().toISOString(),serverNow:new Date().toISOString(),
  endsAt:new Date(Date.now()+300_000).toISOString(),treasureGoal:10000,ownScore:150,
  ownCorrect:1,ownTurn:0,players:[
    {id:playerId,nickname:'Aziza',avatar:'🦊',score:150,answered:0},
    {id:rivalId,nickname:'Sardor',avatar:'🐼',score:900,answered:0},
  ],answeredCount:1,question:null,ownAnswer:null,selfId:playerId,nickname:'Aziza',
  pendingReward:{turnIndex:0,type:pendingType,percent:25,
    targets:[{id:rivalId,nickname:'Sardor',avatar:'🐼',score:900}]},
});

describe('Treasure Quest student interactions',()=>{
  let root:Root,host:HTMLDivElement,request:ReturnType<typeof vi.fn>;
  let mode:'chest'|'target';
  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    localStorage.setItem('campath:live-quiz:123456',JSON.stringify({pin:'123456',playerId,token,roomId}));
    host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
    mode='chest';
    request=vi.fn(async(url:string,init?:RequestInit)=>{
      const path=String(url);
      if(path.includes('/lobby/'))return new Response(JSON.stringify({data:{pin:'123456',
        courseCode:'9618',mode:'treasure',status:'waiting',randomNames:false,playerCount:2}}));
      if(path.endsWith(`/${playerId}`))return new Response(JSON.stringify({data:snapshot(mode==='chest'?null:'take')}));
      if(path.endsWith('/reward'))return new Response(JSON.stringify({data:mode==='chest'
        ?{rewardType:'gold',needsTarget:false,delta:350,newScore:500}
        :{rewardType:'take',needsTarget:false,delta:225,newScore:375}}));
      throw new Error('Unexpected request '+path+' '+init?.method);
    });
    vi.stubGlobal('fetch',request);
  });
  afterEach(async()=>{
    await act(async()=>root.unmount());host.remove();localStorage.clear();vi.unstubAllGlobals();
  });
  const render=async()=>{
    await act(async()=>{root.render(<LiveQuizGuestPage pin="123456"/>);
      await Promise.resolve();await Promise.resolve();await Promise.resolve();});
  };

  it('shows three independent treasure choices and sends only the chosen chest and private token',async()=>{
    await render();
    expect(host.textContent).toContain('Choose a treasure chest');
    expect(host.querySelectorAll('.lq-chest-grid button')).toHaveLength(3);
    const chest=host.querySelector<HTMLButtonElement>('[aria-label="Choose treasure chest 2"]')!;
    await act(async()=>{chest.click();await Promise.resolve();await Promise.resolve();});
    const call=request.mock.calls.find(call=>String(call[0]).endsWith('/reward'))!;
    expect(JSON.parse(String(call[1].body))).toEqual({turnIndex:0,chestIndex:1});
    expect(call[1].headers.Authorization).toBe('Quiz '+token);
    expect(host.textContent).toContain('Total: 500');
  });

  it('lets the student choose a rival when a steal reward is revealed',async()=>{
    mode='target';await render();
    expect(host.textContent).toContain('Take gold from another player');
    const target=[...host.querySelectorAll<HTMLButtonElement>('.lq-target-grid button')]
      .find(button=>button.textContent?.includes('Sardor'))!;
    await act(async()=>{target.click();await Promise.resolve();await Promise.resolve();});
    const call=request.mock.calls.find(call=>String(call[0]).endsWith('/reward'))!;
    expect(JSON.parse(String(call[1].body))).toEqual({turnIndex:0,targetId:rivalId});
  });

  it('shows the correction for the answered question even after the next question loads',async()=>{
    let submitted=false;
    const first:LiveQuizSnapshot={...snapshot(null),pendingReward:null,questionIndex:0,
      question:{id:'old',index:0,prompt:'Old definition',
        options:['Old A','Old B','Old C','Old D'],sourceContext:'Chapter 17'}};
    const next:LiveQuizSnapshot={...first,questionIndex:1,ownTurn:1,
      question:{id:'new',index:1,prompt:'New definition',
        options:['New A','New B','New C','New D'],sourceContext:'Chapter 17'}};
    request.mockImplementation(async(url:string)=>{
      if(url.includes('/lobby/'))return new Response(JSON.stringify({data:{pin:'123456',
        courseCode:'9618',mode:'treasure',status:'active',randomNames:false,playerCount:2}}));
      if(url.endsWith(`/${playerId}`))return new Response(JSON.stringify({data:submitted?next:first}));
      if(url.endsWith('/answer')){submitted=true;return new Response(JSON.stringify({data:{
        submitted:true,turnIndex:0,correct:false,rewardPending:false,correctIndex:2}}));}
      throw new Error('Unexpected request '+url);
    });
    await render();
    const choice=host.querySelector<HTMLButtonElement>('.lq-guest-question .lq-options button')!;
    await act(async()=>{choice.click();await Promise.resolve();await Promise.resolve();});
    expect(host.textContent).toContain('Correct answer: Old C');
    // The next polling cycle replaces the screen question before the feedback expires.
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,1650));});
    expect(host.textContent).toContain('Correct answer: Old C');
    expect(host.textContent).not.toContain('Correct answer: New C');
  });

  it('tells Classic players that the next question starts automatically',async()=>{
    const state:LiveQuizSnapshot={...snapshot(null),mode:'classic',status:'review',
      questionCount:4,questionIndex:1,reviewEndsAt:new Date(Date.now()+5000).toISOString(),
      pendingReward:null,question:{id:'q2',index:1,prompt:'Compiler definition',
        options:['A','B','C','D'],correctIndex:2,explanation:'C is correct',sourceContext:'Chapter 16'},
      ownAnswer:{choiceIndex:0,correct:false,points:0}};
    request.mockImplementation(async(url:string)=>{
      if(url.endsWith(`/${playerId}`))return new Response(JSON.stringify({data:state}));
      if(url.includes('/lobby/'))return new Response(JSON.stringify({data:{pin:'123456',
        courseCode:'9618',mode:'classic',status:'active',randomNames:false,playerCount:2}}));
      throw Error('Unexpected request '+url);
    });
    await render();
    expect(host.textContent).toContain('Next question starts automatically in');
    expect(host.textContent).not.toContain('Waiting for the teacher');
  });
});
