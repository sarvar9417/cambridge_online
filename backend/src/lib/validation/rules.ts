import { findDependencyMentions } from './dependencies.js';

export type Severity = 'error' | 'warning';
export interface Finding { code: `V${string}`; severity: Severity; message: string }

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
    /**
     * How one answer's marks are split across the subtopics it tests. Checked by
     * V21; omit for questions whose classification carries no weights.
     */
    subtopicWeights?: number[];
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
  assets: Array<{
    storagePath: string;
    size: number;
    /** Question path the asset hangs off; V22 needs it to spot siblings. */
    questionPath?: string;
    /** sha256 of the cropped bytes, so the same figure is recognisable. */
    contentHash?: string | null;
  }>;
  /** Dependencies already written by the DEPENDS stage, keyed by question path. */
  dependencies?: Array<{ fromPath: string; kind: string }>;
  duplicateSimilarity?: number;
}

const ranges: Record<string, [number, number]> = {
  State: [1, 2], Give: [1, 2], Name: [1, 2], Identify: [1, 2], Define: [1, 3],
  Describe: [2, 5], Explain: [2, 5], Compare: [2, 6], Calculate: [1, 5],
  Complete: [1, 6], Draw: [1, 5], Write: [3, 15], Evaluate: [4, 12],
  Justify: [1, 5], Suggest: [1, 5], Show: [1, 5], Other: [1, 20],
};

export function validateExtraction(x: ValidationInput) {
  const findings: Finding[] = [];
  const add = (code: Finding['code'], severity: Severity, message: string) =>
    findings.push({ code, severity, message });
  const ids = new Set(x.questions.map((question) => question.id));
  const leaves = x.questions.filter(
    (question) => !x.questions.some((child) => child.parentId === question.id),
  );

  for (const scheme of x.schemes) {
    const sum = scheme.points.reduce((total, marks) => total + marks, 0);
    if (sum < scheme.maxMarks || (scheme.type === 'all_required' && sum !== scheme.maxMarks))
      add('V01', 'error', 'Mark scheme point totals do not cover max marks.');
    if (!ids.has(scheme.questionId)) add('V04', 'error', 'Mark scheme has no matching question.');
    if (scheme.type === 'any_n_from_m' && scheme.points.length <= (scheme.nRequired ?? 0))
      add('V05', 'error', 'Any-N group needs more points than required.');
    if (scheme.type === 'any_n_from_m' && (scheme.groupMaxMarks ?? 0) > scheme.maxMarks)
      add('V06', 'error', 'Group marks exceed scheme marks.');
    if (scheme.type === 'levels_of_response' && !(scheme.levels ?? 0))
      add('V20', 'error', 'Levels scheme has no levels.');
  }

  if (leaves.reduce((total, question) => total + (question.marks ?? 0), 0) !== x.componentTotal)
    add('V02', 'error', 'Leaf marks do not equal component total.');
  for (const question of leaves)
    if (!x.schemes.some((scheme) => scheme.questionId === question.id))
      add('V03', 'error', 'Leaf question has no mark scheme.');

  for (const question of x.questions) {
    const hasChildren = x.questions.some((child) => child.parentId === question.id);
    if ((hasChildren && question.marks !== null) || (!hasChildren && question.marks === null))
      add('V07', 'error', 'Question tree marks are inconsistent.');

    const parentPath = question.path.includes('.')
      ? question.path.split('.').slice(0, -1).join('.')
      : null;
    if (parentPath && !x.questions.some((parent) => parent.path === parentPath))
      add('V08', 'error', 'Question parent path is missing.');
    if (question.answerKind === 'diagram' && question.assetCount < 1)
      add('V10', 'error', 'Diagram question has no asset.');

    const range = question.commandWord ? ranges[question.commandWord] : undefined;
    if (!hasChildren && !range) add('V12', 'warning', 'Command word is missing or invalid.');
    if (range && question.marks !== null) {
      const [min, max] = range;
      if (question.marks < min || question.marks > max)
        add('V13', 'warning', 'Command word and marks are unusual.');
    }
    if (
      !hasChildren && question.answerKind === 'text' && question.marks !== null &&
      (question.answerLines ?? 0) < question.marks
    ) add('V14', 'warning', 'Answer lines are fewer than marks.');
    if (!hasChildren && !question.subtopicConfidences.length)
      add('V15', 'error', 'Leaf question has no subtopic.');
    if (!hasChildren && question.subtopicConfidences.some((confidence) => confidence < 0.7))
      add('V16', 'warning', 'Leaf subtopic confidence is low.');
    if (question.stem.length < 10 || question.stem.length > 3000)
      add('V17', 'warning', 'Stem length is unusual.');
    if (question.extractConfidence < 0.8)
      add('V18', 'error', 'Extraction confidence is low.');

    // V23: references to sibling parts must survive ingestion as explicit
    // dependency rows, otherwise later leaf-level extraction can be invalid.
    const mentions = findDependencyMentions(question.stem);
    if (mentions.length) {
      const recorded = (x.dependencies ?? []).some(
        (dependency) => dependency.fromPath === question.path && dependency.kind !== 'none',
      );
      if (!recorded)
        add('V23', 'warning', 'Stem references another part but no dependency was recorded.');
    }
  }

  const roots = x.questions
    .map((question) => Number(question.path.split('.')[0]))
    .filter(Number.isFinite);
  if (roots.length) {
    const unique = [...new Set(roots)];
    for (let number = Math.min(...unique); number <= Math.max(...unique); number += 1) {
      if (!unique.includes(number)) {
        add('V09', 'warning', 'Question numbering has a gap.');
        break;
      }
    }
  }

  if (x.assets.some((asset) => !asset.storagePath || asset.size <= 2048))
    add('V11', 'error', 'Asset is missing or too small.');
  if ((x.duplicateSimilarity ?? 0) >= 0.95)
    add('V19', 'warning', 'Question is a likely duplicate.');

  // V21: weights split one answer's marks across the subtopics it tests. Summing
  // above 1 inflates mastery for every student who answers it; below 1 quietly
  // makes the question count for less than it is worth.
  for (const question of x.questions) {
    const weights = question.subtopicWeights;
    if (!weights?.length) continue;
    const sum = weights.reduce((total, weight) => total + weight, 0);
    if (Math.abs(sum - 1) > 0.01)
      add('V21', 'warning', `Subtopic weights for ${question.path} sum to ${sum.toFixed(2)}, not 1.`);
  }

  // V22: Cambridge prints one table above 3(a)-(d). If extraction copies it onto
  // each child then cherry-picking 3(c) carries a duplicate, and editing the
  // table later has to be done once per sibling.
  const byParentAndHash = new Map<string, Set<string>>();
  for (const asset of x.assets) {
    if (!asset.contentHash || !asset.questionPath) continue;
    if (!asset.questionPath.includes('.')) continue;
    const parent = asset.questionPath.slice(0, asset.questionPath.lastIndexOf('.'));
    const key = `${parent}::${asset.contentHash}`;
    byParentAndHash.set(key, (byParentAndHash.get(key) ?? new Set()).add(asset.questionPath));
  }
  for (const [key, paths] of byParentAndHash) {
    if (paths.size < 2) continue;
    const parent = key.slice(0, key.indexOf('::'));
    add(
      'V22',
      'warning',
      `The same asset is on ${paths.size} siblings; move it to ${parent}.`,
    );
  }

  return findings;
}
