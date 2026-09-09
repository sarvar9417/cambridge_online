import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

/**
 * Finalizes Live Challenge learning evidence into the platform's existing
 * mastery model. The challenge row is locked and analytics_recorded_at is the
 * durable idempotency marker, so retries after a network/serverless failure do
 * not double-count student evidence.
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

      const mastery=await client.query(
        `with released as (
           select r.id round_id,lcq.question_id,lcq.max_marks_snapshot
           from live_challenge_rounds r
           join live_challenge_questions lcq on lcq.id=r.challenge_question_id
           where r.challenge_id=$1 and r.status='ROUND_RESULTS'
         ), evidence as (
           select p.student_id,qs.subtopic_id,
             count(distinct released.round_id)::int attempts,
             sum(coalesce(effective.score,0))::numeric marks_earned,
             sum(released.max_marks_snapshot)::numeric marks_possible
           from live_challenge_participants p
           cross join released
           join question_subtopics qs on qs.question_id=released.question_id
           left join live_challenge_answers a on a.round_id=released.round_id and a.student_id=p.student_id
           left join lateral (
             select coalesce(
               (select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1),
               (select pm.awarded_marks
                from live_challenge_peer_assignments pa
                join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
                where pa.answer_id=a.id and pa.status='SUBMITTED'
                order by pm.submitted_at desc limit 1),
               0
             )::numeric score
           ) effective on true
           where p.challenge_id=$1 and p.status='JOINED'
           group by p.student_id,qs.subtopic_id
         )
         insert into mastery(student_id,subtopic_id,score,attempts,marks_earned,marks_possible,last_activity_at)
         select student_id,subtopic_id,
           case when marks_possible>0 then marks_earned/marks_possible else 0 end,
           attempts,marks_earned,marks_possible,now()
         from evidence where marks_possible>0
         on conflict(student_id,subtopic_id) do update set
           marks_earned=mastery.marks_earned+excluded.marks_earned,
           marks_possible=mastery.marks_possible+excluded.marks_possible,
           attempts=mastery.attempts+excluded.attempts,
           score=(mastery.marks_earned+excluded.marks_earned)/nullif(mastery.marks_possible+excluded.marks_possible,0),
           last_activity_at=now(),updated_at=now()
         returning student_id,subtopic_id`,
        [id],
      );
      const marked=await client.query(
        `update live_challenges set analytics_recorded_at=now(),updated_at=now()
         where id=$1 and analytics_recorded_at is null returning analytics_recorded_at`,
        [id],
      );
      if(!marked.rowCount)throw new DomainError('live_challenge_state_conflict',409);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'analytics.mastery_recorded',jsonb_build_object('masteryRows',$3))`,
        [id,actor.id,mastery.rowCount??0],
      );
      await client.query('commit');
      return {challengeId:id,recorded:true,recordedAt:marked.rows[0].analytics_recorded_at,masteryRows:mastery.rowCount??0};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }
}
