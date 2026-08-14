import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from './lib/actor.js';
import { AssignmentsService, DomainError } from './services/assignments-service.js';
import { GradingService } from './services/grading-service.js';
import { ResultsService } from './services/results-service.js';

const student: Actor = { id: 'student-id', role: 'student', schoolId: 'school-id', fullName: 'Student' };
const owner: Actor = { id: 'owner-id', role: 'owner', schoolId: 'school-id', fullName: 'Owner' };

describe('domain authorization', () => {
  it('staff grading queue rejects students before querying the database', async () => {
    const query = vi.fn();
    await expect(new GradingService({ query } as unknown as Pool).queue(student)).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });

  it('assignment attempt rejects staff before opening a transaction', async () => {
    const connect = vi.fn();
    await expect(new AssignmentsService({ connect } as unknown as Pool).start(owner, 'assignment-id')).rejects.toMatchObject({ status: 403 });
    expect(connect).not.toHaveBeenCalled();
  });

  it('assignment creation rejects students before opening a transaction', async () => {
    const connect = vi.fn();
    await expect(new AssignmentsService({ connect } as unknown as Pool).create(student, { classId: 'class-id', title: 'Test', questionIds: ['question-id'] })).rejects.toMatchObject({ status: 403 });
    expect(connect).not.toHaveBeenCalled();
  });

  it('answer save hides submissions owned by another student', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(new AssignmentsService({ query } as unknown as Pool).saveAnswer(student, 'submission-id', 'question-id', 'answer')).rejects.toMatchObject({ status: 404 });
  });

  it('result list always includes released-only and actor scope predicates', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    await new ResultsService({ query } as unknown as Pool).list(student);
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('s.released_at is not null');
    expect(sql).toContain('s.student_id = $2');
    expect(values).toEqual(['student', 'student-id', 'school-id']);
  });

  it('result detail always includes released-only and school/class scope', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    await new ResultsService({ query } as unknown as Pool).detail(owner, 'submission-id');
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('s.released_at is not null');
    expect(sql).toContain("$2 = 'owner' and c.school_id = $4");
    expect(values).toEqual(['submission-id', 'owner', 'owner-id', 'school-id']);
  });

  it('domain errors retain stable API status and code', () => {
    const error = new DomainError('invalid_score', 400);
    expect(error).toMatchObject({ code: 'invalid_score', status: 400, message: 'invalid_score' });
  });

  it('heartbeat rejects a replaced device session', async () => {
    const query=vi.fn().mockResolvedValueOnce({rows:[{id:'submission',status:'in_progress',started_at:new Date(),active_session_id:'new-session',time_extension_min:0,time_limit_min:30,due_at:null}]});
    await expect(new AssignmentsService({query} as unknown as Pool).heartbeat(student,'submission','old-session')).rejects.toMatchObject({code:'session_replaced',status:409});
  });

  it('heartbeat returns server-authoritative remaining time', async () => {
    const query=vi.fn().mockResolvedValueOnce({rows:[{id:'submission',status:'in_progress',started_at:new Date(),active_session_id:'session',time_extension_min:0,time_limit_min:30,due_at:null}]}).mockResolvedValueOnce({rowCount:1});
    const state=await new AssignmentsService({query} as unknown as Pool).heartbeat(student,'submission','session');
    expect(state.remainingSeconds).toBeGreaterThan(1700);expect(state.status).toBe('in_progress');
  });
  it('staff cannot submit a student grading appeal',async()=>{const query=vi.fn();await expect(new GradingService({query}as unknown as Pool).appeal(owner,'g','A sufficiently long reason')).rejects.toMatchObject({status:403});expect(query).not.toHaveBeenCalled()});
  it('student appeal query requires ownership and release',async()=>{const query=vi.fn().mockResolvedValue({rowCount:0,rows:[]});await expect(new GradingService({query}as unknown as Pool).appeal(student,'g','A sufficiently long reason')).rejects.toMatchObject({status:404});expect(query.mock.calls[0]![0]).toContain('g.released_at is not null')});
  it('students cannot read the staff appeal queue',async()=>{const query=vi.fn();await expect(new GradingService({query}as unknown as Pool).appealQueue(student)).rejects.toMatchObject({status:403});expect(query).not.toHaveBeenCalled()});
  it('students cannot resolve grading appeals',async()=>{const connect=vi.fn();await expect(new GradingService({connect}as unknown as Pool).resolveAppeal(student,'appeal','accepted','Recheck')).rejects.toMatchObject({status:403});expect(connect).not.toHaveBeenCalled()});
  it('students cannot read assignment-wide results',async()=>{const query=vi.fn();await expect(new AssignmentsService({query}as unknown as Pool).results(student,'assignment')).rejects.toMatchObject({status:403});expect(query).not.toHaveBeenCalled()});
  it('assignment results retain class authorization scope',async()=>{const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{submission_id:null,student_name:'Student',status:null,total_score:null,total_max:null,percentage:null,released_at:null}]});const data=await new AssignmentsService({query}as unknown as Pool).results(owner,'assignment');expect(query.mock.calls[0]![0]).toContain("$2='owner' and c.school_id=$3");expect(data[0]).toMatchObject({studentName:'Student',status:'not_started',totalScore:null})});
});
