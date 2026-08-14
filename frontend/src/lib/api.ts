const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1');

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

/** Called when the session cannot be recovered, so the shell can show the login screen. */
let onSessionLost: (() => void) | null = null;
export const setSessionLostHandler = (handler: (() => void) | null) => {
  onSessionLost = handler;
};

export interface ApiErrorDetails {
  field?: string;
  findings?: Array<{ code: string; severity: string; message: string; offset?: number }>;
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ApiErrorDetails,
  ) {
    super(message);
  }
}

/**
 * A single in-flight refresh shared by every caller: when a page fires five
 * requests at once and the access token has just expired, they must not each
 * rotate the refresh cookie — rotation is single-use and the losers would be
 * treated as token reuse and log the student out mid-exam.
 */
let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  refreshInFlight ??= (async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || typeof body?.accessToken !== 'string') {
      throw new ApiError(
        response.status,
        body?.error?.code ?? 'invalid_refresh',
        body?.error?.message ?? 'Sessiya muddati tugagan.',
        body?.error?.details,
      );
    }
    setAccessToken(body.accessToken);
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function send(path: string, init: RequestInit, token = accessToken): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokenUsed = accessToken;
  let response = await send(path, init, tokenUsed);

  const canRefresh = response.status === 401 && Boolean(tokenUsed) && !path.startsWith('/auth/');
  if (canRefresh) {
    try {
      if (accessToken === tokenUsed) await refreshSession();
      response = await send(path, init, accessToken);
    } catch (error) {
      setAccessToken(null);
      onSessionLost?.();
      throw error;
    }
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.status === 401 && canRefresh) {
    setAccessToken(null);
    onSessionLost?.();
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'request_failed',
      body?.error?.message ?? 'So‘rov bajarilmadi.',
      body?.error?.details,
    );
  }
  return body as T;
}

export type UserStatus = 'pending' | 'active' | 'suspended';

export interface User {
  id: string;
  fullName: string;
  role: 'owner' | 'teacher' | 'student';
  schoolId: string | null;
  status: UserStatus;
}
export interface ClassItem {
  id: string;
  name: string;
  grade: number | null;
  level: 'AS' | 'A2';
  academicYear: string;
  studentCount: number;
}

export interface QuestionSubtopic {
  id: string;
  code: string;
  title: string;
  isPrimary: boolean;
}
export interface QuestionAsset {
  id: string;
  kind: string;
  altText: string;
  svgMarkup: string | null;
}
export interface Question {
  id: string;
  displayRef: string;
  stemMd: string | null;
  stemLatex: string | null;
  contextMd: string | null;
  contextLatex: string | null;
  bodyFormat: 'markdown' | 'latex';
  commandWord: string | null;
  marks: number | null;
  ao: string | null;
  answerKind: string;
  status: string;
  subtopics: QuestionSubtopic[];
  assets: QuestionAsset[];
  parent: {
    id: string;
    displayRef: string;
    contextMd: string | null;
    contextLatex: string | null;
  } | null;
}
export interface QuestionPage {
  data: Question[];
  nextCursor: string | null;
}

export interface MarkSchemePoint {
  id: string;
  code: string;
  text: string;
  textLatex: string | null;
  marks: number;
  accept: string[];
  reject: string[];
  requires: string[];
  isBod: boolean;
  groupId: string | null;
}
export interface MarkScheme {
  id: string;
  schemeType: string;
  maxMarks: number;
  guidanceMd: string | null;
  guidanceLatex: string | null;
  status: string;
  points: MarkSchemePoint[];
  groups: Array<{
    id: string;
    label: string;
    nRequired: number;
    marksPerPoint: number;
    maxMarks: number;
  }>;
}

export interface Subtopic {
  id: string;
  code: string;
  title: string;
  questionCount: number;
}
export interface Topic {
  id: string;
  number: number;
  title: string;
  level: 'AS' | 'A2';
  componentNumber: number | null;
  subtopics: Subtopic[];
}

export interface PendingStudent {
  id: string;
  fullName: string;
  email: string | null;
  createdAt: string;
}
export interface Group {
  id: string;
  classId: string;
  name: string;
  sortOrder: number;
  studentCount: number;
}
export interface RosterEntry {
  id: string;
  fullName: string;
  email: string | null;
  status: UserStatus;
  groupId: string | null;
  groupName: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  className: string;
  totalMarks: number;
  dueAt: string;
  timeLimitMin: number | null;
  submissionStatus: string | null;
}
export interface AttemptQuestion {
  id: string;
  displayRef: string;
  stemMd: string;
  stemLatex?: string | null;
  contextMd: string;
  contextLatex?: string | null;
  commandWord: string;
  marks: number;
  answerKind: string;
  answerText: string;
}
export interface Attempt {
  submissionId: string;
  activeSessionId: string;
  startedAt: string;
  deadline: string | null;
  serverNow: string;
  questions: AttemptQuestion[];
}
export interface GradingPoint {
  id: string;
  code: string;
  text: string;
  matched: boolean | null;
  marks: number;
}
export interface GradingItem {
  id: string;
  text: string;
  displayRef: string;
  stemMd: string;
  marks: number;
  answerKind: string;
  studentName: string;
  points: GradingPoint[];
}
export interface ResultItem {
  id: string;
  title: string;
  className: string;
  studentName: string;
  totalScore: number;
  totalMax: number;
  percentage: number;
  grade: string | null;
  releasedAt: string;
}
export interface ResultDetail {
  gradingId: string;
  appealStatus: 'open' | 'accepted' | 'rejected' | null;
  displayRef: string;
  stemMd: string;
  marks: number;
  answerText: string;
  finalScore: number;
  feedback: string | null;
  points: Array<{ code: string; text: string; matched: boolean; marks: number }>;
}
export interface AppealItem {
  id: string;
  gradingId: string;
  reason: string;
  createdAt: string;
  studentName: string;
  displayRef: string;
  stemMd: string;
  answerText: string;
  finalScore: number;
  marks: number;
}
export interface MasteryItem {
  subtopic_id: string;
  code: string;
  title: string;
  score: number;
  attempts: number;
  marksEarned: number;
  marksPossible: number;
}
export interface ReviewQuestion {
  id: string;
  display_ref: string;
  stem_md: string;
  marks: number;
  command_word: string;
  extract_confidence: number;
  storage_path: string;
  findings: Array<{ code: string; severity: string; message: string }>;
}
export interface Flashcard {
  flashcard_id: string;
  front_md: string;
  back_md: string;
  hint_md: string | null;
}
export interface ExportItem {
  id: string;
  kind: 'question_paper' | 'mark_scheme' | 'combined' | 'feedback';
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  expires_at: string | null;
  created_at: string;
  finished_at: string | null;
}
