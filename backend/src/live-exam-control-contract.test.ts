import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const service=source('src/services/live-exam-control-service.ts');
const route=source('src/routes/live-exam-control.ts');
const app=source('src/app.ts');

describe('Cambridge Live Challenge Phase 3 control contract',()=>{
  it('locks the authoritative session before every CAS lifecycle mutation',()=>{
    expect(service).toContain('for update of les');
    expect(service.match(/assertExpectedLiveExamVersion\(session, expectedVersion\)/g)?.length).toBeGreaterThanOrEqual(8);
    expect(service).toContain("new DomainError('live_state_conflict', 409)");
  });

  it('separates answer lock from Mark Scheme reveal',()=>{
    expect(service).toContain("set status='answers_locked'");
    expect(service).toContain("'answers.locked'");
    expect(service).toContain("session.status !== 'answers_locked'");
    expect(service).toContain("set status='marking',mark_scheme_revealed_at=now()");
    expect(route).toContain("router.post('/:id/answers/lock'");
    expect(route).toContain("router.post('/:id/mark-scheme/reveal'");
  });

  it('fails peer marking closed rather than assigning self review',()=>{
    expect(service).toContain("mode === 'peer' && (answers.rowCount ?? 0) < 2");
    expect(service).toContain("new DomainError('live_peer_assignment_impossible', 409)");
    expect(service).toContain("kind:'peer' as const");
  });

  it('opens published challenges into the joinable lobby explicitly',()=>{
    expect(service).toContain("session.status !== 'published'");
    expect(service).toContain("set status='lobby'");
    expect(service).toContain("'room.opened'");
    expect(route).toContain("router.post('/:id/open-room'");
  });

  it('pauses and resumes question timing without consuming the paused interval',()=>{
    expect(service).toContain("set paused_from_status=status,status='paused',paused_at=now()");
    expect(service).toContain("then question_started_at + (now()-paused_at)");
    expect(service).toContain("'session.paused'");
    expect(service).toContain("'session.resumed'");
  });

  it('mounts version-aware controls before the generic live-exams router',()=>{
    const control=app.indexOf('createLiveExamControlRouter');
    const generic=app.indexOf('createLiveExamsRouter(new LiveExamService');
    expect(control).toBeGreaterThan(-1);
    expect(generic).toBeGreaterThan(control);
  });

  it('keeps legacy state routes reachable only during the explicit compatibility window',()=>{
    expect(route).toContain('if (version === undefined) { next(); return; }');
    expect(route).toContain('Version-aware teacher controls mount before the legacy live-exams router');
  });
});
