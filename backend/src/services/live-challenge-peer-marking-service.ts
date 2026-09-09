import type { Pool,PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { buildLiveChallengePeerAssignments,LiveChallengePeerAssignmentError,type PeerAssignmentIdentity } from './live-challenge-domain.js';

interface SnapshotPoint{id:string;code:string;text:string;marks:number;accept?:string|null;reject?:string|null;requires?:unknown}
interface MarkSchemeSnapshot{maxMarks:number;guidanceMd?:string|null;points?:SnapshotPoint[];groups?:unknown[];levels?:unknown[]}

function snapshot(value:unknown):MarkSchemeSnapshot{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new DomainError('live_challenge_mark_scheme_unavailable',409);
  const raw=value as Record<string,unknown>;
  const maxMarks=Number(raw.maxMarks);
  if(!Number.isFinite(maxMarks)||maxMarks<=0)throw new DomainError('live_challenge_mark_scheme_unavailable',409);
  return {
    maxMarks,
    guidanceMd:typeof raw.guidanceMd==='string'?raw.guidanceMd:null,
    points:Array.isArray(raw.points)?raw.points.map((point)=>{
      const item=point as Record<string,unknown>;
      return {id:String(item.id??''),code:String(item.code??''),text:String(item.text??''),marks:Number(item.marks??0),accept:typeof item.accept==='string'?item.accept:null,reject:typeof item.reject==='string'?item.reject:null,requires:item.requires};
    }).filter(point=>point.id&&point.code&&point.text):[],
    groups:Array.isArray(raw.groups)?raw.groups:[],
    levels:Array.isArray(raw.levels)?raw.levels:[],
  };
}

export class LiveChallengePeerMarkingService{
  constructor(private readonly pool:Pool){}
  private student(actor:Actor){if(actor.role!=='student')throw new DomainError('students_only',403)}
  private staff(actor:Actor){if(actor.role==='student')throw new DomainError('staff_only',403)}

  private async staffRound(client:Pool|PoolClient,actor:Actor,id:string,lock=false){
    this.staff(actor);
    const result=await client.query(
      `select lc.id,lc.status::text status,lc.state_version,lc.settings_json,c.school_id,
         r.id round_id,r.round_number,r.status::text round_status,lcq.max_marks_snapshot,lcq.mark_scheme_snapshot
       from live_challenges lc
       join classes c on c.id=lc.class_id
       join live_challenge_rounds r on r.challenge_id=lc.id
       join live_challenge_questions lcq on lcq.id=r.challenge_question_id
       where lc.id=$1 and r.round_number=(select max(x.round_number) from live_challenge_rounds x where x.challenge_id=lc.id)
         and (($2='owner' and c.school_id=$3) or lc.teacher_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4))
       ${lock?'for update of lc,r':''}`,
      [id,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('live_challenge_peer_round_unavailable',409);
    return result.rows[0];
  }

  async start(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.staffRound(client,actor,id,true);
      if(challenge.status==='PEER_MARKING'){
        const count=await client.query(`select count(*)::int count from live_challenge_peer_assignments where round_id=$1 and status<>'CANCELLED'`,[challenge.round_id]);
        const assignmentCount=Number(count.rows[0]?.count??0);
        await client.query('commit');
        return {id,status:'PEER_MARKING',stateVersion:Number(challenge.state_version),roundId:challenge.round_id,assignmentCount,teacherModerationRequired:assignmentCount===0};
      }
      if(challenge.status!=='ANSWERS_LOCKED'||challenge.round_status!=='ANSWERS_LOCKED')throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);

      const answers=await client.query(`select id,student_id from live_challenge_answers where round_id=$1 and locked_at is not null order by student_id`,[challenge.round_id]);
      if(!answers.rowCount)throw new DomainError('live_challenge_peer_assignment_unavailable',409);
      const settings=challenge.settings_json as Record<string,unknown>|null;
      const peerEnabled=settings?.peer_marking_enabled!==false;
      const teacherOverrideEnabled=settings?.teacher_override_enabled!==false;
      if(!peerEnabled&&!teacherOverrideEnabled)throw new DomainError('live_challenge_peer_marking_disabled',409);

      let assignments:PeerAssignmentIdentity[]=[];
      if(peerEnabled&&answers.rows.length>=2){
        try{
          assignments=buildLiveChallengePeerAssignments(answers.rows.map(row=>({answerId:String(row.id),studentId:String(row.student_id)})),String(challenge.round_id));
        }catch(error){
          if(error instanceof LiveChallengePeerAssignmentError)throw new DomainError('live_challenge_peer_assignment_unavailable',409);
          throw error;
        }
      }
      for(const assignment of assignments){
        await client.query(
          `insert into live_challenge_peer_assignments(round_id,marker_student_id,answer_id,answer_student_id,status)
           values($1,$2,$3,$4,'ASSIGNED')
           on conflict(round_id,marker_student_id) do nothing`,
          [challenge.round_id,assignment.markerStudentId,assignment.answerId,assignment.answerStudentId],
        );
      }
      const persisted=await client.query(`select count(*)::int count from live_challenge_peer_assignments where round_id=$1 and status='ASSIGNED'`,[challenge.round_id]);
      if(Number(persisted.rows[0]?.count??0)!==assignments.length)throw new DomainError('live_challenge_peer_assignment_unavailable',409);
      await client.query(`update live_challenge_rounds set status='PEER_MARKING',marking_started_at=coalesce(marking_started_at,now()) where id=$1`,[challenge.round_id]);
      const updated=await client.query(`update live_challenges set status='PEER_MARKING',state_version=state_version+1,updated_at=now() where id=$1 returning state_version`,[id]);
      const teacherModerationRequired=assignments.length===0;
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'marking.started',jsonb_build_object('roundId',$3::text,'assignmentCount',$4,'teacherModerationRequired',$5))`,
        [id,actor.id,challenge.round_id,assignments.length,teacherModerationRequired],
      );
      await client.query('commit');
      return {id,status:'PEER_MARKING',stateVersion:Number(updated.rows[0].state_version),roundId:challenge.round_id,assignmentCount:assignments.length,teacherModerationRequired};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async assignment(actor:Actor,id:string){
    this.student(actor);
    const access=await this.pool.query(
      `select lc.status::text status,lc.state_version,r.id round_id,r.round_number
       from live_challenges lc
       join classes c on c.id=lc.class_id and c.archived_at is null
       join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
       join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$2 and p.status='JOINED'
       join live_challenge_rounds r on r.challenge_id=lc.id
       where lc.id=$1 and r.round_number=(select max(x.round_number) from live_challenge_rounds x where x.challenge_id=lc.id)`,
      [id,actor.id],
    );
    if(!access.rowCount)throw new DomainError('live_challenge_not_joined',403);
    const state=access.rows[0];
    if(!['PEER_MARKING','ROUND_RESULTS'].includes(state.status))throw new DomainError('live_challenge_peer_marking_not_open',409);
    const result=await this.pool.query(
      `select pa.id peer_assignment_id,pa.status::text assignment_status,a.answer_text,
         lcq.max_marks_snapshot,lcq.mark_scheme_snapshot,q.display_ref,
         pm.awarded_marks,pm.mark_points_json,pm.feedback_text,pm.submitted_at
       from live_challenge_peer_assignments pa
       join live_challenge_answers a on a.id=pa.answer_id
       join live_challenge_rounds r on r.id=pa.round_id
       join live_challenge_questions lcq on lcq.id=r.challenge_question_id
       join questions q on q.id=lcq.question_id
       left join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
       where pa.round_id=$1 and pa.marker_student_id=$2 and pa.status<>'CANCELLED'`,
      [state.round_id,actor.id],
    );
    if(!result.rowCount)return {challengeId:id,status:state.status,stateVersion:Number(state.state_version),roundId:state.round_id,roundNumber:Number(state.round_number),assignment:null};
    const row=result.rows[0],scheme=snapshot(row.mark_scheme_snapshot);
    return {
      challengeId:id,status:state.status,stateVersion:Number(state.state_version),roundId:state.round_id,roundNumber:Number(state.round_number),
      assignment:{
        id:row.peer_assignment_id,status:row.assignment_status,questionRef:row.display_ref,answerText:row.answer_text,
        maxMarks:Number(row.max_marks_snapshot),markScheme:scheme,
        submittedMark:row.awarded_marks==null?null:{awardedMarks:Number(row.awarded_marks),markPointIds:Array.isArray(row.mark_points_json)?row.mark_points_json.map(String):[],feedbackText:row.feedback_text,submittedAt:row.submitted_at},
      },
    };
  }

  async submit(actor:Actor,id:string,input:{awardedMarks:number;markPointIds:string[];feedbackText?:string|null}){
    this.student(actor);
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const result=await client.query(
        `select lc.status::text challenge_status,r.id round_id,pa.id peer_assignment_id,pa.status::text assignment_status,
           lcq.max_marks_snapshot,lcq.mark_scheme_snapshot
         from live_challenges lc
         join classes c on c.id=lc.class_id and c.archived_at is null
         join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
         join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$2 and p.status='JOINED'
         join live_challenge_rounds r on r.challenge_id=lc.id and r.status='PEER_MARKING'
         join live_challenge_questions lcq on lcq.id=r.challenge_question_id
         join live_challenge_peer_assignments pa on pa.round_id=r.id and pa.marker_student_id=$2 and pa.status<>'CANCELLED'
         where lc.id=$1 and lc.status='PEER_MARKING'
         order by r.round_number desc limit 1 for update of pa`,
        [id,actor.id],
      );
      if(!result.rowCount)throw new DomainError('live_challenge_peer_marking_not_open',409);
      const row=result.rows[0],maxMarks=Number(row.max_marks_snapshot),scheme=snapshot(row.mark_scheme_snapshot);
      if(!Number.isFinite(input.awardedMarks)||input.awardedMarks<0||input.awardedMarks>maxMarks)throw new DomainError('live_challenge_peer_score_invalid',400);
      const allowed=new Set((scheme.points??[]).map(point=>point.id));
      if(input.markPointIds.some(pointId=>!allowed.has(pointId)))throw new DomainError('live_challenge_peer_mark_point_invalid',400);
      if(new Set(input.markPointIds).size!==input.markPointIds.length)throw new DomainError('live_challenge_peer_mark_point_invalid',400);
      const existing=await client.query(`select awarded_marks,mark_points_json,feedback_text,submitted_at from live_challenge_peer_marks where peer_assignment_id=$1`,[row.peer_assignment_id]);
      if(existing.rowCount){
        await client.query('commit');
        const mark=existing.rows[0];
        return {challengeId:id,peerAssignmentId:row.peer_assignment_id,awardedMarks:Number(mark.awarded_marks),markPointIds:mark.mark_points_json,feedbackText:mark.feedback_text,submittedAt:mark.submitted_at,immutable:true};
      }
      const inserted=await client.query(
        `insert into live_challenge_peer_marks(peer_assignment_id,awarded_marks,mark_points_json,feedback_text)
         values($1,$2,$3::jsonb,$4)
         returning awarded_marks,mark_points_json,feedback_text,submitted_at`,
        [row.peer_assignment_id,input.awardedMarks,JSON.stringify(input.markPointIds),input.feedbackText?.trim()||null],
      );
      await client.query(`update live_challenge_peer_assignments set status='SUBMITTED',completed_at=now() where id=$1`,[row.peer_assignment_id]);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'peer_mark.submitted',jsonb_build_object('roundId',$3::text,'peerAssignmentId',$4::text))`,
        [id,actor.id,row.round_id,row.peer_assignment_id],
      );
      await client.query('commit');
      const mark=inserted.rows[0];
      return {challengeId:id,peerAssignmentId:row.peer_assignment_id,awardedMarks:Number(mark.awarded_marks),markPointIds:mark.mark_points_json,feedbackText:mark.feedback_text,submittedAt:mark.submitted_at,immutable:true};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async release(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.staffRound(client,actor,id,true);
      if(challenge.status==='ROUND_RESULTS'){
        await client.query('commit');
        return {id,status:'ROUND_RESULTS',stateVersion:Number(challenge.state_version),roundId:challenge.round_id};
      }
      if(challenge.status!=='PEER_MARKING'||challenge.round_status!=='PEER_MARKING')throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      const counts=await client.query(
        `select count(*)::int answer_count,
           count(*) filter(where
             exists(select 1 from live_challenge_score_overrides so where so.answer_id=a.id)
             or exists(
               select 1 from live_challenge_peer_assignments pa
               join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
               where pa.answer_id=a.id and pa.status='SUBMITTED'
             )
           )::int resolved_count,
           count(*) filter(where exists(
             select 1 from live_challenge_peer_assignments pa
             join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
             where pa.answer_id=a.id and pa.status='SUBMITTED'
           ))::int peer_marked_count,
           count(*) filter(where exists(select 1 from live_challenge_score_overrides so where so.answer_id=a.id))::int override_count
         from live_challenge_answers a where a.round_id=$1`,
        [challenge.round_id],
      );
      const answerCount=Number(counts.rows[0]?.answer_count??0);
      const resolvedCount=Number(counts.rows[0]?.resolved_count??0);
      const peerMarkedCount=Number(counts.rows[0]?.peer_marked_count??0);
      const overrideCount=Number(counts.rows[0]?.override_count??0);
      if(answerCount===0||resolvedCount!==answerCount)throw new DomainError('live_challenge_peer_marks_incomplete',409);

      await client.query(
        `insert into mastery(student_id,subtopic_id,score,attempts,marks_earned,marks_possible,last_activity_at)
         select scored.student_id,qs.subtopic_id,
           case when scored.max_marks>0 then scored.effective_score/scored.max_marks else 0 end,
           1,scored.effective_score,scored.max_marks,now()
         from (
           select a.student_id,lcq.question_id,lcq.max_marks_snapshot::numeric max_marks,
             coalesce(
               (select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1),
               (select pm.awarded_marks
                from live_challenge_peer_assignments pa
                join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
                where pa.answer_id=a.id and pa.status='SUBMITTED'
                order by pm.submitted_at desc limit 1),
               0
             )::numeric effective_score
           from live_challenge_answers a
           join live_challenge_rounds r on r.id=a.round_id
           join live_challenge_questions lcq on lcq.id=r.challenge_question_id
           where a.round_id=$1
         ) scored
         join question_subtopics qs on qs.question_id=scored.question_id
         on conflict(student_id,subtopic_id) do update set
           marks_earned=mastery.marks_earned+excluded.marks_earned,
           marks_possible=mastery.marks_possible+excluded.marks_possible,
           attempts=mastery.attempts+excluded.attempts,
           score=(mastery.marks_earned+excluded.marks_earned)/nullif(mastery.marks_possible+excluded.marks_possible,0),
           last_activity_at=now(),updated_at=now()`,
        [challenge.round_id],
      );
      await client.query(`update live_challenge_rounds set status='ROUND_RESULTS',results_released_at=coalesce(results_released_at,now()) where id=$1`,[challenge.round_id]);
      const updated=await client.query(`update live_challenges set status='ROUND_RESULTS',state_version=state_version+1,updated_at=now() where id=$1 returning state_version`,[id]);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'round.results_released',jsonb_build_object('roundId',$3::text,'answerCount',$4,'peerMarkCount',$5,'overrideCount',$6,'masteryApplied',true))`,
        [id,actor.id,challenge.round_id,answerCount,peerMarkedCount,overrideCount],
      );
      await client.query('commit');
      return {id,status:'ROUND_RESULTS',stateVersion:Number(updated.rows[0].state_version),roundId:challenge.round_id,markCount:peerMarkedCount,overrideCount,resolvedCount,masteryApplied:true};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async advance(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.staffRound(client,actor,id,true);
      if(challenge.status==='FINISHED'){
        await client.query('commit');
        return {id,status:'FINISHED',stateVersion:Number(challenge.state_version),roundNumber:Number(challenge.round_number),finished:true};
      }
      if(challenge.status==='QUESTION_ACTIVE'){
        const active=await client.query(
          `select lc.state_version,lc.current_question_position,r.id round_id,r.round_number,r.started_at
           from live_challenges lc join live_challenge_rounds r on r.challenge_id=lc.id
           where lc.id=$1 and r.status='QUESTION_ACTIVE' order by r.round_number desc limit 1`,
          [id],
        );
        await client.query('commit');
        const row=active.rows[0];
        return {id,status:'QUESTION_ACTIVE',stateVersion:Number(row?.state_version??challenge.state_version),currentQuestionPosition:row?.current_question_position==null?null:Number(row.current_question_position),roundId:row?.round_id??challenge.round_id,roundNumber:row?.round_number==null?Number(challenge.round_number):Number(row.round_number),startedAt:row?.started_at??null,finished:false};
      }
      if(challenge.status!=='ROUND_RESULTS'||challenge.round_status!=='ROUND_RESULTS')throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);

      const next=await client.query(
        `select lcq.id,lcq.position
         from live_challenge_questions lcq
         where lcq.challenge_id=$1
           and not exists(select 1 from live_challenge_rounds r where r.challenge_id=$1 and r.challenge_question_id=lcq.id)
         order by case when coalesce($2::jsonb->>'question_order','fixed')='shuffled'
           then md5(lcq.question_id::text||$1::text)
           else lpad(lcq.position::text,6,'0') end
         limit 1 for update of lcq`,
        [id,challenge.settings_json],
      );
      if(!next.rowCount){
        const finished=await client.query(
          `update live_challenges set status='FINISHED',finished_at=coalesce(finished_at,now()),updated_at=now(),state_version=state_version+1
           where id=$1 returning state_version,finished_at`,
          [id],
        );
        await client.query(
          `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
           values($1,$2,'challenge.finished',jsonb_build_object('roundCount',$3))`,
          [id,actor.id,Number(challenge.round_number)],
        );
        await client.query('commit');
        return {id,status:'FINISHED',stateVersion:Number(finished.rows[0].state_version),roundNumber:Number(challenge.round_number),finishedAt:finished.rows[0].finished_at,finished:true};
      }

      const selected=next.rows[0],roundNumber=Number(challenge.round_number)+1;
      const round=await client.query(
        `insert into live_challenge_rounds(challenge_id,challenge_question_id,round_number,status,started_at)
         values($1,$2,$3,'QUESTION_ACTIVE',now()) returning id,round_number,started_at`,
        [id,selected.id,roundNumber],
      );
      const updated=await client.query(
        `update live_challenges set status='QUESTION_ACTIVE',current_question_position=$2,updated_at=now(),state_version=state_version+1
         where id=$1 returning state_version,current_question_position`,
        [id,selected.position],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'question.advanced',jsonb_build_object('roundId',$3::text,'roundNumber',$4,'questionPosition',$5))`,
        [id,actor.id,round.rows[0].id,roundNumber,selected.position],
      );
      await client.query('commit');
      return {id,status:'QUESTION_ACTIVE',stateVersion:Number(updated.rows[0].state_version),currentQuestionPosition:Number(updated.rows[0].current_question_position),roundId:round.rows[0].id,roundNumber:Number(round.rows[0].round_number),startedAt:round.rows[0].started_at,finished:false};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async ownResult(actor:Actor,id:string){
    this.student(actor);
    const result=await this.pool.query(
      `select lc.status::text challenge_status,lc.state_version,r.id round_id,r.round_number,
         q.display_ref,lcq.max_marks_snapshot,a.id answer_id,
         coalesce((select so.new_score from live_challenge_score_overrides so where so.answer_id=a.id order by so.created_at desc limit 1),pm.awarded_marks) effective_score,
         case when exists(select 1 from live_challenge_score_overrides so where so.answer_id=a.id) then true else false end teacher_overridden
       from live_challenges lc
       join classes c on c.id=lc.class_id and c.archived_at is null
       join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
       join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$2 and p.status='JOINED'
       join live_challenge_rounds r on r.challenge_id=lc.id
       join live_challenge_questions lcq on lcq.id=r.challenge_question_id
       join questions q on q.id=lcq.question_id
       join live_challenge_answers a on a.round_id=r.id and a.student_id=$2
       left join live_challenge_peer_assignments pa on pa.round_id=r.id and pa.answer_id=a.id and pa.status='SUBMITTED'
       left join live_challenge_peer_marks pm on pm.peer_assignment_id=pa.id
       where lc.id=$1 and lc.status in ('ROUND_RESULTS','FINISHED')
       order by r.round_number desc limit 1`,
      [id,actor.id],
    );
    if(!result.rowCount)throw new DomainError('live_challenge_result_unavailable',409);
    const row=result.rows[0],score=row.effective_score==null?null:Number(row.effective_score),maxMarks=Number(row.max_marks_snapshot);
    return {challengeId:id,status:row.challenge_status,stateVersion:Number(row.state_version),roundId:row.round_id,roundNumber:Number(row.round_number),questionRef:row.display_ref,score,maxMarks,percentage:score==null?null:Math.round(score/maxMarks*1000)/10,teacherOverridden:row.teacher_overridden===true};
  }
}
