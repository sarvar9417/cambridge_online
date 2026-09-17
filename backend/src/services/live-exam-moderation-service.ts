import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { assertExpectedLiveExamVersion } from './live-exam-transition-guard.js';

type SessionRow=Record<string,unknown>;

/**
 * Versioned teacher moderation for Cambridge Live Challenge.
 *
 * The effective answer is updated only while the authoritative session row is
 * locked. Migration 0172's trigger copies the human reason and before/after
 * score evidence into live_exam_score_overrides, so an override can never be a
 * silent replacement of peer/self evidence.
 */
export class LiveExamModerationService {
  constructor(private readonly pool:Pool){}

  private assertStaff(actor:Actor){
    if(actor.role==='student')throw new DomainError('staff_only',403);
  }

  private async lockControlledSession(client:PoolClient,actor:Actor,sessionId:string){
    this.assertStaff(actor);
    const result=await client.query(
      `select les.*
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )
       for update of les`,
      [sessionId,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    return result.rows[0] as SessionRow;
  }

  private async bump(client:PoolClient,sessionId:string,actorId:string,answerId:string){
    const changed=await client.query(
      `update live_exam_sessions set version=version+1,updated_at=now()
       where id=$1 returning version`,[sessionId],
    );
    const version=Number(changed.rows[0]?.version);
    if(!Number.isSafeInteger(version)||version<1)throw new DomainError('live_state_conflict',409);
    await client.query(
      `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
       values($1,$2,'answer.moderated',$3,$4::jsonb)`,
      [sessionId,actorId,version,JSON.stringify({answerId})],
    );
    return version;
  }

  async moderate(
    actor:Actor,
    sessionId:string,
    answerId:string,
    input:{score:number;feedback?:string;reason:string;expectedVersion:number},
  ){
    const reason=input.reason.trim();
    if(reason.length<3||reason.length>500)throw new DomainError('live_override_reason_required',400);

    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const session=await this.lockControlledSession(client,actor,sessionId);
      assertExpectedLiveExamVersion(session,input.expectedVersion);
      if(!['marking','review'].includes(String(session.status)))throw new DomainError('live_invalid_state',409);

      const result=await client.query(
        `update live_exam_answers a set
           final_score=$3,final_feedback_md=$4,score_source='teacher',
           moderated_by=$5,moderated_at=now(),moderation_reason=$6
         from live_exam_questions leq
         where a.id=$1 and leq.id=a.session_question_id and leq.session_id=$2
           and $3 between 0 and leq.marks
         returning a.id`,
        [answerId,sessionId,input.score,input.feedback??null,actor.id,reason],
      );
      if(!result.rowCount)throw new DomainError('invalid_score',400);

      await client.query(
        `update live_exam_reviews set status='moderated',moderated_by=$2,moderated_at=now()
         where answer_id=$1`,
        [answerId,actor.id],
      );
      const version=await this.bump(client,sessionId,actor.id,answerId);
      await client.query('commit');
      return {answerId,score:input.score,reason,version};
    }catch(error){
      await client.query('rollback');
      throw error;
    }finally{client.release();}
  }
}
