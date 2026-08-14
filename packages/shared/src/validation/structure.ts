import { finding, isLeaf, parentOfPath, rootNumberOf, type RuleDefinition } from './types.js';

/**
 * V07 — marks live on leaves and only on leaves.
 *
 * A parent with marks means the extraction flattened a tree; a leaf without
 * marks means a sub-part lost its allocation. Both corrupt V02 downstream.
 */
export const V07: RuleDefinition = {
  code: 'V07',
  severity: 'error',
  title: 'Marks are on the wrong node of the question tree',
  run: (context) =>
    context.questions.flatMap((question) => {
      const leaf = isLeaf(context, question.path);
      if (leaf && question.marks === null) {
        return [finding('V07', 'error', 'leaf carries no marks', question.path)];
      }
      if (!leaf && question.marks !== null) {
        return [finding('V07', 'error', `parent carries ${question.marks} marks`, question.path)];
      }
      return [];
    }),
};

/**
 * V08 — path continuity: '3.c' can only exist if '3' does.
 *
 * A missing ancestor means the shared scenario is gone, so every child below it
 * is unanswerable once extracted on its own.
 */
export const V08: RuleDefinition = {
  code: 'V08',
  severity: 'error',
  title: 'Question path has a missing ancestor',
  run: (context) => {
    const paths = new Set(context.questions.map((question) => question.path));
    return context.questions.flatMap((question) => {
      const findings = [];
      let ancestor = parentOfPath(question.path);
      while (ancestor) {
        if (!paths.has(ancestor)) {
          findings.push(
            finding('V08', 'error', `ancestor "${ancestor}" is missing`, question.path, {
              ancestor,
            }),
          );
          break;
        }
        ancestor = parentOfPath(ancestor);
      }
      return findings;
    });
  },
};

/**
 * V09 — root question numbers should run 1..n with no gap.
 *
 * A warning rather than an error: some papers legitimately skip a number, but a
 * gap far more often means a whole question was missed.
 */
export const V09: RuleDefinition = {
  code: 'V09',
  severity: 'warning',
  title: 'Question numbering has a gap',
  run: (context) => {
    const roots = [
      ...new Set(
        context.questions
          .filter((question) => question.parentPath === null)
          .map((question) => rootNumberOf(question.path))
          .filter(Number.isFinite),
      ),
    ].sort((a, b) => a - b);

    if (roots.length < 2) return [];

    const missing: number[] = [];
    for (let number = roots[0]!; number <= roots.at(-1)!; number += 1) {
      if (!roots.includes(number)) missing.push(number);
    }
    return missing.length
      ? [
          finding('V09', 'warning', `question numbers missing: ${missing.join(', ')}`, undefined, {
            missing,
          }),
        ]
      : [];
  },
};

export const structureRules = [V07, V08, V09];
