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
const integrityHardening=source('src/database/migrations/0191_live_challenge_integrity_and_deadline_hardening.sql');
const joinCodeLifecycle=source('src/database/migrations/0192_live_challenge_join_code_lifecycle.sql');

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

  it('freezes official response levels and validates the authoritative deadline grace',()=>{
    expect(service).toContain("'levels',coalesce((select jsonb_agg(jsonb_build_object(");
    expect(service).toContain("'levelNumber',msl.level_number");
    expect(service).toContain('const QUESTION_DEADLINE_GRACE_S = 10;');
    expect(service).toContain('closeExpiredQuestion(sessionId)');
    expect(service).toContain("new DomainError('score_outside_level', 400)");
  });

  it('keeps class membership and live participation at the join boundary',()=>{
    expect(service).toContain('join enrollments e on e.class_id=les.class_id and e.student_id=$2 and e.left_at is null');
    expect(service).toContain("where les.join_code=$1 and les.join_code_expires_at > now() and (");
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

  it('snapshots official response levels and fails closed when they are absent',()=>{
    expect(service).toContain("'levels',coalesce((select jsonb_agg");
    expect(service).toContain("'levelNumber',msl.level_number");
    expect(service).toContain("ms.scheme_type <> 'levels_of_response'::scheme_type");
    expect(source('../frontend/src/lib/api.ts')).toContain('LiveMarkSchemeLevel');
    expect(source('../frontend/src/live/LiveExamPage.tsx')).toContain('scheme.levels.map');
  });

  it('protects cross-session rows, score caps and trigger search paths at the database boundary',()=>{
    expect(integrityHardening).toContain('live_answer_session_mismatch');
    expect(integrityHardening).toContain('live_review_session_mismatch');
    expect(integrityHardening).toContain('live_answer_score_exceeds_marks');
    expect(integrityHardening).toContain('live_review_point_score_exceeds_marks');
    expect(integrityHardening).toContain('live_exam_events_session_version_unique');
    expect(integrityHardening.match(/SET search_path = public, pg_temp;/g)).toHaveLength(4);
    expect(integrityHardening).toContain('ALTER FUNCTION public.persist_live_exam_learning_evidence()');
  });

  it('makes voluntary leave a lobby-only action',()=>{
    expect(service).toContain("if (session.rows[0].status !== 'lobby') throw new DomainError('live_invalid_state', 409);");
  });

  it('bounds join-code collisions and expires reusable codes safely',()=>{
    expect(service).toContain('for (let attempt = 0; attempt < 5; attempt += 1)');
    expect(service).toContain('join_code_expires_at > now()');
    expect(joinCodeLifecycle).toContain('live_exam_sessions_active_join_code_unique');
    expect(joinCodeLifecycle).toContain("interval '24 hours'");
    expect(joinCodeLifecycle).toContain('live_join_code_retention');
  });
});
