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
  it("records study after reading, attempts and recap without requiring a perfect score", () => {
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
    r.checks[0].choice = 0;
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
  it("keeps previous question evidence archived instead of reusing it for rewritten checks", () => {
    for (const version of ["v1", "v2", "v3", "v4"]) {
      const oldKey = storageKey("legacy").replace(":v5:", `:${version}:`);
      const oldValue = JSON.stringify({
        [lessons[0].id]: { seen: [0], checks: [{ first: "old answer" }] },
      });
      localStorage.setItem(oldKey, oldValue);
      expect(loadState(storageKey("legacy"))).toEqual({});
      expect(localStorage.getItem(oldKey)).toBe(oldValue);
    }
  });
  it("retains the class filter explorer after the SELECT explanation", () => {
    window.location.hash = "oqitish/darslar?chapter=8&lesson=12";
    render();
    for (let i = 0; i < 5; i++) click("Next →");
    const select = host.querySelector(
      'select[aria-label="Filter by class"]',
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    act(() => {
      select.value = "7B";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    click("Reveal expected rows");
    const result = host.querySelector(
      '.c8-screen [aria-label="Students in 7B"]',
    );
    expect(result?.textContent).toContain("Ahmad");
    expect(result?.querySelectorAll("tbody tr")).toHaveLength(1);
  });
  it("retains the two-table DDL explorer after explaining columns and keys", () => {
    window.location.hash = "oqitish/darslar?chapter=8&lesson=11";
    render();
    for (let i = 0; i < 3; i++) click("Next →");
    click("2 · Student table");
    expect(host.querySelector(".c8-screen")?.textContent).toContain(
      "REFERENCES Class(ClassID)",
    );
  });
  it("renders all lessons and the searchable glossary", () => {
    render();
    expect(host.querySelectorAll(".c8-lesson-list button")).toHaveLength(14);
    click("Key terms");
    expect(host.querySelectorAll(".c8-terms article")).toHaveLength(33);
    expect(host.textContent).toContain("Referential integrity");
  });
  it("introduces keys before showing the foreign-key explorer", () => {
    window.location.hash = "oqitish/darslar?chapter=8&lesson=4";
    render();
    expect(host.querySelector("select")).toBeNull();
    expect(host.querySelector(".c8-screen")?.textContent).toContain(
      "Two students can have the same name",
    );
    click("Next →");
    click("Next →");
    click("Next →");
    const select = host.querySelector("select")!;
    act(() => {
      select.value = "9Z";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.textContent).toContain("No matching parent key");
    for (let i = 0; i < 6; i++) click("Next →");
    expect(
      (
        Array.from(host.querySelectorAll("button")).find(
          (b) => b.textContent === "Mark as studied",
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("starts with the actual table and follows a single linear route through example and feedback", () => {
    window.location.hash = "oqitish/darslar?chapter=8&lesson=1";
    render();
    expect(host.querySelector('[aria-label="Lesson stages"]')).toBeNull();
    expect(host.querySelector(".c8-screen table")?.textContent).toContain(
      "Noor",
    );
    click("Next →");
    expect(host.querySelector(".c8-screen")?.textContent).toContain(
      "One row tells us about one student",
    );
    click("← Previous");
    expect(host.querySelector(".c8-screen")?.textContent).toContain(
      "Start with three students",
    );
    for (let i = 0; i < 5; i++) click("Next →");
    expect(host.querySelector(".c8-screen")?.textContent).toContain(
      "The record is the whole row",
    );
    expect(host.querySelector(".c8-screen textarea")).toBeNull();
    click("Next →");
    act(() =>
      (host.querySelector('input[value="0"]') as HTMLInputElement).click(),
    );
    click("Check my answer");
    expect(host.querySelector(".c8-screen")?.textContent).toContain(
      "Review the reason",
    );
    click("Revise answer");
    act(() =>
      (host.querySelector('input[value="1"]') as HTMLInputElement).click(),
    );
    click("Check revised answer");
    click("Next →");
    act(() =>
      (host.querySelector('input[value="2"]') as HTMLInputElement).click(),
    );
    click("Check my answer");
    click("Next →");
    expect(host.querySelector(".c8-screen")?.textContent).toContain(
      "1 / 2 choice questions correct on your first independent attempt.",
    );
    act(() =>
      (
        host.querySelector(
          '.c8-completion input[type="checkbox"]',
        ) as HTMLInputElement
      ).click(),
    );
    click("Mark as studied");
    expect(host.querySelector(".c8-completion")?.textContent).toContain(
      "Lesson studied",
    );
  });
});
