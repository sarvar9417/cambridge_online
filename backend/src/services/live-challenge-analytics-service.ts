import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

/**
 * Finalizes challenge-level analytics after the last round is complete.
 *
 * Learning evidence is already written transactionally when each round is
 * released. This finalizer therefore owns only the durable challenge-level
 * completion marker. Keeping one writer for mastery prevents double counting,
 * while analytics_recorded_at makes finalization retry-safe in serverless
 * deployments.
 */
export class LiveChallengeAnalyticsService{
  constructor(private readonly pool:Pool){}

  async finalize(actor:Actor,id:string){
    if(actor.role==='student')throw new DomainError('staff_only',403);
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const access=await client.query(
        `select lc.id,lc.status::text status,lc.analytics_recorded_at,c.school_id
         from live_challenges lc join classes c on c.id=lc.class_id
         where lc.id=$1 and (($2='owner' and c.school_id=$3) or lc.teacher_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=lc.class_id and ct.teacher_id=$4
         )) for update of lc`,
        [id,actor.role,actor.schoolId,actor.id],
      );
      if(!access.rowCount)throw new DomainError('not_found',404);
      const challenge=access.rows[0];
      if(challenge.status!=='FINISHED')throw new DomainError('live_challenge_invalid_transition',409);
      if(challenge.analytics_recorded_at){
        await client.query('commit');
        return {challengeId:id,recorded:false,recordedAt:challenge.analytics_recorded_at,masteryRows:0};
      }

      const rounds=await client.query(
        `select count(*)::int released_rounds
         from live_challenge_rounds
         where challenge_id=$1 and status='ROUND_RESULTS'`,
        [id],
      );
      const releasedRounds=Number(rounds.rows[0]?.released_rounds??0);
      const marked=await client.query(
        `update live_challenges set analytics_recorded_at=now(),updated_at=now()
         where id=$1 and analytics_recorded_at is null returning analytics_recorded_at`,
        [id],
      );
      if(!marked.rowCount)throw new DomainError('live_challenge_state_conflict',409);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'analytics.finalized',jsonb_build_object(
           'releasedRounds',$3,'masterySource','round_release'
         ))`,
        [id,actor.id,releasedRounds],
      );
      await client.query('commit');
      return {challengeId:id,recorded:true,recordedAt:marked.rows[0].analytics_recorded_at,masteryRows:0,releasedRounds};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }
}
