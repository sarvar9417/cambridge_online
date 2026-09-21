import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

const service=source('src/services/live-exam-service.ts');
const realtimeService=source('src/services/live-exam-realtime-service.ts');
const realtimeRoute=source('src/routes/live-exam-realtime.ts');
const schema=source('src/database/migrations/0166_live_exam_sessions.sql');
const peerIntegrity=source('src/database/migrations/0168_live_exam_peer_integrity.sql');
const overrideAudit=source('src/database/migrations/0169_live_exam_override_audit.sql');
const learningEvidence=source('src/database/migrations/0170_live_exam_learning_evidence.sql');
const subtopicEvidence=source('src/database/migrations/0190_live_challenge_subtopic_evidence_fallback.sql');
const unifiedControls=source('src/database/migrations/0172_unified_live_challenge_controls.sql');

describe('Live Exam release security and recovery contract',()=>{
  it('keeps one canonical Cambridge question identity while snapshotting assessment evidence',()=>{
    expect(schema).toContain('question_id uuid NOT NULL REFERENCES questions');
    expect(schema).toContain('question_snapshot jsonb NOT NULL');
    expect(schema).toContain('mark_scheme_snapshot jsonb NOT NULL');
    expect(service).toContain("`q.status='approved'`");
    expect(service).toContain("`ms.status='approved'`");
    expect(service).toContain('with recursive closure(question_id)');
    expect(service).toContain("qd.strength::text='required'");
    expect(service).not.toContain('q.parent_id is not null');
  });

  it('never returns the Mark Scheme to a student during an open question',()=>{
    expect(service).toContain("const reveal = ['marking', 'review', 'finished'].includes(String(session.status));");
    expect(service).toContain('markScheme: reveal && currentRow ? currentRow.mark_scheme_snapshot : null');
    expect(service).toContain('if (reveal) review = await this.reviewFor(actor, sessionId, String(currentRow.id));');
  });

  it('keeps class membership and live participation at the join boundary',()=>{
    expect(service).toContain('join enrollments e on e.class_id=les.class_id and e.student_id=$2 and e.left_at is null');
    expect(service).toContain("where les.join_code=$1 and (");
    expect(service).toContain("les.status='lobby'");
    expect(service).toContain("les.settings->>'allowLateJoin'");
    expect(service).toContain("if (actor.role !== 'student') throw new DomainError('students_only', 403)");
  });

  it('keeps internal dependency evidence out of learner snapshots',()=>{
    expect(service).toContain("Omit<PortableQuestion['dependencies'][number], 'evidence' | 'confidence'>");
    expect(service).toContain('dependencies: portable.dependencies.map(({ evidence: _evidence, confidence: _confidence, ...dependency }) => dependency)');
    expect(service).toContain('dependencyWork: dependencyWork.rows.map');
  });

  it('keeps student snapshots private while retaining teacher classroom visibility',()=>{
    expect(service).toContain("($2='student' and lep.id is not null)");
    expect(service).toContain('questions: isStaff ? questionRows.rows.map');
    expect(service).toContain('participants: isStaff ? participants.map');
    expect(service).toContain('teacherAnswers = answerResult.rows.map');
    expect(service).toContain("if (currentRow && isStaff && reveal)");
  });

  it('serializes answer writes against the teacher lock/reveal transition',()=>{
    expect(service).toContain("select status::text,paused_at from live_exam_sessions where id=$1 for share");
    expect(service).toContain("select * from live_exam_sessions where id=$1 for update");
    expect(service).toContain('for update of les');
    expect(service).toContain('and a.submitted_at is null');
    expect(service).toContain("if (session.status !== 'question_open' || session.paused_at) throw new DomainError('live_invalid_state', 409)");
  });

  it('separates answer locking from Mark Scheme reveal',()=>{
    expect(service).toContain("set status='answers_locked',answers_locked_at=now(),mark_scheme_revealed_at=null");
    expect(service).toContain("'answers.locked'");
    expect(service).toContain("if (session.status !== 'answers_locked' || session.paused_at)");
    expect(service).toContain("set status='marking',mark_scheme_revealed_at=now()");
  });

  it('projects projector state through an explicit learner-safe allow-list',()=>{
    const board=service.slice(service.indexOf('async board('),service.indexOf('private async reviewFor'));
    expect(board).toContain("joinCode: session.status === 'lobby' ? session.joinCode : null");
    expect(board).toContain("question: session.status === 'question_open' ? snapshot.question : null");
    expect(board).toContain("markScheme: session.status === 'marking' ? snapshot.markScheme : null");
    expect(board).not.toContain('participants:');
    expect(board).not.toContain('teacherAnswers');
    expect(board).not.toContain('ownAnswer');
    expect(board).not.toContain('review:');
    expect(board).not.toContain('report:');
  });

  it('keeps peer mode structurally incapable of self marking',()=>{
    expect(peerIntegrity).toContain("session_marking_mode = 'peer'");
    expect(peerIntegrity).toContain("NEW.kind <> 'peer'");
    expect(peerIntegrity).toContain('NEW.reviewer_id = answer_student_id');
    expect(peerIntegrity).toContain("MESSAGE = 'live_peer_assignment_impossible'");
  });

  it('preserves every teacher score override as append-only audit evidence',()=>{
    expect(overrideAudit).toContain('CREATE TABLE live_exam_score_overrides');
    expect(overrideAudit).toContain('previous_score numeric(5,2)');
    expect(overrideAudit).toContain('new_score numeric(5,2) NOT NULL');
    expect(overrideAudit).toContain('CREATE TRIGGER live_exam_answers_override_audit');
    expect(overrideAudit).toContain('REVOKE ALL ON live_exam_score_overrides FROM anon, authenticated');
  });

  it('publishes academic evidence only into the class target syllabus',()=>{
    expect(learningEvidence).toContain('SELECT c.syllabus_id INTO target_syllabus_id');
    expect(learningEvidence).toContain('direct_t.syllabus_id = target_syllabus_id');
    expect(learningEvidence).toContain('learning_objective_compatibility compat');
    expect(learningEvidence).toContain("compat.relation IN ('equivalent','subtopic_compatible')");
    expect(learningEvidence).toContain('target_t.syllabus_id = target_syllabus_id');
    expect(subtopicEvidence).toContain('live_exam_analytics_unmapped_question');
    expect(subtopicEvidence).toContain('NULL::uuid learning_objective_id');
    expect(subtopicEvidence).toContain("'stable_subtopic'::text mapping_basis");
    expect(subtopicEvidence).toContain('target_t.number = source_t.number');
    expect(subtopicEvidence).toContain('target_st.code = source_st.code');
    expect(learningEvidence).toContain('marks remain the unit of evidence; speed and leaderboard position never');
  });

  it('uses realtime only as a notification cursor and recovers from authoritative snapshots',()=>{
    expect(realtimeService).toContain('database session remains authoritative');
    expect(realtimeService).toContain('select session_version,event_type,created_at');
    expect(realtimeService).not.toContain('answer_text');
    expect(realtimeService).not.toContain('mark_scheme_snapshot');
    expect(realtimeRoute).toContain("res.set('Cache-Control','private, no-store')");
  });

  it('keeps state changes versioned so reconnecting clients can detect missed events',()=>{
    expect(schema).toContain('version bigint NOT NULL DEFAULT 1 CHECK (version > 0)');
    expect(schema).toContain('session_version bigint NOT NULL');
    expect(schema).toContain('live_exam_events_session_version_idx');
    expect(service).toContain('set version=version+1,updated_at=now()');
  });

  it('keeps pause, late join and participant removal inside the canonical Live Exam boundary',()=>{
    expect(unifiedControls).toContain('ALTER TABLE live_exam_sessions');
    expect(unifiedControls).not.toContain('CREATE TABLE live_challenge');
    expect(service).toContain("'session.paused'");
    expect(service).toContain("'session.resumed'");
    expect(service).toContain("'participant.removed'");
    expect(service).toContain("les.settings->>'allowLateJoin'");
    expect(service).toContain('live_state_conflict');
  });
});
