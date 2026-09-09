import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { AssetUrlSigner } from '../jobs/asset-store.js';
import { attemptQuestionAssetIds, serializeAttemptQuestion } from './attempt-question-serializer.js';
import {
  projectLiveChallengeForStudent,
  type LiveChallengeStatus,
} from './live-challenge-domain.js';
import { DomainError } from './assignments-service.js';

const ACTIVE_STATES = ['PUBLISHED','LOBBY','QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS','PAUSED'] as const;

function joinable(status:string,settings:unknown){
  if(status==='PUBLISHED'||status==='LOBBY')return true;
  if(!ACTIVE_STATES.includes(status as typeof ACTIVE_STATES[number]))return false;
  if(!settings||typeof settings!=='object'||Array.isArray(settings))return false;
  return (settings as Record<string,unknown>).allow_late_join===true;
}

function defaultTimeLimit(settings:unknown){
  if(!settings||typeof settings!=='object'||Array.isArray(settings))return null;
  const raw=settings as Record<string,unknown>;
  if(raw.timing_mode!=='per_question')return null;
  return typeof raw.default_time_limit_seconds==='number'&&Number.isInteger(raw.default_time_limit_seconds)
    ? raw.default_time_limit_seconds
    : null;
}

export class LiveChallengeSessionService{
  constructor(private readonly pool:Pool,private readonly assetUrlSigner?:AssetUrlSigner){}

  private student(actor:Actor){if(actor.role!=='student')throw new DomainError('students_only',403)}
  private staff(actor:Actor){if(actor.role==='student')throw new DomainError('staff_only',403)}

