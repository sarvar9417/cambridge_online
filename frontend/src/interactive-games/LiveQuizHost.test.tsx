import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { LiveQuizHost } from './LiveQuizHost';

vi.mock('../lib/api',()=>({api:vi.fn()}));
const mockApi=vi.mocked(api);
const roomId='a8918dd9-6325-4e32-a602-222222222222';

describe('Live quiz Blooket-style host configuration',()=>{
  let root:Root,container:HTMLDivElement;
  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
    mockApi.mockReset();
    mockApi.mockImplementation((async(path,options)=>{
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
    await click('Host Now');
    const createCall=mockApi.mock.calls.find(([path,options])=>path==='/live-quizzes'&&options?.method==='POST')!;
    expect(JSON.parse(String(createCall[1]?.body))).toMatchObject({
      courseCode:'9618',scopes:[{chapterNo:17,kind:'topic',code:'17.1'}],
      mode:'treasure',durationSeconds:300,questionOrder:'mastery',incorrectPenaltySeconds:5,
    });
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
});
