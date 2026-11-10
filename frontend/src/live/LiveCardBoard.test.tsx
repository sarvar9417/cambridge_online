import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type LiveExamSnapshot } from '../lib/api';
import { LiveCardBoard } from './LiveCardBoard';

vi.mock('../lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  api: vi.fn(),
}));

const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const c='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const makeSnapshot=(overrides:Partial<LiveExamSnapshot['session']>={}):LiveExamSnapshot=>({
  session:{
    id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',classId:'class',className:'Class',
    title:'Card Mode test',joinCode:'123456',status:'lobby',
    markingMode:'self',questionTimeLimitS:180,version:7,
    pausedAt:null,pauseRemainingS:null,
    settings:{playMode:'cards',cardColumns:5,allowLateJoin:false,
      autoCloseWhenAllSubmitted:false,teacherOverrideEnabled:false,
      leaderboardMode:'marks',displayNameMode:'anonymous_alias'},
    questionCount:3,participantCount:2,currentQuestionIndex:-1,
    createdAt:'2026-11-09T00:00:00Z',updatedAt:'2026-11-09T00:00:00Z',
    hostName:'Teacher',startedAt:null,finishedAt:null,questionStartedAt:null,
    deadline:null,serverNow:'2026-11-09T00:00:00Z',
    submittedCount:0,reviewCount:0,reviewedCount:0,
    ...overrides,
  },
  cards:[
    {id:b,position:0,marks:2,used:false},
    {id:a,position:1,marks:2,used:false},
    {id:c,position:2,marks:5,used:false},
  ],
  questions:[],participants:[],question:null,markScheme:null,
  ownAnswer:null,review:null,teacherAnswers:[],
});

describe('Live Card Board',()=>{
  let root:Root;
  let container:HTMLDivElement;

  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    vi.mocked(api).mockReset();
    container=document.createElement('div');
    document.body.appendChild(container);
    root=createRoot(container);
  });

  afterEach(async()=>{
    await act(async()=>root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows up to five mark columns while keeping unreleased question content private',async()=>{
    const snapshot=makeSnapshot();
    await act(async()=>root.render(<LiveCardBoard snapshot={snapshot} refresh={async()=>{}}/>));
    expect(container.querySelectorAll('.live-card-column')).toHaveLength(5);
    expect(container.querySelectorAll('.live-card-tile')).toHaveLength(3);
    expect(container.textContent).toContain('5 ball');
    expect(container.textContent).toContain('1 ball');
    expect(container.textContent).not.toContain('Mark Scheme');
    expect(container.textContent).not.toContain('Cambridge question stem');
  });

  it('makes student card boards read-only even in an otherwise pickable lobby',async()=>{
    await act(async()=>root.render(<LiveCardBoard snapshot={makeSnapshot()}/>));
    const buttons=[...container.querySelectorAll<HTMLButtonElement>('.live-card-tile')];
    expect(buttons).toHaveLength(3);
    expect(buttons.every(button=>button.disabled)).toBe(true);
    expect(container.textContent).toContain('Kartani faqat o‘qituvchi tanlaydi');
    await act(async()=>buttons[0]!.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(api).not.toHaveBeenCalled();
  });

  it('sends a version-checked teacher claim for the selected card and refreshes server state',async()=>{
    const refresh=vi.fn().mockResolvedValue(undefined);
    vi.mocked(api).mockResolvedValue({status:'question_open'} as never);
    await act(async()=>root.render(<LiveCardBoard snapshot={makeSnapshot()} refresh={refresh} interactive/>));
    const first2Point=container.querySelector<HTMLButtonElement>('[aria-label="2 ballik karta 1"]')!;
    expect(first2Point.disabled).toBe(false);
    await act(async()=>first2Point.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(api).toHaveBeenCalledOnce();
    const [url,options]=vi.mocked(api).mock.calls[0]!;
    expect(url).toBe('/live-exams/dddddddd-dddd-4ddd-8ddd-dddddddddddd/cards/'+a+'/open');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({expectedVersion:7});
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('disables used cards and does not allow picks while the question is open',async()=>{
    const snapshot=makeSnapshot({status:'question_open',currentQuestionIndex:0});
    snapshot.cards![0]!.used=true;
    await act(async()=>root.render(<LiveCardBoard snapshot={snapshot}/>));
    const buttons=[...container.querySelectorAll<HTMLButtonElement>('.live-card-tile')];
    expect(buttons.every(button=>button.disabled)).toBe(true);
    expect(container.textContent).toContain('2 / 3 karta qoldi');
    expect(api).not.toHaveBeenCalled();
  });

  it('keeps review cards locked until explicit teacher approval, then permits the next pick',async()=>{
    const snapshot=makeSnapshot({status:'review',currentQuestionIndex:0});
    snapshot.cards![0]!.used=true;
    await act(async()=>root.render(<LiveCardBoard snapshot={snapshot} interactive/>));
    expect([...container.querySelectorAll<HTMLButtonElement>('.live-card-tile')]
      .every(button=>button.disabled)).toBe(true);
    expect(container.textContent).toContain('Avval o‘quvchilar baholarini ko‘rib, tasdiqlang.');

    snapshot.session.settings.cardReviewConfirmedPosition=0;
    await act(async()=>root.render(<LiveCardBoard snapshot={{...snapshot,session:{...snapshot.session}}} interactive/>));
    const available=container.querySelector<HTMLButtonElement>('[aria-label="5 ballik karta 1"]');
    expect(available?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="2 ballik karta 1"]')?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('.live-card-tile.is-used')?.disabled).toBe(true);
  });

  it('does not claim a second card on version conflict, and shows a recoverable error',async()=>{
    const refresh=vi.fn().mockResolvedValue(undefined);
    vi.mocked(api).mockRejectedValue(new Error('live_state_conflict'));
    await act(async()=>root.render(<LiveCardBoard snapshot={makeSnapshot()} refresh={refresh} interactive/>));
    await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="5 ballik karta 1"]')!
      .dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('live_state_conflict');
    expect(refresh).toHaveBeenCalledOnce();
    expect(vi.mocked(api)).toHaveBeenCalledTimes(1);
  });
});
