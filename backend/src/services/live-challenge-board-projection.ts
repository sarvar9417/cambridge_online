export interface LiveChallengeBoardMetrics {
  joinedCount:number;
  answerCount:number;
  assignmentCount:number;
  peerMarkCount:number;
}

interface BoardState {
  id:string;
  title:string;
  className:string;
  syllabusCode:string;
  topicTitle:string|null;
  subtopicTitle:string|null;
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
  joinCode:string|null;
  participantCount:number;
}

const QUESTION_VISIBLE=new Set(['QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS','FINISHED']);
const MARK_SCHEME_VISIBLE=new Set(['PEER_MARKING','ROUND_RESULTS','FINISHED']);
const CODE_VISIBLE=new Set(['PUBLISHED','LOBBY']);

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
    id:state.id,
    title:state.title,
    className:state.className,
    syllabusCode:state.syllabusCode,
    topicTitle:state.topicTitle,
    subtopicTitle:state.subtopicTitle,
    status:state.status,
    stateVersion:state.stateVersion,
    currentQuestionPosition:state.currentQuestionPosition,
    serverNow:state.serverNow,
    round:state.round,
    question:QUESTION_VISIBLE.has(state.status)?state.question:null,
    markScheme:MARK_SCHEME_VISIBLE.has(state.status)?state.markScheme:null,
    joinCode:CODE_VISIBLE.has(state.status)?lobby?.joinCode??null:null,
    joinedCount:metrics.joinedCount,
    submittedCount:metrics.answerCount,
    peerAssignmentCount:metrics.assignmentCount,
    peerMarkCount:metrics.peerMarkCount,
  };
}
