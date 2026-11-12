import data from "./course.json";
export type Table = { headers: string[]; rows: (string | number)[][] };
export type Block = {
  kind: "text" | "table" | "code" | "steps";
  title: string;
  text?: string;
  uz?: string;
  note?: string;
  headers?: string[];
  rows?: string[][];
  items?: { title: string; text: string }[];
};
export type Task = {
  kind: "choice" | "written";
  prompt: string;
  options?: string[];
  correct?: number;
  why?: string;
  answer?: string;
  criteria?: string[];
};
export type Term = {
  name: string;
  definition: string;
  example: string;
  lesson: number;
  page: number;
};
export type Lesson = {
  id: string;
  number: number;
  section: string;
  title: string;
  subtitle: string;
  pages: number[];
  sourceRefs: string[];
  objectives: string[];
  hook: string;
  blocks: Block[];
  worked: Task;
  checks: Task[];
  recap: string[];
  mistake: string;
  next: string;
  visual: string;
  terms: string[];
};
export const lessons = data.lessons as Lesson[];
export const terms = data.terms as Term[];
export const queries = data.queries;
export const groups = [
  {
    code: "8.1",
    title: "Database concepts",
    detail: "Design the data",
    from: 1,
    to: 7,
  },
  {
    code: "8.2",
    title: "Database management systems",
    detail: "Manage and protect it",
    from: 8,
    to: 9,
  },
  {
    code: "8.3",
    title: "DDL & DML",
    detail: "Build it. Query it.",
    from: 10,
    to: 13,
  },
  {
    code: "Review",
    title: "Chapter assessment",
    detail: "Put it all together",
    from: 14,
    to: 14,
  },
];
export type Evidence = {
  draft: string;
  choice?: number;
  first?: string;
  firstChoice?: number;
  guided?: boolean;
  revealed?: boolean;
  submitted?: boolean;
  criteria: number[];
};
export type RecordState = {
  seen: number[];
  worked: Evidence;
  checks: Evidence[];
  recap: boolean;
  completed: boolean;
};
export type CourseState = Record<string, RecordState>;
export const emptyEvidence = (): Evidence => ({ draft: "", criteria: [] });
export const emptyRecord = (lesson: Lesson): RecordState => ({
  seen: [],
  worked: emptyEvidence(),
  checks: lesson.checks.map(emptyEvidence),
  recap: false,
  completed: false,
});
export function taskReady(task: Task, e: Evidence) {
  return Boolean(
    e.submitted &&
    (task.kind === "choice"
      ? e.choice === task.correct
      : e.revealed && task.criteria?.every((_, i) => e.criteria.includes(i))),
  );
}
export function readyToComplete(lesson: Lesson, record: RecordState) {
  return (
    record.seen.length === lesson.blocks.length &&
    taskReady(lesson.worked, record.worked) &&
    lesson.checks.every((task, i) =>
      taskReady(task, record.checks[i] ?? emptyEvidence()),
    ) &&
    record.recap
  );
}
export function firstAttemptCorrect(task: Task, e: Evidence) {
  return (
    task.kind === "choice" &&
    e.first !== undefined &&
    !e.guided &&
    e.firstChoice === task.correct
  );
}
export function loadState(key: string): CourseState {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (!raw || typeof raw !== "object") return {};
    const clean: CourseState = {};
    const readEvidence = (x: unknown): Evidence => {
      if (!x || typeof x !== "object") return emptyEvidence();
      const e = x as Partial<Evidence>;
      return {
        draft: typeof e.draft === "string" ? e.draft.slice(0, 12000) : "",
        choice: Number.isInteger(e.choice) ? e.choice : undefined,
        first: typeof e.first === "string" ? e.first : undefined,
        firstChoice: Number.isInteger(e.firstChoice)
          ? e.firstChoice
          : undefined,
        guided: e.guided === true,
        revealed: e.revealed === true,
        submitted: e.submitted === true,
        criteria: Array.isArray(e.criteria)
          ? e.criteria.filter((n) => Number.isInteger(n) && n >= 0)
          : [],
      };
    };
    for (const lesson of lessons) {
      const r = raw[lesson.id];
      if (!r || typeof r !== "object") continue;
      const checks = lesson.checks.map((_, i) => readEvidence(r.checks?.[i]));
      const record = {
        seen: Array.isArray(r.seen)
          ? [
              ...new Set<number>(
                r.seen.filter(
                  (n: number) =>
                    Number.isInteger(n) && n >= 0 && n < lesson.blocks.length,
                ),
              ),
            ]
          : [],
        worked: readEvidence(r.worked),
        checks,
        recap: r.recap === true,
        completed: false,
      };
      clean[lesson.id] = {
        ...record,
        completed: r.completed === true && readyToComplete(lesson, record),
      };
    }
    return clean;
  } catch {
    return {};
  }
}
export function storageKey(userId: string) {
  return `campath:chapter8:v1:${userId}`;
}
export function resolveLesson(params: URLSearchParams) {
  const n = Number(params.get("lesson"));
  if (Number.isInteger(n) && n >= 1 && n <= lessons.length)
    return lessons[n - 1];
  const topic = params.get("topic");
  if (topic && topic !== "overview")
    return lessons.find((l) => l.section === topic) ?? null;
  return null;
}
