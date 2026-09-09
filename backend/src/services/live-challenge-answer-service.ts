import type { Pool,PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

function autoClose(settings:unknown){
  if(!settings||typeof settings!=='object'||Array.isArray(settings))return true;
  return (settings as Record<string,unknown>).auto_close_when_all_submitted!==false;
}

export class LiveChallengeAnswerService{
  constructor(private readonly pool:Pool){}

  private student(actor:Actor){if(actor.role!=='student')throw new DomainError('students_only',403)}
  private staff(actor:Actor){if(actor.role==='student')throw new DomainError('staff_only',403)}

  private async staffActiveRound(client:PoolClient,actor:Actor,id:string){
    this.staff(actor);
    const result=await client.query(
      `select lc.id,lc.status::text status,lc.state_version,c.school_id,r.id round_id,r.round_number,r.status::text round_status
       from live_challenges lc
       join classes c on c.id=lc.class_id
       join live_challenge_rounds r on r.challenge_id=lc.id and r.status in ('QUESTION_ACTIVE','ANSWERS_LOCKED')
       where lc.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or lc.teacher_id=$4
         or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
       )
       order by r.round_number desc limit 1
       for update of lc,r`,
      [id,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('live_challenge_answer_round_unavailable',409);
    return result.rows[0];
  }

  private async lockRound(client:PoolClient,input:{challengeId:string;roundId:string;actorId:string|null;automatic:boolean}){
    await client.query(
      `update live_challenge_answers set locked_at=coalesce(locked_at,now()),updated_at=now() where round_id=$1`,
      [input.roundId],
    );
    await client.query(
      `update live_challenge_rounds set status='ANSWERS_LOCKED',locked_at=coalesce(locked_at,now())
       where id=$1 and status='QUESTION_ACTIVE'`,
      [input.roundId],
    );
    const updated=await client.query(
      `update live_challenges set status='ANSWERS_LOCKED',updated_at=now(),state_version=state_version+1
       where id=$1 and status='QUESTION_ACTIVE'
       returning status::text status,state_version`,
      [input.challengeId],
    );
    if(!updated.rowCount){
      const current=await client.query(`select status::text status,state_version from live_challenges where id=$1`,[input.challengeId]);
      if(current.rows[0]?.status!=='ANSWERS_LOCKED')throw new DomainError('live_challenge_invalid_transition',409);
      return {status:current.rows[0].status,stateVersion:Number(current.rows[0].state_version)};
    }
    await client.query(
      `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
       values($1,$2,'round.answers_locked',jsonb_build_object('roundId',$3::text,'automatic',$4))`,
      [input.challengeId,input.actorId,input.roundId,input.automatic],
    );
    return {status:updated.rows[0].status,stateVersion:Number(updated.rows[0].state_version)};
  }

  async submit(actor:Actor,id:string,answerText:string,expectedStateVersion?:number){
    this.student(actor);
    const text=answerText.trim();
    if(!text)throw new DomainError('live_challenge_answer_required',400);
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const active=await client.query(
        `select lc.id,lc.status::text status,lc.state_version,lc.settings_json,r.id round_id,r.started_at
         from live_challenges lc
         join classes c on c.id=lc.class_id and c.archived_at is null
         join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
         join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$2 and p.status='JOINED'
         join live_challenge_rounds r on r.challenge_id=lc.id and r.status='QUESTION_ACTIVE'
         where lc.id=$1 and lc.status='QUESTION_ACTIVE'
         order by r.round_number desc limit 1
         for update of lc,r`,
        [id,actor.id],
      );
      if(!active.rowCount)throw new DomainError('live_challenge_answer_closed',409);
      const challenge=active.rows[0];
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      const duration=Math.max(0,Date.now()-new Date(challenge.started_at).getTime());
      const inserted=await client.query(
        `insert into live_challenge_answers(round_id,student_id,answer_text,submission_duration_ms)
         values($1,$2,$3,$4)
         on conflict(round_id,student_id) do nothing
         returning id,answer_text,submitted_at,locked_at,submission_duration_ms`,
        [challenge.round_id,actor.id,text,duration],
      );
      if(!inserted.rowCount)throw new DomainError('live_challenge_answer_already_submitted',409);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'answer.submitted',jsonb_build_object('roundId',$3::text,'durationMs',$4))`,
        [id,actor.id,challenge.round_id,duration],
      );

      let challengeStatus='QUESTION_ACTIVE';
      let stateVersion=Number(challenge.state_version);
      let locked=false;
      if(autoClose(challenge.settings_json)){
        const counts=await client.query(
          `select
             (select count(*)::int from live_challenge_participants where challenge_id=$1 and status='JOINED') joined_count,
             (select count(*)::int from live_challenge_answers where round_id=$2) answer_count`,
          [id,challenge.round_id],
        );
        const joined=Number(counts.rows[0]?.joined_count??0),answered=Number(counts.rows[0]?.answer_count??0);
        if(joined>0&&answered>=joined){
          const next=await this.lockRound(client,{challengeId:id,roundId:challenge.round_id,actorId:null,automatic:true});
          challengeStatus=next.status;stateVersion=next.stateVersion;locked=true;
        }
      }
      await client.query('commit');
      const row=inserted.rows[0];
      return {
        id:row.id,challengeId:id,roundId:challenge.round_id,text:row.answer_text,
        submittedAt:row.submitted_at,lockedAt:locked?new Date().toISOString():row.locked_at,
        submissionDurationMs:Number(row.submission_duration_ms),challengeStatus,stateVersion,
      };
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async own(actor:Actor,id:string){
    this.student(actor);
    const result=await this.pool.query(
      `select lc.status::text challenge_status,lc.state_version,r.id round_id,r.round_number,r.status::text round_status,
         a.id answer_id,a.answer_text,a.submitted_at,a.locked_at,a.submission_duration_ms
       from live_challenges lc
       join classes c on c.id=lc.class_id and c.archived_at is null
       join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
       join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$2 and p.status='JOINED'
       left join live_challenge_rounds r on r.challenge_id=lc.id
         and r.round_number=(select max(x.round_number) from live_challenge_rounds x where x.challenge_id=lc.id)
       left join live_challenge_answers a on a.round_id=r.id and a.student_id=$2
       where lc.id=$1`,
      [id,actor.id],
    );
    if(!result.rowCount)throw new DomainError('live_challenge_not_joined',403);
    const row=result.rows[0];
    return {
      challengeId:id,challengeStatus:row.challenge_status,stateVersion:Number(row.state_version),
      roundId:row.round_id,roundNumber:row.round_number==null?null:Number(row.round_number),roundStatus:row.round_status,
      answer:row.answer_id?{
        id:row.answer_id,text:row.answer_text,submittedAt:row.submitted_at,lockedAt:row.locked_at,
        submissionDurationMs:row.submission_duration_ms==null?null:Number(row.submission_duration_ms),
      }:null,
    };
  }

  async metrics(actor:Actor,id:string){
    this.staff(actor);
    const result=await this.pool.query(
      `select lc.id,lc.status::text status,lc.state_version,
         r.id round_id,r.round_number,r.status::text round_status,
         (select count(*)::int from live_challenge_participants p where p.challenge_id=lc.id and p.status='JOINED') joined_count,
         (select count(*)::int from live_challenge_answers a where a.round_id=r.id) answer_count,
         (select count(*)::int from live_challenge_peer_assignments pa where pa.round_id=r.id and pa.status<>'CANCELLED') assignment_count,
         (select count(*)::int from live_challenge_peer_assignments pa where pa.round_id=r.id and pa.status='SUBMITTED') peer_mark_count
       from live_challenges lc
       join classes c on c.id=lc.class_id
       left join live_challenge_rounds r on r.challenge_id=lc.id
         and r.round_number=(select max(x.round_number) from live_challenge_rounds x where x.challenge_id=lc.id)
       where lc.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or lc.teacher_id=$4
         or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
       )`,
      [id,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    const row=result.rows[0];
    return {
      challengeId:id,status:row.status,stateVersion:Number(row.state_version),roundId:row.round_id,
      roundNumber:row.round_number==null?null:Number(row.round_number),roundStatus:row.round_status,
      joinedCount:Number(row.joined_count??0),answerCount:Number(row.answer_count??0),
      assignmentCount:Number(row.assignment_count??0),peerMarkCount:Number(row.peer_mark_count??0),
    };
  }

  async events(actor:Actor,id:string,after='0'){
    const access=actor.role==='student'
      ? await this.pool.query(
          `select lc.id,lc.state_version
           from live_challenges lc
           join classes c on c.id=lc.class_id and c.archived_at is null
           join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
           join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$2 and p.status='JOINED'
           where lc.id=$1 and lc.status not in ('DRAFT','CANCELLED')`,
          [id,actor.id],
        )
      : await this.pool.query(
          `select lc.id,lc.state_version
           from live_challenges lc join classes c on c.id=lc.class_id
           where lc.id=$1 and (
             ($2='owner' and c.school_id=$3)
             or lc.teacher_id=$4
             or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
           )`,
          [id,actor.role,actor.schoolId,actor.id],
        );
    if(!access.rowCount)throw new DomainError(actor.role==='student'?'live_challenge_not_joined':'not_found',actor.role==='student'?403:404);
    const events=await this.pool.query(
      `select id::text id,event_type,created_at
       from live_challenge_events
       where challenge_id=$1 and id>$2::bigint
       order by id asc limit 100`,
      [id,after],
    );
    const rows=events.rows.map(row=>({id:String(row.id),eventType:String(row.event_type),createdAt:row.created_at}));
    return {
      challengeId:id,stateVersion:Number(access.rows[0].state_version),
      cursor:rows.length?rows[rows.length-1]!.id:after,
      events:rows,
    };
  }

  async lock(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.staffActiveRound(client,actor,id);
      if(challenge.status==='ANSWERS_LOCKED'){
        await client.query('commit');
        return {id,status:'ANSWERS_LOCKED',stateVersion:Number(challenge.state_version),roundId:challenge.round_id};
      }
      if(challenge.status!=='QUESTION_ACTIVE'||challenge.round_status!=='QUESTION_ACTIVE')throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      const next=await this.lockRound(client,{challengeId:id,roundId:challenge.round_id,actorId:actor.id,automatic:false});
      const count=await client.query(`select count(*)::int count from live_challenge_answers where round_id=$1`,[challenge.round_id]);
      await client.query('commit');
      return {id,status:next.status,stateVersion:next.stateVersion,roundId:challenge.round_id,submissionCount:Number(count.rows[0]?.count??0)};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }
}
