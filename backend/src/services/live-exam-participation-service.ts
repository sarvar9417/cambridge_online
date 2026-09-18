import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { assertExpectedLiveExamVersion } from './live-exam-transition-guard.js';

type SessionRow = Record<string, unknown>;

export class LiveExamParticipationService {
  constructor(private readonly pool: Pool) {}

  private async transaction<T>(work:(client:PoolClient)=>Promise<T>) {
    const client=await this.pool.connect();
    try {
      await client.query('begin');
      const result=await work(client);
      await client.query('commit');
      return result;
    } catch(error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  private async bump(
    client:PoolClient,sessionId:string,actorId:string,eventType:string,payload:Record<string,unknown>={},
  ) {
    const changed=await client.query(
      `update live_exam_sessions set version=version+1,updated_at=now() where id=$1 returning version`,
      [sessionId],
    );
    const version=Number(changed.rows[0]?.version);
    if(!Number.isSafeInteger(version)||version<1)throw new DomainError('live_state_conflict',409);
    await client.query(
      `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
       values($1,$2,$3,$4,$5::jsonb)`,
      [sessionId,actorId,eventType,version,JSON.stringify(payload)],
    );
    return version;
  }

  private setting(settings:unknown,key:string) {
    return Boolean(settings&&typeof settings==='object'&&!Array.isArray(settings)
      && (settings as Record<string,unknown>)[key]===true);
  }

  async join(actor:Actor,code:string) {
    if(actor.role!=='student')throw new DomainError('students_only',403);
    return this.transaction(async(client)=>{
      const found=await client.query(
        `select les.id,les.status::text,les.current_question_index,les.settings
         from live_exam_sessions les
         join enrollments e on e.class_id=les.class_id and e.student_id=$2 and e.left_at is null
         where les.join_code=$1
         for update of les`,
        [code,actor.id],
      );
      if(!found.rowCount)throw new DomainError('live_code_not_found',404);
      const session=found.rows[0] as SessionRow;
      const status=String(session.status);
      const allowLateJoin=this.setting(session.settings,'allowLateJoin');
      if(status!=='lobby'&&!(status==='question_open'&&allowLateJoin)) {
        throw new DomainError('live_join_closed',409);
      }

      const existing=await client.query(
        `select id,left_at from live_exam_participants
         where session_id=$1 and student_id=$2
         for update`,
        [session.id,actor.id],
      );
      if(existing.rowCount&&existing.rows[0].left_at===null) {
        await client.query(
          `update live_exam_participants set last_seen_at=now() where id=$1`,
          [existing.rows[0].id],
        );
        return {sessionId:String(session.id),participantId:String(existing.rows[0].id),reused:true};
      }

      const participant=await client.query(
        `insert into live_exam_participants(session_id,student_id,left_at,last_seen_at)
         values($1,$2,null,now())
         on conflict(session_id,student_id) do update set left_at=null,last_seen_at=now(),joined_at=now()
         returning id,session_id`,
        [session.id,actor.id],
      );
      const participantId=String(participant.rows[0].id);

      if(status==='question_open') {
        const current=await client.query(
          `select id from live_exam_questions where session_id=$1 and position=$2`,
          [session.id,session.current_question_index],
        );
        if(!current.rowCount)throw new DomainError('live_no_questions',409);
        await client.query(
          `insert into live_exam_answers(session_question_id,participant_id)
           values($1,$2) on conflict do nothing`,
          [current.rows[0].id,participantId],
        );
      }

      const version=await this.bump(client,String(session.id),actor.id,'participant.joined',{
        participantId,late:status==='question_open',
      });
      return {sessionId:String(session.id),participantId,version,reused:false};
    });
  }

  async remove(actor:Actor,sessionId:string,participantId:string,expectedVersion:number) {
    if(actor.role==='student')throw new DomainError('staff_only',403);
    return this.transaction(async(client)=>{
      const locked=await client.query(
        `select les.*
         from live_exam_sessions les join classes c on c.id=les.class_id
         where les.id=$1 and (
           ($2='owner' and c.school_id=$3)
           or ($2='teacher' and (c.owner_id=$4 or exists(
             select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
           )))
         ) for update of les`,
        [sessionId,actor.role,actor.schoolId,actor.id],
      );
      if(!locked.rowCount)throw new DomainError('not_found',404);
      const session=locked.rows[0] as SessionRow;
      assertExpectedLiveExamVersion(session,expectedVersion);
      const removable=session.status==='lobby'
        ||(session.status==='paused'&&session.paused_from_status==='lobby');
      if(!removable)throw new DomainError('live_participant_removal_closed',409);

      const removed=await client.query(
        `update live_exam_participants set left_at=now(),last_seen_at=now()
         where id=$1 and session_id=$2 and left_at is null
         returning id,student_id`,
        [participantId,sessionId],
      );
      if(!removed.rowCount)throw new DomainError('not_found',404);
      const version=await this.bump(client,sessionId,actor.id,'participant.removed',{
        participantId,studentId:removed.rows[0].student_id,
      });
      return {sessionId,participantId,version};
    });
  }

  async leave(actor:Actor,sessionId:string) {
    if(actor.role!=='student')throw new DomainError('students_only',403);
    return this.transaction(async(client)=>{
      const locked=await client.query(
        `select les.status::text,les.paused_from_status::text,lep.id participant_id
         from live_exam_sessions les
         join live_exam_participants lep on lep.session_id=les.id
           and lep.student_id=$2 and lep.left_at is null
         where les.id=$1
         for update of les,lep`,
        [sessionId,actor.id],
      );
      if(!locked.rowCount)throw new DomainError('not_found',404);
      const row=locked.rows[0];
      const canLeave=row.status==='lobby'||(row.status==='paused'&&row.paused_from_status==='lobby');
      if(!canLeave)throw new DomainError('live_leave_closed',409);
      await client.query(
        `update live_exam_participants set left_at=now(),last_seen_at=now() where id=$1`,
        [row.participant_id],
      );
      const version=await this.bump(client,sessionId,actor.id,'participant.left',{
        participantId:row.participant_id,
      });
      return {sessionId,version};
    });
  }
}
