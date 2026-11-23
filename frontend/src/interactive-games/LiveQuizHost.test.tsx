import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { LiveQuizHost, reviewCountdownSeconds } from './LiveQuizHost';

vi.mock('../lib/api',()=>({api:vi.fn()}));
const mockApi=vi.mocked(api);
const roomId='a8918dd9-6325-4e32-a602-222222222222';
const classId='88f83723-c77b-45ae-9234-4a1ab2e33b12';
const classResponse={data:[{id:classId,name:'11-A',grade:11,level:'AS',academicYear:'2026-2027',studentCount:18}]};

describe('Live quiz Blooket-style host configuration',()=>{
  let root:Root,container:HTMLDivElement;
  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
    mockApi.mockReset();
    mockApi.mockImplementation((async(path,options)=>{
      if(path==='/classes')return classResponse;
      if(path==='/live-quizzes'&&!options)return {data:[]};
      if(path==='/live-quizzes'&&options?.method==='POST')return {data:{id:roomId,pin:'123456',questionCount:15}};
      if(path===`/live-quizzes/${roomId}`)return {data:{id:roomId,pin:'123456',courseCode:'9618',
        status:'waiting',mode:'treasure',questionCount:15,questionIndex:-1,
        questionSeconds:20,questionStartedAt:null,serverNow:new Date().toISOString(),
        players:[],answeredCount:0,question:null,ownAnswer:null}};
      throw new Error('Unexpected request '+path);
    }) as typeof api);
  });
  afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();});
  const click=async(name:string)=>{
    const button=[...container.querySelectorAll('button')].find(el=>el.textContent?.includes(name));
    if(!button)throw new Error('Missing button '+name);
    await act(async()=>{button.click();await Promise.resolve();});
  };

  it('allows teachers to select independent Treasure Quest and sends the topic-scoped settings',async()=>{
    await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
      scopes={[{chapterNo:17,kind:'topic',code:'17.1'}]} onExit={()=>{}}
      onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
    await click('Treasure Quest');
    expect(container.querySelector('.lq-mode-card[aria-pressed="true"] strong')?.textContent).toBe('Treasure Quest');
    await act(async()=>{
      const duration=container.querySelector<HTMLSelectElement>('[aria-label="Treasure game duration"]')!;
      duration.value='300';duration.dispatchEvent(new Event('change',{bubbles:true}));
      const order=container.querySelector<HTMLSelectElement>('[aria-label="Live quiz question ordering"]')!;
      order.value='mastery';order.dispatchEvent(new Event('change',{bubbles:true}));
      const penalty=container.querySelector<HTMLSelectElement>('[aria-label="Wrong-answer cooldown"]')!;
      penalty.value='5';penalty.dispatchEvent(new Event('change',{bubbles:true}));
    });
    const classroom=container.querySelector<HTMLSelectElement>('[aria-label="Live Quiz classroom"]')!;
    await act(async()=>{classroom.value=classId;
      classroom.dispatchEvent(new Event('change',{bubbles:true}));});
    await click('Host Now');
    const createCall=mockApi.mock.calls.find(([path,options])=>path==='/live-quizzes'&&options?.method==='POST')!;
    expect(JSON.parse(String(createCall[1]?.body))).toMatchObject({
      classId,courseCode:'9618',scopes:[{chapterNo:17,kind:'topic',code:'17.1'}],
      mode:'treasure',durationSeconds:300,questionOrder:'mastery',incorrectPenaltySeconds:5,
    });
  });

  it('allows code-only hosting with multiple classes without broadcasting a class invitation',async()=>{
    const original=mockApi.getMockImplementation()!;
    const secondId='01111cc9-315c-4e03-a975-38bc114bd811';
    mockApi.mockImplementation(((path,options)=>path==='/classes'
      ? Promise.resolve({data:[...classResponse.data,{...classResponse.data[0],id:secondId,name:'11-B'}]})
      : original(path,options)) as typeof api);
    await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
      scopes={[{chapterNo:17,kind:'chapter'}]} onExit={()=>{}}
      onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
    const classroom=container.querySelector<HTMLSelectElement>('[aria-label="Live Quiz classroom"]')!;
    const hostButton=[...container.querySelectorAll<HTMLButtonElement>('button')]
      .find(item=>item.textContent?.includes('Host Now'))!;
    expect(classroom.value).toBe('');
    expect(hostButton.disabled).toBe(false);
    await click('Host Now');
    const createCall=mockApi.mock.calls.find(([path,options])=>path==='/live-quizzes'&&options?.method==='POST')!;
    expect(JSON.parse(String(createCall[1]?.body))).not.toHaveProperty('classId');
  });

  it('can optionally select a class and include its ID in the hosted game',async()=>{
    const original=mockApi.getMockImplementation()!;
    const secondId='01111cc9-315c-4e03-a975-38bc114bd811';
    mockApi.mockImplementation(((path,options)=>path==='/classes'
      ? Promise.resolve({data:[...classResponse.data,{...classResponse.data[0],id:secondId,name:'11-B'}]})
      : original(path,options)) as typeof api);
    await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
      scopes={[{chapterNo:17,kind:'chapter'}]} onExit={()=>{}}
      onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
    const classroom=container.querySelector<HTMLSelectElement>('[aria-label="Live Quiz classroom"]')!;
    await act(async()=>{classroom.value=secondId;
      classroom.dispatchEvent(new Event('change',{bubbles:true}));});
    await click('Host Now');
    const createCall=mockApi.mock.calls.find(([path,options])=>path==='/live-quizzes'&&options?.method==='POST')!;
    expect(JSON.parse(String(createCall[1]?.body)).classId).toBe(secondId);
  });

  it('confirms a successful classroom join-link copy',async()=>{
    const previous=Object.getOwnPropertyDescriptor(navigator,'clipboard');
    const writeText=vi.fn(async(_url:string)=>{});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
    try{
      await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
        scopes={[{chapterNo:17,kind:'chapter'}]} onExit={()=>{}}
        onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
      await click('Host Now');
      await act(async()=>{await Promise.resolve();await Promise.resolve();});
      await click('Copy join link');
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/#/play/123456`);
      expect(container.textContent).toContain('Copied!');
      await click('Copy PIN-entry link');
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/#/play`);
      expect(container.textContent).toContain('Code-entry link copied!');
    }finally{
      if(previous)Object.defineProperty(navigator,'clipboard',previous);
      else Reflect.deleteProperty(navigator,'clipboard');
    }
  });

  it('ends a waiting game before students join and deletes it only after confirmation',async()=>{
    let status:'waiting'|'finished'='waiting';
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
    mockApi.mockImplementation((async(path,options)=>{
      if(path==='/classes')return classResponse;
      if(path==='/live-quizzes'&&!options)return {data:[]};
      if(path==='/live-quizzes'&&options?.method==='POST')return {data:{id:roomId,pin:'123456',questionCount:4}};
      if(path===`/live-quizzes/${roomId}/action`){status='finished';return {data:{status:'finished'}};}
      if(path===`/live-quizzes/${roomId}`&&options?.method==='DELETE')return {data:{deleted:true}};
      if(path===`/live-quizzes/${roomId}`)return {data:{id:roomId,pin:'123456',courseCode:'9618',
        status,mode:'classic',questionCount:4,questionIndex:-1,questionSeconds:20,
        questionStartedAt:null,serverNow:new Date().toISOString(),players:[],answeredCount:0,
        question:null,ownAnswer:null}};
      if(path===`/live-quizzes/${roomId}/report`)return {data:{id:roomId,pin:'123456',
        courseCode:'9618',mode:'classic',students:[],questionSummary:[],totalQuestions:0,questionBankSize:4}};
      throw Error('Unexpected request '+path);
    }) as typeof api);
    try{
      await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
        scopes={[{chapterNo:17,kind:'chapter'}]} onExit={()=>{}}
        onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
      await click('Host Now');
      await act(async()=>{await Promise.resolve();await Promise.resolve();});
      expect(container.textContent).toContain('End game without starting');
      await click('End game without starting');
      expect(mockApi).toHaveBeenCalledWith(`/live-quizzes/${roomId}/action`,expect.objectContaining({method:'POST'}));
      const finishCall=mockApi.mock.calls.find(([path,options])=>path.endsWith('/action')&&options?.method==='POST')!;
      expect(JSON.parse(String(finishCall[1]?.body))).toMatchObject({action:'finish',expectedQuestionIndex:-1});
      expect(container.textContent).toContain('Delete this finished game');
      await click('Delete this finished game');
      expect(mockApi).toHaveBeenCalledWith(`/live-quizzes/${roomId}`,{method:'DELETE'});
      expect(container.textContent).toContain('Host Now');
      expect(confirm).toHaveBeenCalledTimes(2);
    }finally{confirm.mockRestore();}
  });

  it('shows deletion only on finished history entries and leaves them untouched on cancel',async()=>{
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
    mockApi.mockImplementation((async(path)=>{
      if(path==='/classes')return classResponse;
      if(path==='/live-quizzes')return {data:[
        {id:roomId,pin:'123456',status:'finished',mode:'classic',courseCode:'9618',
          questionCount:4,playerCount:5,createdAt:new Date().toISOString()},
        {id:'waiting-room',pin:'654321',status:'waiting',mode:'treasure',courseCode:'9618',
          questionCount:15,playerCount:2,createdAt:new Date().toISOString()},
      ]};
      throw Error('Unexpected request '+path);
    }) as typeof api);
    try{
      await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
        scopes={[{chapterNo:17,kind:'chapter'}]} onExit={()=>{}}
        onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
      expect(container.querySelectorAll('.lq-history-delete')).toHaveLength(1);
      await click('Delete finished game');
      expect(mockApi.mock.calls.some(([path,options])=>path===`/live-quizzes/${roomId}`&&options?.method==='DELETE')).toBe(false);
      expect(container.querySelectorAll('.lq-history-item')).toHaveLength(2);
      expect(confirm).toHaveBeenCalledOnce();
    }finally{confirm.mockRestore();}
  });

  it('switching back to Classic removes the self-paced-only mastery option',async()=>{
    await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
      scopes={[{chapterNo:15,kind:'chapter'}]} onExit={()=>{}}
      onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
    await click('Treasure Quest');
    const order=container.querySelector<HTMLSelectElement>('[aria-label="Live quiz question ordering"]')!;
    await act(async()=>{order.value='mastery';order.dispatchEvent(new Event('change',{bubbles:true}));});
    await click('Classic Challenge');
    expect([...container.querySelectorAll('option')].some(option=>option.value==='mastery')).toBe(false);
    expect(container.querySelector('[aria-label="Live quiz seconds per question"]')).not.toBeNull();
  });

  it('shows answer-choice distribution and automatic next-question countdown during Classic review',async()=>{
    const now=Date.now();
    mockApi.mockImplementation((async(path,options)=>{
      if(path==='/classes')return classResponse;
      if(path==='/live-quizzes'&&!options)return {data:[]};
      if(path==='/live-quizzes'&&options?.method==='POST')return {data:{id:roomId,pin:'123456',questionCount:4}};
      if(path===`/live-quizzes/${roomId}`)return {data:{id:roomId,pin:'123456',courseCode:'9618',
        status:'review',mode:'classic',questionCount:4,questionIndex:0,
        questionSeconds:20,questionStartedAt:new Date(now-12000).toISOString(),
        reviewEndsAt:new Date(now+5000).toISOString(),answerCounts:[1,0,2,0],
        serverNow:new Date(now).toISOString(),players:[
          {id:'1',nickname:'Aziza',avatar:'🦊',score:900,answered:true},
          {id:'2',nickname:'Sardor',avatar:'🐼',score:800,answered:true},
          {id:'3',nickname:'Sevinch',avatar:'🦁',score:0,answered:true},
        ],answeredCount:3,question:{id:'question',index:0,prompt:'Question one',
          options:['A','B','C','D'],correctIndex:2,explanation:'C is right',sourceContext:'Chapter 17'},
        ownAnswer:null}};
      throw Error('Unexpected request '+path);
    }) as typeof api);
    await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
      scopes={[{chapterNo:17,kind:'chapter'}]} onExit={()=>{}}
      onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
    await click('Host Now');
    await act(async()=>{await Promise.resolve();await Promise.resolve();});
    expect(container.textContent).toContain('How the class answered');
    expect(container.textContent).toContain('2 · 67%');
    expect(container.textContent).toContain('Results · next in');
    expect(container.textContent).toContain('Next now');
    expect(container.querySelectorAll('.lq-answer-distribution progress')).toHaveLength(4);
    expect(container.querySelector('.lq-question-stage.is-review .lq-answer-distribution .is-correct .lq-distribution-correct')?.textContent)
      .toBe('✓ Correct');
    expect(container.querySelectorAll('.lq-question-stage.is-review .lq-options')).toHaveLength(0);
    expect(container.querySelector('.lq-progress-track')?.getAttribute('aria-valuenow')).toBe('1');
    expect(container.querySelector('.lq-join-banner.is-compact')).not.toBeNull();
    expect(container.querySelector('[role="timer"]')?.getAttribute('aria-label')).toBe('Next question countdown');
  });

  it('keeps the Treasure projector leaderboard to a readable top ten while preserving the whole room count',async()=>{
    const players=Array.from({length:14},(_,index)=>({id:String(index),nickname:`Learner ${index+1}`,
      avatar:'🦊',score:1400-index*100,answered:1}));
    mockApi.mockImplementation((async(path,options)=>{
      if(path==='/classes')return classResponse;
      if(path==='/live-quizzes'&&!options)return {data:[]};
      if(path==='/live-quizzes'&&options?.method==='POST')return {data:{id:roomId,pin:'123456',questionCount:15}};
      if(path===`/live-quizzes/${roomId}`)return {data:{id:roomId,pin:'123456',courseCode:'9618',
        status:'active',mode:'treasure',questionCount:15,questionIndex:0,
        questionSeconds:20,questionStartedAt:new Date().toISOString(),serverNow:new Date().toISOString(),
        endsAt:new Date(Date.now()+180_000).toISOString(),players,answeredCount:14,
        question:null,ownAnswer:null,treasureGoal:10000}};
      throw Error('Unexpected request '+path);
    }) as typeof api);
    await act(async()=>{root.render(<LiveQuizHost courseCode="9618"
      scopes={[{chapterNo:17,kind:'chapter'}]} onExit={()=>{}}
      onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
    await click('Host Now');
    await act(async()=>{await Promise.resolve();await Promise.resolve();});
    expect(container.querySelectorAll('.lq-treasure-projector .lq-leaderboard > div')).toHaveLength(10);
    expect(container.textContent).toContain('Top 10 of 14 players');
    expect(container.textContent).toContain('End game & show reports');
  });
  it('hosts 0478 directly, keeps 9618 history separate, and leaves class invitation optional',async()=>{
    const original=mockApi.getMockImplementation()!;
    mockApi.mockImplementation(((path,options)=>{
      if(path==='/live-quizzes'&&!options)return Promise.resolve({data:[
        {id:'9618-room',pin:'333333',courseCode:'9618',status:'finished',mode:'classic',
          questionCount:10,playerCount:9,createdAt:new Date().toISOString()},
        {id:'0478-room',pin:'444444',courseCode:'0478',status:'finished',mode:'classic',
          questionCount:10,playerCount:10,createdAt:new Date().toISOString()},
      ]});
      return original(path,options);
    }) as typeof api);
    await act(async()=>{root.render(<LiveQuizHost courseCode="0478"
      scopes={[{chapterNo:3,kind:'chapter'}]} onExit={()=>{}}
      onToggleFullscreen={()=>{}} isFullscreen={false}/>);await Promise.resolve();});
    expect(container.querySelector('.lq-course-tag')?.textContent).toBe('0478');
    expect(container.querySelectorAll('.lq-history-item')).toHaveLength(1);
    expect(container.textContent).toContain('PIN 444444');
    expect(container.textContent).not.toContain('PIN 333333');
    expect(container.querySelector<HTMLSelectElement>('[aria-label="Live Quiz classroom"]')?.value).toBe('');
    await click('Host Now');
    const createCall=mockApi.mock.calls.find(([path,options])=>path==='/live-quizzes'&&options?.method==='POST')!;
    const payload=JSON.parse(String(createCall[1]?.body)) as Record<string,unknown>;
    expect(payload).toMatchObject({courseCode:'0478',scopes:[{chapterNo:3,kind:'chapter'}],mode:'classic'});
    expect(payload).not.toHaveProperty('classId');
  });
});

it('counts down to an automatic server-controlled review transition',()=>{
  const state={status:'review' as const,reviewEndsAt:new Date(5000).toISOString()};
  expect(reviewCountdownSeconds(state as Parameters<typeof reviewCountdownSeconds>[0],0)).toBe(5);
  expect(reviewCountdownSeconds(state as Parameters<typeof reviewCountdownSeconds>[0],4200)).toBe(1);
  expect(reviewCountdownSeconds(state as Parameters<typeof reviewCountdownSeconds>[0],6000)).toBe(0);

});
