import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

/**
 * Reconciles a per-question deadline against persistent round state.
 *
 * No Node timer is authoritative. Any authorised client can trigger this
 * transaction after a missed realtime event, which makes the deadline safe
 * across serverless cold starts and reconnects.
 */
export class LiveChallengeTimingService{
  constructor(private readonly pool:Pool){}

  async reconcile(actor:Actor,id:string){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const access=await client.query(
        `select lc.id,lc.status::text status,lc.state_version,lc.settings_json,c.school_id,
           r.id round_id,r.started_at,lcq.time_limit_seconds
         from live_challenges lc
         join classes c on c.id=lc.class_id and c.archived_at is null
         left join live_challenge_rounds r on r.challenge_id=lc.id and r.status='QUESTION_ACTIVE'
         left join live_challenge_questions lcq on lcq.id=r.challenge_question_id
         where lc.id=$1 and (
           ($2='student' and exists(
             select 1 from enrollments e
             join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=e.student_id and p.status='JOINED'
             where e.class_id=lc.class_id and e.student_id=$3 and e.left_at is null
           ))
           or ($2='owner' and c.school_id=$4)
           or ($2='teacher' and (lc.teacher_id=$3 or exists(
             select 1 from class_teachers ct where ct.class_id=lc.class_id and ct.teacher_id=$3
           )))
         )
         for update of lc,r`,
        [id,actor.role,actor.id,actor.schoolId],
      );
      if(!access.rowCount)throw new DomainError('not_found',404);
      const row=access.rows[0];
      if(row.status!=='QUESTION_ACTIVE'||!row.round_id||!row.started_at){
        await client.query('commit');
        return {challengeId:id,changed:false,status:row.status,stateVersion:Number(row.state_version)};
      }
      const settings=(row.settings_json??{}) as Record<string,unknown>;
      if(settings.timing_mode!=='per_question'){
        await client.query('commit');
        return {challengeId:id,changed:false,status:row.status,stateVersion:Number(row.state_version)};
      }
      const limit=Number(row.time_limit_seconds??settings.default_time_limit_seconds);
      if(!Number.isFinite(limit)||limit<10){
        await client.query('commit');
        return {challengeId:id,changed:false,status:row.status,stateVersion:Number(row.state_version)};
      }
      const expired=await client.query(
        `select now() >= $1::timestamptz + ($2::int * interval '1 second') expired,
           greatest(0,ceil(extract(epoch from ($1::timestamptz + ($2::int * interval '1 second')-now()))))::int remaining_seconds`,
        [row.started_at,limit],
      );
      if(expired.rows[0]?.expired!==true){
        await client.query('commit');
        return {challengeId:id,changed:false,status:'QUESTION_ACTIVE',stateVersion:Number(row.state_version),remainingSeconds:Number(expired.rows[0]?.remaining_seconds??0)};
      }

      const locked=await client.query(
        `update live_challenge_answers set locked_at=coalesce(locked_at,now())
         where round_id=$1 returning id`,
        [row.round_id],
      );
      await client.query(
        `update live_challenge_rounds
         set status='ANSWERS_LOCKED',locked_at=coalesce(locked_at,now())
         where id=$1 and status='QUESTION_ACTIVE'`,
        [row.round_id],
      );
      const challenge=await client.query(
        `update live_challenges
         set status='ANSWERS_LOCKED',state_version=state_version+1,updated_at=now()
         where id=$1 and status='QUESTION_ACTIVE'
         returning state_version`,
        [id],
      );
      if(!challenge.rowCount)throw new DomainError('live_challenge_state_conflict',409);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'question.locked',jsonb_build_object(
           'roundId',$3::text,'reason','timer_expired','submissionCount',$4
         ))`,
        [id,actor.id,row.round_id,locked.rowCount??0],
      );
      await client.query('commit');
      return {challengeId:id,changed:true,status:'ANSWERS_LOCKED',stateVersion:Number(challenge.rows[0].state_version),roundId:row.round_id,submissionCount:locked.rowCount??0,reason:'timer_expired'};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }
}
