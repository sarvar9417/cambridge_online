import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveExamPage } from './LiveExamPage';
import { api, ApiError, type LiveExamSnapshot } from '../lib/api';

vi.mock('../lib/api', async importOriginal => ({ ...await importOriginal<typeof import('../lib/api')>(), api: vi.fn() }));
vi.mock('./LiveExamLeaderboard', () => ({ LiveExamLeaderboard: () => null }));

const timestamp = '2026-09-29T00:00:00Z';
const makeSnapshot = (): LiveExamSnapshot => ({
  session: {
    id: 'session', classId: 'class', className: 'QA class', title: 'Feedback correction', joinCode: '123456',
    status: 'review', markingMode: 'teacher', questionTimeLimitS: null, version: 4,
    pausedAt: null, pauseRemainingS: null,
    settings: { allowLateJoin: false, autoCloseWhenAllSubmitted: false, teacherOverrideEnabled: true, leaderboardMode: 'marks', displayNameMode: 'anonymous_alias' },
    questionCount: 1, participantCount: 1, currentQuestionIndex: 0, createdAt: timestamp, updatedAt: timestamp,
    hostName: 'Teacher', startedAt: timestamp, finishedAt: null, questionStartedAt: timestamp,
    deadline: null, serverNow: timestamp, submittedCount: 1, reviewCount: 1, reviewedCount: 1,
  },
  questions: [], participants: [], question: null, markScheme: null, ownAnswer: null, review: null,
  teacherAnswers: [{
    id: 'answer', text: 'Learner answer', wordCount: 2, submittedAt: timestamp, score: 0,
    feedback: 'Original feedback', scoreSource: 'teacher', moderatedAt: timestamp, updatedAt: timestamp,
    studentName: 'QA learner', studentId: 'student', reviewId: 'review', reviewStatus: 'moderated',
    reviewKind: 'teacher', reviewMatchedPointIds: [],
  }],
});

