import { Fragment, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  api,
  apiBlob,
  AUTH_EXPIRED_EVENT,
  setAccessToken,
  type AppealItem,
  type Assignment,
  type Attempt,
  type ClassItem,
  type CommandWordProgress,
  type ContentGames,
  type ExportItem,
  type Flashcard,
  type GradingItem,
  type MasteryItem,
  type Question,
  type ResultDetail,
  type ResultItem,
  type User,
} from "./lib/api";
import {
  flushAnswers,
  queueAnswer,
  type PendingAnswer,
} from "./lib/offline-queue";
import { ThemeToggle } from './components/ThemeToggle';
import { AuthScreens } from './auth/AuthScreens';
import { UserApprovalPanel } from './auth/UserApprovalPanel';
import { AppShell, navigationFor } from './shell/AppShell';
import { OverviewPage } from './admin/OverviewPage';
import { CorpusPage } from './admin/CorpusPage';
import { QualityPage } from './admin/QualityPage';
import { SystemPage } from './admin/SystemPage';
import { QuestionBankPage } from './QuestionBankPage';
import { SelectionHandoffPage } from './SelectionHandoffPage';
import { StudentHome } from './student/StudentHome';
import { StudentResults } from './student/StudentResults';
import { ClassesPage } from './teaching/ClassesPage';
import { TeacherAssignments } from './teaching/TeacherAssignments';
import { GradingQueue } from './teaching/GradingQueue';
import { useRoute, navigate, HOME_BY_ROLE } from './lib/router';
import { sectionsFor, type SectionName } from './lib/sections';
import { AnalyticsPanel } from "./AnalyticsPanel";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grading, setGrading] = useState<GradingItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const route = useRoute();
  // The rail badges come from the same endpoint the dashboard reads, so a count
  // in the sidebar can never disagree with the number on the page.
  const [badges, setBadges] = useState<{ pendingUsers: number; reviewQueue: number; openAppeals: number }>(
    { pendingUsers: 0, reviewQueue: 0, openAppeals: 0 },
  );
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [attemptIndex,setAttemptIndex]=useState(0);
  const [submitConfirm,setSubmitConfirm]=useState(false);
  const [online,setOnline]=useState(()=>navigator.onLine);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [resultDetail, setResultDetail] = useState<ResultDetail[] | null>(null);
  const [openResultId, setOpenResultId] = useState<string | null>(null);
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [practicing,setPracticing]=useState<string|null>(null);
  const [commandWords,setCommandWords]=useState<CommandWordProgress[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [games,setGames]=useState<ContentGames>({termMatch:[],sequence:[],spotTheGap:[]});
  const [gameMode,setGameMode]=useState<'term'|'sequence'|'gap'>('term');
  const [termAnswers,setTermAnswers]=useState<Record<string,string>>({});
  const [sequence,setSequence]=useState<ContentGames['sequence']>([]);
  const [gapAnswer,setGapAnswer]=useState('');
  const [gameResult,setGameResult]=useState('');
  const [cardRevealed, setCardRevealed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [appeals, setAppeals] = useState<AppealItem[]>([]);
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [appealDraft, setAppealDraft] = useState<Record<string, string>>({});
  // Empty means every class. The queue opens filtered when it is reached from
  // a class page, which carries ?sinf=.
  const [gradingClass,setGradingClass]=useState('');
  const [gradingView,setGradingView]=useState<'by_question'|'by_student'|'confidence'>('by_question');
  const saveTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    const expired = () => {
      setAccessToken(null);
      setUser(null);
      setAttempt(null);
      setError('Sessiya muddati tugadi. Qayta kiring.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
  }, []);

  const loadData = async (session: { accessToken: string; user: User }) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    const [classData, assignmentData, resultData] = await Promise.all([
      api<{ data: ClassItem[] }>("/classes"),
      api<{ data: Assignment[] }>("/assignments"),
      api<{ data: ResultItem[] }>("/results"),
    ]);
    setClasses(classData.data);
    setAssignments(assignmentData.data);
    setResults(resultData.data);
    if (session.user.role === "student") {
      const [m, w, c, g] = await Promise.all([
        api<{ data: MasteryItem[] }>("/analytics/mastery"),
        api<{ data: CommandWordProgress[] }>("/analytics/command-words"),
        api<{ data: Flashcard[] }>("/content/flashcards/due"),
        api<{data:ContentGames}>("/content/games"),
      ]);
      setMastery(m.data);
      setCommandWords(w.data);
      setFlashcards(c.data);
      setGames(g.data);setSequence([...g.data.sequence].reverse());
    }
    if (session.user.role !== "student") {
      const [questionData, gradingData, appealData, exportData] =
        await Promise.all([
          api<{ data: Question[] }>("/questions"),
          api<{ data: GradingItem[] }>("/grading/queue"),
          api<{ data: AppealItem[] }>("/grading/appeals"),
          api<{ data: ExportItem[] }>("/exports"),
        ]);
      setQuestions(questionData.data);
      setGrading(gradingData.data);
      setAppeals(appealData.data);
      setExports(exportData.data);
    }
  };

  useEffect(() => {
    api<{ accessToken: string; user: User }>("/auth/refresh", {
      method: "POST",
    },{suppressAuthExpired:true})
      .then(loadData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // A bare URL has no route. Each role gets a home it is allowed to open --
  // sending a student to the owner dashboard would greet them with a 403.
  //
  // A URL that resolves to nothing for this role goes the same way: a teacher
  // following a shared student link should land somewhere they can work, not on
  // a blank page with a working sidebar.
  useEffect(() => {
    if (!user) return;
    const STANDALONE = ['oqitish/savol-banki', 'oqitish/tanlovlar'];
    const stranded = route.surface !== 'boshqaruv'
      && !STANDALONE.includes(route.path)
      && sectionsFor(route.surface, route.page, user.role).length === 0;
    if (!route.surface || stranded) navigate(HOME_BY_ROLE[user.role]);
  }, [user, route.surface, route.page]);

  useEffect(() => {
    if (!user || user.role === 'student') return;
    const fromRoute = route.params.get('sinf') ?? '';
    if (route.path !== 'oqitish/tekshirish' || fromRoute === gradingClass) return;
    setGradingClass(fromRoute);
    void loadGrading(gradingView, fromRoute).catch(() => {});
  }, [user, route.path, route.params.get('sinf')]);

  // The class page links to its own assignments; without this the link would
  // arrive on a list of every class's work and quietly mean nothing.
  useEffect(() => {
    if (!user || user.role === 'student' || route.path !== 'oqitish/vazifalar') return;
    const classId = route.params.get('sinf') ?? '';
    const query = classId ? `?classId=${encodeURIComponent(classId)}` : '';
    void api<{ data: Assignment[] }>(`/assignments${query}`)
      .then((result) => setAssignments(result.data))
      .catch(() => {});
  }, [user, route.path, route.params.get('sinf')]);

  useEffect(() => {
    if (user?.role !== 'owner') return;
    api<{ waiting: { pendingUsers: number; reviewQueue: number; openAppeals: number } }>('/admin/overview')
      .then((result) => setBadges(result.waiting))
      // A failed badge fetch must not break the page it decorates.
      .catch(() => {});
  }, [user, route.path]);

  useEffect(() => {
    if (!attempt) return;
    const initial = attempt.deadline
      ? Math.max(
          0,
          Math.floor(
            (new Date(attempt.deadline).getTime() -
              new Date(attempt.serverNow).getTime()) /
              1000,
          ),
        )
      : null;
    setRemainingSeconds(initial);
    const heartbeat = async () => {
      try {
        const state = await api<{ remainingSeconds: number | null; status:string }>(
          `/submissions/${attempt.submissionId}/heartbeat`,
          {
            method: "POST",
            body: JSON.stringify({ activeSessionId: attempt.activeSessionId }),
          },
        );
        setRemainingSeconds(state.remainingSeconds);
        if (state.remainingSeconds === 0 || !["not_started", "in_progress"].includes(state.status)) {
          setAttempt(null);
          setError("Vaqt tugadi. Javoblaringiz avtomatik topshirildi.");
          setAssignments((await api<{ data: Assignment[] }>("/assignments")).data);
        }
      } catch (cause) {
        setAttempt(null);
        setError(cause instanceof Error && cause.message !== "So‘rov bajarilmadi."
          ? cause.message
          : "Urinish yopildi. Javoblaringiz saqlandi.");
        void api<{ data: Assignment[] }>("/assignments")
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
      () =>
        setRemainingSeconds((value) =>
          value === null ? null : Math.max(0, value - 1),
        ),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [remainingSeconds === null]);
  const sendPending = (answer: PendingAnswer) =>
    api(
      `/submissions/${answer.submissionId}/answers/${answer.questionId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          text: answer.text,
          activeSessionId: answer.activeSessionId,
        }),
      },
    ).then(() => {});
  useEffect(() => {
    const sync = () => {setOnline(true);void flushAnswers(localStorage, sendPending)};
    const offline=()=>setOnline(false);
    window.addEventListener("online", sync);window.addEventListener('offline',offline);
    sync();
    return () => {window.removeEventListener("online", sync);window.removeEventListener('offline',offline)};
  }, []);

  useEffect(() => {
    if (
      !user ||
      user.role === "student" ||
      !exports.some(
        (item) => item.status === "queued" || item.status === "running",
      )
    )
      return;
    const refresh = () =>
      void api<{ data: ExportItem[] }>("/exports")
        .then((response) => setExports(response.data))
        .catch(() => {});
    const timer = window.setInterval(refresh, 2_000);
    return () => window.clearInterval(timer);
  }, [user, exports]);

  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setAccessToken(null);
    setUser(null);
  };
  const downloadOwnData = async () => {
    setError('');
    try {
      const data = await api<unknown>('/privacy/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type:'application/json' }));
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
      method: "POST",
      headers: { "Idempotency-Key": requestId },
      body: JSON.stringify({ clientSessionId: requestId }),
    });
    setAttempt(next);
    setAttemptIndex(0);
    setAnswers(
      Object.fromEntries(
        next.questions.map((question) => [
          question.id,
          localStorage.getItem(`answer:${next.submissionId}:${question.id}`) ??
            question.answerText,
        ]),
      ),
    );
  };
  const startPractice=async(item:MasteryItem)=>{
    setPracticing(item.subtopic_id);setError('');
    try{
      const created=await api<{id:string}>('/assignments/practice',{
        method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},
        body:JSON.stringify({subtopicId:item.subtopic_id}),
      });
      await start(created.id);
    }catch(cause){setError(cause instanceof Error?cause.message:'Mashq yaratilmadi.')}finally{setPracticing(null)}
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
    saveTimers.current[id] = window.setTimeout(
      () => flushAnswers(localStorage, sendPending),
      1000,
    );
  };
  const submit = async () => {
    if (!attempt) return;
    await Promise.all(
      attempt.questions.map((question) =>
        api(
          `/submissions/${attempt.submissionId}/answers/${question.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              text: answers[question.id] ?? "",
              activeSessionId: attempt.activeSessionId,
            }),
          },
        ),
      ),
    );
    await api(`/submissions/${attempt.submissionId}/submit`, {
      method: "POST",
    });
    setAttempt(null);
    setSubmitConfirm(false);
    setAssignments((await api<{ data: Assignment[] }>("/assignments")).data);
  };
  const togglePoint = async (
    item: GradingItem,
    pointId: string,
    matched: boolean,
  ) => {
    await api(`/gradings/${item.id}/points/${pointId}`, {
      method: "PATCH",
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
      method: "PATCH",
      body: JSON.stringify({ score }),
    });
  };
  const release = async (item: GradingItem) => {
    await api(`/gradings/${item.id}/release`, { method: "POST" });
    setGrading((current) => current.filter((entry) => entry.id !== item.id));
  };
  const loadGrading=async(view:'by_question'|'by_student'|'confidence',classId:string)=>{
    const query=new URLSearchParams(view==='confidence'?{sort:'confidence'}:{mode:view});
    if(classId)query.set('classId',classId);
    setGrading((await api<{data:GradingItem[]}>(`/grading/queue?${query}`)).data);
  };
  const changeGradingView=async(view:'by_question'|'by_student'|'confidence')=>{
    setGradingView(view);
    await loadGrading(view,gradingClass);
  };
  const changeGradingClass=async(classId:string)=>{
    setGradingClass(classId);
    await loadGrading(gradingView,classId);
  };
  const openResult = async (id: string) => {
    setOpenResultId(id);
    setResultDetail((await api<{ data: ResultDetail[] }>(`/results/${id}`)).data);
  };
  const submitAppeal = async (item: ResultDetail) => {
    const reason = appealDraft[item.gradingId]?.trim() ?? "";
    if (reason.length < 10) {
      setError("Apellyatsiya sababini kamida 10 belgi bilan yozing.");
      return;
    }
    await api(`/gradings/${item.gradingId}/appeal`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    setResultDetail(
      (current) =>
        current?.map((entry) =>
          entry.gradingId === item.gradingId
            ? { ...entry, appealStatus: "open" }
            : entry,
        ) ?? null,
    );
    setAppealDraft((current) => ({ ...current, [item.gradingId]: "" }));
  };
  const resolveAppeal = async (
    item: AppealItem,
    decision: "accepted" | "rejected",
  ) => {
    const resolution = prompt(
      decision === "accepted" ? "Qayta tekshirish izohi" : "Rad etish izohi",
    );
    if (!resolution || resolution.trim().length < 3) return;
    await api(`/grading/appeals/${item.id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ decision, resolution }),
    });
    setAppeals((current) => current.filter((entry) => entry.id !== item.id));
    if (decision === "accepted")
      setGrading((await api<{ data: GradingItem[] }>("/grading/queue")).data);
  };
  const gradeCard = async (grade: number) => {
    const card = flashcards[0];
    if (!card) return;
    await api(`/content/flashcards/${card.flashcard_id}/review`, {
      method: "POST",
      body: JSON.stringify({ grade }),
    });
    setFlashcards((current) => current.slice(1));
    setCardRevealed(false);
  };
  const exportAssignment = async (
    id: string,
    kind: "question_paper" | "combined",
  ) => {
    setError("");
    try {
      const created = await api<ExportItem>("/exports", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ kind, refTable: "assignments", refId: id }),
      });
      setExports((current) => [created, ...current]);
      await api('/jobs/run-once',{method:'POST'});
      setExports((await api<{data:ExportItem[]}>('/exports')).data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "PDF tayyorlash boshlanmadi.",
      );
    }
  };
  const downloadExport=async(item:ExportItem)=>{const blob=await apiBlob(`/exports/${item.id}/file`),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`campath-${item.kind}.pdf`;anchor.click();URL.revokeObjectURL(url)};
  const generateAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await api("/assignments/generate", {
      method: "POST",
      body: JSON.stringify({
        classId: data.get("classId"),
        title: data.get("title"),
        targetMarks: Number(data.get("targetMarks")),
        excludeSeen: data.get("excludeSeen") === "on",
        excludeDiagrams: data.get("excludeDiagrams") === "on",
        seed: Date.now(),
      }),
    });
    setGenerating(false);
    setAssignments((await api<{ data: Assignment[] }>("/assignments")).data);
  };

  if (loading && !user) return <main className="center">Yuklanmoqda...</main>;
  // The whole signed-out surface -- sign in, register, recover a password --
  // lives in AuthScreens, which owns its own errors and loading state.
  if (!user) return <AuthScreens onSignedIn={loadData} />;
  if (attempt)
    return (
      <main className="attempt">
        <header>
          <button
            className="back"
            title="Orqaga"
            onClick={() => setAttempt(null)}
          >
            ←
          </button>
          <strong>
            Vazifa · {attempt.questions.length} savol{" "}
            {remainingSeconds !== null &&
              `· ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`}
          </strong>
          <button onClick={()=>setSubmitConfirm(true)} disabled={remainingSeconds === 0}>
            Topshirish
          </button>
        </header>
        <div className={`sync-state ${online?'online':'offline'}`}>{online?'Sinxronlandi':'Oflayn — javoblaring saqlanmoqda'}</div>
        {error && <p className="attempt-error">{error}</p>}
        <div className="attempt-progress" aria-label={`${attemptIndex+1} / ${attempt.questions.length}`}>{attempt.questions.map((question,index)=><button title={`${index+1}. ${question.displayRef}`} aria-label={`${index+1}-savol`} className={(answers[question.id]??'').trim()?'answered':''} onClick={()=>setAttemptIndex(index)} key={question.id} />)}</div>
        {(()=>{const question=attempt.questions[attemptIndex]!;return <>
          <section className="question" key={question.id}>
            <p className="ref">
              {attemptIndex + 1}. {question.displayRef} · {question.commandWord} ·{" "}
              {question.marks} ball
            </p>
            {question.contextMd && (
              <p className="context">{question.contextMd}</p>
            )}
            <h2>{question.stemMd}</h2>
            <textarea className={question.answerKind==='code'||question.answerKind==='pseudocode'?'code-answer':''}
              disabled={remainingSeconds === 0}
              value={answers[question.id] ?? ""}
              onChange={(event) => change(question.id, event.target.value)}
              placeholder="Javobingni yoz..."
            />
            <small>
              {
                (answers[question.id] ?? "").trim().split(/\s+/).filter(Boolean)
                  .length
              }{" "}
              so‘z · avtomatik saqlanadi
            </small>
          </section>
          <nav className="attempt-nav"><button className="secondary" disabled={attemptIndex===0} onClick={()=>setAttemptIndex(value=>value-1)}>← Oldingi</button><span>{attemptIndex+1} / {attempt.questions.length}</span><button disabled={attemptIndex===attempt.questions.length-1} onClick={()=>setAttemptIndex(value=>value+1)}>Keyingi →</button></nav>
        </>})()}
        {submitConfirm&&<div className="modal-backdrop" role="presentation"><section className="submit-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-title"><h2 id="submit-title">Topshirishga tayyormisan?</h2><p>Javob berilgan: <strong>{attempt.questions.filter(question=>(answers[question.id]??'').trim()).length} / {attempt.questions.length}</strong></p>{attempt.questions.some(question=>!(answers[question.id]??'').trim())&&<p>Bo‘sh: {attempt.questions.filter(question=>!(answers[question.id]??'').trim()).map(question=>question.displayRef).join(', ')}</p>}<p>Topshirgandan keyin javobni o‘zgartira olmaysan.</p><div><button className="secondary" onClick={()=>setSubmitConfirm(false)}>Ortga</button><button onClick={submit}>Topshirish</button></div></section></div>}
      </main>
    );

  /*
   * The sections, named and routed.
   *
   * Every one of these used to render on every screen: choosing "Vazifalar" in
   * the rail showed the class list, the appeals, the grading queue and the
   * question bank underneath it. A section that appears everywhere is a section
   * that answers nothing, so each now belongs to one route.
   *
   * The role guards stay even though the navigation already keeps roles apart:
   * a teacher who types a student URL should get nothing, not an empty
   * student screen.
   */
  const studentAssignments = (
    <>
        {user.role === "student" && (
          <section id="student-assignments">
            <h2>Vazifalar</h2>
            <div className="table">
              {assignments.map((assignment) => {
                const closed = Boolean(
                  assignment.submissionStatus &&
                    assignment.submissionStatus !== "in_progress" &&
                    assignment.submissionStatus !== "not_started",
                );
                return (
                  <div className="tr assignment" key={assignment.id}>
                    <div>
                      <strong>{assignment.title}</strong>
                      <small>
                        {assignment.className} · {assignment.totalMarks} ball
                      </small>
                    </div>
                    <span>{assignment.submissionStatus ?? "Boshlanmagan"}</span>
                    <button
                      disabled={closed}
                      onClick={() => start(assignment.id)}
                    >
                      {assignment.submissionStatus === "in_progress"
                        ? "Davom etish"
                        : closed
                          ? "Yakunlangan"
                          : "Boshlash"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
    </>
  );

  const studentResults = (
    <StudentResults
      user={user}
      results={results}
      detail={resultDetail}
      openResultId={openResultId}
      appealDraft={appealDraft}
      onOpen={openResult}
      onClose={() => { setResultDetail(null); setOpenResultId(null); }}
      onAppealDraft={(gradingId, value) => setAppealDraft((current) => ({ ...current, [gradingId]: value }))}
      onAppeal={submitAppeal}
    />
  );

  const studentLearning = (
    <>
        {user.role === "student" && (
          <section id="student-learning">
            <div className="section-title">
              <h2>Bilim xaritasi</h2>
              <span>{mastery.length} mavzu</span>
            </div>
            {mastery.length === 0 ? (
              <p className="empty">
                Natijalar chiqqach bilim xaritasi paydo bo‘ladi.
              </p>
            ) : (
              <div className="mastery-list">
                {mastery.map((item,index) => (
                  <div key={item.subtopic_id}>
                    <div>
                      <strong>
                        {item.code} {item.title}
                      </strong>
                      <span>{Math.round(item.score * 100)}%</span>
                    </div>
                    <progress max="1" value={item.score} />
                    {index===0&&<button className="practice-button" disabled={practicing===item.subtopic_id} onClick={()=>startPractice(item)}>{practicing===item.subtopic_id?'Tayyorlanmoqda…':'Mashq qilish'}</button>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {user.role === "student" && (
          <section id="student-command-words">
            <div className="section-title">
              <h2>Imtihon ko‘nikmalari</h2>
              <span>{commandWords.length} command word</span>
            </div>
            {commandWords.length === 0 ? (
              <p className="empty">Baholar chiqarilgach command word tahlili paydo bo‘ladi.</p>
            ) : (
              <div className="student-command-words">
                {commandWords.map((item)=><div className="word-row" key={item.commandWord}><span>{item.commandWord}</span><progress max="100" value={item.percentage}/><b>{item.percentage}%</b><small>{item.sampleSize} javob</small></div>)}
              </div>
            )}
          </section>
        )}
        {user.role === "student" && flashcards[0] && (
          <section id="student-flashcards">
            <div className="section-title">
              <h2>Kartochkalar</h2>
              <span>{flashcards.length} ta</span>
            </div>
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
                <button onClick={() => setCardRevealed(true)}>
                  Javobni ko‘rsatish
                </button>
              )}
            </article>
          </section>
        )}
        {user.role === "student" && (games.termMatch.length>0||games.sequence.length>1) && (
          <section id="student-games">
            <div className="section-title"><h2>Mashq o‘yinlari</h2><div className="segmented game-tabs" aria-label="O‘yin turi">
              <button className={gameMode==='term'?'active':''} onClick={()=>{setGameMode('term');setGameResult('')}}>Term match</button>
              <button className={gameMode==='sequence'?'active':''} onClick={()=>{setGameMode('sequence');setGameResult('')}}>Sequence</button>
              <button className={gameMode==='gap'?'active':''} onClick={()=>{setGameMode('gap');setGameResult('')}}>Spot the gap</button>
            </div></div>
            <div className="learning-game">
              {gameMode==='term'&&<>{games.termMatch.map(item=><label key={item.id}><strong>{item.term}</strong><select value={termAnswers[item.id]??''} onChange={event=>setTermAnswers(current=>({...current,[item.id]:event.target.value}))}><option value="">Ta’rifni tanlang</option>{games.termMatch.map(option=><option value={option.id} key={option.id}>{option.definition}</option>)}</select></label>)}<button onClick={()=>setGameResult(`${games.termMatch.filter(item=>termAnswers[item.id]===item.id).length}/${games.termMatch.length} to‘g‘ri`)}>Tekshirish</button></>}
              {gameMode==='sequence'&&<>{sequence.map((item,index)=><div className="sequence-item" key={item.id}><b>{index+1}</b><span>{item.code} {item.text}</span><button title="Yuqoriga" disabled={index===0} onClick={()=>setSequence(current=>{const next=[...current];[next[index-1],next[index]]=[next[index]!,next[index-1]!];return next})}>↑</button><button title="Pastga" disabled={index===sequence.length-1} onClick={()=>setSequence(current=>{const next=[...current];[next[index],next[index+1]]=[next[index+1]!,next[index]!];return next})}>↓</button></div>)}<button onClick={()=>setGameResult(sequence.every((item,index)=>item.id===games.sequence[index]?.id)?'To‘g‘ri tartib':'Tartibni yana tekshiring')}>Tekshirish</button></>}
              {gameMode==='gap'&&games.spotTheGap[0]&&<><p className="gap-prompt">{games.spotTheGap[0].prompt}</p><label>Atama<input value={gapAnswer} onChange={event=>setGapAnswer(event.target.value)} /></label><button onClick={()=>setGameResult(gapAnswer.trim().toLowerCase()===games.spotTheGap[0]!.answer.toLowerCase()?'To‘g‘ri':`Javob: ${games.spotTheGap[0]!.answer}`)}>Tekshirish</button></>}
              {gameResult&&<strong className="game-result" aria-live="polite">{gameResult}</strong>}
            </div>
          </section>
        )}
    </>
  );

  const studentProfile = (
    <>
        {user.role==='student'&&<section id="student-profile" className="student-profile"><h2>Profil</h2><p>{user.fullName}</p><div><button className="secondary" onClick={downloadOwnData}>Ma’lumotlarim</button><button className="danger" onClick={logout}>Chiqish</button></div></section>}
    </>
  );


  const analyticsPanel = (
    <>
        {user.role !== "student" && classes.length > 0 && (
          <AnalyticsPanel classes={classes} owner={user.role === "owner"} />
        )}
    </>
  );

  const appealsSection = (
    <>
        {user.role !== "student" && appeals.length > 0 && (
          <section>
            <div className="section-title">
              <h2>Apellyatsiyalar</h2>
              <span>{appeals.length} ta</span>
            </div>
            <div className="appeal-list">
              {appeals.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>
                      {item.studentName} · {item.displayRef} · {item.finalScore}
                      /{item.marks}
                    </strong>
                    <p>{item.stemMd}</p>
                    <blockquote>
                      {item.answerText || "Javob yozilmagan"}
                    </blockquote>
                    <p className="appeal-reason">{item.reason}</p>
                  </div>
                  <div>
                    <button onClick={() => resolveAppeal(item, "accepted")}>
                      Qabul qilish
                    </button>
                    <button
                      className="danger"
                      onClick={() => resolveAppeal(item, "rejected")}
                    >
                      Rad etish
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
    </>
  );

  const teacherAssignments = (
    <TeacherAssignments
      assignments={assignments}
      classes={classes}
      exports={exports}
      filterClassId={route.params.get('sinf') ?? ''}
      generating={generating}
      onToggleGenerate={() => setGenerating((value) => !value)}
      onGenerate={generateAssignment}
      onExport={exportAssignment}
      onDownload={downloadExport}
    />
  );

  const gradingQueue = (
    <GradingQueue
      items={grading}
      classes={classes}
      classId={gradingClass}
      view={gradingView}
      onClassChange={changeGradingClass}
      onViewChange={changeGradingView}
      onTogglePoint={togglePoint}
      onSetScore={setScore}
      onRelease={release}
    />
  );

  // The rule for which section belongs on which page is a pure function, so it
  // can be read and tested without rendering anything.
  const bySection: Record<SectionName, ReactNode> = {
    studentAssignments, studentResults, studentLearning,
    studentHome: (
      <StudentHome
        user={user}
        assignments={assignments}
        results={results}
        mastery={mastery}
        flashcards={flashcards}
        onStart={start}
        onPractice={startPractice}
        practicing={practicing}
      />
    ),
    studentProfile,
    classes: (
      <ClassesPage
        user={user}
        classes={classes}
        onChanged={() => { void api<{ data: ClassItem[] }>('/classes').then((r) => setClasses(r.data)); }}
      />
    ),
    analytics: analyticsPanel,
    appeals: appealsSection,
    teacherAssignments,
    gradingQueue,
  };

  const routedSections = sectionsFor(route.surface, route.page, user.role)
    .map((name) => <Fragment key={name}>{bySection[name]}</Fragment>);

  const page =
    route.surface === 'boshqaruv' && route.page === 'holat' ? <OverviewPage />
      : route.surface === 'boshqaruv' && route.page === 'odamlar'
        ? <UserApprovalPanel classes={classes} currentUserId={user.id} />
        : route.surface === 'boshqaruv' && route.page === 'korpus' ? <CorpusPage />
          : route.surface === 'boshqaruv' && route.page === 'sifat' ? <QualityPage />
            : route.surface === 'boshqaruv' && route.page === 'tizim' ? <SystemPage />
              // Both keep their own dense workspace layout, but inside the
              // shell now, so the rail stays put and they no longer each open
              // their own session on arrival.
              : route.path === 'oqitish/savol-banki' ? <QuestionBankPage user={user} />
                : route.path === 'oqitish/tanlovlar' ? <SelectionHandoffPage user={user} />
                  : routedSections;

  return (
    <AppShell
      user={user}
      route={route}
      groups={navigationFor(user.role, classes, badges)}
      onLogout={logout}
    >
      {error && <p className="app-error">{error}</p>}
      {page}
    </AppShell>
  );
}

