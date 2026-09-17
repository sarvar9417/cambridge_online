import type { StructuredQuestionContent } from './structured-question-content';

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1');
const LIVE_SNAPSHOT_PATH = /^\/live-exams\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIVE_CONTROL_PATH = /^\/live-exams\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/(start|reveal|marking\/complete|next|cancel|open-room|answers\/lock|mark-scheme\/reveal|pause|resume)$/i;
const LIVE_FULL_REFRESH_MS = 15_000;

type LiveSnapshotCacheEntry = { body:unknown; version:number; fetchedAt:number };
type LiveCursor = { currentVersion:number; changed:boolean };
const liveSnapshotCache = new Map<string, LiveSnapshotCacheEntry>();

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  if (token !== accessToken) liveSnapshotCache.clear();
  accessToken = token;
};
export const AUTH_EXPIRED_EVENT = 'campath:auth-expired';
let refreshPromise: Promise<string> | null = null;
let refreshRequest: Promise<Response> | null = null;

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
  accessToken = null;
  liveSnapshotCache.clear();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await send('/auth/refresh', { method: 'POST' }, null);
      const body = await parseBody(response);
      if (!response.ok || typeof body?.accessToken !== 'string') throw new Error(body?.error?.message ?? 'Sessiya muddati tugagan.');
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
  if (path === '/auth/refresh' && init.method?.toUpperCase() === 'POST') {
    // Refresh cookies are single-use. Share the request across startup effects
    // (including StrictMode's replay) and automatic access-token refreshes.
    refreshRequest ??= fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' })
      .finally(() => { refreshRequest = null; });
    // Each caller parses its own body; a Response stream can only be read once.
    return refreshRequest.then((response) => response.clone());
  }
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
}

async function requestJson<T>(path: string, init: RequestInit = {}, options:{suppressAuthExpired?:boolean} = {}): Promise<T> {
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
  if (response.status === 401 && (canRefresh || path === '/auth/refresh') && !options.suppressAuthExpired) expireSession();
  if (!response.ok) {
    throw new ApiError(body?.error?.message ?? 'So‘rov bajarilmadi.', body?.error?.code ?? 'request_failed', body?.error?.detail, response.status);
  }
  return body as T;
}

function liveSnapshotKey(path:string, init:RequestInit) {
  const method=(init.method??'GET').toUpperCase();
  return method==='GET'&&!init.body&&LIVE_SNAPSHOT_PATH.test(path)?path:null;
}

function snapshotVersion(body:unknown) {
  if (!body || typeof body !== 'object' || !('session' in body)) return null;
  const session=(body as {session?:unknown}).session;
  if (!session || typeof session !== 'object' || !('version' in session)) return null;
  const version=(session as {version?:unknown}).version;
  return typeof version==='number'&&Number.isFinite(version)&&version>=0?version:null;
}

function snapshotStatus(body:unknown) {
  if (!body || typeof body !== 'object' || !('session' in body)) return null;
  const session=(body as {session?:unknown}).session;
  if (!session || typeof session !== 'object' || !('status' in session)) return null;
  const status=(session as {status?:unknown}).status;
  return typeof status==='string'?status:null;
}

function rememberLiveSnapshot(key:string, body:unknown, version:number) {
  liveSnapshotCache.set(key,{body,version,fetchedAt:Date.now()});
  if(liveSnapshotCache.size>20){
    const oldest=liveSnapshotCache.keys().next().value as string|undefined;
    if(oldest)liveSnapshotCache.delete(oldest);
  }
}

function jsonBody(init:RequestInit) {
  if(typeof init.body!=='string'||!init.body.trim())return {} as Record<string,unknown>;
  try{
    const parsed=JSON.parse(init.body) as unknown;
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Record<string,unknown>:{};
  }catch{return {} as Record<string,unknown>}
}

async function liveControlRequest<T>(
  path:string,
  init:RequestInit,
  options:{suppressAuthExpired?:boolean},
):Promise<{handled:false}|{handled:true;value:T}> {
  if((init.method??'GET').toUpperCase()!=='POST')return {handled:false};
  const matched=path.match(LIVE_CONTROL_PATH);
  if(!matched)return {handled:false};
  const sessionId=matched[1]!;
  const action=matched[2]!.toLowerCase();
  const snapshotKey=`/live-exams/${sessionId}`;
  const cached=liveSnapshotCache.get(snapshotKey);
  if(!cached)return {handled:false};

  const request=(target:string,body:Record<string,unknown>)=>requestJson<T>(target,{
    ...init,
    method:'POST',
    body:JSON.stringify(body),
  },options);
  const body=jsonBody(init);

  try{
    // The old teacher button combined answer lock and MS reveal. Preserve that
    // UX while executing the new server-authoritative two-step state machine.
    if(action==='reveal'){
      let version=cached.version;
      const status=snapshotStatus(cached.body);
      if(status==='question_open'){
        const locked=await requestJson<{version:number}>(`${snapshotKey}/answers/lock`,{
          method:'POST',body:JSON.stringify({expectedVersion:version}),
        },options);
        version=locked.version;
      }
      const value=await requestJson<T>(`${snapshotKey}/mark-scheme/reveal`,{
        method:'POST',body:JSON.stringify({expectedVersion:version}),
      },options);
      return {handled:true,value};
    }

    const value=await request(path,{...body,expectedVersion:cached.version});
    return {handled:true,value};
  }finally{
    // Any attempted state mutation invalidates the local authority. A stale tab
    // that receives 409 must fetch the authoritative server snapshot next.
    liveSnapshotCache.delete(snapshotKey);
  }
}

