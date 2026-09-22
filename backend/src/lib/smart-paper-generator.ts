export interface SmartPaperCandidate {
  id: string;
  rootId: string;
  sourceRef: string;
  marks: number;
  year: number;
  commandWord: string | null;
  primarySubtopic: string | null;
  hasDiagram: boolean;
}

export interface SmartPaperUnit {
  rootId: string;
  questions: SmartPaperCandidate[];
  marks: number;
}

export interface SmartPaperPlan {
  questionIds: string[];
  rootIds: string[];
  totalMarks: number;
  warnings: string[];
  seed: number;
}

export interface SmartPaperParams {
  targetMarks: number;
  seed: number;
  maxQuestions?: number;
}

const mulberry32 = (initialSeed: number) => {
  let seed = initialSeed | 0;
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

function groupUnits(candidates: SmartPaperCandidate[]): SmartPaperUnit[] {
  const grouped = new Map<string, SmartPaperCandidate[]>();
  for (const candidate of candidates) {
    const questions = grouped.get(candidate.rootId) ?? [];
    questions.push(candidate);
    grouped.set(candidate.rootId, questions);
  }
  return [...grouped.entries()].map(([rootId, questions]) => ({
    rootId,
    questions: [...questions].sort((a, b) => a.sourceRef.localeCompare(b.sourceRef)),
    marks: questions.reduce((sum, question) => sum + question.marks, 0),
  }));
}

function diversityPenalty(questions: SmartPaperCandidate[]) {
  const subtopics = new Map<string, number>();
  const commands = new Map<string, number>();
  for (const question of questions) {
    if (question.primarySubtopic) {
      subtopics.set(question.primarySubtopic, (subtopics.get(question.primarySubtopic) ?? 0) + 1);
    }
    if (question.commandWord) {
      commands.set(question.commandWord, (commands.get(question.commandWord) ?? 0) + 1);
    }
  }
  const repeatedSubtopics = [...subtopics.values()].reduce((sum, count) => sum + Math.max(0, count - 2), 0);
  const repeatedCommands = [...commands.values()].reduce((sum, count) => sum + Math.max(0, count - 3), 0);
  return repeatedSubtopics * 2 + repeatedCommands * 0.5;
}

function recencyPenalty(questions: SmartPaperCandidate[]) {
  if (!questions.length) return 0;
  const newest = Math.max(...questions.map((question) => question.year));
  return questions.reduce((sum, question) => sum + Math.max(0, newest - question.year), 0) / questions.length * 0.15;
}

function cost(questions: SmartPaperCandidate[], targetMarks: number) {
  const marks = questions.reduce((sum, question) => sum + question.marks, 0);
  return Math.abs(marks - targetMarks) * 100
    + diversityPenalty(questions)
    + recencyPenalty(questions)
    + Math.max(0, questions.length - 30) * 0.25;
}

/**
 * Deterministic Cambridge worksheet planner.
 *
 * A root family is the atomic selection unit so a generated paper never
 * silently splits siblings that matched the teacher's filter. The service
 * layer subsequently expands explicit answer/text dependencies and evaluates
 * the final mark total against the requested target.
 */
export function generateSmartPaper(
  candidates: SmartPaperCandidate[],
  params: SmartPaperParams,
): SmartPaperPlan {
  const targetMarks = Math.max(1, Math.round(params.targetMarks));
  const maxQuestions = Math.max(1, params.maxQuestions ?? 80);
  const units = groupUnits(candidates)
    .filter((unit) => unit.questions.length <= maxQuestions && unit.marks > 0);

  if (!units.length) {
    return {
      questionIds: [],
      rootIds: [],
      totalMarks: 0,
      warnings: ['insufficient_pool'],
      seed: params.seed,
    };
  }

  let bestQuestions: SmartPaperCandidate[] = [];
  let bestRootIds: string[] = [];
  let bestCost = Number.POSITIVE_INFINITY;

  for (let iteration = 0; iteration < 360; iteration += 1) {
    const random = mulberry32(params.seed + iteration * 7919);
    const ordered = units
      .map((unit) => ({
        unit,
        random: random(),
        newestYear: Math.max(...unit.questions.map((question) => question.year)),
      }))
      .sort((a, b) => {
        // Mostly randomized, with a gentle preference for recent sources.
        const scoreA = a.random + a.newestYear * 0.0001;
        const scoreB = b.random + b.newestYear * 0.0001;
        return scoreB - scoreA;
      })
      .map((item) => item.unit);

    const chosen: SmartPaperUnit[] = [];
    let totalMarks = 0;
    let questionCount = 0;

    for (const unit of ordered) {
      if (questionCount + unit.questions.length > maxQuestions) continue;
      const nextTotal = totalMarks + unit.marks;
      const improves = Math.abs(targetMarks - nextTotal) < Math.abs(targetMarks - totalMarks);
      const nearOvershoot = totalMarks < targetMarks && nextTotal <= targetMarks + 2;
      if (improves || nearOvershoot) {
        chosen.push(unit);
        totalMarks = nextTotal;
        questionCount += unit.questions.length;
      }
      if (totalMarks === targetMarks) break;
    }

    // A single large family can still be the closest defensible result.
    if (!chosen.length) {
      const nearest = [...ordered].sort(
        (a, b) => Math.abs(a.marks - targetMarks) - Math.abs(b.marks - targetMarks),
      )[0];
      if (nearest) chosen.push(nearest);
    }

    const questions = chosen.flatMap((unit) => unit.questions);
    const currentCost = cost(questions, targetMarks);
    if (currentCost < bestCost) {
      bestCost = currentCost;
      bestQuestions = questions;
      bestRootIds = chosen.map((unit) => unit.rootId);
    }
    if (currentCost === 0) break;
  }

  const totalMarks = bestQuestions.reduce((sum, question) => sum + question.marks, 0);
  const warnings: string[] = [];
  if (!bestQuestions.length) warnings.push('insufficient_pool');
  if (Math.abs(totalMarks - targetMarks) > 2) warnings.push(`target_unmet:${totalMarks}/${targetMarks}`);

  return {
    questionIds: bestQuestions.map((question) => question.id),
    rootIds: bestRootIds,
    totalMarks,
    warnings,
    seed: params.seed,
  };
}
