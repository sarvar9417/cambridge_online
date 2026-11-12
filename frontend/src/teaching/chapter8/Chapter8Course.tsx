import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { api, type LessonProgress } from "../../lib/api";
import { navigate, useRoute } from "../../lib/router";
import { DataTable, Visual } from "./Visuals";
import {
  emptyEvidence,
  emptyRecord,
  firstAttemptCorrect,
  groups,
  lessons,
  loadState,
  readyToComplete,
  resolveLesson,
  storageKey,
  taskReady,
  terms,
  type Block,
  type CourseState,
  type Evidence,
  type Lesson,
  type RecordState,
  type Task,
} from "./model";
import "./chapter8.css";

type Props = { audience: "teacher" | "student"; userId: string };
const phases = ["Start", "Learn", "Practice", "Check", "Recap"];
function courseUrl(
  audience: Props["audience"],
  lesson?: number,
  mode = "study",
) {
  const params = new URLSearchParams({ course: "9618", chapter: "8", mode });
  if (lesson) params.set("lesson", String(lesson));
  if (mode === "exam")
    params.set(
      "topic",
      lesson && lesson <= 7 ? "8.1" : lesson && lesson <= 9 ? "8.2" : "8.3",
    );
  return `${audience === "student" ? "oquvchi" : "oqitish"}/darslar?${params}`;
}
function BlockView({ block }: { block: Block }) {
  return (
    <article className="c8-block">
      <h2>{block.title}</h2>
      {block.kind === "text" ? (
        <p>{block.text}</p>
      ) : block.kind === "table" ? (
        <DataTable
          caption={block.title}
          headers={block.headers ?? []}
          rows={block.rows ?? []}
        />
      ) : block.kind === "code" ? (
        <>
          <pre>
            <code>{block.text}</code>
          </pre>
          {block.note ? <p className="c8-code-note">{block.note}</p> : null}
        </>
      ) : (
        <ol className="c8-steps">
          {block.items?.map((item, i) => (
            <li key={i}>
              <span>{i + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {block.uz ? (
        <details className="c8-uz">
          <summary>O‘zbekcha tushuntirish</summary>
          <p lang="uz">{block.uz}</p>
        </details>
      ) : null}
    </article>
  );
}
function TaskCard({
  task,
  evidence,
  onChange,
  label,
}: {
  task: Task;
  evidence: Evidence;
  onChange: (value: Evidence) => void;
  label: string;
}) {
  const e = evidence;
  const submit = () =>
    onChange({
      ...e,
      submitted: true,
      first:
        e.first ??
        (task.kind === "choice"
          ? (task.options?.[e.choice ?? -1] ?? "")
          : e.draft),
      firstChoice: e.first === undefined ? e.choice : e.firstChoice,
      revealed: task.kind === "choice" ? true : e.revealed,
    });
  return (
    <section className="c8-task">
      <span className="c8-kicker">{label}</span>
      <h2>{task.prompt}</h2>
      {task.kind === "choice" ? (
        <fieldset>
          <legend className="c8-sr">Choose one answer</legend>
          {task.options?.map((option, i) => (
            <label className={e.choice === i ? "is-selected" : ""} key={option}>
              <input
                type="radio"
                name={label}
                value={i}
                checked={e.choice === i}
                disabled={e.submitted}
                onChange={() => onChange({ ...e, choice: i })}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="c8-answer-label">
          Your explanation
          <textarea
            maxLength={12000}
            rows={5}
            value={e.draft}
            disabled={e.submitted}
            onChange={(event) => onChange({ ...e, draft: event.target.value })}
            placeholder="Explain your reasoning. For SQL, write the complete query."
          />
        </label>
      )}
      {!e.submitted ? (
        <div className="c8-task-actions">
          <button
            type="button"
            className="c8-button c8-button--primary"
            disabled={
              task.kind === "choice" ? e.choice === undefined : !e.draft.trim()
            }
            onClick={submit}
          >
            Save {e.first === undefined ? "first attempt" : "revision"}
          </button>
          {task.kind === "written" && !e.revealed ? (
            <button
              type="button"
              className="c8-link"
              onClick={() =>
                onChange({
                  ...e,
                  revealed: true,
                  guided: e.first === undefined ? true : e.guided,
                })
              }
            >
              Need a model first?
            </button>
          ) : null}
        </div>
      ) : (
        <div className="c8-task-actions">
          <span className="c8-evidence-label">
            {e.guided
              ? "Guided attempt"
              : e.first ===
                  (task.kind === "choice"
                    ? task.options?.[e.choice ?? -1]
                    : e.draft)
                ? "First attempt saved"
                : "Revision saved · first attempt preserved"}
          </span>
          <button
            type="button"
            className="c8-link"
            onClick={() => onChange({ ...e, submitted: false, criteria: [] })}
          >
            Revise answer
          </button>
        </div>
      )}
      {task.kind === "written" && e.submitted && !e.revealed ? (
        <button
          type="button"
          className="c8-button"
          onClick={() => onChange({ ...e, revealed: true })}
        >
          Compare with model answer
        </button>
      ) : null}
      {e.revealed ? (
        <div
          className={
            "c8-model" +
            (task.kind === "choice" && e.choice !== task.correct
              ? " is-wrong"
              : "")
          }
          role="status"
        >
          <strong>
            {task.kind === "choice"
              ? e.choice === task.correct
                ? "Correct — here is why"
                : "Review the reason"
              : "Model answer · self-check"}
          </strong>
          {task.kind === "choice" ? (
            <p>
              {task.options?.[task.correct ?? 0]}. {task.why}
            </p>
          ) : (
            <>
              <pre className="c8-model-answer">{task.answer}</pre>
              <p>
                Tick a criterion only if your own answer contains it. This is
                self-assessment, not a teacher grade.
              </p>
              {task.criteria?.map((criterion, i) => (
                <label className="c8-criterion" key={criterion}>
                  <input
                    type="checkbox"
                    disabled={!e.submitted}
                    checked={e.criteria.includes(i)}
                    onChange={(event) =>
                      onChange({
                        ...e,
                        criteria: event.target.checked
                          ? [...e.criteria, i]
                          : e.criteria.filter((n) => n !== i),
                      })
                    }
                  />
                  <span>{criterion}</span>
                </label>
              ))}
            </>
          )}
        </div>
      ) : null}
      {e.first !== undefined ? (
        <details className="c8-first">
          <summary>
            View saved first attempt{" "}
            {e.guided ? "(guided)" : "(before feedback)"}
          </summary>
          <p>{e.first}</p>
        </details>
      ) : null}
    </section>
  );
}
function Glossary({
  onOpenLesson,
  onClose,
}: {
  onOpenLesson: (n: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  const matches = terms.filter((t) =>
    `${t.name} ${t.definition}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <section className="c8-glossary" aria-label="Chapter glossary">
      <header>
        <div>
          <span className="c8-kicker">33 SOURCE KEY TERMS</span>
          <h2>Small definitions. Clear examples.</h2>
        </div>
        <button
          type="button"
          className="c8-button"
          ref={closeRef}
          onClick={onClose}
        >
          Close glossary
        </button>
      </header>
      <label>
        Find a key term
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try primary key, DBMS, 3NF…"
          type="search"
        />
      </label>
      <p aria-live="polite">{matches.length} terms</p>
      <div className="c8-terms">
        {matches.map((t) => (
          <article key={t.name}>
            <h3>{t.name}</h3>
            <p>{t.definition}</p>
            <p className="c8-term-example">{t.example}</p>
            <button
              type="button"
              className="c8-link"
              onClick={() => onOpenLesson(t.lesson)}
            >
              Lesson {t.lesson} · Hodder p.{t.page} →
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
function CourseOverview({
  state,
  audience,
  onOpen,
}: {
  state: CourseState;
  audience: Props["audience"];
  onOpen: (n: number) => void;
}) {
  const done = lessons.filter((l) => state[l.id]?.completed).length;
  return (
    <>
      <header className="c8-hero">
        <div>
          <span className="c8-kicker">
            CAMBRIDGE 9618 / AS LEVEL / CHAPTER 08
          </span>
          <h1>
            Databases.
            <br />
            <em>Make the connections.</em>
          </h1>
          <p>
            From scattered files to a carefully designed system. Learn the
            ideas, see them work, then explain them yourself.
          </p>
          <button
            type="button"
            className="c8-button c8-button--primary"
            onClick={() =>
              onOpen(lessons.find((l) => !state[l.id]?.completed)?.number ?? 1)
            }
          >
            {done ? "Continue learning" : "Start with lesson 01"} <span>→</span>
          </button>
        </div>
        <div
          className="c8-hero-art"
          aria-label="A database connects related entities"
        >
          <div className="c8-mini-table">
            <span>STUDENT</span>
            <p>
              <b>PK</b> StudentID
            </p>
            <p>FirstName</p>
            <p>
              <b>FK</b> ClassID
            </p>
          </div>
          <div className="c8-art-link">ONE SHARED RECORD</div>
          <div className="c8-mini-table c8-mini-table--second">
            <span>CLASS</span>
            <p>
              <b>PK</b> ClassID
            </p>
            <p>Location</p>
            <p>
              <b>FK</b> LicenceNumber
            </p>
          </div>
        </div>
      </header>
      <div className="c8-metrics">
        <span>
          <b>14</b> focused lessons
        </span>
        <span>
          <b>33</b> key terms
        </span>
        <span>
          <b>3</b> connected sections
        </span>
        <span>
          <b>{done}/14</b>{" "}
          {audience === "student"
            ? "lessons completed"
            : "practice sessions completed"}
        </span>
      </div>
      <section className="c8-path">
        <header>
          <div>
            <span className="c8-kicker">YOUR CHAPTER ROUTE</span>
            <h2>Understand. Build. Explain.</h2>
          </div>
          <p>
            Hodder, Chapter 8 · pp.196–216
            <br />
            Original explanations and adapted practice
          </p>
        </header>
        {groups.map((group) => (
          <section className="c8-group" key={group.code}>
            <div className="c8-group-label">
              <span>{group.code}</span>
              <h3>{group.title}</h3>
              <p>{group.detail}</p>
            </div>
            <div className="c8-lesson-list">
              {lessons
                .filter((l) => l.number >= group.from && l.number <= group.to)
                .map((lesson) => (
                  <button
                    type="button"
                    key={lesson.id}
                    onClick={() => onOpen(lesson.number)}
                  >
                    <span className="c8-number">
                      {state[lesson.id]?.completed
                        ? "✓"
                        : String(lesson.number).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.subtitle}</small>
                    </div>
                    <span className="c8-row-arrow">→</span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}
function LessonReader({
  lesson,
  state,
  setState,
  present,
  audience,
  userId,
  onOpen,
}: {
  lesson: Lesson;
  state: CourseState;
  setState: Dispatch<SetStateAction<CourseState>>;
  present: boolean;
  audience: Props["audience"];
  userId: string;
  onOpen: (n: number) => void;
}) {
  const [phase, setPhase] = useState(0);
  const [block, setBlock] = useState(0);
  const [check, setCheck] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const record = state[lesson.id] ?? emptyRecord(lesson);
  const update = (fn: (r: RecordState) => RecordState) =>
    setState((current) => ({
      ...current,
      [lesson.id]: fn(current[lesson.id] ?? emptyRecord(lesson)),
    }));
  useEffect(() => {
    if (phase === 1 && !present)
      setState((current) => {
        const r = current[lesson.id] ?? emptyRecord(lesson);
        return r.seen.includes(block)
          ? current
          : { ...current, [lesson.id]: { ...r, seen: [...r.seen, block] } };
      });
  }, [phase, block, lesson, present, setState]);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    contentRef.current?.focus({ preventScroll: true });
    contentRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [phase, block, check]);
  const next = () => {
    if (phase === 1 && block < lesson.blocks.length - 1) setBlock((n) => n + 1);
    else if (phase === 3 && check < lesson.checks.length - 1)
      setCheck((n) => n + 1);
    else setPhase((p) => Math.min(4, p + 1));
  };
  const prev = () => {
    if (phase === 1 && block > 0) setBlock((n) => n - 1);
    else if (phase === 3 && check > 0) setCheck((n) => n - 1);
    else setPhase((p) => Math.max(0, p - 1));
  };
  useEffect(() => {
    if (!present) return;
    const handler = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          "input,textarea,select,button,summary,a",
        )
      )
        return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        next();
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const finish = async () => {
    if (!readyToComplete(lesson, record) || saving) return;
    setSaving(true);
    setError("");
    try {
      if (audience === "student")
        await api<LessonProgress>("/content/lessons/progress", {
          method: "PUT",
          body: JSON.stringify({
            courseCode: "9618",
            chapterNo: 8,
            slideId: lesson.id,
            completed: true,
          }),
        });
      update((r) => ({ ...r, completed: true }));
    } catch {
      setError(
        "Progress could not sync. Your answers remain on this device. Retry when connected.",
      );
    } finally {
      setSaving(false);
    }
  };
  const missing = [
    record.seen.length < lesson.blocks.length
      ? `Read ${lesson.blocks.length - record.seen.length} remaining concept screens`
      : null,
    !taskReady(lesson.worked, record.worked)
      ? "Finish the worked practice and self-check"
      : null,
    !lesson.checks.every((task, i) => taskReady(task, record.checks[i]))
      ? "Finish or revise the checks"
      : null,
    !record.recap ? "Confirm the recap" : null,
  ].filter(Boolean);
  return (
    <div className="c8-reader-layout">
      <aside className="c8-outline">
        <span className="c8-kicker">CHAPTER CONTENTS</span>
        {groups.map((group) => (
          <section key={group.code}>
            <h3>
              {group.code} · {group.title}
            </h3>
            {lessons
              .filter((l) => l.number >= group.from && l.number <= group.to)
              .map((l) => (
                <button
                  type="button"
                  aria-current={l.number === lesson.number ? "page" : undefined}
                  key={l.id}
                  onClick={() => onOpen(l.number)}
                >
                  <span>
                    {state[l.id]?.completed
                      ? "✓"
                      : String(l.number).padStart(2, "0")}
                  </span>
                  {l.title}
                </button>
              ))}
          </section>
        ))}
      </aside>
      <main className="c8-reader">
        <header className="c8-lesson-heading">
          <span className="c8-kicker">
            {lesson.section} · LESSON {String(lesson.number).padStart(2, "0")} /
            14
          </span>
          <h1>{lesson.title}</h1>
          <p>{lesson.subtitle}</p>
        </header>
        <nav className="c8-phases" aria-label="Lesson stages">
          {phases.map((p, i) => (
            <button
              type="button"
              key={p}
              aria-current={phase === i ? "step" : undefined}
              onClick={() => setPhase(i)}
            >
              <span>{i + 1}</span>
              {p}
            </button>
          ))}
        </nav>
        <div
          ref={contentRef}
          tabIndex={-1}
          className="c8-screen"
          key={lesson.id}
        >
          {phase === 0 ? (
            <>
              <div className="c8-hook">
                <span className="c8-kicker">THINK FIRST</span>
                <h2>{lesson.hook}</h2>
              </div>
              <Visual name={lesson.visual} />
              <section className="c8-objectives">
                <h2>By the end, you can…</h2>
                <ul>
                  {lesson.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <p>
                  To complete: read each concept, attempt the practice, check
                  your answers and finish the recap. Written responses are
                  self-assessed.
                </p>
              </section>
            </>
          ) : null}
          {phase === 1 ? (
            <>
              <div className="c8-concept-nav">
                <span>
                  CONCEPT {block + 1} / {lesson.blocks.length}
                </span>
                <div role="group" aria-label="Concept screens">
                  {lesson.blocks.map((b, i) => (
                    <button
                      type="button"
                      key={b.title}
                      aria-label={`Concept ${i + 1}: ${b.title}`}
                      aria-pressed={block === i}
                      onClick={() => setBlock(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <BlockView block={lesson.blocks[block]} />
              <aside className="c8-mistake">
                <b>Avoid this mistake</b>
                <p>{lesson.mistake}</p>
              </aside>
            </>
          ) : null}
          {phase === 2 ? (
            <TaskCard
              label="WORKED PRACTICE · TRY, THEN COMPARE"
              task={lesson.worked}
              evidence={record.worked}
              onChange={(e) =>
                update((r) => ({ ...r, worked: e, completed: false }))
              }
            />
          ) : null}
          {phase === 3 ? (
            <>
              <div className="c8-concept-nav">
                <span>
                  CHECK {check + 1} / {lesson.checks.length}
                </span>
                <div role="group" aria-label="Assessment tasks">
                  {lesson.checks.map((_, i) => (
                    <button
                      type="button"
                      aria-label={`Check ${i + 1}`}
                      aria-pressed={check === i}
                      key={i}
                      onClick={() => setCheck(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <TaskCard
                label={`CHECK ${check + 1} · ${lesson.number === 14 ? "INDEPENDENT ASSESSMENT" : "RETRIEVE AND APPLY"}`}
                task={lesson.checks[check]}
                evidence={record.checks[check]}
                onChange={(e) =>
                  update((r) => ({
                    ...r,
                    checks: r.checks.map((x, i) => (i === check ? e : x)),
                    completed: false,
                  }))
                }
              />
            </>
          ) : null}
          {phase === 4 ? (
            <>
              <section className="c8-recap">
                <span className="c8-kicker">TAKE THESE IDEAS WITH YOU</span>
                <h2>Remember the reason.</h2>
                <ul>
                  {lesson.recap.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="c8-next-idea">{lesson.next}</p>
              </section>
              {lesson.terms.length ? (
                <section>
                  <h2>Key terms in this lesson</h2>
                  <div className="c8-terms">
                    {terms
                      .filter((t) => lesson.terms.includes(t.name))
                      .map((t) => (
                        <article key={t.name}>
                          <h3>{t.name}</h3>
                          <p>{t.definition}</p>
                          <p className="c8-term-example">{t.example}</p>
                        </article>
                      ))}
                  </div>
                </section>
              ) : null}
              <section className="c8-completion">
                <h2>
                  {record.completed ? "Lesson completed" : "Finish this lesson"}
                </h2>
                <p>
                  {
                    lesson.checks.filter((t, i) =>
                      firstAttemptCorrect(t, record.checks[i]),
                    ).length
                  }{" "}
                  / {lesson.checks.filter((t) => t.kind === "choice").length}{" "}
                  choice checks correct on the independent first attempt.
                  Written answers are self-assessed; completion is not a mastery
                  grade.
                </p>
                <label className="c8-criterion">
                  <input
                    type="checkbox"
                    checked={record.recap}
                    onChange={(e) =>
                      update((r) => ({
                        ...r,
                        recap: e.target.checked,
                        completed: false,
                      }))
                    }
                  />
                  I can explain the recap and have reviewed the key terms.
                </label>
                {!present ? (
                  <>
                    <button
                      type="button"
                      className="c8-button c8-button--primary"
                      disabled={
                        !readyToComplete(lesson, record) ||
                        saving ||
                        record.completed
                      }
                      onClick={finish}
                    >
                      {record.completed
                        ? "✓ Completed"
                        : saving
                          ? "Saving…"
                          : "Complete lesson"}
                    </button>
                    {missing.length && !record.completed ? (
                      <p className="c8-pending">
                        <strong>Still to do:</strong> {missing.join(" · ")}
                      </p>
                    ) : null}
                    {error ? <p role="alert">{error}</p> : null}
                  </>
                ) : (
                  <p>
                    Presentation rehearsal does not submit student progress.
                  </p>
                )}
              </section>
            </>
          ) : null}
        </div>
        <footer className="c8-reader-footer">
          <button
            type="button"
            className="c8-button"
            disabled={phase === 0}
            onClick={prev}
          >
            ← Previous
          </button>
          <span>
            {phases[phase]}
            {phase === 1
              ? ` · ${block + 1}/${lesson.blocks.length}`
              : phase === 3
                ? ` · ${check + 1}/${lesson.checks.length}`
                : ""}
          </span>
          {phase === 4 ? (
            <button
              type="button"
              className="c8-button c8-button--primary"
              onClick={() =>
                lesson.number < 14
                  ? onOpen(lesson.number + 1)
                  : navigate(courseUrl(audience))
              }
            >
              {lesson.number < 14 ? "Next lesson →" : "Chapter overview"}
            </button>
          ) : (
            <button
              type="button"
              className="c8-button c8-button--primary"
              onClick={next}
            >
              Continue →
            </button>
          )}
        </footer>
        <details className="c8-source">
          <summary>Source and teaching notes</summary>
          <p>
            Hodder Education · Chapter 8 · printed pages{" "}
            {lesson.pages.join(", ")}.
          </p>
          <p>
            {lesson.sourceRefs.join(" · ")}. Explanations and tasks are
            rewritten for learning. The school example uses consistent synthetic
            values; sample rows vary between the normalisation and SQL
            exercises.
          </p>
          <p>
            SQL corrections: commas between SELECT columns; quoted literals; ISO
            date strings; consistent LicenceNumber; retain Student.ClassID;
            DELETE removes rows, not the table definition. Repeated teacher keys
            and the duplicate Maths label in Table 8.11 are not reproduced.
          </p>
          <p>
            Technical references:{" "}
            <a
              href="https://www.sqlite.org/lang_aggfunc.html"
              target="_blank"
              rel="noreferrer"
            >
              SQLite aggregates
            </a>{" "}
            ·{" "}
            <a
              href="https://www.sqlite.org/foreignkeys.html"
              target="_blank"
              rel="noreferrer"
            >
              Foreign keys
            </a>{" "}
            ·{" "}
            <a
              href="https://www.sqlite.org/lang_altertable.html"
              target="_blank"
              rel="noreferrer"
            >
              ALTER TABLE
            </a>{" "}
            ·{" "}
            <a
              href="https://dev.mysql.com/doc/refman/8.4/en/create-database.html"
              target="_blank"
              rel="noreferrer"
            >
              MySQL CREATE DATABASE
            </a>
          </p>
        </details>
      </main>
    </div>
  );
}
export function Chapter8Course({ audience, userId }: Props) {
  const route = useRoute();
  const present =
    audience === "teacher" && route.params.get("mode") === "present";
  const lesson = resolveLesson(route.params) ?? (present ? lessons[0] : null);
  const [state, setState] = useState<CourseState>(() =>
    loadState(storageKey(userId)),
  );
  const [glossary, setGlossary] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const root = useRef<HTMLElement>(null);
  const glossaryButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (present) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state, userId, present]);
  const open = (n: number) => {
    setGlossary(false);
    navigate(courseUrl(audience, n, present ? "present" : "study"));
  };
  useEffect(() => {
    root.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [lesson?.number, glossary]);
  const closeGlossary = () => {
    setGlossary(false);
    requestAnimationFrame(() => glossaryButton.current?.focus());
  };
  return (
    <section
      ref={root}
      className={"c8-course" + (present ? " c8-present" : "")}
    >
      <header className="c8-topbar">
        <button
          type="button"
          className="c8-brand"
          onClick={() => {
            setGlossary(false);
            navigate(courseUrl(audience));
          }}
        >
          <span>08</span>
          <b>Databases</b>
        </button>
        <nav aria-label="Chapter tools">
          <button
            type="button"
            onClick={() =>
              navigate(
                `${audience === "student" ? "oquvchi" : "oqitish"}/darslar`,
              )
            }
          >
            All lessons
          </button>
          <button
            type="button"
            ref={glossaryButton}
            aria-pressed={glossary}
            onClick={() => setGlossary(!glossary)}
          >
            Key terms <span>33</span>
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(courseUrl(audience, lesson?.number ?? 1, "exam"))
            }
          >
            Past Papers
          </button>
          {audience === "teacher" ? (
            <button
              type="button"
              onClick={() => {
                if (present && document.fullscreenElement)
                  void document.exitFullscreen().catch(() => {});
                navigate(
                  courseUrl(
                    audience,
                    lesson?.number ?? 1,
                    present ? "study" : "present",
                  ),
                );
              }}
            >
              {present ? "Exit presentation" : "Present"}
            </button>
          ) : null}
          {present ? (
            <button
              type="button"
              onClick={() =>
                void root.current?.requestFullscreen?.().catch(() => {})
              }
            >
              Full screen
            </button>
          ) : null}
        </nav>
      </header>
      {storageError ? (
        <p className="c8-storage-warning" role="alert">
          Answers cannot be saved on this device. Keep this tab open; local
          storage may be full or disabled.
        </p>
      ) : null}
      {glossary ? (
        <Glossary onClose={closeGlossary} onOpenLesson={open} />
      ) : lesson ? (
        <LessonReader
          key={`${userId}:${lesson.id}:${present}`}
          lesson={lesson}
          state={state}
          setState={setState}
          present={present}
          audience={audience}
          userId={userId}
          onOpen={open}
        />
      ) : (
        <CourseOverview state={state} audience={audience} onOpen={open} />
      )}
      <footer className="c8-bottom">
        CAMBRIDGE ONLINE{" "}
        <span>Chapter 08 · Databases · Hodder-based learning</span>
      </footer>
    </section>
  );
}
