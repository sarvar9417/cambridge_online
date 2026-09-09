import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Cambridge Live Challenge release security contract',()=>{
  it('keeps canonical Cambridge source fidelity fail closed',()=>{
    const builder=source('src/services/live-challenge-service.ts');
    expect(builder).toContain("q.status='approved'::review_status");
    expect(builder).toContain("sp.kind='QP'::paper_kind");
    expect(builder).toContain("ms.status='approved'::review_status");
    expect(builder).toContain('q.content_version=1');
    expect(builder).toContain("lower(coalesce(sp.sha256,'')) ~ '^[0-9a-f]{64}$'");
    expect(builder).toContain('question_source_occurrences');
    expect(builder).toContain('validation_findings');
  });

  it('withholds Mark Scheme until the marking/result phase',()=>{
    const domain=source('src/services/live-challenge-domain.ts');
    expect(domain).toContain("status === 'PEER_MARKING' || status === 'ROUND_RESULTS' || status === 'FINISHED'");
    expect(domain).toContain('markScheme: studentCanSeeMarkScheme(input.status) ? input.markScheme : null');
  });

  it('keeps board projection private while revealing Mark Scheme only in allowed phases',()=>{
    const board=source('src/services/live-challenge-board-projection.ts');
    expect(board).not.toContain('answerText');
    expect(board).not.toContain('studentId');
    expect(board).not.toContain('studentName');
    expect(board).toContain("const MARK_SCHEME_VISIBLE=new Set(['PEER_MARKING','ROUND_RESULTS','FINISHED'])");
    expect(board).toContain('markScheme:MARK_SCHEME_VISIBLE.has(state.status)?state.markScheme:null');
    expect(board).toContain('submittedCount');
    expect(board).toContain('joinedCount');
  });

  it('excludes removed students from peer assignment, resolution and mastery evidence',()=>{
    const peer=source('src/services/live-challenge-peer-marking-service.ts');
    const joinedFilters=peer.match(/p\.status='JOINED'/g)??[];
    expect(joinedFilters.length).toBeGreaterThanOrEqual(5);
    expect(peer).toContain('select id,student_id from live_challenge_answers a');
    expect(peer).toContain('insert into mastery');
  });

  it('requires optimistic state versions for teacher-driven runtime transitions',()=>{
    const routes=source('src/routes/live-challenges.ts');
    for(const path of ['/answers/lock','/peer-marking/start','/peer-marking/release','/next','/pause','/resume','/cancel']){
      expect(routes).toContain(path);
    }
    expect(routes).toContain('expectedStateVersion');
    const session=source('src/services/live-challenge-session-service.ts');
    const answer=source('src/services/live-challenge-answer-service.ts');
    const peer=source('src/services/live-challenge-peer-marking-service.ts');
    const moderation=source('src/services/live-challenge-moderation-service.ts');
    for(const text of [session,answer,peer,moderation])expect(text).toContain('live_challenge_state_conflict');
  });

  it('supports notification polling while keeping REST/database state authoritative',()=>{
    const routes=source('src/routes/live-challenges.ts');
    const answers=source('src/services/live-challenge-answer-service.ts');
    expect(routes).toContain("router.get('/:id/events'");
    expect(routes).toContain("router.get('/:id/state'");
    expect(routes).toContain("router.get('/:id/board'");
    expect(answers).toContain('live_challenge_events');
    expect(answers).toContain('afterId');
  });

  it('preserves DB-level answer locking and anti-self-marking constraints',()=>{
    const migration=source('src/database/migrations/0163_live_challenge_foundation.sql');
    expect(migration).toContain('marker_student_id <> answer_student_id');
    expect(migration).toContain('guard_locked_live_challenge_answer_v1');
    expect(migration).toContain('live_challenge_answer_locked');
    expect(migration).toContain('UNIQUE (round_id, student_id)');
    expect(migration).toContain('state_version bigint NOT NULL');
  });
});
