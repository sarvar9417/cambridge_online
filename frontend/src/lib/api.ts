import type { StructuredQuestionContent } from './structured-question-content';
import type { StructuredResponse } from './structured-response';
import type { PortableSourceAsset } from './portable-source-assets';
import { randomId } from './random-id';

const API_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_API_URL ?? '/api/v1');
const LIVE_SNAPSHOT_PATH = /^\/live-exams\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/projector)?$/i;
const LIVE_FULL_REFRESH_MS = 15_000;

type LiveSnapshotCacheEntry = { body:unknown; version:number; fetchedAt:number };
type LiveCursor = { currentVersion:number; changed:boolean };
const liveSnapshotCache = new Map<string, LiveSnapshotCacheEntry>();

let accessToken: string | null = null;
let sessionGeneration = 0;
export const setAccessToken = (token: string | null) => {
  if (token !== accessToken) {
    liveSnapshotCache.clear();
    sessionGeneration += 1;
    refreshPromise = null;
    refreshRequest = null;
  }
  accessToken = token;
};
export const AUTH_EXPIRED_EVENT = 'campath:auth-expired';
export const SESSION_CHANGED_KEY = 'campath:session-changed';
let refreshPromise: Promise<string> | null = null;
let refreshRequest: Promise<Response> | null = null;
// A successful login/logout intentionally advances the request's generation.
const responseGenerations = new WeakMap<Response, number>();

function readSessionMarker() {
  try { return localStorage.getItem(SESSION_CHANGED_KEY); } catch { return null; }
}
let sessionMarker = readSessionMarker();

// Only a random change marker is shared. Credentials stay in memory/httpOnly cookies.
export function synchronizeSession() {
  const marker = readSessionMarker();
  if (marker === sessionMarker) return false;
  sessionMarker = marker;
  expireSession();
  return true;
}

function sessionChangedError() {
  return new ApiError('Akkaunt o‘zgardi. Qayta kiring.', 'session_changed', undefined, 409);
}

function assertCurrentSession(generation: number) {
  synchronizeSession();
  if (generation !== sessionGeneration) throw sessionChangedError();
}

function publishSessionChange() {
  setAccessToken(null);
  // Invalidate anonymous startup requests too.
  sessionGeneration += 1;
  sessionMarker = randomId();
  try { localStorage.setItem(SESSION_CHANGED_KEY, sessionMarker); }
  catch { sessionMarker = null; }
}

async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  // Single-use refresh cookies belong to the browser context, not to one tab.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('campath:auth-cookie', action);
  }
  return action();
}

function changesSession(path: string, init: RequestInit) {
  return init.method?.toUpperCase() === 'POST' && ['/auth/login', '/auth/logout', '/auth/redeem-invite', '/auth/change-password'].includes(path);
}

export class ApiError extends Error {
  constructor(message: string, readonly code: string, readonly detail?: string, readonly status?: number) {
    super(message);
  }
}

async function parseBody(response: Response) {
  if (response.status === 204) return null;
  try { return await response.json(); } catch { return null; }
}

function expireSession() {
  setAccessToken(null);
  sessionGeneration += 1;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const generation = sessionGeneration;
    const pending = (async () => {
      const response = await send('/auth/refresh', { method: 'POST' }, null);
      const body = await parseBody(response);
      assertCurrentSession(generation);
      if (!response.ok || typeof body?.accessToken !== 'string') {
        throw new ApiError(body?.error?.message ?? 'Sessiyani yangilab bo‘lmadi.', body?.error?.code ?? 'refresh_failed', body?.error?.detail, response.status);
      }
      accessToken = body.accessToken;
      return body.accessToken;
    })().finally(() => { if (refreshPromise === pending) refreshPromise = null; });
    refreshPromise = pending;
  }
  return refreshPromise;
}

function send(path: string, init: RequestInit, token: string | null) {
  const generation = sessionGeneration;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (path === '/auth/refresh' && init.method?.toUpperCase() === 'POST') {
    // Refresh cookies are single-use. Share the request across startup effects
    // (including StrictMode's replay) and automatic access-token refreshes.
    if (!refreshRequest) {
      const pending = withSessionLock(async () => {
        assertCurrentSession(generation);
        return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
      }).finally(() => { if (refreshRequest === pending) refreshRequest = null; });
      refreshRequest = pending;
    }
    // Each caller parses its own body; a Response stream can only be read once.
    return refreshRequest.then((response) => response.clone());
  }
  if (changesSession(path, init)) {
    return withSessionLock(async () => {
      assertCurrentSession(generation);
      const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
      assertCurrentSession(generation);
      if (response.ok) publishSessionChange();
      responseGenerations.set(response, sessionGeneration);
      return response;
    });
  }
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
}

