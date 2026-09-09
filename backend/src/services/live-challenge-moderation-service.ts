import type { Pool,PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

const PAUSABLE=new Set(['LOBBY','QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS']);
const REMOVABLE=new Set(['PUBLISHED','LOBBY','QUESTION_ACTIVE','ANSWERS_LOCKED']);

export class LiveChallengeModerationService{
  constructor(private readonly pool:Pool){}
  private staff(actor:Actor){if(actor.role==='student')throw new DomainError('staff_only',403)}

  private async challenge(client:Pool|PoolClient,actor:Actor,id:string,lock=false){
    this.staff(actor);
    const result=await client.query(
      `select lc.id,lc.status::text status,lc.state_version,lc.settings_json,
         lc.paused_from_status::text paused_from_status,lc.paused_at,c.school_id
       from live_challenges lc
       join classes c on c.id=lc.class_id
       where lc.id=$1 and (($2='owner' and c.school_id=$3) or lc.teacher_id=$4 or exists(
         select 1 from class_teachers ct where ct.class_id=lc.class_id and ct.teacher_id=$4
       ))
       ${lock?'for update of lc':''}`,
      [id,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    return result.rows[0];
  }

  private async latestRound(client:Pool|PoolClient,actor:Actor,id:string,lock=false){
    this.staff(actor);
    const result=await client.query(
      `select lc.id,lc.status::text status,lc.state_version,lc.settings_json,c.school_id,
         r.id round_id,r.round_number,r.status::text round_status,
         lcq.max_marks_snapshot,q.display_ref
       from live_challenges lc
       join classes c on c.id=lc.class_id
       join live_challenge_rounds r on r.challenge_id=lc.id
       join live_challenge_questions lcq on lcq.id=r.challenge_question_id
       join questions q on q.id=lcq.question_id
       where lc.id=$1
         and r.round_number=(select max(x.round_number) from live_challenge_rounds x where x.challenge_id=lc.id)
         and (($2='owner' and c.school_id=$3) or lc.teacher_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=lc.class_id and ct.teacher_id=$4
         ))
       ${lock?'for update of lc,r':''}`,
      [id,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('live_challenge_peer_round_unavailable',409);
    return result.rows[0];
  }

  async pause(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.challenge(client,actor,id,true);
      if(challenge.status==='PAUSED'){
        await client.query('commit');
        return {id,status:'PAUSED',pausedFromStatus:challenge.paused_from_status,stateVersion:Number(challenge.state_version)};
      }
      if(!PAUSABLE.has(String(challenge.status)))throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      const updated=await client.query(
        `update live_challenges
         set paused_from_status=status,paused_at=now(),status='PAUSED',state_version=state_version+1,updated_at=now()
         where id=$1 returning paused_from_status::text paused_from_status,state_version,paused_at`,
        [id],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'challenge.paused',jsonb_build_object('fromStatus',$3))`,
        [id,actor.id,challenge.status],
      );
      await client.query('commit');
      return {id,status:'PAUSED',pausedFromStatus:updated.rows[0].paused_from_status,stateVersion:Number(updated.rows[0].state_version),pausedAt:updated.rows[0].paused_at};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async resume(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.challenge(client,actor,id,true);
      if(challenge.status!=='PAUSED'||!challenge.paused_from_status||!challenge.paused_at)throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      const restored=String(challenge.paused_from_status);
      if(restored==='QUESTION_ACTIVE'){
        await client.query(
          `update live_challenge_rounds
           set started_at=started_at+(now()-$2::timestamptz)
           where challenge_id=$1 and status='QUESTION_ACTIVE' and started_at is not null`,
          [id,challenge.paused_at],
        );
      }
      const updated=await client.query(
        `update live_challenges
         set status=paused_from_status,paused_from_status=null,paused_at=null,state_version=state_version+1,updated_at=now()
         where id=$1 returning status::text status,state_version`,
        [id],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'challenge.resumed',jsonb_build_object('restoredStatus',$3))`,
        [id,actor.id,restored],
      );
      await client.query('commit');
      return {id,status:updated.rows[0].status,stateVersion:Number(updated.rows[0].state_version),resumed:true};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async cancel(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.challenge(client,actor,id,true);
      if(challenge.status==='CANCELLED'){
        await client.query('commit');
        return {id,status:'CANCELLED',stateVersion:Number(challenge.state_version),cancelled:true};
      }
      if(challenge.status==='FINISHED')throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      await client.query(
        `update live_challenge_peer_assignments pa set status='CANCELLED',completed_at=coalesce(completed_at,now())
         where pa.status='ASSIGNED' and exists(
           select 1 from live_challenge_rounds r where r.id=pa.round_id and r.challenge_id=$1
         )`,
        [id],
      );
      await client.query(
        `update live_challenge_rounds set status='CANCELLED'
         where challenge_id=$1 and status in ('PENDING','QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING')`,
        [id],
      );
      const updated=await client.query(
        `update live_challenges
         set status='CANCELLED',join_code=null,paused_from_status=null,paused_at=null,state_version=state_version+1,updated_at=now()
         where id=$1 returning state_version`,
        [id],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'challenge.cancelled',jsonb_build_object('fromStatus',$3))`,
        [id,actor.id,challenge.status],
      );
      await client.query('commit');
      return {id,status:'CANCELLED',stateVersion:Number(updated.rows[0].state_version),cancelled:true};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async removeParticipant(actor:Actor,id:string,studentId:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.challenge(client,actor,id,true);
      const effective=challenge.status==='PAUSED'?String(challenge.paused_from_status??''):String(challenge.status);
      if(!REMOVABLE.has(effective))throw new DomainError('live_challenge_participant_removal_closed',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      const removed=await client.query(
        `update live_challenge_participants
         set status='REMOVED',left_at=now(),last_seen_at=now()
         where challenge_id=$1 and student_id=$2 and status<>'REMOVED'
         returning student_id`,
        [id,studentId],
      );
      if(!removed.rowCount)throw new DomainError('live_challenge_participant_not_found',404);
      const updated=await client.query(
        `update live_challenges set state_version=state_version+1,updated_at=now()
         where id=$1 returning state_version`,
        [id],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'participant.removed',jsonb_build_object('studentId',$3::text))`,
        [id,actor.id,studentId],
      );
      await client.query('commit');
      return {id,studentId,status:'REMOVED',stateVersion:Number(updated.rows[0].state_version)};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async list(actor:Actor,id:string){
    const round=await this.latestRound(this.pool,actor,id);
    if(!['PEER_MARKING','ROUND_RESULTS','FINISHED'].includes(String(round.status)))throw new DomainError('live_challenge_moderation_unavailable',409);
    const answers=await this.pool.query(
      `select a.id answer_id,a.student_id,u.full_name,a.answer_text,a.submitted_at,
         pa.status::text assignment_status,pm.awarded_marks peer_score,pm.submitted_at peer_marked_at,
         latest.new_score override_score,latest.previous_score override_previous_score,
         latest.reason override_reason,latest.created_at override_created_at
       from live_challenge_answers a
       join users u on u.id=a.student_id
       left join live_challenge_peer_assignments pa on pa.round_id=a.round_id and pa.answer_id=a.id
       left join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
       left join lateral (
         select so.new_score,so.previous_score,so.reason,so.created_at
         from live_challenge_score_overrides so
         where so.answer_id=a.id
         order by so.created_at desc limit 1
       ) latest on true
       where a.round_id=$1
       order by u.full_name,a.submitted_at`,
      [round.round_id],
    );
    return {
      challengeId:id,status:round.status,stateVersion:Number(round.state_version),roundId:round.round_id,
      roundNumber:Number(round.round_number),questionRef:round.display_ref,maxMarks:Number(round.max_marks_snapshot),
      answers:answers.rows.map(row=>{
        const peerScore=row.peer_score==null?null:Number(row.peer_score);
        const overrideScore=row.override_score==null?null:Number(row.override_score);
        return {
          answerId:row.answer_id,studentId:row.student_id,studentName:row.full_name,answerText:row.answer_text,
          submittedAt:row.submitted_at,assignmentStatus:row.assignment_status,peerScore,
          peerMarkedAt:row.peer_marked_at,overrideScore,overridePreviousScore:row.override_previous_score==null?null:Number(row.override_previous_score),
          overrideReason:row.override_reason,overrideCreatedAt:row.override_created_at,
          effectiveScore:overrideScore??peerScore,resolved:overrideScore!==null||peerScore!==null,
        };
      }),
    };
  }

  async override(actor:Actor,id:string,input:{answerId:string;newScore:number;reason:string;expectedStateVersion?:number}){
    this.staff(actor);
    const reason=input.reason.trim();
    if(reason.length<3)throw new DomainError('live_challenge_override_reason_required',400);
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const round=await this.latestRound(client,actor,id,true);
      if(!['PEER_MARKING','ROUND_RESULTS'].includes(String(round.status)))throw new DomainError('live_challenge_moderation_unavailable',409);
      if(input.expectedStateVersion!==undefined&&Number(round.state_version)!==input.expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      if((round.settings_json as Record<string,unknown>|null)?.teacher_override_enabled===false)throw new DomainError('live_challenge_teacher_override_disabled',409);
      const maxMarks=Number(round.max_marks_snapshot);
      if(!Number.isFinite(input.newScore)||input.newScore<0||input.newScore>maxMarks)throw new DomainError('live_challenge_peer_score_invalid',400);

      const answer=await client.query(
        `select a.id,a.student_id,
           (select pm.awarded_marks
            from live_challenge_peer_assignments pa
            join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
            where pa.answer_id=a.id and pa.round_id=a.round_id
            order by pm.submitted_at desc limit 1) peer_score,
           (select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1) override_score
         from live_challenge_answers a
         where a.id=$1 and a.round_id=$2
         for update of a`,
        [input.answerId,round.round_id],
      );
      if(!answer.rowCount)throw new DomainError('live_challenge_answer_not_found',404);
      const row=answer.rows[0];
      const previous=row.override_score==null?(row.peer_score==null?null:Number(row.peer_score)):Number(row.override_score);
      const inserted=await client.query(
        `insert into live_challenge_score_overrides(round_id,answer_id,teacher_id,previous_score,new_score,reason)
         values($1,$2,$3,$4,$5,$6)
         returning id,previous_score,new_score,reason,created_at`,
        [round.round_id,input.answerId,actor.id,previous,input.newScore,reason],
      );
      await client.query(
        `update live_challenge_peer_assignments
         set status='CANCELLED',completed_at=coalesce(completed_at,now())
         where round_id=$1 and answer_id=$2 and status='ASSIGNED'`,
        [round.round_id,input.answerId],
      );
      const updated=await client.query(
        `update live_challenges set state_version=state_version+1,updated_at=now()
         where id=$1 returning state_version`,
        [id],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'score.overridden',jsonb_build_object(
           'roundId',$3::text,'answerId',$4::text,'previousScore',$5,'newScore',$6
         ))`,
        [id,actor.id,round.round_id,input.answerId,previous,input.newScore],
      );
      await client.query('commit');
      const saved=inserted.rows[0];
      return {
        challengeId:id,roundId:round.round_id,answerId:input.answerId,stateVersion:Number(updated.rows[0].state_version),
        overrideId:saved.id,previousScore:saved.previous_score==null?null:Number(saved.previous_score),
        newScore:Number(saved.new_score),reason:saved.reason,createdAt:saved.created_at,
      };
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }
}
