import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  api,
  setAccessToken,
  type AppealItem,
  type Assignment,
  type Attempt,
  type ClassItem,
  type CommandWordProgress,
  type ExportItem,
  type Flashcard,
  type GradingItem,
  type MasteryItem,
  type Question,
  type ResultDetail,
  type ResultItem,
  type ReviewQuestion,
  type Topic,
  type User,
} from './lib/api';
import { flushAnswers, queueAnswer, type PendingAnswer } from './lib/offline-queue';
import { ThemeToggle, useTheme } from './lib/theme';
import { AnalyticsPanel } from './AnalyticsPanel';
import { AuthScreen, PendingApprovalScreen } from './features/auth/AuthScreen';
import { EnrolmentPanel } from './features/enrolment/EnrolmentPanel';
import { QuestionEditor } from './features/questions/QuestionEditor';
import { Latex } from './components/Latex';

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        C
      </span>
      <span className="brand-name">CamPath</span>
    </div>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const HomeIcon = () => (
  <svg {...iconProps}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-6h6v6" />
  </svg>
);
const UsersIcon = () => (
  <svg {...iconProps}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const BankIcon = () => (
  <svg {...iconProps}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);
const ClipboardIcon = () => (
  <svg {...iconProps}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </svg>
);
const ChartIcon = () => (
  <svg {...iconProps}>
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20v-6" />
  </svg>
);

export function App() {
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grading, setGrading] = useState<GradingItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionQuery, setQuestionQuery] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [resultDetail, setResultDetail] = useState<ResultDetail[] | null>(null);
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [commandWords, setCommandWords] = useState<CommandWordProgress[]>([]);
  const [review, setReview] = useState<ReviewQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [appeals, setAppeals] = useState<AppealItem[]>([]);
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [appealDraft, setAppealDraft] = useState<Record<string, string>>({});
  const [topics, setTopics] = useState<Topic[]>([]);
  const [staffTab, setStaffTab] = useState<'work' | 'enrolment' | 'authoring'>('work');
  const [showKeys, setShowKeys] = useState(false);
  const [gradeFocus, setGradeFocus] = useState<number | null>(null);
  const gradeRefs = useRef<(HTMLElement | null)[]>([]);
  const bankSearchRef = useRef<HTMLInputElement | null>(null);
  const saveTimers = useRef<Record<string, number>>({});

  const loadData = async (session: { accessToken: string; user: User }) => {
    setAccessToken(session.accessToken);
    setUser(session.user);

    // A self-registered student is enrolled nowhere until a teacher places them,
    // so every data endpoint below would 403. Show the waiting screen instead.
    if (session.user.status === 'pending') return;

    const [classData, assignmentData, resultData] = await Promise.all([
      api<{ data: ClassItem[] }>('/classes'),
      api<{ data: Assignment[] }>('/assignments'),
      api<{ data: ResultItem[] }>('/results'),
    ]);
    setClasses(classData.data);
    setAssignments(assignmentData.data);
    setResults(resultData.data);
    if (session.user.role === 'student') {
      const [m, w, c] = await Promise.all([
        api<{ data: MasteryItem[] }>('/analytics/mastery'),
        api<{ data: CommandWordProgress[] }>('/analytics/command-words'),
        api<{ data: Flashcard[] }>('/content/flashcards/due'),
      ]);
      setMastery(m.data);
      setCommandWords(w.data);
      setFlashcards(c.data);
    }
    if (session.user.role !== 'student') {
      const [questionData, gradingData, appealData, exportData] = await Promise.all([
        api<{ data: Question[] }>('/questions'),
        api<{ data: GradingItem[] }>('/grading/queue'),
        api<{ data: AppealItem[] }>('/grading/appeals'),
        api<{ data: ExportItem[] }>('/exports'),
      ]);
      setQuestions(questionData.data);
      setGrading(gradingData.data);
      setAppeals(appealData.data);
      setExports(exportData.data);
      if (session.user.role === 'owner')
        setReview((await api<{ data: ReviewQuestion[] }>('/ingestion/review')).data);
      setTopics((await api<{ data: Topic[] }>('/syllabus/topics')).data);
    }
  };

  useEffect(() => {
    api<{ accessToken: string; user: User }>('/auth/refresh', {
      method: 'POST',
    })
      .then(loadData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!attempt) return;
    const initial = attempt.deadline
      ? Math.max(
          0,
          Math.floor(
            (new Date(attempt.deadline).getTime() - new Date(attempt.serverNow).getTime()) / 1000,
          ),
        )
      : null;
    setRemainingSeconds(initial);
    const heartbeat = async () => {
      try {
        const state = await api<{ remainingSeconds: number | null; status: string }>(
          `/assignments/submissions/${attempt.submissionId}/heartbeat`,
          {
            method: 'POST',
            body: JSON.stringify({ activeSessionId: attempt.activeSessionId }),
          },
        );
        setRemainingSeconds(state.remainingSeconds);
        if (
          state.remainingSeconds === 0 ||
          !['not_started', 'in_progress'].includes(state.status)
        ) {
          setAttempt(null);
          setError('Vaqt tugadi. Javoblaringiz avtomatik topshirildi.');
          setAssignments((await api<{ data: Assignment[] }>('/assignments')).data);
        }
      } catch (cause) {
        setAttempt(null);
        setError(
          cause instanceof Error && cause.message !== 'So‘rov bajarilmadi.'
            ? cause.message
            : 'Urinish yopildi. Javoblaringiz saqlandi.',
        );
        void api<{ data: Assignment[] }>('/assignments')
          .then((response) => setAssignments(response.data))
          .catch(() => {});
      }
    };
    const timer = window.setInterval(heartbeat, 30_000);
    void heartbeat();
    return () => window.clearInterval(timer);
  }, [attempt]);

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;
    const timer = window.setInterval(
      () => setRemainingSeconds((value) => (value === null ? null : Math.max(0, value - 1))),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [remainingSeconds === null]);
  const sendPending = (answer: PendingAnswer) =>
    api(`/assignments/submissions/${answer.submissionId}/answers/${answer.questionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        text: answer.text,
        activeSessionId: answer.activeSessionId,
      }),
    }).then(() => {});
  useEffect(() => {
    const sync = () => void flushAnswers(localStorage, sendPending);
    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, []);

  useEffect(() => {
    if (
      !user ||
      user.role === 'student' ||
      !exports.some((item) => item.status === 'queued' || item.status === 'running')
    )
      return;
    const refresh = () =>
      void api<{ data: ExportItem[] }>('/exports')
        .then((response) => setExports(response.data))
        .catch(() => {});
    const timer = window.setInterval(refresh, 2_000);
    return () => window.clearInterval(timer);
  }, [user, exports]);

  // Klaviatura qisqartmalari (spec 05 §8.6)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      const typing =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (event.target as HTMLElement | null)?.isContentEditable;
      const key = event.key;
      if (key === 'Escape') setShowKeys(false);
      if (typing) return;
      if (key === '?') {
        event.preventDefault();
        setShowKeys((current) => !current);
        return;
      }
      if ((key === 'k' && event.metaKey) || (key === 'k' && event.ctrlKey)) {
        event.preventDefault();
        if (user?.role !== 'student') {
          setStaffTab('work');
          window.setTimeout(() => bankSearchRef.current?.focus(), 0);
        }
        return;
      }
      if (!user) return;
      if (user.role !== 'student' && staffTab === 'work' && grading.length > 0) {
        if (key === 'J' || key === 'K') {
          event.preventDefault();
          setGradeFocus((current) => {
            const next =
              current === null
                ? 0
                : key === 'J'
                  ? Math.min(grading.length - 1, current + 1)
                  : Math.max(0, current - 1);
            gradeRefs.current[next]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return next;
          });
        } else if (/^[1-9]$/.test(key)) {
          const item = grading[gradeFocus ?? 0];
          const point = item?.points[Number(key) - 1];
          if (point) void togglePoint(item, point.id, !point.matched);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, staffTab, grading, gradeFocus]);

  /** Re-reads the session so an approved student leaves the waiting screen. */
  const recheckStatus = async () => {
    try {
      const session = await api<{ accessToken: string; user: User }>('/auth/refresh', {
        method: 'POST',
      });
      await loadData(session);
    } catch {
      setError('Holatni tekshirib bo‘lmadi.');
    }
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setAccessToken(null);
    setUser(null);
  };
  const downloadOwnData = async () => {
    setError('');
    try {
      const data = await api<unknown>('/privacy/export');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `campath-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ma'lumotlar yuklanmadi.");
    }
  };
  const start = async (id: string) => {
    const requestId = crypto.randomUUID();
    const next = await api<Attempt>(`/assignments/${id}/attempt`, {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body: JSON.stringify({ clientSessionId: requestId }),
    });
    setAttempt(next);
    setAnswers(
      Object.fromEntries(
        next.questions.map((question) => [
          question.id,
          localStorage.getItem(`answer:${next.submissionId}:${question.id}`) ?? question.answerText,
        ]),
      ),
    );
  };
  const change = (id: string, value: string) => {
    if (!attempt) return;
    setAnswers((current) => ({ ...current, [id]: value }));
    localStorage.setItem(`answer:${attempt.submissionId}:${id}`, value);
    queueAnswer(localStorage, {
      submissionId: attempt.submissionId,
      questionId: id,
      text: value,
      activeSessionId: attempt.activeSessionId,
    });
    window.clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = window.setTimeout(() => flushAnswers(localStorage, sendPending), 1000);
  };
  const submit = async () => {
    if (!attempt || !confirm('Vazifani topshirishni tasdiqlaysizmi?')) return;
    await Promise.all(
      attempt.questions.map((question) =>
        api(`/assignments/submissions/${attempt.submissionId}/answers/${question.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            text: answers[question.id] ?? '',
            activeSessionId: attempt.activeSessionId,
          }),
        }),
      ),
    );
    await api(`/assignments/submissions/${attempt.submissionId}/submit`, {
      method: 'POST',
    });
    setAttempt(null);
    setAssignments((await api<{ data: Assignment[] }>('/assignments')).data);
  };
  const togglePoint = async (item: GradingItem, pointId: string, matched: boolean) => {
    await api(`/grading/points/${pointId}`, {
      method: 'PATCH',
      body: JSON.stringify({ teacherMatched: matched }),
    });
    setGrading((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              points: entry.points.map((point) =>
                point.id === pointId ? { ...point, matched } : point,
              ),
            }
          : entry,
      ),
    );
  };
  const setScore = async (item: GradingItem, score: number) => {
    await api(`/grading/${item.id}/score`, {
      method: 'PATCH',
      body: JSON.stringify({ score }),
    });
  };
  const release = async (item: GradingItem) => {
    await api(`/grading/${item.id}/release`, { method: 'POST' });
    setGrading((current) => current.filter((entry) => entry.id !== item.id));
  };
  const createAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await api('/assignments', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        classId: data.get('classId'),
        title: data.get('title'),
        dueAt: data.get('dueAt') ? new Date(String(data.get('dueAt'))).toISOString() : undefined,
        timeLimitMin: data.get('timeLimitMin') ? Number(data.get('timeLimitMin')) : undefined,
        questionIds: selectedQuestions,
      }),
    });
    setCreating(false);
    setSelectedQuestions([]);
    setAssignments((await api<{ data: Assignment[] }>('/assignments')).data);
  };
  const openResult = async (id: string) =>
    setResultDetail((await api<{ data: ResultDetail[] }>(`/results/${id}`)).data);
  const submitAppeal = async (item: ResultDetail) => {
    const reason = appealDraft[item.gradingId]?.trim() ?? '';
    if (reason.length < 10) {
      setError('Apellyatsiya sababini kamida 10 belgi bilan yozing.');
      return;
    }
    await api(`/grading/${item.gradingId}/appeal`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    setResultDetail(
      (current) =>
        current?.map((entry) =>
          entry.gradingId === item.gradingId ? { ...entry, appealStatus: 'open' } : entry,
        ) ?? null,
    );
    setAppealDraft((current) => ({ ...current, [item.gradingId]: '' }));
  };
  const resolveAppeal = async (item: AppealItem, decision: 'accepted' | 'rejected') => {
    const resolution = prompt(
      decision === 'accepted' ? 'Qayta tekshirish izohi' : 'Rad etish izohi',
    );
    if (!resolution || resolution.trim().length < 3) return;
    await api(`/grading/appeals/${item.id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decision, resolution }),
    });
    setAppeals((current) => current.filter((entry) => entry.id !== item.id));
    if (decision === 'accepted')
      setGrading((await api<{ data: GradingItem[] }>('/grading/queue')).data);
  };
  const reviewDecision = async (id: string, decision: 'approved' | 'rejected') => {
    await api(`/ingestion/review/${id}/${decision}`, { method: 'POST' });
    setReview((current) => current.filter((item) => item.id !== id));
  };
  const gradeCard = async (grade: number) => {
    const card = flashcards[0];
    if (!card) return;
    await api(`/content/flashcards/${card.flashcard_id}/review`, {
      method: 'POST',
      body: JSON.stringify({ grade }),
    });
    setFlashcards((current) => current.slice(1));
    setCardRevealed(false);
  };
  const exportAssignment = async (id: string, kind: 'question_paper' | 'combined') => {
    setError('');
    try {
      const created = await api<ExportItem>('/exports', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ kind, refTable: 'assignments', refId: id }),
      });
      setExports((current) => [created, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PDF tayyorlash boshlanmadi.');
    }
  };
  const generateAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await api('/assignments/generate', {
      method: 'POST',
      body: JSON.stringify({
        classId: data.get('classId'),
        title: data.get('title'),
        targetMarks: Number(data.get('targetMarks')),
        excludeSeen: data.get('excludeSeen') === 'on',
        excludeDiagrams: data.get('excludeDiagrams') === 'on',
        seed: Date.now(),
      }),
    });
    setGenerating(false);
    setAssignments((await api<{ data: Assignment[] }>('/assignments')).data);
  };

  if (loading && !user) return <main className="center">Yuklanmoqda...</main>;
  if (!user)
    return (
      <main className="login-page">
        <ThemeToggle theme={theme} toggle={toggle} />
        <div className="login-panel">
          <Brand />
          <p className="login-sub">Cambridge 9618 tayyorlov platformasi</p>
          <AuthScreen
            onSignedIn={(session) => {
              setError('');
              void loadData(session);
            }}
          />
        </div>
      </main>
    );
  if (user.status === 'pending')
    return (
      <main className="login-page">
        <ThemeToggle theme={theme} toggle={toggle} />
        <div className="login-panel">
          <Brand />
          <PendingApprovalScreen user={user} onSignOut={logout} onRecheck={recheckStatus} />
        </div>
      </main>
    );
  if (attempt)
    return (
      <main className="attempt">
        <header>
          <button className="back" title="Orqaga" onClick={() => setAttempt(null)}>
            ←
          </button>
          <strong>
            Vazifa · {attempt.questions.length} savol
            {remainingSeconds !== null && (
              <span
                className={`timer${remainingSeconds <= 300 ? ' timer--warn' : ''}${
                  remainingSeconds <= 0 ? ' timer--done' : ''
                }`}
              >
                {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
              </span>
            )}
          </strong>
          <div className="attempt-actions">
            <ThemeToggle theme={theme} toggle={toggle} />
            <button onClick={submit} disabled={remainingSeconds === 0}>
              Topshirish
            </button>
          </div>
        </header>
        <div
          className="attempt-progress"
          role="progressbar"
          aria-valuenow={attempt.questions.length}
        >
          {attempt.questions.map((question) => (
            <span
              className={(answers[question.id] ?? '').trim() ? 'filled' : ''}
              key={question.id}
              title={question.displayRef}
            />
          ))}
        </div>
        {error && <p className="attempt-error">{error}</p>}
        {attempt.questions.map((question, index) => (
          <section className="question" key={question.id}>
            <p className="ref">
              {index + 1}. {question.displayRef} · {question.commandWord} · {question.marks} ball
            </p>
            {(question.contextLatex || question.contextMd) && (
              <Latex className="context" source={question.contextLatex || question.contextMd} />
            )}
            <h2>
              <Latex source={question.stemLatex || question.stemMd} inline />
            </h2>
            <textarea
              disabled={remainingSeconds === 0}
              value={answers[question.id] ?? ''}
              onChange={(event) => change(question.id, event.target.value)}
              placeholder="Javobingni yoz..."
            />
            <small>
              {(answers[question.id] ?? '').trim().split(/\s+/).filter(Boolean).length} so‘z ·
              avtomatik saqlanadi
            </small>
          </section>
        ))}
      </main>
    );

  const role =
    user.role === 'owner' ? 'Owner' : user.role === 'teacher' ? 'O‘qituvchi' : 'O‘quvchi';

  const now = Date.now();
  const upcomingDeadlines = assignments
    .filter((a) => a.dueAt && new Date(a.dueAt).getTime() > now)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 4);
  const attentionItems = [
    ...(grading.length > 0
      ? [
          {
            tone: 'tone-missed' as const,
            title: `${grading.length} ta javob tekshirilishi kutilmoqda`,
            hint: 'Baholash navbatiga o‘ting',
            href: '#baholash',
          },
        ]
      : []),
    ...(appeals.length > 0
      ? [
          {
            tone: 'tone-uncertain' as const,
            title: `${appeals.length} ta apellyatsiya qaror kutilmoqda`,
            hint: 'Talabani tekshirib ko‘ring',
            href: '#appeals',
          },
        ]
      : []),
    ...(user.role === 'owner' && review.length > 0
      ? [
          {
            tone: 'tone-uncertain' as const,
            title: `${review.length} ta savol ingestion tekshiruvida`,
            hint: 'Sifat nazoratidan o‘tkazing',
            href: '#ingestion',
          },
        ]
      : []),
  ];

  return (
    <div className="app">
      <aside>
        <Brand />
        <nav>
          {user.role === 'student' ? (
            <>
              <div className="nav-group">Asosiy</div>
              {[
                { label: 'Bosh sahifa', icon: <HomeIcon />, href: '#top', active: true },
                { label: 'Vazifalar', icon: <ClipboardIcon />, href: '#vazifalar' },
                { label: 'Natijalar', icon: <ChartIcon />, href: '#natijalar' },
              ].map((item) => (
                <a className={item.active ? 'active' : ''} key={item.label} href={item.href}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </a>
              ))}
              <div className="nav-group">O‘rganmoq</div>
              {[
                { label: 'Bilim xaritasi', icon: <ChartIcon />, href: '#xarita' },
                ...(flashcards.length > 0
                  ? [{ label: 'Kartochkalar', icon: <BankIcon />, href: '#kartochkalar' }]
                  : []),
              ].map((item) => (
                <a key={item.href} href={item.href}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </>
          ) : (
            <>
              <div className="nav-group">Asosiy</div>
              {[
                { label: 'Bugungi ish', icon: <HomeIcon />, href: '#top', active: true },
                { label: 'Vazifalar', icon: <ClipboardIcon />, href: '#vazifalar' },
                ...(appeals.length > 0
                  ? [
                      {
                        label: 'Apellyatsiyalar',
                        icon: <ChartIcon />,
                        href: '#appeals',
                        count: appeals.length,
                      },
                    ]
                  : []),
              ].map((item) => (
                <a className={item.active ? 'active' : ''} key={item.label} href={item.href}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.count !== undefined && <span className="nav-count">{item.count}</span>}
                </a>
              ))}
              <div className="nav-group">Boshqaruv</div>
              {[
                { label: 'O‘quvchilar', icon: <UsersIcon />, href: '#enrolment' },
                ...(user.role === 'owner'
                  ? [{ label: 'Savol yaratish', icon: <BankIcon />, href: '#authoring' }]
                  : []),
              ].map((item) => (
                <a key={item.label} href={item.href}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </>
          )}
        </nav>
        <div className="side-foot">
          <button className="ghost data-export" onClick={downloadOwnData}>
            Ma’lumotlarim
          </button>
          <button className="ghost" onClick={logout}>
            Chiqish
          </button>
        </div>
      </aside>
      <main id="top">
        <header>
          <div>
            {user.role !== 'student' ? (
              <>
                <p className="eyebrow">
                  Bugungi ish ·{' '}
                  {new Date().toLocaleDateString('uz-UZ', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                <h1>Salom, {user.fullName}</h1>
              </>
            ) : (
              <>
                <p className="eyebrow">Cambridge 9618</p>
                <h1>Salom, {user.fullName}</h1>
              </>
            )}
          </div>
          <div className="page-head-actions">
            <ThemeToggle theme={theme} toggle={toggle} />
            <span className="role">{role}</span>
          </div>
        </header>
        {error && <p className="app-error">{error}</p>}
        {user.role === 'student' && (
          <div className="stats">
            <div className="stat-card">
              <span className="stat-label">Vazifalar</span>
              <span className="stat-value">
                {assignments.filter((a) => a.submissionStatus === 'in_progress').length}
                <small> jurnalda</small>
              </span>
              <span className="stat-hint">
                {assignments.filter((a) => a.submissionStatus === 'not_started').length} tasi
                boshlanmagan
              </span>
            </div>
            <div className="stat-card tone-awarded">
              <span className="stat-label">O‘rtacha natija</span>
              <span className="stat-value">
                {results.length
                  ? `${Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)}%`
                  : '—'}
              </span>
              <span className="stat-hint">{results.length} ta natija chiqarilgan</span>
            </div>
            <div className="stat-card tone-uncertain">
              <span className="stat-label">Kartochkalar</span>
              <span className="stat-value">
                {flashcards.length}
                <small> ta</small>
              </span>
              <span className="stat-hint">Bugun takrorlash navbatida</span>
            </div>
          </div>
        )}
        {user.role !== 'student' && (
          <div className="stats">
            <div className="stat-card">
              <span className="stat-label">Baholash navbati</span>
              <span className="stat-value">
                {grading.length}
                <small> javob</small>
              </span>
              <span className="stat-hint">Tekshirilishi kerak</span>
            </div>
            <div className="stat-card tone-uncertain">
              <span className="stat-label">Apellyatsiyalar</span>
              <span className="stat-value">
                {appeals.length}
                <small> ta</small>
              </span>
              <span className="stat-hint">Qaror kutilmoqda</span>
            </div>
            <div className="stat-card tone-awarded">
              <span className="stat-label">Nashr etilgan</span>
              <span className="stat-value">
                {results.length}
                <small> natija</small>
              </span>
              <span className="stat-hint">O‘quvchilarga ko‘rsatildi</span>
            </div>
          </div>
        )}
        {user.role === 'student' && (
          <section id="vazifalar">
            <div className="section-title">
              <h2>Vazifalar</h2>
              <span>{assignments.length} ta</span>
            </div>
            <div className="table">
              {assignments.map((assignment) => {
                const closed = Boolean(
                  assignment.submissionStatus &&
                  assignment.submissionStatus !== 'in_progress' &&
                  assignment.submissionStatus !== 'not_started',
                );
                return (
                  <div className="tr assignment" key={assignment.id}>
                    <div>
                      <strong>{assignment.title}</strong>
                      <small>
                        {assignment.className} · {assignment.totalMarks} ball
                      </small>
                    </div>
                    <span className={`status-pill ${assignment.submissionStatus ?? 'not_started'}`}>
                      {assignment.submissionStatus ?? 'Boshlanmagan'}
                    </span>
                    <button disabled={closed} onClick={() => start(assignment.id)}>
                      {assignment.submissionStatus === 'in_progress'
                        ? 'Davom etish'
                        : closed
                          ? 'Yakunlangan'
                          : 'Boshlash'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <section id="natijalar">
          <div className="section-title">
            <h2>Natijalar</h2>
            <span>{results.length} ta</span>
          </div>
          {results.length === 0 ? (
            <p className="empty">Hozircha chiqarilgan natija yo‘q.</p>
          ) : (
            <div className="table results">
              {results.map((result) => (
                <button
                  className="tr result-row"
                  key={result.id}
                  onClick={() => openResult(result.id)}
                >
                  <div>
                    <strong>{result.title}</strong>
                    <small>{user.role === 'student' ? result.className : result.studentName}</small>
                  </div>
                  <strong>
                    {result.totalScore}/{result.totalMax}
                  </strong>
                  <span>{result.percentage}%</span>
                </button>
              ))}
            </div>
          )}
          {resultDetail && (
            <div className="result-detail">
              <div className="section-title">
                <h3>Javoblar tahlili</h3>
                <button title="Yopish" onClick={() => setResultDetail(null)}>
                  ×
                </button>
              </div>
              {resultDetail.map((item) => (
                <article key={item.gradingId}>
                  <strong>
                    {item.displayRef} · {item.finalScore}/{item.marks}
                  </strong>
                  <p>{item.stemMd}</p>
                  <blockquote>{item.answerText || 'Javob yozilmagan'}</blockquote>
                  {item.points.map((point) => (
                    <div className={point.matched ? 'point hit' : 'point'} key={point.code}>
                      <b>{point.matched ? '✓' : '×'}</b>
                      <span>
                        {point.code} {point.text}
                      </span>
                      <strong>{point.marks}</strong>
                    </div>
                  ))}
                  {user.role === 'student' &&
                    (item.appealStatus ? (
                      <p className="appeal-status">
                        Apellyatsiya:{' '}
                        {item.appealStatus === 'open'
                          ? 'ko‘rib chiqilmoqda'
                          : item.appealStatus === 'accepted'
                            ? 'qabul qilindi'
                            : 'rad etildi'}
                      </p>
                    ) : (
                      <div className="appeal-form">
                        <textarea
                          value={appealDraft[item.gradingId] ?? ''}
                          onChange={(event) =>
                            setAppealDraft((current) => ({
                              ...current,
                              [item.gradingId]: event.target.value,
                            }))
                          }
                          placeholder="Bahoga nima sababdan e’tiroz bildirayotganingizni yozing"
                        />
                        <button onClick={() => submitAppeal(item)}>Apellyatsiya yuborish</button>
                      </div>
                    ))}
                </article>
              ))}
            </div>
          )}
        </section>
        {user.role === 'student' && (
          <section id="xarita">
            <div className="section-title">
              <h2>Bilim xaritasi</h2>
              <span>{mastery.length} mavzu</span>
            </div>
            {mastery.length === 0 ? (
              <p className="empty">Natijalar chiqqach bilim xaritasi paydo bo‘ladi.</p>
            ) : (
              <div className="mastery-list">
                {mastery.map((item) => (
                  <div key={item.subtopic_id}>
                    <div>
                      <strong>
                        {item.code} {item.title}
                      </strong>
                      <span>{Math.round(item.score * 100)}%</span>
                    </div>
                    <progress max="1" value={item.score} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {user.role === 'student' && (
          <section id="imtihon-konikmalari">
            <div className="section-title">
              <h2>Imtihon ko‘nikmalari</h2>
              <span>{commandWords.length} command word</span>
            </div>
            {commandWords.length === 0 ? (
              <p className="empty">Baholar chiqarilgach command word tahlili paydo bo‘ladi.</p>
            ) : (
              <div className="student-command-words">
                {commandWords.map((item) => (
                  <div className="word-row" key={item.commandWord}>
                    <span>{item.commandWord}</span>
                    <progress max="100" value={item.percentage} />
                    <b>{item.percentage}%</b>
                    <small>{item.sampleSize} javob</small>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {user.role === 'student' && (
          <>
            <section id="kartochkalar">
              <div className="section-title">
                <h2>Kartochkalar</h2>
                <span>{flashcards.length} ta</span>
              </div>
              {flashcards[0] ? (
                <article className="flashcard">
                  <strong>{flashcards[0].front_md}</strong>
                  {cardRevealed ? (
                    <>
                      <p>{flashcards[0].back_md}</p>
                      <div>
                        <button onClick={() => gradeCard(1)}>Qiyin</button>
                        <button onClick={() => gradeCard(3)}>O‘rta</button>
                        <button onClick={() => gradeCard(5)}>Oson</button>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => setCardRevealed(true)}>Javobni ko‘rsatish</button>
                  )}
                </article>
              ) : (
                <p className="empty">Bugun takrorlash kartochkalari qolmadi.</p>
              )}
            </section>
          </>
        )}
        <section>
          <h2>Sinflar</h2>
          <div className="table">
            <div className="tr head">
              <span>Sinf</span>
              <span>Daraja</span>
              <span>O‘quvchilar</span>
            </div>
            {classes.map((item) => (
              <div className="tr" key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.level}</span>
                <span>{item.studentCount}</span>
              </div>
            ))}
          </div>
        </section>
        {user.role !== 'student' && (
          <nav className="staff-tabs">
            {(
              [
                ['work', 'Bugungi ish'],
                ['enrolment', 'O‘quvchilar'],
                ...(user.role === 'owner' ? [['authoring', 'Savol yaratish'] as const] : []),
              ] as Array<[typeof staffTab, string]>
            ).map(([value, title]) => (
              <button
                key={value}
                className={staffTab === value ? 'active' : ''}
                onClick={() => setStaffTab(value)}
              >
                {title}
              </button>
            ))}
          </nav>
        )}

        {user.role !== 'student' && staffTab === 'enrolment' && (
          <EnrolmentPanel classes={classes} canSuspend={user.role === 'owner'} />
        )}

        {user.role === 'owner' && staffTab === 'authoring' && (
          <QuestionEditor
            topics={topics}
            onSaved={() => {
              void api<{ data: Question[] }>('/questions?status=needs_review').then((response) =>
                setQuestions(response.data),
              );
            }}
          />
        )}

        {user.role !== 'student' && staffTab === 'work' && (
          <>
            {(attentionItems.length > 0 || upcomingDeadlines.length > 0) && (
              <div className="today">
                {attentionItems.length > 0 && (
                  <section className="today-block">
                    <div className="section-title">
                      <h2>Diqqat talab qiladi</h2>
                      <span>{attentionItems.length} ta</span>
                    </div>
                    <div className="attention-list">
                      {attentionItems.map((item) => (
                        <a
                          href={item.href}
                          className={`attention-row ${item.tone}`}
                          key={item.title}
                        >
                          <span className="attention-dot" aria-hidden="true" />
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.hint}</small>
                          </span>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
                {upcomingDeadlines.length > 0 && (
                  <section className="today-block">
                    <div className="section-title">
                      <h2>Yaqin muddatlar</h2>
                      <span>{upcomingDeadlines.length} ta</span>
                    </div>
                    <div className="attention-list">
                      {upcomingDeadlines.map((a) => (
                        <div className="deadline-row" key={a.id}>
                          <span className="deadline-date">
                            {new Date(a.dueAt).toLocaleDateString('uz-UZ', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span>
                            <strong>{a.title}</strong>
                            <small>
                              {a.className} · {a.totalMarks} ball
                            </small>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
            {user.role === 'owner' && (
              <section id="ingestion">
                <div className="section-title">
                  <h2>Ingestion tekshiruvi</h2>
                  <span>{review.length} savol</span>
                </div>
                {review.map((item) => (
                  <article className="review-item" key={item.id}>
                    <div>
                      <strong>
                        {item.display_ref} · {item.marks} ball
                      </strong>
                      <p>{item.stem_md}</p>
                      {item.findings.map((f) => (
                        <span className={`finding ${f.severity}`} key={f.code}>
                          {f.code} {f.message}
                        </span>
                      ))}
                    </div>
                    <div>
                      <button onClick={() => reviewDecision(item.id, 'approved')}>
                        Tasdiqlash
                      </button>
                      <button
                        className="danger"
                        onClick={() => reviewDecision(item.id, 'rejected')}
                      >
                        Rad etish
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
            <section>
              <div className="section-title">
                <h2>Vazifalar</h2>
                <div className="actions">
                  <button className="secondary" onClick={() => setGenerating((value) => !value)}>
                    Avto yaratish
                  </button>
                  <button onClick={() => setCreating((value) => !value)}>
                    {creating ? 'Bekor qilish' : 'Yangi vazifa'}
                  </button>
                </div>
              </div>
              {generating && (
                <form className="generator-form" onSubmit={generateAssignment}>
                  <label>
                    Sinf
                    <select name="classId">
                      {classes.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nomi
                    <input name="title" minLength={3} required />
                  </label>
                  <label>
                    Maqsad ball
                    <input
                      name="targetMarks"
                      type="number"
                      min="1"
                      max="100"
                      defaultValue="25"
                      required
                    />
                  </label>
                  <label>
                    <input name="excludeSeen" type="checkbox" defaultChecked />
                    Ko‘rilgan savollarni chiqarish
                  </label>
                  <label>
                    <input name="excludeDiagrams" type="checkbox" />
                    Diagrammasiz
                  </label>
                  <button>Yaratish</button>
                </form>
              )}
              {assignments.length > 0 && (
                <div className="table staff-assignments">
                  <div className="tr head">
                    <span>Vazifa</span>
                    <span>Muddat</span>
                    <span>Ball</span>
                    <span>PDF</span>
                  </div>
                  {assignments.map((a) => {
                    const due = a.dueAt ? new Date(a.dueAt).getTime() : null;
                    const overdue = due !== null && due < now;
                    const soon = due !== null && !overdue && due - now < 48 * 3600 * 1000;
                    return (
                      <div className="tr" key={a.id}>
                        <div>
                          <strong>{a.title}</strong>
                          <small>{a.className}</small>
                        </div>
                        {a.dueAt ? (
                          <span
                            className={`status-pill${overdue ? ' overdue' : soon ? ' in_progress' : ''}`}
                            title={new Date(a.dueAt).toLocaleString('uz-UZ')}
                          >
                            {overdue
                              ? 'Muddat o‘tdi'
                              : soon
                                ? 'Yaqinda'
                                : new Date(a.dueAt).toLocaleDateString('uz-UZ', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                          </span>
                        ) : (
                          <span className="muted">Muddatsiz</span>
                        )}
                        <strong>{a.totalMarks} ball</strong>
                        <div>
                          <button
                            title="Savollar PDF"
                            onClick={() => exportAssignment(a.id, 'question_paper')}
                          >
                            QP
                          </button>
                          <button
                            title="Savol va mark scheme PDF"
                            onClick={() => exportAssignment(a.id, 'combined')}
                          >
                            QP+MS
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {exports.length > 0 && (
                <div className="export-status" aria-live="polite">
                  {exports.slice(0, 5).map((item) => (
                    <div key={item.id}>
                      <div>
                        <strong>
                          {item.kind === 'combined'
                            ? 'Savollar va mark scheme'
                            : item.kind === 'question_paper'
                              ? 'Savollar PDF'
                              : 'Natija PDF'}
                        </strong>
                        <small>{new Date(item.created_at).toLocaleString('uz-UZ')}</small>
                      </div>
                      <span className={`status-${item.status}`}>
                        {item.status === 'queued'
                          ? 'Navbatda'
                          : item.status === 'running'
                            ? 'Tayyorlanmoqda'
                            : item.status === 'succeeded'
                              ? 'Tayyor'
                              : 'Xato'}
                      </span>
                      {item.error && <small>{item.error}</small>}
                    </div>
                  ))}
                </div>
              )}
              {creating && (
                <form className="assignment-form" onSubmit={createAssignment}>
                  <label>
                    Sinf
                    <select name="classId" required>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nomi
                    <input name="title" required minLength={3} />
                  </label>
                  <label>
                    Muddat
                    <input name="dueAt" type="datetime-local" />
                  </label>
                  <label>
                    Vaqt limiti
                    <input name="timeLimitMin" type="number" min="1" max="300" />
                  </label>
                  <fieldset>
                    <legend>Savollar</legend>
                    {questions.slice(0, 20).map((question) => (
                      <label key={question.id}>
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(question.id)}
                          onChange={(event) =>
                            setSelectedQuestions((current) =>
                              event.target.checked
                                ? [...current, question.id]
                                : current.filter((id) => id !== question.id),
                            )
                          }
                        />
                        {question.displayRef} ·{' '}
                        <Latex source={question.stemLatex || question.stemMd} inline /> (
                        {question.marks})
                      </label>
                    ))}
                  </fieldset>
                  <button disabled={selectedQuestions.length === 0}>
                    Nashr qilish · {selectedQuestions.length} savol
                  </button>
                </form>
              )}
            </section>
            <section id="baholash">
              <div className="section-title">
                <h2>Tekshirish navbati</h2>
                <span>{grading.length} javob</span>
              </div>
              {grading.length === 0 ? (
                <p className="empty">Tekshiriladigan javob yo‘q.</p>
              ) : (
                <div className="grading-list">
                  {grading.map((item, index) => (
                    <article
                      className={`grading-card${gradeFocus === index ? ' focused' : ''}`}
                      key={item.id}
                      ref={(node) => {
                        gradeRefs.current[index] = node;
                      }}
                      onClick={() => setGradeFocus(index)}
                    >
                      <div className="grading-head">
                        <div>
                          <strong>{item.studentName}</strong>
                          <span>
                            {item.displayRef} · {item.marks} ball
                          </span>
                        </div>
                        <button onClick={() => release(item)}>Natijani chiqarish</button>
                      </div>
                      <h3>{item.stemMd}</h3>
                      <blockquote>{item.text || 'Javob yozilmagan'}</blockquote>
                      {item.points.length > 0 ? (
                        <div className="mark-points">
                          <div className="mp-head">
                            <span>Mark points</span>
                            <span className="mp-live">
                              <span className="on">
                                {item.points
                                  .filter((p) => p.matched)
                                  .reduce((s, p) => s + p.marks, 0)}
                              </span>
                              {' / '}
                              <span className="off">
                                {item.points.reduce((s, p) => s + p.marks, 0)}
                              </span>
                            </span>
                          </div>
                          {item.points.map((point) => (
                            <label key={point.id}>
                              <input
                                type="checkbox"
                                checked={Boolean(point.matched)}
                                onChange={(event) =>
                                  togglePoint(item, point.id, event.target.checked)
                                }
                              />
                              <span>
                                <strong>{point.code}</strong> {point.text}
                              </span>
                              <b>{point.marks}</b>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <label className="score-input">
                          Ball
                          <input
                            type="number"
                            min="0"
                            max={item.marks}
                            defaultValue="0"
                            onBlur={(event) => setScore(item, Number(event.target.value))}
                          />{' '}
                          / {item.marks}
                        </label>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section>
              <div className="section-title">
                <h2>Savol banki</h2>
                <span>{questions.length} savol</span>
              </div>
              <div className="bank-toolbar">
                <input
                  ref={bankSearchRef}
                  className="bank-search"
                  type="search"
                  value={questionQuery}
                  onChange={(event) => setQuestionQuery(event.target.value)}
                  placeholder="Qidirish… (ref yoki matn)"
                  aria-label="Savol banki qidiruvi"
                />
              </div>
              <div className="table questions">
                <div className="tr head">
                  <span>Ref</span>
                  <span>Savol</span>
                  <span>Ball</span>
                </div>
                {(() => {
                  const q = questionQuery.trim().toLowerCase();
                  const list = q
                    ? questions.filter(
                        (question) =>
                          question.displayRef.toLowerCase().includes(q) ||
                          (question.stemMd ?? '').toLowerCase().includes(q),
                      )
                    : questions;
                  return list.slice(0, 10).map((question) => (
                    <div className="tr" key={question.id}>
                      <span>{question.displayRef}</span>
                      <span>
                        <Latex source={question.stemLatex || question.stemMd} inline />
                      </span>
                      <strong>{question.marks}</strong>
                    </div>
                  ));
                })()}
              </div>
            </section>
            {classes.length > 0 && (
              <AnalyticsPanel classes={classes} owner={user.role === 'owner'} />
            )}
            {appeals.length > 0 && (
              <section id="appeals">
                <div className="section-title">
                  <h2>Apellyatsiyalar</h2>
                  <span>{appeals.length} ta</span>
                </div>
                <div className="appeal-list">
                  {appeals.map((item) => (
                    <article key={item.id}>
                      <div>
                        <strong>
                          {item.studentName} · {item.displayRef} · {item.finalScore}/{item.marks}
                        </strong>
                        <p>{item.stemMd}</p>
                        <blockquote>{item.answerText || 'Javob yozilmagan'}</blockquote>
                        <p className="appeal-reason">{item.reason}</p>
                      </div>
                      <div>
                        <button onClick={() => resolveAppeal(item, 'accepted')}>
                          Qabul qilish
                        </button>
                        <button className="danger" onClick={() => resolveAppeal(item, 'rejected')}>
                          Rad etish
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      {user.role === 'student' && (
        <nav className="mobile-nav" aria-label="Asosiy navigatsiya">
          <a href="#top" className="active">
            <span className="nav-icon">
              <HomeIcon />
            </span>
            Bosh sahifa
          </a>
          <a href="#vazifalar">
            <span className="nav-icon">
              <ClipboardIcon />
            </span>
            Vazifalar
          </a>
          <a href="#natijalar">
            <span className="nav-icon">
              <ChartIcon />
            </span>
            Natijalar
          </a>
          <a href="#kartochkalar">
            <span className="nav-icon">
              <BankIcon />
            </span>
            Kartochkalar
          </a>
        </nav>
      )}
      {showKeys && (
        <div
          className="keysheet"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowKeys(false)}
        >
          <div className="keysheet-card" onClick={(event) => event.stopPropagation()}>
            <h3>Klaviatura</h3>
            <div className="key-group">
              <kbd>?</kbd>
              <span>Bu xaritani ochish / yopish</span>
            </div>
            <div className="key-group">
              <kbd>Esc</kbd>
              <span>Oynalarni yopish</span>
            </div>
            {user.role !== 'student' && staffTab === 'work' && (
              <>
                <div className="key-group">
                  <kbd>⌘</kbd> <kbd>K</kbd>
                  <span>Savol bankidan qidirish</span>
                </div>
                <div className="key-group">
                  <kbd>J</kbd> <kbd>K</kbd>
                  <span>Keyingi / oldingi savolni tanlash</span>
                </div>
                <div className="key-group">
                  <kbd>1</kbd>–<kbd>9</kbd>
                  <span>Tanlangan savolning mark pointini almashtirish</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