async function authenticatedResponse(path: string, init: RequestInit = {}, options:{suppressAuthExpired?:boolean} = {}): Promise<Response> {
  if (synchronizeSession()) throw sessionChangedError();
  const generation = sessionGeneration;
  const tokenUsed = accessToken;
  let response = await send(path, init, tokenUsed);
  assertCurrentSession(responseGenerations.get(response) ?? generation);
  const canRefresh = response.status === 401 && Boolean(tokenUsed) && path !== '/auth/refresh' && path !== '/auth/login';
  if (canRefresh) {
    try {
      if (accessToken === tokenUsed) await refreshAccessToken();
    } catch (error) {
      assertCurrentSession(generation);
      // A network failure or server outage does not invalidate the session.
      if (error instanceof ApiError && [401, 403, 410].includes(error.status ?? 0) && !options.suppressAuthExpired) expireSession();
      throw error;
    }
    response = await send(path, init, accessToken);
    assertCurrentSession(responseGenerations.get(response) ?? generation);
  }
  if (response.status === 401 && (canRefresh || path === '/auth/refresh') && !options.suppressAuthExpired) expireSession();
  return response;
}

async function requestJson<T>(path: string, init: RequestInit = {}, options:{suppressAuthExpired?:boolean} = {}): Promise<T> {
  const generation = sessionGeneration;
  const response = await authenticatedResponse(path, init, options);
  const body = await parseBody(response);
  if (response.ok) assertCurrentSession(responseGenerations.get(response) ?? generation);
  if (!response.ok) {
    throw new ApiError(body?.error?.message ?? 'So‘rov bajarilmadi.', body?.error?.code ?? 'request_failed', body?.error?.detail, response.status);
  }
  return body as T;
}

function liveSnapshotKey(path:string, init:RequestInit) {
  const method=(init.method??'GET').toUpperCase();
  return method==='GET'&&!init.body&&LIVE_SNAPSHOT_PATH.test(path)?path:null;
}

function liveCursorPath(path:string) {
  const match=path.match(LIVE_SNAPSHOT_PATH);
  return match ? `/live-exams/${match[1]}/events` : null;
}

function snapshotVersion(body:unknown) {
  if (!body || typeof body !== 'object' || !('session' in body)) return null;
  const session=(body as {session?:unknown}).session;
  if (!session || typeof session !== 'object' || !('version' in session)) return null;
  const version=(session as {version?:unknown}).version;
  return typeof version==='number'&&Number.isFinite(version)&&version>=0?version:null;
}

function rememberLiveSnapshot(key:string, body:unknown, version:number) {
  liveSnapshotCache.set(key,{body,version,fetchedAt:Date.now()});
  if(liveSnapshotCache.size>20){
    const oldest=liveSnapshotCache.keys().next().value as string|undefined;
    if(oldest)liveSnapshotCache.delete(oldest);
  }
}

export async function api<T>(path: string, init: RequestInit = {}, options:{suppressAuthExpired?:boolean} = {}): Promise<T> {
  const cacheKey=liveSnapshotKey(path,init);
  if(!cacheKey)return requestJson<T>(path,init,options);

  const cached=liveSnapshotCache.get(cacheKey);
  const cursorPath=liveCursorPath(path);
  if(cached&&cursorPath&&Date.now()-cached.fetchedAt<LIVE_FULL_REFRESH_MS){
    try{
      const cursor=await requestJson<LiveCursor>(`${cursorPath}?afterVersion=${cached.version}&limit=1`,{},options);
      if(!cursor.changed&&cursor.currentVersion===cached.version)return cached.body as T;
    }catch(error){
      if (error instanceof ApiError && error.code === 'session_changed') throw error;
      // During a rolling deployment the cursor route may briefly be absent or
      // unreachable. Fall back to the authoritative snapshot instead of
      // making Live Exam depend on the notification optimisation.
    }
  }

  const body=await requestJson<T>(path,init,options);
  const version=snapshotVersion(body);
  if(version!==null)rememberLiveSnapshot(cacheKey,body,version);
  return body;
}

