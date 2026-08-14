const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1');

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const AUTH_EXPIRED_EVENT = 'campath:auth-expired';
let refreshPromise: Promise<string> | null = null;

async function parseBody(response: Response) {
  if (response.status === 204) return null;
  return response.json();
}

function expireSession() {
  accessToken = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await parseBody(response);
      if (!response.ok || typeof body?.accessToken !== 'string') {
        throw new Error(body?.error?.message ?? 'Sessiya muddati tugagan.');
      }
      accessToken = body.accessToken;
      return body.accessToken;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

function send(path: string, init: RequestInit, token: string | null) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokenUsed = accessToken;
  let response = await send(path, init, tokenUsed);
  const canRefresh = response.status === 401 && Boolean(tokenUsed) && path !== '/auth/refresh' && path !== '/auth/login';
  if (canRefresh) {
    try {
      if (accessToken === tokenUsed) await refreshAccessToken();
      response = await send(path, init, accessToken);
    } catch (error) {
      expireSession();
      throw error;
    }
  }
  const body = await parseBody(response);
  if (response.status === 401 && (canRefresh || path === '/auth/refresh')) expireSession();
  if (!response.ok) throw new Error(body?.error?.message ?? 'So‘rov bajarilmadi.');
  return body as T;
}

export interface User { id: string; fullName: string; role: 'owner'|'teacher'|'student'; schoolId: string|null }
export interface ClassItem { id:string; name:string; grade:number|null; level:'AS'|'A2'; academicYear:string; studentCount:number }
export interface Question { id:string; displayRef:string; stemMd:string; commandWord:string; marks:number; ao:string; answerKind:string }
export interface Assignment {id:string;title:string;className:string;totalMarks:number;dueAt:string;timeLimitMin:number|null;submissionStatus:string|null}
export interface AttemptQuestion {id:string;displayRef:string;stemMd:string;contextMd:string;commandWord:string;marks:number;answerKind:string;answerText:string}
export interface Attempt {submissionId:string;activeSessionId:string;startedAt:string;deadline:string|null;serverNow:string;questions:AttemptQuestion[]}
export interface GradingPoint {id:string;code:string;text:string;matched:boolean|null;marks:number}
export interface GradingItem {id:string;text:string;displayRef:string;stemMd:string;marks:number;answerKind:string;studentName:string;points:GradingPoint[]}
export interface ResultItem {id:string;title:string;className:string;studentName:string;totalScore:number;totalMax:number;percentage:number;grade:string|null;releasedAt:string}
export interface ResultDetail {gradingId:string;appealStatus:'open'|'accepted'|'rejected'|null;displayRef:string;stemMd:string;marks:number;answerText:string;finalScore:number;feedback:string|null;points:Array<{code:string;text:string;matched:boolean;marks:number}>}
export interface AppealItem {id:string;gradingId:string;reason:string;createdAt:string;studentName:string;displayRef:string;stemMd:string;answerText:string;finalScore:number;marks:number}
export interface MasteryItem {subtopic_id:string;code:string;title:string;score:number;attempts:number;marksEarned:number;marksPossible:number}
export interface ReviewQuestion {id:string;display_ref:string;stem_md:string;marks:number;command_word:string;extract_confidence:number;storage_path:string;findings:Array<{code:string;severity:string;message:string}>}
export interface Flashcard {flashcard_id:string;front_md:string;back_md:string;hint_md:string|null}
export interface ExportItem {id:string;kind:'question_paper'|'mark_scheme'|'combined'|'feedback';status:'queued'|'running'|'succeeded'|'failed';error:string|null;expires_at:string|null;created_at:string;finished_at:string|null}
