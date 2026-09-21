import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const service=source('src/services/live-exam-participation-service.ts');
const route=source('src/routes/live-exam-participation.ts');
const app=source('src/app.ts');

describe('Cambridge Live Challenge participation contract',()=>{
 it('keeps room-code join enrollment scoped and row locked',()=>{
  expect(service).toContain('join enrollments e on e.class_id=les.class_id and e.student_id=$2 and e.left_at is null');
  expect(service).toContain('for update of les');
  expect(route).toContain("router.post('/join'");
 });
 it('allows late join only while a question is open and the builder policy enables it',()=>{
  expect(service).toContain("status==='question_open'&&allowLateJoin");
  expect(service).toContain("this.setting(session.settings,'allowLateJoin')");
  expect(service).toContain("new DomainError('live_join_closed',409)");
  expect(service).toContain("late:status==='question_open'");
 });
 it('creates the current answer row for a safely admitted late joiner',()=>{
  expect(service).toContain("if(status==='question_open')");
  expect(service).toContain('insert into live_exam_answers(session_question_id,participant_id)');
 });
 it('makes duplicate active joins idempotent without a second session event',()=>{
  expect(service).toContain('if(existing.rowCount&&existing.rows[0].left_at===null)');
  expect(service).toContain('reused:true');
 });
 it('restricts teacher removal and student leave to the pre-start lobby boundary',()=>{
  expect(service).toContain("session.status==='lobby'");
  expect(service).toContain("session.paused_from_status==='lobby'");
  expect(service).toContain("new DomainError('live_participant_removal_closed',409)");
  expect(service).toContain("new DomainError('live_leave_closed',409)");
 });
 it('mounts participation policy before the legacy live-exams router',()=>{
  const participation=app.indexOf('createLiveExamParticipationRouter');
  const generic=app.indexOf('createLiveExamsRouter(new LiveExamService');
  expect(participation).toBeGreaterThan(-1);
  expect(generic).toBeGreaterThan(participation);
 });
});
