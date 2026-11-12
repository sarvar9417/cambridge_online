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
        <>
          <DataTable
            caption={block.title}
            headers={block.headers ?? []}
            rows={block.rows ?? []}
          />
          {block.text ? <p>{block.text}</p> : null}
        </>
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
      {block.relatedTable ? <DataTable {...block.relatedTable} /> : null}
      {block.visual ? <Visual name={block.visual} /> : null}
      {block.remember ? (
        <p className="c8-remember">
          <b>Remember</b>
          {block.remember}
        </p>
      ) : null}
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
            {e.first === undefined ? "Check my answer" : "Check revised answer"}
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
            <em>Start with one table.</em>
          </h1>
          <p>
            One school example, one idea at a time. Read a simple table, connect
            related facts, then learn how to design and query a database.
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
        <div className="c8-hero-art c8-hero-example">
          <span className="c8-kicker">YOUR FIRST EXAMPLE</span>
          <DataTable
            caption="Student"
            headers={["StudentID", "FirstName", "ClassID"]}
            rows={[
              ["S1276", "Noor", "7A"],
              ["S1277", "Ahmad", "7B"],
            ]}
          />
          <p>
            One row. One student.
            <br />
            Start here — the rest builds on this.
          </p>
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
          {audience === "student" ? "lessons studied" : "lessons studied"}
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
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const record = state[lesson.id] ?? emptyRecord(lesson);
  const exampleStep = lesson.blocks.length;
  const checkStart = exampleStep + 1;
  const lastStep = checkStart + lesson.checks.length;
  const checkIndex = step - checkStart;
  const isCheck = checkIndex >= 0 && checkIndex < lesson.checks.length;
  const stage =
    step < exampleStep
      ? "Understand"
      : step === exampleStep
        ? "Worked example"
        : isCheck
          ? "Try it"
          : "Remember";
  const update = (fn: (r: RecordState) => RecordState) =>
    setState((current) => ({
      ...current,
      [lesson.id]: fn(current[lesson.id] ?? emptyRecord(lesson)),
    }));
  useEffect(() => {
    if (step < lesson.blocks.length && !present)
      setState((current) => {
        const r = current[lesson.id] ?? emptyRecord(lesson);
        return r.seen.includes(step)
          ? current
          : { ...current, [lesson.id]: { ...r, seen: [...r.seen, step] } };
      });
  }, [step, lesson, present, setState]);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    contentRef.current?.focus({ preventScroll: true });
    contentRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);
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
        setStep((s) => Math.min(lastStep, s + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [present, lastStep]);
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
        "Progress could not sync. Your answers remain on this device. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  };
  const missingReading = lesson.blocks.findIndex(
    (_, i) => !record.seen.includes(i),
  );
  const missingCheck = lesson.checks.findIndex(
    (_, i) => !record.checks[i]?.submitted,
  );
  const choiceCount = lesson.checks.filter((t) => t.kind === "choice").length;
  return (
    <div className="c8-reader-layout c8-linear">
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
        <div className="c8-reading-progress">
          <span>{stage}</span>
          <span>
            Step {step + 1} of {lastStep + 1}
          </span>
          <progress
            aria-label="Position in lesson"
            value={step + 1}
            max={lastStep + 1}
          />
        </div>
        <div ref={contentRef} tabIndex={-1} className="c8-screen">
          {step < exampleStep ? (
            <BlockView key={step} block={lesson.blocks[step]} />
          ) : null}
          {step === exampleStep ? (
            <section className="c8-worked-example">
              <span className="c8-kicker">LET’S WORK THROUGH ONE</span>
              <h2>{lesson.worked.prompt}</h2>
              <div>
                <b>Explanation</b>
                <p>{lesson.worked.answer}</p>
              </div>
              <p className="c8-code-note">
                Next, try a short question yourself. You can return to this
                explanation.
              </p>
            </section>
          ) : null}
          {isCheck ? (
            <TaskCard
              key={checkIndex}
              label={`QUESTION ${checkIndex + 1} OF ${lesson.checks.length}`}
              task={lesson.checks[checkIndex]}
              evidence={record.checks[checkIndex]}
              onChange={(e) =>
                update((r) => ({
                  ...r,
                  checks: r.checks.map((x, i) => (i === checkIndex ? e : x)),
                  completed: false,
                }))
              }
            />
          ) : null}
          {step === lastStep ? (
            <>
              <section className="c8-recap">
                <span className="c8-kicker">THE MAIN IDEAS</span>
                <h2>What to remember</h2>
                <ul>
                  {lesson.recap.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="c8-next-idea">{lesson.next}</p>
              </section>
              {lesson.terms.length ? (
                <details className="c8-review-terms">
                  <summary>
                    Review this lesson’s {lesson.terms.length} key terms
                  </summary>
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
                </details>
              ) : null}
              {!present ? (
                <section className="c8-completion">
                  <h2>
                    {record.completed ? "Lesson studied" : "Save your progress"}
                  </h2>
                  {choiceCount > 0 ? (
                    <p>
                      {
                        lesson.checks.filter((t, i) =>
                          firstAttemptCorrect(t, record.checks[i]),
                        ).length
                      }{" "}
                      / {choiceCount} choice questions correct on your first
                      independent attempt.
                    </p>
                  ) : null}
                  <p>
                    This records study, not mastery. Review the explanation for
                    any answer you missed.
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
                    I have reviewed the main ideas and my answers.
                  </label>
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
                      ? "✓ Studied"
                      : saving
                        ? "Saving…"
                        : "Mark as studied"}
                  </button>
                  {missingReading >= 0 ? (
                    <button
                      type="button"
                      className="c8-link"
                      onClick={() => setStep(missingReading)}
                    >
                      Return to the unread explanation →
                    </button>
                  ) : null}
                  {missingCheck >= 0 ? (
                    <button
                      type="button"
                      className="c8-link"
                      onClick={() => setStep(checkStart + missingCheck)}
                    >
                      Try question {missingCheck + 1} →
                    </button>
                  ) : null}
                  {error ? <p role="alert">{error}</p> : null}
                </section>
              ) : (
                <p>Discuss the recap with the class before moving on.</p>
              )}
            </>
          ) : null}
        </div>
        <footer className="c8-reader-footer">
          <button
            type="button"
            className="c8-button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            ← Previous
          </button>
          <span>
            {step + 1} / {lastStep + 1}
          </span>
          <button
            type="button"
            className="c8-button c8-button--primary"
            onClick={() =>
              step < lastStep
                ? setStep((s) => s + 1)
                : lesson.number < 14
                  ? onOpen(lesson.number + 1)
                  : navigate(courseUrl(audience))
            }
          >
            {step < lastStep
              ? "Next →"
              : lesson.number < 14
                ? "Next lesson →"
                : "Chapter overview"}
          </button>
        </footer>
        <section className="c8-deeper-study" aria-label="Further study">
          <details>
            <summary>
              {lesson.number === 11
                ? "Full school SQL and further explanations"
                : "Full explanations and further examples"}
            </summary>
            <p>
              Use these after the short walkthrough to study the complete topic
              in more detail.
            </p>
            {lesson.details.map((b, i) => (
              <details key={i}>
                <summary>{b.title}</summary>
                <BlockView block={b} />
              </details>
            ))}
          </details>
          <details>
            <summary>More practice — explain and apply</summary>
            {[lesson.extension.worked, ...lesson.extension.checks].map(
              (task, i) => (
                <article key={i} className="c8-extension-task">
                  <h3>{task.prompt}</h3>
                  {task.options ? (
                    <ol>
                      {task.options.map((option) => (
                        <li key={option}>{option}</li>
                      ))}
                    </ol>
                  ) : null}
                  <details>
                    <summary>Compare with the answer</summary>
                    <p>{task.answer ?? task.options?.[task.correct ?? -1]}</p>
                    {task.why ? <p>{task.why}</p> : null}
                  </details>
                </article>
              ),
            )}
          </details>
          <details className="c8-source">
            <summary>
              Source notes · Hodder pp.{Math.min(...lesson.pages)}–
              {Math.max(...lesson.pages)}
            </summary>
            <p>
              Hodder Education, Chapter 8. Printed pages{" "}
              {lesson.pages.join(", ")}. {lesson.sourceRefs.join(" · ")}.
            </p>
            <p>
              Explanations and practice are adapted for learning. Small examples
              isolate one idea before the complete school design. The full
              school SQL uses consistent illustrative records.
            </p>
            <p>
              Printed errors corrected: consistent LicenceNumber;
              Student.ClassID retained; unique teacher keys; commas between
              SELECT columns; quoted text and dates; DELETE removes rows, not
              the table definition. SQL support varies by DBMS.
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
        </section>
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
