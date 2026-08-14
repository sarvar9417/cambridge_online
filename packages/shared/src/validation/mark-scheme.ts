import { finding, isLeaf, leavesOf, type RuleDefinition } from './types.js';

/**
 * V01 — mark point totals must cover the scheme maximum.
 *
 * `all_required` sums every point, so the sum must equal the maximum exactly.
 * Other types award a subset, so the pool must be at least the maximum; a pool
 * smaller than the maximum means points were dropped during extraction and the
 * question can never score full marks.
 */
export const V01: RuleDefinition = {
  code: 'V01',
  severity: 'error',
  title: 'Mark point marks do not add up to the scheme maximum',
  run: (context) =>
    context.schemes.flatMap((scheme) => {
      const sum = scheme.points.reduce((total, point) => total + point.marks, 0);
      if (scheme.type === 'all_required' && sum !== scheme.maxMarks) {
        return [
          finding(
            'V01',
            'error',
            `all_required scheme sums to ${sum} but max_marks is ${scheme.maxMarks}`,
            scheme.questionPath,
            { sum, maxMarks: scheme.maxMarks },
          ),
        ];
      }
      if (scheme.type !== 'all_required' && sum < scheme.maxMarks) {
        return [
          finding(
            'V01',
            'error',
            `mark point pool is ${sum} but max_marks is ${scheme.maxMarks}`,
            scheme.questionPath,
            { sum, maxMarks: scheme.maxMarks },
          ),
        ];
      }
      return [];
    }),
};

/**
 * V02 — the paper's leaf marks must equal the component total.
 *
 * The single most valuable check in the pipeline: a whole question lost to a
 * page-boundary split shows up here and nowhere else.
 */
export const V02: RuleDefinition = {
  code: 'V02',
  severity: 'error',
  title: 'Paper total does not equal the component total',
  run: (context) => {
    const total = leavesOf(context).reduce((sum, leaf) => sum + (leaf.marks ?? 0), 0);
    if (total === context.componentTotalMarks) return [];
    return [
      finding(
        'V02',
        'error',
        `leaf marks total ${total} but the component is ${context.componentTotalMarks}`,
        undefined,
        { total, expected: context.componentTotalMarks },
      ),
    ];
  },
};

/** V03 — every leaf must have a mark scheme, or it can never be graded. */
export const V03: RuleDefinition = {
  code: 'V03',
  severity: 'error',
  title: 'Leaf question has no mark scheme',
  run: (context) => {
    const schemed = new Set(context.schemes.map((scheme) => scheme.questionPath));
    return leavesOf(context)
      .filter((leaf) => !schemed.has(leaf.path))
      .map((leaf) => finding('V03', 'error', 'leaf has no mark scheme', leaf.path));
  },
};

/**
 * V04 — a mark scheme whose question does not exist.
 *
 * Usually means the MS was matched to a question number the QP extraction
 * missed, which is a stronger signal than it looks: the question is gone.
 */
export const V04: RuleDefinition = {
  code: 'V04',
  severity: 'error',
  title: 'Mark scheme has no matching question',
  run: (context) => {
    const paths = new Set(context.questions.map((question) => question.path));
    return context.schemes
      .filter((scheme) => !paths.has(scheme.questionPath))
      .map((scheme) =>
        finding('V04', 'error', 'mark scheme references a missing question', scheme.questionPath),
      );
  },
};

/**
 * V05 — 'any N from M' needs M greater than N.
 *
 * When they are equal the scheme is really `all_required` and the group was
 * read wrongly; grading it as a choice would award full marks too easily.
 */
export const V05: RuleDefinition = {
  code: 'V05',
  severity: 'error',
  title: 'any_n_from_m group has no more points than it requires',
  run: (context) =>
    context.schemes
      .filter((scheme) => scheme.type === 'any_n_from_m')
      .flatMap((scheme) =>
        scheme.groups
          .filter(
            (group) =>
              scheme.points.filter((point) => point.groupLabel === group.label).length <=
              group.nRequired,
          )
          .map((group) =>
            finding(
              'V05',
              'error',
              `group "${group.label}" requires ${group.nRequired} but offers ${
                scheme.points.filter((point) => point.groupLabel === group.label).length
              }`,
              scheme.questionPath,
              { group: group.label, nRequired: group.nRequired },
            ),
          ),
      ),
};

/** V06 — a group cannot be worth more than the whole scheme. */
export const V06: RuleDefinition = {
  code: 'V06',
  severity: 'error',
  title: 'Group maximum exceeds the scheme maximum',
  run: (context) =>
    context.schemes.flatMap((scheme) =>
      scheme.groups
        .filter((group) => group.maxMarks > scheme.maxMarks)
        .map((group) =>
          finding(
            'V06',
            'error',
            `group "${group.label}" allows ${group.maxMarks} of a ${scheme.maxMarks} mark scheme`,
            scheme.questionPath,
          ),
        ),
    ),
};

/** V20 — a banded scheme with no bands cannot be marked at all. */
export const V20: RuleDefinition = {
  code: 'V20',
  severity: 'error',
  title: 'levels_of_response scheme has no level rows',
  run: (context) =>
    context.schemes
      .filter((scheme) => scheme.type === 'levels_of_response' && scheme.levelCount === 0)
      .map((scheme) =>
        finding('V20', 'error', 'levels_of_response scheme has no levels', scheme.questionPath),
      ),
};

export const markSchemeRules = [V01, V02, V03, V04, V05, V06, V20];

export { isLeaf };