export async function api<T>(path: string, init: RequestInit = {}, options:{suppressAuthExpired?:boolean} = {}): Promise<T> {
  const control=await liveControlRequest<T>(path,init,options);
  if(control.handled)return control.value;

  const cacheKey=liveSnapshotKey(path,init);
  if(!cacheKey)return requestJson<T>(path,init,options);

  const cached=liveSnapshotCache.get(cacheKey);
  if(cached&&Date.now()-cached.fetchedAt<LIVE_FULL_REFRESH_MS){
    try{
      const cursor=await requestJson<LiveCursor>(`${path}/events?afterVersion=${cached.version}&limit=1`,{},options);
      if(!cursor.changed&&cursor.currentVersion===cached.version)return cached.body as T;
    }catch{
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

export async function apiBlob(path:string){const tokenUsed=accessToken;let response=await send(path,{},tokenUsed);if(response.status===401&&tokenUsed){if(accessToken===tokenUsed)await refreshAccessToken();response=await send(path,{},accessToken)}if(!response.ok){const body=await parseBody(response);throw new Error(body?.error?.message??'Fayl yuklanmadi.')}return response.blob()}

export interface User { id: string; fullName: string; role: 'owner'|'teacher'|'student'; schoolId: string|null }
export interface ClassItem { id:string; name:string; grade:number|null; level:'AS'|'A2'; academicYear:string; studentCount:number }
export interface Question { id:string; displayRef:string; stemMd:string; commandWord:string; marks:number; ao:string; answerKind:string }
export interface Assignment {id:string;classId:string;title:string;mode:string;className:string;totalMarks:number;opensAt:string|null;dueAt:string|null;timeLimitMin:number|null;publishedAt:string|null;submissionStatus:string|null;classSize:number;submittedCount:number;pendingGrading:number}
export interface AttemptQuestion {id:string;displayRef:string;stemMd:string;contextMd:string;commandWord:string;marks:number;answerKind:string;answerText:string;contentJson?:StructuredQuestionContent|null;contentVersion?:1|null;assetUrls?:Record<string,string>}
export interface Attempt {submissionId:string;activeSessionId:string;startedAt:string;deadline:string|null;serverNow:string;questions:AttemptQuestion[]}
export interface GradingPoint {id:string;code:string;text:string;matched:boolean|null;marks:number}
export interface GradingItem {id:string;text:string;displayRef:string;stemMd:string;marks:number;answerKind:string;studentName:string;points:GradingPoint[]}
export interface ResultItem {id:string;title:string;className:string;studentName:string;totalScore:number;totalMax:number;percentage:number;grade:string|null;releasedAt:string}
export interface PracticeTarget {subtopicId:string;code:string;title:string}
export interface ResultDetail {gradingId:string;appealStatus:'open'|'accepted'|'rejected'|null;displayRef:string;stemMd:string;marks:number;answerText:string;finalScore:number;feedback:string|null;points:Array<{code:string;text:string;matched:boolean;marks:number}>;contentJson?:StructuredQuestionContent|null;contentVersion?:1|null;assetUrls?:Record<string,string>;practiceTargets?:PracticeTarget[]}
export interface AppealItem {id:string;gradingId:string;reason:string;createdAt:string;studentName:string;displayRef:string;stemMd:string;answerText:string;finalScore:number;marks:number}
export interface MasteryItem {subtopic_id:string;code:string;title:string;score:number;attempts:number;marksEarned:number;marksPossible:number;compatibilityMapped?:boolean;practiceQuestionCount?:number;practiceReady?:boolean}
export interface CommandWordProgress {commandWord:string;percentage:number;sampleSize:number}
export interface ReviewQuestion {id:string;display_ref:string;stem_md:string;context_md:string|null;marks:number|null;command_word:string|null;answer_kind:string;answer_lines:number;extract_confidence:number;storage_path:string;findings:Array<{id?:string;code:string;severity:string;message:string}>}
export interface Flashcard {flashcard_id:string;front_md:string;back_md:string;hint_md:string|null}
export interface ContentGames {termMatch:Array<{id:string;term:string;definition:string}>;sequence:Array<{id:string;code:string;text:string}>;spotTheGap:Array<{id:string;prompt:string;answer:string}>}
export interface LessonProgress {chapterNo:number;slideId:string;visitedAt:string;completedAt:string|null}
export interface ExportItem {id:string;kind:'question_paper'|'mark_scheme'|'combined'|'feedback';status:'queued'|'running'|'succeeded'|'failed';error:string|null;expires_at:string|null;created_at:string;finished_at:string|null}

export type LiveExamStatus = 'draft'|'published'|'lobby'|'question_open'|'answers_locked'|'marking'|'review'|'paused'|'finished'|'cancelled';
export type LiveExamMarkingMode = 'teacher'|'peer'|'self';
export interface LiveExamSummary {
  id:string;classId:string;className:string;title:string;joinCode:string|null;status:LiveExamStatus;
  markingMode:LiveExamMarkingMode;questionTimeLimitS:number|null;version:number;
  questionCount:number;participantCount:number;currentQuestionIndex?:number;createdAt:string;updatedAt:string;
}
export interface LiveExamRealtimeEvent {version:number;type:string;createdAt:string}
export interface LiveExamRealtimeCursor {sessionId:string;currentVersion:number;changed:boolean;events:LiveExamRealtimeEvent[]}
export interface LiveExamAsset {id:string;kind:string;storagePath:string|null;url:string|null;contentMd:string|null;altText:string;sortOrder:number;sourcePage:number|null}
export interface LiveExamPortableQuestion {
  leaf:{id:string;rootId:string;label:string;path:string;displayRef:string;stem:string;stemLatex?:string|null;bodyFormat?:'markdown'|'latex';contentJson?:StructuredQuestionContent|null;commandWord:string|null;marks:number;answerKind:string;answerLines:number|null};
  chain:Array<{id:string;label:string;depth:number}>;
  contextBlocks:Array<{id:string;label:string;displayRef:string;depth:number;context:string|null;contextLatex?:string|null;assets:LiveExamAsset[]}>;
  dependencies:Array<{id:string;questionId:string;dependsOnId:string;displayRef:string;stem:string|null;kind:string;strength:string;evidence:string|null;confidence:number|null}>;
  sourceRef:string;
}
export interface LiveExamQuestion {id:string;sourceQuestionId:string;position:number;marks:number;portable:LiveExamPortableQuestion}
export interface LiveMarkSchemePoint {id:string;code:string;text:string;marks:number;accept?:unknown;reject?:unknown;requires?:unknown;isBod?:boolean;groupId?:string|null;matched?:boolean}
export interface LiveMarkScheme {id:string;schemeType:string;maxMarks:number;guidanceMd:string|null;points:LiveMarkSchemePoint[];groups:Array<{id:string;label:string|null;nRequired:number;marksPerPoint:number;maxMarks:number;awardMode?:'fixed'|'point_marks'}>}
export interface LiveExamAnswer {id:string;text:string;wordCount:number;submittedAt:string|null;score:number|null;feedback:string|null;scoreSource:LiveExamMarkingMode|null;moderatedAt:string|null}
export interface LiveExamReview {id:string;answerId:string;kind:LiveExamMarkingMode;status:'assigned'|'submitted'|'moderated';answerText:string;awardedMarks:number|null;feedback:string|null;submittedAt:string|null;points:LiveMarkSchemePoint[]}
export interface LiveExamSnapshot {
  session:LiveExamSummary&{hostName:string;currentQuestionIndex:number;startedAt:string|null;finishedAt:string|null;questionStartedAt:string|null;deadline:string|null;serverNow:string;submittedCount:number;reviewCount:number;reviewedCount:number};
  questions:Array<{id:string;position:number;marks:number;displayRef:string}>;
  participants:Array<{id:string;studentId:string;fullName:string;joinedAt:string;lastSeenAt:string;online:boolean;submitted:boolean;score:number|null;scoreSource:LiveExamMarkingMode|null}>;
  question:LiveExamQuestion|null;markScheme:LiveMarkScheme|null;ownAnswer:LiveExamAnswer|null;review:LiveExamReview|null;
  teacherAnswers:Array<LiveExamAnswer&{studentName:string;studentId:string;reviewId:string|null;reviewStatus:string|null;reviewKind:LiveExamMarkingMode|null}>;
  report?:{rows:Array<{questionPosition:number;displayRef:string;marks:number;answerText:string;score:number|null;scoreSource:LiveExamMarkingMode|null;studentId?:string;studentName?:string}>;earned:number;possible:number}|null;
}
