import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import {api} from '../lib/api';
import {LiveChallengeMoment,LiveChallengeTeacherEffects,LiveProjectorSoundControl} from './LiveChallengeStage';
import {LiveChallengeFinalPodium} from './LiveChallengeFinalPodium';
import {LiveMascot3D} from './LiveMascot3D';

vi.mock('../lib/api',async importOriginal=>({
  ...await importOriginal<typeof import('../lib/api')>(),api:vi.fn(),
}));

const policy={animations:true,sound:false,intensity:'balanced' as const,publicCelebrations:true};
describe('Live Challenge full-screen gamification contracts',()=>{
  let root:Root;
  let container:HTMLDivElement;
  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    vi.mocked(api).mockReset();
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
  it('never celebrates an unreleased or impossible class score',async()=>{
    await act(async()=>root.render(<LiveChallengeMoment eventId="round-1" score={null} possible={4} context="Released" policy={policy} publicView/>));
    expect(container.querySelector('.live-neon-shared-cue')).toBeNull();
    await act(async()=>root.render(<LiveChallengeMoment eventId="round-2" score={8} possible={4} context="Released" policy={policy} publicView/>));
    expect(container.querySelector('.live-neon-shared-cue')).toBeNull();
  });
  it('shows the same released-round celebration exactly once per browser session',async()=>{
    await act(async()=>root.render(<LiveChallengeMoment eventId="room:2:review" score={3} possible={4} context="A released class round" policy={policy} publicView/>));
    expect(container.querySelector('.live-neon-shared-cue')?.textContent).toContain('Class average: 3');
    expect(container.querySelector('.live-neon-mascot')).not.toBeNull();
    await act(async()=>root.unmount());
    root=createRoot(container);
    await act(async()=>root.render(<LiveChallengeMoment eventId="room:2:review" score={3} possible={4} context="A released class round" policy={policy} publicView/>));
    expect(container.querySelector('.live-neon-shared-cue')).toBeNull();
  });
  it('obeys teacher-wide animation/public-celebration permissions',async()=>{
    await act(async()=>root.render(<LiveChallengeMoment eventId="private" score={4} possible={4} context="Saved" policy={{...policy,animations:false}}/>));
    expect(container.querySelector('.live-neon-shared-cue')).toBeNull();
    await act(async()=>root.render(<LiveChallengeMoment eventId="public" score={4} possible={4} context="Release" policy={{...policy,publicCelebrations:false}} publicView/>));
    expect(container.querySelector('.live-neon-shared-cue')).toBeNull();
  });
  it('submits synchronized settings, never marks or student identities',async()=>{
    vi.mocked(api).mockResolvedValue({version:6} as never);
    const refresh=vi.fn(async()=>undefined);
    await act(async()=>root.render(<LiveChallengeTeacherEffects sessionId="session" policy={policy} version={5} onSaved={refresh}/>));
    const checkboxes=container.querySelectorAll<HTMLInputElement>('.live-neon-teacher-toggles input[type="checkbox"]');
    await act(async()=>checkboxes[2].click());
    const apply=[...container.querySelectorAll('button')].find(button=>button.textContent?.includes('Apply to all screens'))!;
    await act(async()=>apply.click());
    expect(vi.mocked(api)).toHaveBeenCalledTimes(1);
    const [,options]=vi.mocked(api).mock.calls[0];
    const body=JSON.parse(String(options?.body));
    expect(body).toMatchObject({...policy,publicCelebrations:false,expectedVersion:5});
    expect(JSON.stringify(body)).not.toMatch(/answer|studentId|score|markScheme/i);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('requires a local user gesture to arm projector sound',async()=>{
    await act(async()=>root.render(<LiveProjectorSoundControl enabled/>));
    const button=container.querySelector<HTMLButtonElement>('.live-neon-projector-sound')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await act(async()=>button.click());
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
  it('renders genuine WebGL canvas with semantic SVG fallback',async()=>{
    await act(async()=>root.render(<LiveMascot3D tier="gold" fallback={<svg role="img" aria-label="Robot fallback"/>}/>));
    expect(container.querySelector('.live-neon-mascot-canvas')).not.toBeNull();
    expect(container.querySelector('[aria-label="Robot fallback"]')).not.toBeNull();
  });
  it('renders official tie ranks and marks without reordering scores',async()=>{
    await act(async()=>root.render(<LiveChallengeFinalPodium standings={[
      {rank:1,studentName:'Learner A',score:4,possible:4},
      {rank:1,studentName:'Learner B',score:4,possible:4},
      {rank:3,studentName:'Learner C',score:3,possible:4},
    ]}/>));
    const podium=container.querySelector('[aria-label="Final Ceremony podium"]')!;
    expect(podium.textContent).toContain('Learner A');
    expect(podium.textContent).toContain('Learner B');
    expect(podium.textContent).toContain('3 / 4');
    expect(podium.querySelector('[aria-label="Position 1: Learner B"]')).not.toBeNull();
  });
});
