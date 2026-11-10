import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveChallengeCelebration, LiveChallengeFinalCeremony } from './LiveChallengeCelebration';

describe('Live Challenge 2.0 result feedback',()=>{
  let root:Root;
  let container:HTMLDivElement;

  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    window.localStorage.clear();
    window.sessionStorage.clear();
    container=document.createElement('div');
    document.body.appendChild(container);
    root=createRoot(container);
  });
  afterEach(async()=>{
    await act(async()=>root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows a responsive mascot and accurate released marks on review',async()=>{
    await act(async()=>root.render(<LiveChallengeCelebration sessionId="one" userId="student" questionIndex={0} score={4} possible={4}/>));
    expect(container.querySelector('.live-neon-mascot')).not.toBeNull();
    expect(container.querySelector('[aria-label="Celebration message"]')?.textContent).toContain('OUTSTANDING!');
    expect(container.querySelector('[aria-label="Celebration message"]')?.textContent).toContain('+4');
    expect(container.textContent).toContain('Perfect Answer');
    expect(container.textContent).toContain('1 reviewed');
  });

  it('does not reveal or fabricate marks before score release',async()=>{
    await act(async()=>root.render(<LiveChallengeCelebration sessionId="one" userId="student" questionIndex={0} score={null} possible={4}/>));
    expect(container.querySelector('.live-neon-cue')).toBeNull();
    expect(container.textContent).toContain('0 reviewed');
  });

  it('does not replay a previous celebration on refresh',async()=>{
    await act(async()=>root.render(<LiveChallengeCelebration sessionId="one" userId="student" questionIndex={0} score={4} possible={4}/>));
    expect(container.querySelector('.live-neon-cue')).not.toBeNull();
    await act(async()=>root.unmount());
    root=createRoot(container);
    await act(async()=>root.render(<LiveChallengeCelebration sessionId="one" userId="student" questionIndex={0} score={4} possible={4}/>));
    expect(container.querySelector('.live-neon-cue')).toBeNull();
    expect(container.textContent).toContain('Perfect Answer');
  });

  it('keeps effects preferences independent of assessment evidence',async()=>{
    await act(async()=>root.render(<LiveChallengeCelebration sessionId="one" userId="student" questionIndex={0} score={null} possible={4}/>));
    const checkbox=container.querySelector<HTMLInputElement>('.live-fx-settings input[type="checkbox"]')!;
    await act(async()=>checkbox.click());
    expect(JSON.parse(window.localStorage.getItem('cambridge-live-challenge-effects-v2')!).animation).toBe(false);
    await act(async()=>root.render(<LiveChallengeCelebration sessionId="one" userId="student" questionIndex={0} score={2} possible={4}/>));
    expect(container.querySelector('.live-neon-cue')).toBeNull();
    expect(container.textContent).toContain('1 reviewed');
  });

  it('shows final Cambridge marks and earned achievements from canonical report rows',async()=>{
    const results=Array.from({length:5},(_,questionPosition)=>({questionPosition,score:4,marks:4}));
    await act(async()=>root.render(<LiveChallengeFinalCeremony title="Your Results" earned={20} possible={20} results={results}/>));
    expect(container.textContent).toContain('20 / 20');
    expect(container.textContent).toContain('100%');
    expect(container.textContent).toContain('Challenge Explorer');
    expect(container.textContent).toContain('On Fire');
  });
});
