import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';

export class DomainError extends Error {
  constructor(
    public code: string,
    public status: 400 | 403 | 404 | 409 | 422 | 429,
  ) {
    super(code);
  }
}

export class AssignmentsService {
  constructor(private pool: Pool) {}
  async create(
    actor: Actor,
    input: {
      classId: string;
      title: string;
      instructions?: string;
      dueAt?: string;
      timeLimitMin?: number;
      questionIds: string[];
    },
  ) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const visible = await client.query(
        `select 1 from classes c where c.id=$1 and (($2='owner' and c.school_id=$3) or ($2='teacher' and(c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4))))`,
        [input.classId, actor.role, actor.schoolId, actor.id],
      );
      if (!visible.rowCount) throw new DomainError('not_found', 404);
      const marks = await client.query(
        `select count(*)::int count,coalesce(sum(marks),0)::int total from questions where id=any($1::uuid[]) and status in('approved','manual') and parent_id is not null`,
        [input.questionIds],
      );
      if (marks.rows[0].count !== input.questionIds.length)
        throw new DomainError('invalid_questions', 400);
      const assignment = await client.query(
        `insert into assignments(class_id,created_by,title,instructions_md,total_marks,opens_at,due_at,time_limit_min,published_at) values($1,$2,$3,$4,$5,now(),$6,$7,now()) returning id,title,total_marks`,
        [
          input.classId,
          actor.id,
          input.title,
          input.instructions ?? null,
          marks.rows[0].total,
          input.dueAt ?? null,
          input.timeLimitMin ?? null,
        ],
      );
      for (const [index, id] of input.questionIds.entries())
        await client.query(
          `insert into assignment_questions(assignment_id,question_id,sort_order)values($1,$2,$3)`,
          [assignment.rows[0].id, id, index + 1],
        );
      await client.query('commit');
      return assignment.rows[0];
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
  async list(actor: Actor) {
    const values: unknown[] = [actor.id];
    const scope =
      actor.role === 'student'
        ? `exists(select 1 from enrollments e where e.class_id=a.class_id and e.student_id=$1 and e.left_at is null) and a.published_at is not null`
        : actor.role === 'owner'
          ? `exists(select 1 from classes c where c.id=a.class_id and c.school_id=$2)`
          : `exists(select 1 from classes c where c.id=a.class_id and (c.owner_id=$1 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$1)))`;
    if (actor.role === 'owner') values.push(actor.schoolId);
    const r = await this.pool.query(
      `select a.id,a.title,a.mode,a.total_marks,a.opens_at,a.due_at,a.time_limit_min,a.published_at,c.name class_name,
      s.id submission_id,s.status submission_status from assignments a join classes c on c.id=a.class_id
      left join submissions s on s.assignment_id=a.id and s.student_id=$1 where a.archived_at is null and ${scope} order by a.due_at nulls last`,
      values,
    );
    return r.rows.map((x) => ({
      id: x.id,
      title: x.title,
      mode: x.mode,
      totalMarks: x.total_marks,
      opensAt: x.opens_at,
      dueAt: x.due_at,
      timeLimitMin: x.time_limit_min,
      publishedAt: x.published_at,
      className: x.class_name,
      submissionId: x.submission_id,
      submissionStatus: x.submission_status,
    }));
  }
  async results(actor: Actor, assignmentId: string) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    const result = await this.pool.query(
      `select s.id submission_id,u.full_name student_name,s.status,s.total_score,s.total_max,s.percentage,s.released_at
      from assignments a join classes c on c.id=a.class_id
      join enrollments e on e.class_id=c.id and e.left_at is null join users u on u.id=e.student_id
      left join submissions s on s.assignment_id=a.id and s.student_id=u.id
      where a.id=$1 and (($2='owner' and c.school_id=$3) or ($2='teacher' and (c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4))))
      order by u.full_name`,
      [assignmentId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) {
      const visible = await this.pool.query(
        `select 1 from assignments a join classes c on c.id=a.class_id where a.id=$1 and (($2='owner' and c.school_id=$3) or ($2='teacher' and (c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4))))`,
        [assignmentId, actor.role, actor.schoolId, actor.id],
      );
      if (!visible.rowCount) throw new DomainError('not_found', 404);
    }
    return result.rows.map((row) => ({
      submissionId: row.submission_id,
      studentName: row.student_name,
      status: row.status ?? 'not_started',
      totalScore: row.total_score === null ? null : Number(row.total_score),
      totalMax: row.total_max === null ? null : Number(row.total_max),
      percentage: row.percentage === null ? null : Number(row.percentage),
      releasedAt: row.released_at,
    }));
  }
  async update(
    actor: Actor,
    id: string,
    input: {
      title?: string;
      dueAt?: string | null;
      timeLimitMin?: number | null;
      published?: boolean;
    },
  ) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    const r = await this.pool.query(
      `update assignments a set title=coalesce($2,title),due_at=case when $3 then $4::timestamptz else due_at end,time_limit_min=case when $5 then $6::int else time_limit_min end,published_at=case when $7 then coalesce(published_at,now()) else published_at end where a.id=$1 and exists(select 1 from classes c where c.id=a.class_id and (($8='owner'and c.school_id=$9)or($8='teacher'and(c.owner_id=$10 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$10)))))returning id,title,due_at,time_limit_min,published_at`,
      [
        id,
        input.title ?? null,
        'dueAt' in input,
        input.dueAt ?? null,
        'timeLimitMin' in input,
        input.timeLimitMin ?? null,
        input.published ?? false,
        actor.role,
        actor.schoolId,
        actor.id,
      ],
    );
    if (!r.rowCount) throw new DomainError('not_found', 404);
    return r.rows[0];
  }
  async submission(actor: Actor, id: string) {
    const r = await this.pool.query(
      `select s.*,a.title from submissions s join assignments a on a.id=s.assignment_id join classes c on c.id=a.class_id where s.id=$1 and (($2='student'and s.student_id=$3)or($2='owner'and c.school_id=$4)or($2='teacher'and(c.owner_id=$3 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3))))`,
      [id, actor.role, actor.id, actor.schoolId],
    );
    if (!r.rowCount) throw new DomainError('not_found', 404);
    return r.rows[0];
  }
  async extend(actor: Actor, id: string, minutes: number) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    await this.submission(actor, id);
    return (
      await this.pool.query(
        `update submissions set time_extension_min=time_extension_min+$2 where id=$1 returning id,time_extension_min`,
        [id, minutes],
      )
    ).rows[0];
  }
  async session(actor: Actor, id: string, open: boolean) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    const code = open ? String(Math.floor(100000 + Math.random() * 900000)) : null;
    const r = await this.pool.query(
      `update assignments a set session_code=$2,session_opened_at=case when $3 then now()else null end where a.id=$1 and exists(select 1 from classes c where c.id=a.class_id and (($4='owner'and c.school_id=$5)or($4='teacher'and(c.owner_id=$6 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$6)))))returning id,session_code`,
      [id, code, open, actor.role, actor.schoolId, actor.id],
    );
    if (!r.rowCount) throw new DomainError('not_found', 404);
    return r.rows[0];
  }
  async start(actor: Actor, assignmentId: string, clientSessionId?: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const ar = await client.query(
        `select a.* from assignments a join enrollments e on e.class_id=a.class_id
        where a.id=$1 and e.student_id=$2 and e.left_at is null and a.published_at is not null for update`,
        [assignmentId, actor.id],
      );
      const a = ar.rows[0];
      if (!a) throw new DomainError('not_found', 404);
      if (a.opens_at && new Date(a.opens_at) > new Date())
        throw new DomainError('assignment_not_open', 409);
      if (a.due_at && new Date(a.due_at) < new Date() && !a.allow_late)
        throw new DomainError('assignment_closed', 409);
      const sid = clientSessionId ?? randomUUID();
      const sr = await client.query(
        `insert into submissions(assignment_id,student_id,status,started_at,active_session_id)
        values($1,$2,'in_progress',now(),$3) on conflict(assignment_id,student_id) do update set
        status=case when submissions.status='not_started' then 'in_progress'::submission_status else submissions.status end,
        started_at=case when submissions.status='not_started' then now() else submissions.started_at end,
        active_session_id=case when submissions.status in ('not_started','in_progress') then excluded.active_session_id else submissions.active_session_id end
        returning *`,
        [assignmentId, actor.id, sid],
      );
      const s = sr.rows[0];
      if (!['not_started', 'in_progress'].includes(s.status))
        throw new DomainError('already_submitted', 409);
      const qr = await client.query(
        `select q.id,q.display_ref,q.stem_md,q.context_md,q.command_word,q.marks,q.answer_kind,
        p.context_md parent_context,ans.text answer_text from assignment_questions aq join questions q on q.id=aq.question_id
        left join questions p on p.id=q.parent_id left join answers ans on ans.submission_id=$1 and ans.question_id=q.id
        where aq.assignment_id=$2 order by aq.sort_order`,
        [s.id, assignmentId],
      );
      await client.query('commit');
      const deadline = a.time_limit_min
        ? new Date(
            new Date(s.started_at).getTime() + (a.time_limit_min + s.time_extension_min) * 60000,
          )
        : a.due_at;
      return {
        submissionId: s.id,
        activeSessionId: sid,
        startedAt: s.started_at,
        deadline,
        serverNow: new Date(),
        questions: qr.rows.map((q) => ({
          id: q.id,
          displayRef: q.display_ref,
          stemMd: q.stem_md,
          contextMd: q.parent_context ?? q.context_md,
          commandWord: q.command_word,
          marks: q.marks,
          answerKind: q.answer_kind,
          answerText: q.answer_text ?? '',
        })),
      };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
  async saveAnswer(
    actor: Actor,
    submissionId: string,
    questionId: string,
    text: string,
    sessionId?: string,
  ) {
    const r = await this.pool.query(
      `select s.*,a.time_limit_min,a.due_at from submissions s join assignments a on a.id=s.assignment_id where s.id=$1 and s.student_id=$2`,
      [submissionId, actor.id],
    );
    const s = r.rows[0];
    if (!s) throw new DomainError('not_found', 404);
    if (!['not_started', 'in_progress'].includes(s.status))
      throw new DomainError('submission_closed', 409);
    if (sessionId && s.active_session_id !== sessionId)
      throw new DomainError('session_replaced', 409);
    const deadline = s.time_limit_min
      ? new Date(
          new Date(s.started_at).getTime() + (s.time_limit_min + s.time_extension_min) * 60000,
        )
      : s.due_at
        ? new Date(s.due_at)
        : null;
    if (deadline && Date.now() > deadline.getTime() + 10000)
      throw new DomainError('time_expired', 409);
    const q = await this.pool.query(
      `select 1 from assignment_questions where assignment_id=$1 and question_id=$2`,
      [s.assignment_id, questionId],
    );
    if (!q.rowCount) throw new DomainError('not_found', 404);
    await this.pool.query(
      `insert into answers(submission_id,question_id,text,word_count) values($1,$2,$3,$4)
      on conflict(submission_id,question_id) do update set text=excluded.text,word_count=excluded.word_count,updated_at=now()`,
      [submissionId, questionId, text, text.trim() ? text.trim().split(/\s+/).length : 0],
    );
    return { savedAt: new Date() };
  }
  async submit(actor: Actor, submissionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const r = await client.query(
        `update submissions set status='submitted',submitted_at=now() where id=$1 and student_id=$2 and status in('not_started','in_progress') returning id,status,submitted_at`,
        [submissionId, actor.id],
      );
      if (!r.rowCount) throw new DomainError('submission_closed', 409);
      await client.query(
        `insert into answers(submission_id,question_id,text,word_count)
      select $1,aq.question_id,'',0 from submissions s join assignment_questions aq on aq.assignment_id=s.assignment_id where s.id=$1 on conflict do nothing`,
        [submissionId],
      );
      await client.query(
        `insert into gradings(answer_id,status,max_marks)
      select ans.id,'needs_teacher',q.marks from answers ans join questions q on q.id=ans.question_id where ans.submission_id=$1 on conflict(answer_id) do nothing`,
        [submissionId],
      );
      await client.query(
        `insert into grading_points(grading_id,mark_scheme_point_id,teacher_matched,final_matched,awarded_marks)
      select g.id,msp.id,false,false,0 from gradings g join answers ans on ans.id=g.answer_id join mark_schemes ms on ms.question_id=ans.question_id join mark_scheme_points msp on msp.mark_scheme_id=ms.id where ans.submission_id=$1 on conflict do nothing`,
        [submissionId],
      );
      await client.query('commit');
      return r.rows[0];
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
  async heartbeat(actor: Actor, submissionId: string, sessionId: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const result = await this.pool.query(
      `select s.id,s.status,s.started_at,s.active_session_id,s.time_extension_min,a.time_limit_min,a.due_at
      from submissions s join assignments a on a.id=s.assignment_id where s.id=$1 and s.student_id=$2`,
      [submissionId, actor.id],
    );
    const s = result.rows[0];
    if (!s) throw new DomainError('not_found', 404);
    if (s.active_session_id !== sessionId) throw new DomainError('session_replaced', 409);
    const deadline = s.time_limit_min
      ? new Date(
          new Date(s.started_at).getTime() + (s.time_limit_min + s.time_extension_min) * 60000,
        )
      : s.due_at
        ? new Date(s.due_at)
        : null;
    const remainingSeconds = deadline
      ? Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000))
      : null;
    if (remainingSeconds === 0 && ['not_started', 'in_progress'].includes(s.status)) {
      await this.autoSubmit(submissionId);
      throw new DomainError('time_expired', 409);
    }
    await this.pool.query(
      `update submissions set time_spent_s=time_spent_s+least(30,greatest(0,extract(epoch from(now()-coalesce(started_at,now())))::int-time_spent_s)) where id=$1`,
      [submissionId],
    );
    return { serverNow: new Date(), remainingSeconds, status: s.status };
  }
  async closeExpired(limit = 100) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const rows = await client.query(
        `select s.id from submissions s join assignments a on a.id=s.assignment_id
        where s.status in('not_started','in_progress') and ((a.time_limit_min is not null and s.started_at+(a.time_limit_min+s.time_extension_min)*interval '1 minute'<=now()) or (a.time_limit_min is null and a.due_at is not null and a.due_at<=now()))
        order by s.started_at for update of s skip locked limit $1`,
        [limit],
      );
      for (const row of rows.rows) await this.autoSubmit(row.id, client);
      await client.query('commit');
      return rows.rowCount ?? 0;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
  private async autoSubmit(
    submissionId: string,
    executor: { query: (sql: string, values?: unknown[]) => Promise<any> } = this.pool,
  ) {
    await executor.query(
      `update submissions set status='submitted',submitted_at=coalesce(submitted_at,now()),auto_submitted=true where id=$1 and status in('not_started','in_progress')`,
      [submissionId],
    );
    await executor.query(
      `insert into answers(submission_id,question_id,text,word_count) select $1,aq.question_id,'',0 from submissions s join assignment_questions aq on aq.assignment_id=s.assignment_id where s.id=$1 on conflict do nothing`,
      [submissionId],
    );
    await executor.query(
      `insert into gradings(answer_id,status,max_marks) select ans.id,'needs_teacher',q.marks from answers ans join questions q on q.id=ans.question_id where ans.submission_id=$1 on conflict(answer_id) do nothing`,
      [submissionId],
    );
    await executor.query(
      `insert into grading_points(grading_id,mark_scheme_point_id,teacher_matched,final_matched,awarded_marks) select g.id,msp.id,false,false,0 from gradings g join answers ans on ans.id=g.answer_id join mark_schemes ms on ms.question_id=ans.question_id join mark_scheme_points msp on msp.mark_scheme_id=ms.id where ans.submission_id=$1 on conflict do nothing`,
      [submissionId],
    );
  }
}
