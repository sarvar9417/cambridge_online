import { parseStructuredQuestionContent } from '../lib/structured-question-content.js';

interface QuestionRow {
  id: string;
  display_ref: string;
  stem_md: string | null;
  context_md: string | null;
  content_json?: unknown | null;
  content_version?: number | null;
  command_word: string | null;
  marks: number | null;
  ao: string | null;
  answer_kind: string;
  parent: unknown;
  mark_scheme?: unknown;
  can_view_scheme?: boolean;
}

export function serializeQuestion(row: QuestionRow) {
  const structuredContent = row.content_json == null
    ? null
    : parseStructuredQuestionContent(row.content_json);
  if (structuredContent && row.content_version !== 1) {
    throw new Error('Structured question content has an unsupported database version.');
  }

  const question: Record<string, unknown> = {
    id: row.id,
    displayRef: row.display_ref,
    stemMd: row.stem_md,
    contextMd: row.context_md,
    contentJson: structuredContent,
    contentVersion: structuredContent ? 1 : null,
    commandWord: row.command_word,
    marks: row.marks,
    ao: row.ao,
    answerKind: row.answer_kind,
    parent: row.parent,
  };
  if (row.can_view_scheme && row.mark_scheme) question.markScheme = row.mark_scheme;
  return question;
}