export async function apiBlob(path: string) {
  const generation = sessionGeneration;
  const response = await authenticatedResponse(path);
  if (!response.ok) {
    const body = await parseBody(response);
    throw new ApiError(body?.error?.message ?? 'Fayl yuklanmadi.', body?.error?.code ?? 'request_failed', body?.error?.detail, response.status);
  }
  const blob = await response.blob();
  assertCurrentSession(generation);
  return blob;
}

export interface User { id: string; fullName: string; role: 'owner'|'teacher'|'student'; schoolId: string|null }
export interface ClassItem { id:string; name:string; grade:number|null; level:'AS'|'A2'; academicYear:string; studentCount:number }
export interface Question { id:string; displayRef:string; stemMd:string; commandWord:string; marks:number; ao:string; answerKind:string }
export interface Assignment {id:string;classId:string;title:string;mode:string;className:string;totalMarks:number;opensAt:string|null;dueAt:string|null;timeLimitMin:number|null;publishedAt:string|null;submissionStatus:string|null;classSize:number;submittedCount:number;pendingGrading:number}
export interface AttemptQuestion {id:string;displayRef:string;stemMd:string;contextMd:string;commandWord:string;marks:number;answerKind:string;answerText:string;structuredResponse?:StructuredResponse|null;contentJson?:StructuredQuestionContent|null;contentVersion?:1|null;assetUrls?:Record<string,string>;sourceAssets?:PortableSourceAsset[]}
export interface Attempt {submissionId:string;activeSessionId:string;startedAt:string;deadline:string|null;serverNow:string;questions:AttemptQuestion[]}
export interface GradingPoint {id:string;code:string;text:string;matched:boolean|null;marks:number}
export interface GradingItem {id:string;text:string;displayRef:string;stemMd:string;marks:number;answerKind:string;studentName:string;points:GradingPoint[]}
export interface ResultItem {id:string;title:string;className:string;studentName:string;totalScore:number;totalMax:number;percentage:number;grade:string|null;releasedAt:string}
export interface PracticeTarget {subtopicId:string;code:string;title:string}
export interface ResultDetail {gradingId:string;appealStatus:'open'|'accepted'|'rejected'|null;displayRef:string;stemMd:string;marks:number;answerText:string;finalScore:number;feedback:string|null;points:Array<{code:string;text:string;matched:boolean;marks:number}>;contentJson?:StructuredQuestionContent|null;contentVersion?:1|null;assetUrls?:Record<string,string>;sourceAssets?:PortableSourceAsset[];practiceTargets?:PracticeTarget[]}
export interface AppealItem {id:string;gradingId:string;reason:string;createdAt:string;studentName:string;displayRef:string;stemMd:string;answerText:string;finalScore:number;marks:number}
export interface MasteryItem {subtopic_id:string;code:string;title:string;score:number;attempts:number;marksEarned:number;marksPossible:number;compatibilityMapped?:boolean;practiceQuestionCount?:number;practiceReady?:boolean}
export interface CommandWordProgress {commandWord:string;percentage:number;sampleSize:number}
export interface ReviewQuestion {id:string;display_ref:string;stem_md:string;context_md:string|null;marks:number|null;command_word:string|null;answer_kind:string;answer_lines:number;extract_confidence:number;storage_path:string;findings:Array<{id?:string;code:string;severity:string;message:string}>}
export interface Flashcard {flashcard_id:string;front_md:string;back_md:string;hint_md:string|null}
export interface ContentGames {termMatch:Array<{id:string;term:string;definition:string}>;sequence:Array<{id:string;code:string;text:string}>;spotTheGap:Array<{id:string;prompt:string;answer:string}>}
export interface LessonProgress {chapterNo:number;slideId:string;visitedAt:string;completedAt:string|null}
export interface ExportItem {id:string;file_format?:'pdf'|'docx';kind:'question_paper'|'mark_scheme'|'combined'|'feedback';status:'queued'|'running'|'succeeded'|'failed';error:string|null;expires_at:string|null;created_at:string;finished_at:string|null}

