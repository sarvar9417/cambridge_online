export interface ContentInput {
  notes: string;
  learningObjectiveKeywords: string[][];
  glossary: Array<{ term: string; definitionEn: string }>;
  officialText: string;
  flashcards: Array<{ front: string }>;
  quiz: Array<{ options: string[]; correctIds: number[] }>;
  englishTerms: string[];
  allowedTerms: string[];
}
export interface ContentFinding {
  code: `C${string}`;
  message: string;
}
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const sim = (a: string, b: string) => {
  const x = new Set(norm(a).split(' ')),
    y = new Set(norm(b).split(' '));
  const inter = [...x].filter((v) => y.has(v)).length;
  return inter / Math.max(1, new Set([...x, ...y]).size);
};
export function validateContent(x: ContentInput) {
  const f: ContentFinding[] = [];
  const add = (code: ContentFinding['code'], message: string) => f.push({ code, message });
  const words = x.notes.trim().split(/\s+/).filter(Boolean).length;
  if (words < 600 || words > 1500) add('C01', 'Notes length must be 600-1500 words.');
  if (
    x.learningObjectiveKeywords.some((group) => !group.some((k) => norm(x.notes).includes(norm(k))))
  )
    add('C02', 'A learning objective is not covered.');
  if (x.glossary.some((g) => !norm(x.notes).includes(norm(g.term))))
    add('C03', 'A glossary term is absent from notes.');
  if (
    x.glossary.some(
      (g) =>
        Math.max(
          ...norm(x.officialText)
            .split(/[.!?]/)
            .map((part) => sim(part, g.definitionEn)),
        ) < 0.9,
    )
  )
    add('C04', 'A definition is not grounded in official text.');
  if (x.flashcards.length < 8 || x.flashcards.length > 25)
    add('C05', 'Flashcard count must be 8-25.');
  if (
    x.flashcards.some((a, i) => x.flashcards.some((b, j) => j > i && sim(a.front, b.front) >= 0.9))
  )
    add('C06', 'Flashcard fronts are duplicated.');
  if (
    x.quiz.some(
      (q) =>
        q.correctIds.length < 1 ||
        q.correctIds.some((id) => id < 0 || id >= q.options.length) ||
        new Set(q.correctIds).size !== q.correctIds.length,
    )
  )
    add('C07', 'Quiz correct_ids are invalid.');
  if (x.quiz.some((q) => new Set(q.options.map(norm)).size !== q.options.length))
    add('C08', 'Quiz options are duplicated.');
  const allowed = new Set(x.glossary.map((g) => norm(g.term)));
  if (x.englishTerms.some((t) => !allowed.has(norm(t))))
    add('C09', 'An English term is missing from glossary.');
  const syllabus = new Set(x.allowedTerms.map(norm));
  if (x.englishTerms.some((t) => !syllabus.has(norm(t))))
    add('C10', 'A term is outside the syllabus.');
  return f;
}
