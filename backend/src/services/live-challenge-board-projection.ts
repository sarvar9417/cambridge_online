export interface LiveChallengeBoardMetrics {
  joinedCount:number;
  answerCount:number;
  assignmentCount:number;
  peerMarkCount:number;
}

interface BoardState {
  id:unknown;
  title:unknown;
  className:unknown;
  syllabusCode:unknown;
  topicTitle:unknown;
  subtopicTitle:unknown;
  status:string;
  stateVersion:number;
  currentQuestionPosition:number|null;
  serverNow:string;
  round:unknown;
  question:unknown;
  markScheme:unknown;
  source?:unknown;
}

interface LobbyState {
  joinCode:unknown;
  participantCount:number;
}

const QUESTION_VISIBLE=new Set(['QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS','FINISHED']);
const MARK_SCHEME_VISIBLE=new Set(['PEER_MARKING','ROUND_RESULTS','FINISHED']);
const CODE_VISIBLE=new Set(['PUBLISHED','LOBBY']);
const nullableText=(value:unknown)=>value==null?null:String(value);

/**
 * Public/projector-safe shape for an authenticated classroom board.
 *
 * This intentionally constructs a new allow-listed object rather than deleting
 * fields from the teacher state. New teacher-only fields therefore fail closed:
 * they cannot leak to the board until explicitly added here.
 */
export function projectLiveChallengeForBoard(
  state:BoardState,
  metrics:LiveChallengeBoardMetrics,
  lobby:LobbyState|null,
){
  return {
    id:String(state.id),
    title:String(state.title),
    className:String(state.className),
    syllabusCode:String(state.syllabusCode),
    topicTitle:nullableText(state.topicTitle),
    subtopicTitle:nullableText(state.subtopicTitle),
    status:state.status,
    stateVersion:state.stateVersion,
    currentQuestionPosition:state.currentQuestionPosition,
    serverNow:state.serverNow,
    round:state.round,
    question:QUESTION_VISIBLE.has(state.status)?state.question:null,
    markScheme:MARK_SCHEME_VISIBLE.has(state.status)?state.markScheme:null,
    joinCode:CODE_VISIBLE.has(state.status)&&lobby?.joinCode!=null?String(lobby.joinCode):null,
    joinedCount:metrics.joinedCount,
    submittedCount:metrics.answerCount,
    peerAssignmentCount:metrics.assignmentCount,
    peerMarkCount:metrics.peerMarkCount,
  };
}