export type LiveExamStatus = 'lobby'|'question_open'|'marking'|'review'|'finished'|'cancelled';
export type LiveExamMarkingMode = 'teacher'|'peer'|'self';
export interface LiveExamSummary {
  id:string;classId:string;className:string;title:string;joinCode:string;status:LiveExamStatus;
  markingMode:LiveExamMarkingMode;questionTimeLimitS:number|null;version:number;
  pausedAt:string|null;pauseRemainingS:number|null;
  settings:{allowLateJoin:boolean;autoCloseWhenAllSubmitted:boolean;teacherOverrideEnabled:boolean;leaderboardMode:'marks'|'marks_speed_tiebreak'};
  questionCount:number;participantCount:number;currentQuestionIndex?:number;createdAt:string;updatedAt:string;
}
export interface LiveExamRealtimeEvent {version:number;type:string;createdAt:string}
export interface LiveExamRealtimeCursor {sessionId:string;currentVersion:number;changed:boolean;events:LiveExamRealtimeEvent[]}
export interface LiveExamAsset {id:string;kind:string;storagePath:string|null;url:string|null;contentMd:string|null;altText:string;sortOrder:number;sourcePage:number|null}
export interface LiveExamPortableQuestion {
  leaf:{id:string;rootId:string;label:string;path:string;displayRef:string;stem:string;stemLatex?:string|null;bodyFormat?:'markdown'|'latex';contentJson?:StructuredQuestionContent|null;commandWord:string|null;marks:number;answerKind:string;answerLines:number|null};
  chain:Array<{id:string;label:string;depth:number}>;
  contextBlocks:Array<{id:string;label:string;displayRef:string;depth:number;context:string|null;contextLatex?:string|null;assets:LiveExamAsset[]}>;
  dependencies:Array<{id:string;questionId:string;dependsOnId:string;displayRef:string;stem:string|null;kind:string;strength:string;evidence?:string|null;confidence?:number|null}>;
  sourceRef:string;
}
export interface LiveExamDependencyWork {questionId:string;displayRef:string;kind:string;strength:string;position:number|null;ownAnswer:string|null;submittedAt:string|null}
export interface LiveExamQuestion {id:string;sourceQuestionId:string;position:number;marks:number;portable:LiveExamPortableQuestion;dependencyWork:LiveExamDependencyWork[]}
export interface LiveMarkSchemePoint {id:string;code:string;text:string;marks:number;accept?:unknown;reject?:unknown;requires?:unknown;isBod?:boolean;groupId?:string|null;matched?:boolean}
export interface LiveMarkSchemeLevel {id:string;levelNumber:number;minMarks:number;maxMarks:number;descriptorMd:string;indicativeContentMd:string|null}
export interface LiveMarkScheme {id:string;schemeType:string;maxMarks:number;guidanceMd:string|null;levels:LiveMarkSchemeLevel[];points:LiveMarkSchemePoint[];groups:Array<{id:string;label:string|null;nRequired:number;marksPerPoint:number;maxMarks:number;awardMode?:'fixed'|'point_marks'}>}
export interface LiveExamAnswer {id:string;text:string;structuredResponse?:StructuredResponse|null;wordCount:number;submittedAt:string|null;score:number|null;feedback:string|null;scoreSource:LiveExamMarkingMode|null;moderatedAt:string|null;updatedAt:string;provisionalScore?:number|null;provisionalFeedback?:string|null}
export interface LiveExamReview {id:string;answerId:string;kind:LiveExamMarkingMode;status:'assigned'|'submitted'|'moderated';answerText:string;awardedMarks:number|null;feedback:string|null;submittedAt:string|null;points:LiveMarkSchemePoint[]}
export interface LiveExamSnapshot {
  session:LiveExamSummary&{hostName:string;currentQuestionIndex:number;startedAt:string|null;finishedAt:string|null;questionStartedAt:string|null;deadline:string|null;serverNow:string;submittedCount:number;reviewCount:number;reviewedCount:number};
  questions:Array<{id:string;position:number;marks:number;displayRef:string}>;
  participants:Array<{id:string;studentId:string;fullName:string;joinedAt:string;lastSeenAt:string;online:boolean;submitted:boolean;score:number|null;scoreSource:LiveExamMarkingMode|null}>;
  question:LiveExamQuestion|null;markScheme:LiveMarkScheme|null;ownAnswer:LiveExamAnswer|null;review:LiveExamReview|null;
  teacherAnswers:Array<LiveExamAnswer&{studentName:string;studentId:string;reviewId:string|null;reviewStatus:string|null;reviewKind:LiveExamMarkingMode|null;reviewMatchedPointIds:string[]}>;
  report?:{rows:Array<{questionPosition:number;displayRef:string;marks:number;answerText:string;score:number|null;feedback:string|null;scoreSource:LiveExamMarkingMode|null;studentId?:string;studentName?:string}>;earned:number;possible:number}|null;
}
