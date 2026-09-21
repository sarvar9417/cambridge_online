import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

const service=source('src/services/live-exam-service.ts');
const participation=source('src/services/live-exam-participation-service.ts');
const realtimeService=source('src/services/live-exam-realtime-service.ts');
const realtimeRoute=source('src/routes/live-exam-realtime.ts');
const schema=source('src/database/migrations/0166_live_exam_sessions.sql');
const peerIntegrity=source('src/database/migrations/0168_live_exam_peer_integrity.sql');
const overrideAudit=source('src/database/migrations/0169_live_exam_override_audit.sql');
const learningEvidence=source('src/database/migrations/0170_live_exam_learning_evidence.sql');

describe('Live Exam release security and recovery contract',()=>{
  it('keeps one canonical Cambridge question identity while snapshotting assessment evidence',()=>{
    expect(schema).toContain('question_id uuid NOT NULL REFERENCES questions');
    expect(schema).toContain('question_snapshot jsonb NOT NULL');
    expect(schema).toContain('mark_scheme_snapshot jsonb NOT NULL');
    expect(service).toContain("`q.status='approved'`");
    expect(service).toContain("`ms.status='approved'`");
    expect(service).toContain('not exists(select 1 from question_dependencies qd where qd.question_id=q.id)');
  });

  it('never returns the Mark Scheme to a student during an open question',()=>{
    expect(service).toContain("const reveal = ['marking', 'review', 'finished'].includes(String(session.status));");
    expect(service).toContain('markScheme: reveal && currentRow ? currentRow.mark_scheme_snapshot : null');
    expect(service).toContain('if (reveal) review = await this.reviewFor(actor, sessionId, String(currentRow.id));');
  });

  it('keeps class membership and live participation at the join boundary',()=>{
    expect(participation).toContain('join enrollments e on e.class_id=les.class_id and e.student_id=$2 and e.left_at is null');
    expect(participation).toContain('where les.join_code=$1');
    expect(participation).toContain("status!=='lobby'");
    expect(participation).toContain("if(actor.role!=='student')throw new DomainError('students_only',403)");
  });

  it('keeps student snapshots private while retaining teacher classroom visibility',()=>{
    expect(service).toContain("($2='student' and lep.id is not null)");
    expect(service).toContain('questions: isStaff ? questionRows.rows.map');
    expect(service).toContain('participants: isStaff ? participants.map');
    expect(service).toContain('teacherAnswers = answerResult.rows.map');
    expect(service).toContain("if (currentRow && isStaff && reveal)");
  });

  it('serializes answer writes against the teacher lock/reveal transition',()=>{
    expect(service).toContain("select status::text from live_exam_sessions where id=$1 for share");
    expect(service).toContain("select status::text from live_exam_sessions where id=$1 for update");
    expect(service).toContain('for update of les');
    expect(service).toContain('and a.submitted_at is null');
    expect(service).toContain("if (session.status !== 'question_open') throw new DomainError('live_invalid_state', 409)");
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
    expect(learningEvidence).toContain('live_exam_analytics_unmapped_question');
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
});
