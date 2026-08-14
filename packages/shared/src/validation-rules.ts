export type Severity = 'error' | 'warning';
export interface Finding {
  code: `V${string}`;
  severity: Severity;
  message: string;
}
export interface ValidationInput {
  componentTotal: number;
  questions: Array<{
    id: string;
    path: string;
    parentId: string | null;
    marks: number | null;
    stem: string;
    commandWord: string | null;
    answerKind: string;
    answerLines: number | null;
    assetCount: number;
    subtopicConfidences: number[];
    extractConfidence: number;
  }>;
  schemes: Array<{
    questionId: string;
    type: string;
    maxMarks: number;
    points: number[];
    nRequired?: number;
    groupMaxMarks?: number;
    levels?: number;
  }>;
  assets: Array<{ storagePath: string; size: number }>;
  duplicateSimilarity?: number;
}
const ranges: Record<string, [number, number]> = {
  State: [1, 2],
  Give: [1, 2],
  Name: [1, 2],
  Identify: [1, 2],
  Define: [1, 3],
  Describe: [2, 5],
  Explain: [2, 5],
  Compare: [2, 6],
  Calculate: [1, 5],
  Complete: [1, 6],
  Draw: [1, 5],
  Write: [3, 15],
  Evaluate: [4, 12],
  Justify: [1, 5],
  Suggest: [1, 5],
  Show: [1, 5],
  Other: [1, 20],
};
export function validateExtraction(x: ValidationInput) {
  const f: Finding[] = [];
  const add = (code: Finding['code'], severity: Severity, message: string) =>
    f.push({ code, severity, message });
  const ids = new Set(x.questions.map((q) => q.id));
  const leaves = x.questions.filter((q) => !x.questions.some((c) => c.parentId === q.id));
  for (const s of x.schemes) {
    const sum = s.points.reduce((a, b) => a + b, 0);
    if (sum < s.maxMarks || (s.type === 'all_required' && sum !== s.maxMarks))
      add('V01', 'error', 'Mark scheme point totals do not cover max marks.');
    if (!ids.has(s.questionId)) add('V04', 'error', 'Mark scheme has no matching question.');
    if (s.type === 'any_n_from_m' && s.points.length <= (s.nRequired ?? 0))
      add('V05', 'error', 'Any-N group needs more points than required.');
    if (s.type === 'any_n_from_m' && (s.groupMaxMarks ?? 0) > s.maxMarks)
      add('V06', 'error', 'Group marks exceed scheme marks.');
    if (s.type === 'levels_of_response' && !(s.levels ?? 0))
      add('V20', 'error', 'Levels scheme has no levels.');
  }
  if (leaves.reduce((a, q) => a + (q.marks ?? 0), 0) !== x.componentTotal)
    add('V02', 'error', 'Leaf marks do not equal component total.');
  for (const q of leaves)
    if (!x.schemes.some((s) => s.questionId === q.id))
      add('V03', 'error', 'Leaf question has no mark scheme.');
  for (const q of x.questions) {
    const hasChildren = x.questions.some((c) => c.parentId === q.id);
    if ((hasChildren && q.marks !== null) || (!hasChildren && q.marks === null))
      add('V07', 'error', 'Question tree marks are inconsistent.');
    const parentPath = q.path.includes('.') ? q.path.split('.').slice(0, -1).join('.') : null;
    if (parentPath && !x.questions.some((p) => p.path === parentPath))
      add('V08', 'error', 'Question parent path is missing.');
    if (q.answerKind === 'diagram' && q.assetCount < 1)
      add('V10', 'error', 'Diagram question has no asset.');
    const range = q.commandWord ? ranges[q.commandWord] : undefined;
    if (!hasChildren && !range) add('V12', 'warning', 'Command word is missing or invalid.');
    if (range && q.marks !== null) {
      const [a, b] = range;
      if (q.marks < a || q.marks > b) add('V13', 'warning', 'Command word and marks are unusual.');
    }
    if (
      !hasChildren &&
      q.answerKind === 'text' &&
      q.marks !== null &&
      (q.answerLines ?? 0) < q.marks
    )
      add('V14', 'warning', 'Answer lines are fewer than marks.');
    if (!q.subtopicConfidences.length) add('V15', 'error', 'Question has no subtopic.');
    if (q.subtopicConfidences.some((c) => c < 0.7))
      add('V16', 'warning', 'Subtopic confidence is low.');
    if (q.stem.length < 10 || q.stem.length > 3000)
      add('V17', 'warning', 'Stem length is unusual.');
    if (q.extractConfidence < 0.8) add('V18', 'error', 'Extraction confidence is low.');
  }
  const roots = x.questions.map((q) => Number(q.path.split('.')[0])).filter(Number.isFinite);
  if (roots.length) {
    const unique = [...new Set(roots)];
    for (let n = Math.min(...unique); n <= Math.max(...unique); n++)
      if (!unique.includes(n)) {
        add('V09', 'warning', 'Question numbering has a gap.');
        break;
      }
  }
  if (x.assets.some((a) => !a.storagePath || a.size <= 2048))
    add('V11', 'error', 'Asset is missing or too small.');
  if ((x.duplicateSimilarity ?? 0) >= 0.95)
    add('V19', 'warning', 'Question is a likely duplicate.');
  return f;
}
