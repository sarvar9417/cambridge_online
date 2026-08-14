import { finding, leavesOf, type RuleDefinition } from './types.js';

export const MIN_SUBTOPIC_CONFIDENCE = 0.7;
/** Floating point sums never land exactly on 1.0. */
export const WEIGHT_TOLERANCE = 0.01;

/**
 * V15 — an unclassified leaf is invisible.
 *
 * The whole product is "filter by topic"; a question with no subtopic link can
 * never be found again, so this is an error rather than a warning.
 */
export const V15: RuleDefinition = {
  code: 'V15',
  severity: 'error',
  title: 'Leaf has no subtopic link',
  run: (context) =>
    leavesOf(context)
      .filter((leaf) => leaf.subtopics.length === 0)
      .map((leaf) => finding('V15', 'error', 'no subtopic was assigned', leaf.path)),
};

/** V16 — a weak classification is usually a wrong one; route it to review. */
export const V16: RuleDefinition = {
  code: 'V16',
  severity: 'warning',
  title: 'Subtopic classification confidence is low',
  run: (context) =>
    context.questions.flatMap((question) =>
      question.subtopics
        .filter((subtopic) => subtopic.confidence < MIN_SUBTOPIC_CONFIDENCE)
        .map((subtopic) =>
          finding(
            'V16',
            'warning',
            `subtopic ${subtopic.code} confidence ${subtopic.confidence.toFixed(2)} is below ${MIN_SUBTOPIC_CONFIDENCE}`,
            question.path,
            { code: subtopic.code, confidence: subtopic.confidence },
          ),
        ),
    ),
};

/**
 * V21 — subtopic weights must sum to 1.0.
 *
 * Weights split one answer's marks across the subtopics it tests. If they sum
 * to more than 1, mastery inflates for every student who answers it; if less,
 * the question quietly counts for less than it should.
 */
export const V21: RuleDefinition = {
  code: 'V21',
  severity: 'warning',
  title: 'Subtopic weights do not sum to 1.0',
  run: (context) =>
    context.questions
      .filter((question) => question.subtopics.length > 0)
      .flatMap((question) => {
        const sum = question.subtopics.reduce((total, subtopic) => total + subtopic.weight, 0);
        if (Math.abs(sum - 1) <= WEIGHT_TOLERANCE) return [];
        return [
          finding(
            'V21',
            'warning',
            `subtopic weights sum to ${sum.toFixed(2)}, expected 1.00`,
            question.path,
            { sum },
          ),
        ];
      }),
};

export const classificationRules = [V15, V16, V21];