describe('Live session updates', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.mocked(api).mockReset();
    window.history.replaceState(null, '', '/#oqitish/live?id=session');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows only the learner\'s released credited and missed Mark Points', async () => {
    const view=makeSnapshot();
    view.markScheme={id:'scheme',schemeType:'all_required',maxMarks:2,guidanceMd:null,levels:[],groups:[],
      points:[{id:'p1',code:'M1',text:'Correct definition',marks:1},{id:'p2',code:'M2',text:'Correct explanation',marks:1}]};
    view.ownAnswer={id:'own-answer',text:'Only definition',wordCount:2,submittedAt:timestamp,
      score:1,feedback:'Partly correct',scoreSource:'teacher',moderatedAt:null,updatedAt:timestamp};
    view.ownPointFeedback={status:'available',points:[
      {id:'p1',code:'M1',text:'Correct definition',marks:1,matched:true,credited:true},
      {id:'p2',code:'M2',text:'Correct explanation',marks:1,matched:false,credited:false},
    ]};
    vi.mocked(api).mockImplementation(async url=>
      (url.endsWith('/heartbeat')?{}:structuredClone(view)) as never);
    window.history.replaceState(null,'','/#oquvchi/live?id=session');
    await act(async()=>root.render(<LiveExamPage user={{id:'student',fullName:'Learner',role:'student',schoolId:null}} classes={[]}/>));
    const breakdown=container.querySelector('[aria-label="Sizning Mark Point natijalaringiz"]')!;
    expect(breakdown.textContent).toContain('M1');
    expect(breakdown.textContent).toContain('Ballga hisoblangan');
    expect(breakdown.textContent).toContain('M2');
    expect(breakdown.textContent).toContain('Ball berilmagan');
    expect(container.textContent).toContain('1');
  });

  it('does not display stale awarded point flags after teacher override', async () => {
    const view=makeSnapshot();
    view.ownAnswer={id:'own-answer',text:'Answer',wordCount:1,submittedAt:timestamp,
      score:1,feedback:'Manual correction',scoreSource:'teacher',moderatedAt:timestamp,updatedAt:timestamp};
    view.ownPointFeedback={status:'unavailable',reason:'teacher_override'};
    vi.mocked(api).mockImplementation(async url=>
      (url.endsWith('/heartbeat')?{}:structuredClone(view)) as never);
    window.history.replaceState(null,'','/#oquvchi/live?id=session');
    await act(async()=>root.render(<LiveExamPage user={{id:'student',fullName:'Learner',role:'student',schoolId:null}} classes={[]}/>));
    expect(container.textContent).toContain('O‘qituvchi yakuniy ballni qo‘lda tuzatgan');
    expect(container.textContent).not.toContain('Ballga hisoblangan');
  });

  it('shows released point feedback per question in the completed personal report', async () => {
    const view=makeSnapshot();
    view.session.status='finished';
    view.report={earned:1,possible:2,rows:[{
      questionPosition:0,displayRef:'9618/11 Q1',marks:2,answerText:'Answer',score:1,
      feedback:'One point',scoreSource:'peer',pointFeedback:{status:'available',points:[
        {id:'p1',code:'M1',text:'Right fact',marks:1,matched:true,credited:true},
        {id:'p2',code:'M2',text:'Missing fact',marks:1,matched:false,credited:false},
      ]},
    }]};
    vi.mocked(api).mockImplementation(async url=>
      (url.endsWith('/heartbeat')?{}:structuredClone(view)) as never);
    window.history.replaceState(null,'','/#oquvchi/live?id=session');
    await act(async()=>root.render(<LiveExamPage user={{id:'student',fullName:'Learner',role:'student',schoolId:null}} classes={[]}/>));
    expect(container.textContent).toContain('Right fact');
    expect(container.textContent).toContain('Missing fact');
  });

  it('allows consecutive feedback-only edits after a successful moderation', async () => {
    let view = makeSnapshot();
    let waitForRefresh = false;
    let finishRefresh: (() => void) | undefined;
    vi.mocked(api).mockImplementation(async (url, options) => {
      if (url.endsWith('/moderate')) {
        const input = JSON.parse(String(options?.body));
        expect(input.expectedVersion).toBe(view.session.version);
        view = { ...view, session: { ...view.session, version: view.session.version + 1 },
          teacherAnswers: view.teacherAnswers.map(answer => ({ ...answer, feedback: input.feedback })) };
        waitForRefresh = true;
        return { version: view.session.version } as never;
      }
      if (!url.endsWith('/heartbeat') && waitForRefresh) {
        await new Promise<void>(resolve => { finishRefresh = resolve; });
      }
      return (url.endsWith('/heartbeat') ? {} : structuredClone(view)) as never;
    });
    await act(async () => root.render(<LiveExamPage user={{ id: 'teacher', fullName: 'Teacher', role: 'teacher', schoolId: null }} classes={[]} />));

    for (const feedback of ['First correction', 'Second correction']) {
      const input = container.querySelector<HTMLTextAreaElement>('.live-teacher-marker textarea')!;
      const button = container.querySelector<HTMLButtonElement>('.live-teacher-marker button')!;
      expect(button.disabled).toBe(false);
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, feedback);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => button.click());
      expect(view.teacherAnswers[0]!.feedback).toBe(feedback);
      expect(container.querySelector<HTMLButtonElement>('.live-teacher-marker button')!.disabled).toBe(true);
      expect(finishRefresh).toBeDefined();
      await act(async () => { waitForRefresh = false; finishRefresh!(); });
      expect(container.querySelector<HTMLButtonElement>('.live-teacher-marker button')!.disabled).toBe(false);
    }
    expect(vi.mocked(api).mock.calls.filter(([url]) => url.endsWith('/moderate'))).toHaveLength(2);
  });

  it('refreshes after an older poll before allowing the next correction', async () => {
    vi.useFakeTimers();
    let view = makeSnapshot();
    let reads = 0;
    let finishOldPoll: (() => void) | undefined;
    vi.mocked(api).mockImplementation(async (url, options) => {
      if (url.endsWith('/heartbeat')) return {} as never;
      if (url.endsWith('/moderate')) {
        const input = JSON.parse(String(options?.body));
        expect(input.expectedVersion).toBe(view.session.version);
        view = { ...view, session: { ...view.session, version: view.session.version + 1 } };
        return { version: view.session.version } as never;
      }
      const result = structuredClone(view);
      if (++reads === 2) await new Promise<void>(resolve => { finishOldPoll = resolve; });
      return result as never;
    });
    await act(async () => root.render(<LiveExamPage user={{ id: 'teacher', fullName: 'Teacher', role: 'teacher', schoolId: null }} classes={[]} />));
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(finishOldPoll).toBeDefined();
    const button = () => container.querySelector<HTMLButtonElement>('.live-teacher-marker button')!;
    await act(async () => button().click());
    expect(button().disabled).toBe(true);
    await act(async () => finishOldPoll!());
    expect(reads).toBe(3);
    expect(button().disabled).toBe(false);
    await act(async () => button().click());
    expect(view.session.version).toBe(6);
    expect(button().disabled).toBe(false);
  });


  it('renders optional double marking calibration and peer disagreement review for staff', async () => {
    const view = makeSnapshot();
    view.session.status='marking';
    view.session.markingMode='peer';
    view.session.reviewCount=6;
    view.session.reviewedCount=5;
    view.session.settings.peerCalibrationPercent=100;
    view.session.settings.peerDisagreementThreshold=0.5;
    view.question={
      id:'session-question',
      sourceQuestionId:'question',
      position:0,
      marks:1,
      portable:{
        leaf:{id:'question',rootId:'question',label:'1',path:'1',displayRef:'9618/11/M/J/26 Q1',stem:'State one fact.',commandWord:'State',marks:1,answerKind:'text',answerLines:2},
        chain:[{id:'question',label:'1',depth:0}],
        contextBlocks:[],
        dependencies:[],
        sourceRef:'9618/11/M/J/26 Q1',
      },
      dependencyWork:[],
    };
    view.markScheme={
      id:'scheme',schemeType:'points',maxMarks:1,guidanceMd:null,levels:[],groups:[],
      points:[{id:'point',code:'M1',text:'Correct fact',marks:1}],
    };
    view.teacherAnswers=[{
      id:'answer',text:'Learner answer',wordCount:2,submittedAt:timestamp,score:null,
      feedback:null,scoreSource:null,moderatedAt:null,updatedAt:timestamp,
      studentName:'QA learner',studentId:'student',reviewId:'teacher-review',reviewStatus:'assigned',
      reviewKind:'teacher',reviewPurpose:'calibration',provisionalScore:0,provisionalFeedback:'Peer feedback',reviewMatchedPointIds:[],
    }];
    view.peerQualityQueue=[{
      answerId:'answer',studentName:'QA learner',peerScore:0,teacherScore:1,disagreement:1,threshold:0.5,needsTeacherReview:true,
    }];
    vi.mocked(api).mockImplementation(async url =>
      (url.endsWith('/heartbeat') ? {} : structuredClone(view)) as never
    );

    await act(async () => root.render(<LiveExamPage user={{ id: 'teacher', fullName: 'Teacher', role: 'teacher', schoolId: null }} classes={[]} />));

    expect(container.textContent).toContain('TEACHER CALIBRATION');
    expect(container.textContent).toContain('Peer bahoni mustaqil tekshirish');
    expect(container.textContent).toContain('PEER QUALITY');
    expect(container.textContent).toContain('Peer 0 · Teacher 1');
    expect(container.textContent).toContain('Δ 1');
  });

  it.each([403, 404])('removes the stale lobby and stops polling when access is revoked (%s)', async status => {
    vi.useFakeTimers();
    const view = makeSnapshot();
    view.session.status = 'lobby';
    view.teacherAnswers = [];
    let reads = 0;
    vi.mocked(api).mockImplementation(async url => {
      if (url.endsWith('/heartbeat')) return {} as never;
      if (++reads > 1) throw new ApiError('Topilmadi.', 'not_found', undefined, status);
      return view as never;
    });
    await act(async () => root.render(<LiveExamPage user={{ id: 'student', fullName: 'Learner', role: 'student', schoolId: null }} classes={[]} />));
    expect(container.textContent).toContain('XONAGA QO‘SHILDINGIZ');
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(container.textContent).not.toContain('XONAGA QO‘SHILDINGIZ');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('qatnashish huquqingiz yo‘q');
    const count = vi.mocked(api).mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(vi.mocked(api).mock.calls).toHaveLength(count);
  });

  it('retains the current room through a temporary polling failure', async () => {
    vi.useFakeTimers();
    const view = makeSnapshot();
    view.session.status = 'lobby';
    view.teacherAnswers = [];
    let reads = 0;
    vi.mocked(api).mockImplementation(async url => {
      if (url.endsWith('/heartbeat')) return {} as never;
      if (++reads === 2) throw new ApiError('Temporarily unavailable', 'unavailable', undefined, 503);
      return view as never;
    });
    await act(async () => root.render(<LiveExamPage user={{ id: 'student', fullName: 'Learner', role: 'student', schoolId: null }} classes={[]} />));
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(container.textContent).toContain('XONAGA QO‘SHILDINGIZ');
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(reads).toBe(3);
    expect(container.textContent).toContain('XONAGA QO‘SHILDINGIZ');
  });
});
