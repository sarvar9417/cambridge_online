export interface PendingAnswer {
  submissionId: string;
  questionId: string;
  text: string;
  activeSessionId: string;
}
const PREFIX = 'campath:pending:';

export function queueAnswer(storage: Storage, answer: PendingAnswer) {
  storage.setItem(`${PREFIX}${answer.submissionId}:${answer.questionId}`, JSON.stringify(answer));
}
export function pendingAnswers(storage: Storage) {
  const answers: PendingAnswer[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      answers.push(JSON.parse(storage.getItem(key)!) as PendingAnswer);
    } catch {
      storage.removeItem(key);
    }
  }
  return answers;
}
export async function flushAnswers(
  storage: Storage,
  send: (answer: PendingAnswer) => Promise<void>,
) {
  for (const answer of pendingAnswers(storage)) {
    try {
      await send(answer);
      storage.removeItem(`${PREFIX}${answer.submissionId}:${answer.questionId}`);
    } catch {
      /* Online event retries later. */
    }
  }
}
