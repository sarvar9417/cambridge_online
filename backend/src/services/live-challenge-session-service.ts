import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

const ACTIVE_STATES = ['PUBLISHED','LOBBY','QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS','PAUSED'] as const;

function joinable(status:string,settings:unknown){
  if(status==='PUBLISHED'||status==='LOBBY')return true;
  if(!ACTIVE_STATES.includes(status as typeof ACTIVE_STATES[number]))return false;
  if(!settings||typeof settings!=='object'||Array.isArray(settings))return false;
  return (settings as Record<string,unknown>).allow_late_join===true;
}

export class LiveChallengeSessionService{
  constructor(private readonly pool:Pool){}

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
         and exists(select 1 from live_challenges lc where lc.id=p.challenge_id and lc.status in ('PUBLISHED','LOBBY','PAUSED'))
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
}
