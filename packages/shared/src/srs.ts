export interface ReviewState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}
export interface ReviewResult extends ReviewState {
  dueAt: Date;
  lastGrade: number;
}
export function sm2(state: ReviewState, grade: number, now = new Date()): ReviewResult {
  const q = Math.max(0, Math.min(5, Math.round(grade)));
  let { easeFactor, intervalDays, repetitions, lapses } = state;
  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
    lapses++;
  } else {
    intervalDays =
      repetitions === 0
        ? 1
        : repetitions === 1
          ? 6
          : Math.max(1, Math.round(intervalDays * easeFactor));
    repetitions++;
  }
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    repetitions,
    lapses,
    dueAt: new Date(now.getTime() + intervalDays * 86400000),
    lastGrade: q,
  };
}