  private async teacherChallenge(client:Pool|PoolClient,actor:Actor,id:string,lock=false){
    this.staff(actor);
    const result=await client.query(
      `select lc.*,c.name class_name,s.code syllabus_code,t.title topic_title,st.title subtopic_title
       from live_challenges lc
       join classes c on c.id=lc.class_id
       join syllabi s on s.id=lc.syllabus_id
       left join topics t on t.id=lc.topic_id
       left join subtopics st on st.id=lc.subtopic_id
       where lc.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or lc.teacher_id=$4
         or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
       ) ${lock?'for update of lc':''}`,
      [id,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    return result.rows[0];
  }

  private async studentChallenge(actor:Actor,id:string){
    this.student(actor);
    const result=await this.pool.query(
      `select lc.*,c.name class_name,s.code syllabus_code,t.title topic_title,st.title subtopic_title,
         p.status::text participant_status
       from live_challenges lc
       join classes c on c.id=lc.class_id and c.archived_at is null
       join enrollments e on e.class_id=c.id and e.student_id=$2 and e.left_at is null
       join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$2 and p.status='JOINED'
       join syllabi s on s.id=lc.syllabus_id
       left join topics t on t.id=lc.topic_id
       left join subtopics st on st.id=lc.subtopic_id
       where lc.id=$1 and lc.status not in ('DRAFT','CANCELLED')`,
      [id,actor.id],
    );
    if(!result.rowCount)throw new DomainError('live_challenge_not_joined',403);
    return result.rows[0];
  }

  private async signedQuestion(row:Record<string,unknown>){
    const base=serializeAttemptQuestion({
      id:String(row.question_id),
      display_ref:String(row.display_ref??''),
      stem_md:typeof row.stem_md==='string'?row.stem_md:null,
      context_md:typeof row.context_md==='string'?row.context_md:null,
      parent_context:typeof row.parent_context==='string'?row.parent_context:null,
      command_word:typeof row.command_word==='string'?row.command_word:null,
      marks:Number(row.max_marks_snapshot??row.marks??0),
      answer_kind:String(row.answer_kind??'text'),
      answer_text:null,
      content_json:row.content_json,
      content_version:row.content_version==null?null:Number(row.content_version),
    });
    const ids=attemptQuestionAssetIds(base.contentJson);
    if(!ids.length)return base;
    if(!this.assetUrlSigner)throw new DomainError('live_challenge_question_assets_unavailable',409);
    const assets=await this.pool.query(`select id,storage_path from question_assets where id=any($1::uuid[])`,[ids]);
    const urls:Record<string,string>={};
    await Promise.all(assets.rows.map(async(asset)=>{
      if(!asset.storage_path)return;
      const url=await this.assetUrlSigner!.signStoragePath(asset.storage_path,300);
      if(url)urls[String(asset.id)]=url;
    }));
    if(ids.some(id=>!urls[id]))throw new DomainError('live_challenge_question_assets_unavailable',409);
    return serializeAttemptQuestion({
      id:String(row.question_id),
      display_ref:String(row.display_ref??''),
      stem_md:typeof row.stem_md==='string'?row.stem_md:null,
      context_md:typeof row.context_md==='string'?row.context_md:null,
      parent_context:typeof row.parent_context==='string'?row.parent_context:null,
      command_word:typeof row.command_word==='string'?row.command_word:null,
      marks:Number(row.max_marks_snapshot??row.marks??0),
      answer_kind:String(row.answer_kind??'text'),
      answer_text:null,
      content_json:row.content_json,
      content_version:row.content_version==null?null:Number(row.content_version),
    },urls);
  }

  private async stateProjection(challenge:Record<string,unknown>,staff:boolean){
    const status=String(challenge.status) as LiveChallengeStatus;
    const position=challenge.current_question_position==null?null:Number(challenge.current_question_position);
    let round:null|Record<string,unknown>=null;
    let question:null|Awaited<ReturnType<LiveChallengeSessionService['signedQuestion']>>=null;
    let markScheme:unknown=null;
    let source:unknown=null;
    let timeLimitSeconds:number|null=null;

    if(position!==null){
      const current=await this.pool.query(
        `select lcq.id challenge_question_id,lcq.position,lcq.max_marks_snapshot,lcq.time_limit_seconds,
           lcq.source_occurrence_snapshot,lcq.mark_scheme_snapshot,
           q.id question_id,q.display_ref,q.stem_md,q.context_md,q.command_word::text command_word,
           q.marks,q.answer_kind::text answer_kind,q.content_json,q.content_version,p.context_md parent_context,
           r.id round_id,r.round_number,r.status::text round_status,r.started_at round_started_at,
           r.locked_at,r.marking_started_at,r.results_released_at
         from live_challenge_questions lcq
         join questions q on q.id=lcq.question_id
         left join questions p on p.id=q.parent_id
         left join live_challenge_rounds r on r.challenge_id=lcq.challenge_id and r.challenge_question_id=lcq.id
         where lcq.challenge_id=$1 and lcq.position=$2
         order by r.round_number desc nulls last limit 1`,
        [String(challenge.id),position],
      );
      if(!current.rowCount)throw new DomainError('live_challenge_round_unavailable',409);
      const row=current.rows[0] as Record<string,unknown>;
      question=await this.signedQuestion(row);
      markScheme=row.mark_scheme_snapshot;
      source=row.source_occurrence_snapshot;
      timeLimitSeconds=row.time_limit_seconds==null?defaultTimeLimit(challenge.settings_json):Number(row.time_limit_seconds);
      round={
        id:row.round_id,
        number:row.round_number==null?null:Number(row.round_number),
        status:row.round_status,
        startedAt:row.round_started_at,
        lockedAt:row.locked_at,
        markingStartedAt:row.marking_started_at,
        resultsReleasedAt:row.results_released_at,
        timeLimitSeconds,
      };
    }

    const projected=staff
      ? {status,question,markScheme,source}
      : {...projectLiveChallengeForStudent({status,question,markScheme}),source:null};
    return {
      id:challenge.id,
      title:challenge.title,
      classId:challenge.class_id,
      className:challenge.class_name,
      syllabusCode:challenge.syllabus_code,
      topicTitle:challenge.topic_title,
      subtopicTitle:challenge.subtopic_title,
      status:projected.status,
      stateVersion:Number(challenge.state_version),
      currentQuestionPosition:position,
      serverNow:new Date().toISOString(),
      round,
      question:projected.question,
      markScheme:projected.markScheme,
      source:staff?source:null,
    };
  }

  async studentFeed(actor:Actor){
    this.student(actor);
    const result=await this.pool.query(
      `select lc.id,lc.title,lc.class_id,c.name class_name,lc.status::text status,
         lc.join_code,lc.settings_json,lc.published_at,lc.started_at,lc.current_question_position,
         u.full_name teacher_name,s.code syllabus_code,t.title topic_title,st.title subtopic_title,
         p.status::text participant_status,p.joined_at,
         (select count(*)::int from live_challenge_questions q where q.challenge_id=lc.id) question_count,
         (select count(*)::int from live_challenge_participants x where x.challenge_id=lc.id and x.status='JOINED') joined_count
       from enrollments e
       join classes c on c.id=e.class_id and c.archived_at is null
       join live_challenges lc on lc.class_id=c.id
       join users u on u.id=lc.teacher_id
       join syllabi s on s.id=lc.syllabus_id
       left join topics t on t.id=lc.topic_id
       left join subtopics st on st.id=lc.subtopic_id
       left join live_challenge_participants p on p.challenge_id=lc.id and p.student_id=$1
       where e.student_id=$1 and e.left_at is null
         and lc.status in ('PUBLISHED','LOBBY','QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS','PAUSED')
       order by case lc.status when 'QUESTION_ACTIVE' then 0 when 'LOBBY' then 1 when 'PUBLISHED' then 2 else 3 end,
         lc.published_at desc nulls last,lc.created_at desc`,
      [actor.id],
    );
    return result.rows.map(row=>({
      id:row.id,title:row.title,classId:row.class_id,className:row.class_name,status:row.status,
      teacherName:row.teacher_name,syllabusCode:row.syllabus_code,topicTitle:row.topic_title,
      subtopicTitle:row.subtopic_title,questionCount:Number(row.question_count),joinedCount:Number(row.joined_count),
      participantStatus:row.participant_status,joinedAt:row.joined_at,publishedAt:row.published_at,startedAt:row.started_at,
      currentQuestionPosition:row.current_question_position,
      canJoin:joinable(row.status,row.settings_json),
    }));
  }

  async join(actor:Actor,code:string){
    this.student(actor);
    const normalized=code.trim().toUpperCase();
    if(!/^[A-Z0-9]{6}$/.test(normalized))throw new DomainError('live_challenge_invalid_join_code',400);
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const result=await client.query(
        `select lc.id,lc.title,lc.class_id,c.name class_name,lc.status::text status,lc.settings_json,
           lc.started_at,lc.join_code,u.full_name teacher_name
         from live_challenges lc
         join classes c on c.id=lc.class_id and c.archived_at is null
         join enrollments e on e.class_id=c.id and e.student_id=$1 and e.left_at is null
         join users u on u.id=lc.teacher_id
         where lc.join_code=$2
           and lc.status not in ('DRAFT','FINISHED','CANCELLED')
         for update of lc`,
        [actor.id,normalized],
      );
      if(!result.rowCount)throw new DomainError('live_challenge_join_not_found',404);
      const challenge=result.rows[0];
      if(!joinable(challenge.status,challenge.settings_json))throw new DomainError('live_challenge_join_closed',409);
      const existing=await client.query(
        `select status::text status from live_challenge_participants where challenge_id=$1 and student_id=$2 for update`,
        [challenge.id,actor.id],
      );
      if(existing.rows[0]?.status==='REMOVED')throw new DomainError('live_challenge_removed',403);
      await client.query(
        `insert into live_challenge_participants(challenge_id,student_id,status,joined_at,last_seen_at,left_at)
         values($1,$2,'JOINED',now(),now(),null)
         on conflict(challenge_id,student_id) do update set
           status='JOINED',last_seen_at=now(),left_at=null`,
        [challenge.id,actor.id],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'participant.joined',jsonb_build_object('joinCode',$3))`,
        [challenge.id,actor.id,normalized],
      );
      const count=await client.query(
        `select count(*)::int joined_count from live_challenge_participants where challenge_id=$1 and status='JOINED'`,
        [challenge.id],
      );
      await client.query('commit');
      return {id:challenge.id,title:challenge.title,classId:challenge.class_id,className:challenge.class_name,status:challenge.status,teacherName:challenge.teacher_name,joinedCount:Number(count.rows[0].joined_count),joined:true};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async leave(actor:Actor,id:string){
    this.student(actor);
    const result=await this.pool.query(
      `update live_challenge_participants p set status='LEFT',left_at=now(),last_seen_at=now()
       where p.challenge_id=$1 and p.student_id=$2 and p.status='JOINED'
         and exists(
           select 1 from live_challenges lc
           where lc.id=p.challenge_id and (
             lc.status in ('PUBLISHED','LOBBY')
             or (lc.status='PAUSED' and lc.paused_from_status in ('PUBLISHED','LOBBY'))
           )
         )
       returning p.challenge_id`,
      [id,actor.id],
    );
    if(!result.rowCount)throw new DomainError('live_challenge_leave_closed',409);
    await this.pool.query(`insert into live_challenge_events(challenge_id,actor_id,event_type) values($1,$2,'participant.left')`,[id,actor.id]);
    return {id,left:true};
  }

  async lobby(actor:Actor,id:string){
    const challenge=await this.teacherChallenge(this.pool,actor,id);
    if(!['PUBLISHED','LOBBY','PAUSED'].includes(challenge.status))throw new DomainError('live_challenge_lobby_unavailable',409);
    const participants=await this.pool.query(
      `select p.student_id,u.full_name,p.status::text status,p.joined_at,p.last_seen_at
       from live_challenge_participants p join users u on u.id=p.student_id
       where p.challenge_id=$1 and p.status<>'REMOVED'
       order by case p.status when 'JOINED' then 0 else 1 end,u.full_name`,
      [id],
    );
    return {
      id:challenge.id,title:challenge.title,classId:challenge.class_id,className:challenge.class_name,
      syllabusCode:challenge.syllabus_code,topicTitle:challenge.topic_title,subtopicTitle:challenge.subtopic_title,
      status:challenge.status,joinCode:challenge.join_code,stateVersion:Number(challenge.state_version),
      participantCount:participants.rows.filter(row=>row.status==='JOINED').length,
      participants:participants.rows.map(row=>({studentId:row.student_id,fullName:row.full_name,status:row.status,joinedAt:row.joined_at,lastSeenAt:row.last_seen_at})),
    };
  }

  async openLobby(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.teacherChallenge(client,actor,id,true);
      if(challenge.status==='LOBBY'){await client.query('commit');return{ id,status:'LOBBY',stateVersion:Number(challenge.state_version),joinCode:challenge.join_code }}
      if(challenge.status!=='PUBLISHED')throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      const updated=await client.query(
        `update live_challenges set status='LOBBY',updated_at=now(),state_version=state_version+1 where id=$1
         returning id,status::text status,state_version,join_code`,
        [id],
      );
      await client.query(`insert into live_challenge_events(challenge_id,actor_id,event_type) values($1,$2,'challenge.lobby_opened')`,[id,actor.id]);
      await client.query('commit');
      return {id:updated.rows[0].id,status:updated.rows[0].status,stateVersion:Number(updated.rows[0].state_version),joinCode:updated.rows[0].join_code};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async start(actor:Actor,id:string,expectedStateVersion?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const challenge=await this.teacherChallenge(client,actor,id,true);
      if(challenge.status==='QUESTION_ACTIVE'){
        const existing=await client.query(
          `select r.id round_id,r.round_number,r.started_at,lc.current_question_position,lc.state_version
           from live_challenge_rounds r join live_challenges lc on lc.id=r.challenge_id
           where r.challenge_id=$1 and r.status='QUESTION_ACTIVE'
           order by r.round_number desc limit 1`,[id],
        );
        await client.query('commit');
        const row=existing.rows[0];
        return {id,status:'QUESTION_ACTIVE',stateVersion:Number(row?.state_version??challenge.state_version),currentQuestionPosition:Number(row?.current_question_position??challenge.current_question_position),roundId:row?.round_id??null,roundNumber:row?.round_number==null?null:Number(row.round_number),startedAt:row?.started_at??challenge.started_at};
      }
      if(challenge.status!=='LOBBY')throw new DomainError('live_challenge_invalid_transition',409);
      if(expectedStateVersion!==undefined&&Number(challenge.state_version)!==expectedStateVersion)throw new DomainError('live_challenge_state_conflict',409);
      const first=await client.query(
        `select lcq.id,lcq.position
         from live_challenge_questions lcq
         where lcq.challenge_id=$1
         order by case when coalesce($2::jsonb->>'question_order','fixed')='shuffled'
           then md5(lcq.question_id::text||$1::text)
           else lpad(lcq.position::text,6,'0') end
         limit 1 for update`,
        [id,challenge.settings_json],
      );
      if(!first.rowCount)throw new DomainError('live_challenge_questions_required',409);
      const selected=first.rows[0];
      const round=await client.query(
        `insert into live_challenge_rounds(challenge_id,challenge_question_id,round_number,status,started_at)
         values($1,$2,1,'QUESTION_ACTIVE',now())
         returning id,round_number,started_at`,
        [id,selected.id],
      );
      const updated=await client.query(
        `update live_challenges set status='QUESTION_ACTIVE',current_question_position=$2,
           started_at=coalesce(started_at,now()),updated_at=now(),state_version=state_version+1
         where id=$1 returning id,status::text status,state_version,current_question_position,started_at`,
        [id,selected.position],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'round.started',jsonb_build_object('roundId',$3::text,'roundNumber',1,'questionPosition',$4))`,
        [id,actor.id,round.rows[0].id,selected.position],
      );
      await client.query('commit');
      return {id:updated.rows[0].id,status:updated.rows[0].status,stateVersion:Number(updated.rows[0].state_version),currentQuestionPosition:Number(updated.rows[0].current_question_position),roundId:round.rows[0].id,roundNumber:Number(round.rows[0].round_number),startedAt:round.rows[0].started_at};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async state(actor:Actor,id:string){
    const challenge=actor.role==='student'
      ? await this.studentChallenge(actor,id)
      : await this.teacherChallenge(this.pool,actor,id);
    return this.stateProjection(challenge,actor.role!=='student');
  }
}