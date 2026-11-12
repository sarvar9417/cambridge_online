import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chapter8Course } from "./Chapter8Course";
import {
  emptyRecord,
  firstAttemptCorrect,
  lessons,
  loadState,
  readyToComplete,
  resolveLesson,
  storageKey,
  taskReady,
  terms,
  type Evidence,
} from "./model";
vi.mock("../../lib/api", () => ({
  api: vi.fn().mockResolvedValue({ slideId: "h8-rewrite-v1-01" }),
}));
const EXPECTED_TERMS = [
  "Database",
  "Relational database",
  "Table",
  "Record",
  "Field",
  "Tuple",
  "Entity",
  "Attribute",
  "Candidate key",
  "Primary key",
  "Secondary key",
  "Foreign key",
  "Relationship",
  "Referential integrity",
  "Index",
  "Entity-relationship (E-R) model or E-R diagram",
  "Normalisation",
  "First normal form (1NF)",
  "Second normal form (2NF)",
  "Third normal form (3NF)",
  "Composite key",
  "Database management system (DBMS)",
  "Data management",
  "Data dictionary",
  "Data modelling",
  "Logical schema",
  "Access rights",
  "Developer interface",
  "Structured query language (SQL)",
  "Query processor",
  "Data definition language (DDL)",
  "Data manipulation language (DML)",
  "SQL script",
];
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  localStorage.clear();
  window.location.hash = "oqitish/darslar?course=9618&chapter=8";
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
function render(userId = "test-user") {
  act(() => root.render(<Chapter8Course audience="teacher" userId={userId} />));
}
function click(text: string) {
  const button = Array.from(host.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  );
  expect(button, text).toBeTruthy();
  act(() => button!.click());
}
describe("Chapter 8 source-backed course", () => {
  it("accounts for every key term in the three source boxes and every printed page", () => {
    expect(terms.map((t) => t.name).sort()).toEqual(EXPECTED_TERMS.sort());
    expect(new Set(lessons.flatMap((l) => l.pages))).toEqual(
      new Set(Array.from({ length: 21 }, (_, i) => 196 + i)),
    );
    for (const term of terms) {
      expect(lessons[term.lesson - 1].terms).toContain(term.name);
      expect(term.example.length).toBeGreaterThan(20);
    }
  });
  it("has a continuous 14-lesson route and a six-task transfer assessment", () => {
    expect(lessons.map((l) => l.number)).toEqual(
      Array.from({ length: 14 }, (_, i) => i + 1),
    );
    expect(lessons[13].checks).toHaveLength(6);
    expect(lessons.slice(0, 7).every((l) => l.section === "8.1")).toBe(true);
    expect(lessons.slice(7, 9).every((l) => l.section === "8.2")).toBe(true);
    expect(lessons.slice(9, 13).every((l) => l.section === "8.3")).toBe(true);
  });
  it("does not complete a lesson with unattempted or only-revealed tasks", () => {
    const l = lessons[0];
    const r = emptyRecord(l);
    r.seen = l.blocks.map((_, i) => i);
    r.recap = true;
    r.worked.revealed = true;
    expect(readyToComplete(l, r)).toBe(false);
    r.worked = {
      draft: "answer",
      first: "answer",
      submitted: true,
      revealed: true,
      criteria: l.worked.criteria!.map((_, i) => i),
    };
    r.checks = l.checks.map((t) => ({
      draft: "answer",
      first: "answer",
      submitted: true,
      revealed: true,
      criteria: t.criteria?.map((_, i) => i) ?? [],
      choice: t.correct,
    }));
    expect(readyToComplete(l, r)).toBe(true);
    r.seen = [];
    expect(readyToComplete(l, r)).toBe(false);
  });
  it("preserves a wrong first attempt when a corrected retry succeeds", () => {
    const t = lessons[0].checks[0];
    const e: Evidence = {
      draft: "",
      first: "wrong",
      firstChoice: 0,
      choice: t.correct,
      revealed: true,
      submitted: true,
      criteria: [],
    };
    expect(taskReady(t, e)).toBe(true);
    expect(firstAttemptCorrect(t, e)).toBe(false);
    expect(
      firstAttemptCorrect(t, { ...e, firstChoice: t.correct, guided: true }),
    ).toBe(false);
  });
  it("handles malformed saved state and separates user namespaces", () => {
    localStorage.setItem(storageKey("a"), "broken");
    expect(loadState(storageKey("a"))).toEqual({});
    localStorage.setItem(
      storageKey("a"),
      JSON.stringify({
        [lessons[0].id]: { seen: [0, 99, "1", 0], checks: [], completed: true },
      }),
    );
    const state = loadState(storageKey("a"));
    expect(state[lessons[0].id].seen).toEqual([0]);
    expect(state[lessons[0].id].completed).toBe(false);
    expect(loadState(storageKey("b"))).toEqual({});
  });
  it("resolves deep links and the older topic links without crossing courses", () => {
    expect(resolveLesson(new URLSearchParams("lesson=12"))?.number).toBe(12);
    expect(resolveLesson(new URLSearchParams("topic=8.2"))?.number).toBe(8);
    expect(resolveLesson(new URLSearchParams("lesson=999"))).toBeNull();
  });
  it("renders all lessons and the searchable glossary", () => {
    render();
    expect(host.querySelectorAll(".c8-lesson-list button")).toHaveLength(14);
    click("Key terms");
    expect(host.querySelectorAll(".c8-terms article")).toHaveLength(33);
    expect(host.textContent).toContain("Referential integrity");
  });
  it("keeps learner completion gated and provides the interactive foreign-key explanation", () => {
    window.location.hash = "oqitish/darslar?chapter=8&lesson=4";
    render();
    const select = host.querySelector("select")!;
    act(() => {
      select.value = "9Z";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.textContent).toContain("No matching parent key");
    click("Recap");
    expect(
      (
        Array.from(host.querySelectorAll("button")).find(
          (b) => b.textContent === "Complete lesson",
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
