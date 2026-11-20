import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { ContentService } from './content-service.js';

type Scope = { chapterNo:number;kind:'chapter'|'topic'|'section';code?:string };
type Quality = 'official_textbook_definition'|'supplementary_targeted_verified'|string;
type Term = {id:string;term:string;definition:string;status:string;isOfficialKeyTerm:boolean;
  definitionEvidenceStatus:Quality;chapterNo?:number;syllabusTopicCode?:string};
type Question = {id:string;prompt:string;options:string[];answerIndex:number;
  explanation:string;sourceContext:string};
type Status = 'waiting'|'active'|'review'|'finished';
type Room = {id:string;host_id:string;pin:string;course_code:string;scopes:Scope[];
  questions:Question[];status:Status;question_index:number;question_seconds:number;
  question_started_at:Date|string|null;created_at:string;finished_at:string|null};
type Player = {id:string;room_id:string;nickname:string;avatar:string;score:number;
  streak:number;correct_count:number};
type Answer = {player_id:string;question_index:number;choice_index:number;correct:boolean;
  points:number;elapsed_ms:number};

const error=(code:string,status:400|403|404|409|429)=>new DomainError(code,status);
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const shuffled=<T,>(values:readonly T[]):T[]=>{
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=randomInt(i+1);[result[i],result[j]]=[result[j]!,result[i]!];}
  return result;
};

/** Answers remain server-only until a round is revealed; the room PIN is never
 * sufficient to read individual answers, reporting data or a participant token.
 */
export function buildLiveQuizQuestions(terms:readonly Term[], requested:number):Question[] {
  const seenTerms=new Set<string>(),seenDefinitions=new Set<string>();
  const eligible=terms.filter(term=>{
    if(term.status!=='approved'||!(term.isOfficialKeyTerm||
        ['official_textbook_definition','supplementary_targeted_verified'].includes(term.definitionEvidenceStatus)))return false;
    const label=term.term.trim().toLocaleLowerCase('en');
    const description=term.definition.trim().toLocaleLowerCase('en');
    if(!label||!description||seenTerms.has(label)||seenDefinitions.has(description))return false;
    seenTerms.add(label);seenDefinitions.add(description);return true;
  });
  if(eligible.length<4)throw error('quiz_question_pool_small',409);
  return shuffled(eligible).slice(0,requested).map(term=>{
    const distractors=shuffled(eligible.filter(other=>other.id!==term.id)).slice(0,3);
    const choices=shuffled([term,...distractors]);
    const answerIndex=choices.findIndex(candidate=>candidate.id===term.id);
    return {id:randomUUID(),prompt:term.definition,options:choices.map(choice=>choice.term),answerIndex,
      explanation:`${term.term} — ${term.definition}`,
      sourceContext:`Chapter ${term.chapterNo??'?'}${term.syllabusTopicCode?' · Topic '+term.syllabusTopicCode:''}`};
  });
}

export function liveQuizPoints(correct:boolean,elapsedMs:number,limitSeconds:number,streak:number) {
  if(!correct)return 0;
  const timeFraction=1-Math.min(1,Math.max(0,elapsedMs)/(limitSeconds*1000));
  return Math.min(1000,600+Math.floor(300*timeFraction)+Math.min(100,Math.max(0,streak)*25));
}

export class LiveQuizService {
  private content:ContentService;
  constructor(private pool:Pool,content?:ContentService){this.content=content??new ContentService(pool);}

  private teacher(actor:Actor){if(actor.role==='student')throw error('quiz_teacher_only',403);}

  async create(actor:Actor,input:{courseCode:'9618'|'0478';scopes:Scope[];count:number;seconds:number}) {
    this.teacher(actor);
    const collection=await this.content.interactiveGameCollection(actor,{courseCode:input.courseCode,scopes:input.scopes});
    const questions=buildLiveQuizQuestions(collection.pairs,input.count);
    for(let i=0;i<8;i++){
      const pin=String(randomInt(100000,1000000));
      try{
        const result=await this.pool.query<{id:string}>(
          `insert into live_quiz_rooms(host_id,pin,course_code,scopes,questions,question_seconds)
           select $1,$2,$3,$4::jsonb,$5::jsonb,$6
           where not exists(select 1 from live_quiz_rooms
             where pin=$2 and created_at>now()-interval '24 hours')
           returning id`,
          [actor.id,pin,input.courseCode,JSON.stringify(collection.scopes),JSON.stringify(questions),input.seconds],
        );
        if(result.rowCount)return {id:result.rows[0]!.id,pin,questionCount:questions.length};
      }catch(cause){if((cause as {code?:string}).code!=='23505')throw cause;}
    }
    throw error('quiz_pin_unavailable',409);
  }

  async history(actor:Actor){
    this.teacher(actor);
    const rows=await this.pool.query(
      `select r.id,r.pin,r.course_code,r.status,r.created_at,r.finished_at,
        jsonb_array_length(r.questions) question_count,
        (select count(*)::int from live_quiz_players p where p.room_id=r.id) player_count
       from live_quiz_rooms r where r.host_id=$1 order by r.created_at desc limit 25`,[actor.id]);
    return rows.rows.map(row=>({id:row.id,pin:row.pin,courseCode:row.course_code,status:row.status,
      createdAt:row.created_at,finishedAt:row.finished_at,questionCount:Number(row.question_count),
      playerCount:Number(row.player_count)}));
  }

  private async hostRoom(actor:Actor,id:string,lock?:PoolClient):Promise<Room>{
    this.teacher(actor);
    const result=await (lock??this.pool).query<Room>(
      `select * from live_quiz_rooms where id=$1 and host_id=$2${lock?' for update':''}`,[id,actor.id]);
    if(!result.rowCount)throw error('quiz_room_not_found',404);
    return result.rows[0]!;
  }

  private async playerRoom(id:string,token:string,lock?:PoolClient):Promise<{room:Room;player:Player}>{
    if(!/^[0-9a-f]{64}$/i.test(token))throw error('quiz_player_not_found',404);
    const result=await (lock??this.pool).query<Room&{
      player_id:string;room_id:string;nickname:string;avatar:string;score:number;streak:number;correct_count:number}>(
      `select r.*,p.id player_id,p.room_id,p.nickname,p.avatar,p.score,p.streak,p.correct_count
       from live_quiz_players p join live_quiz_rooms r on r.id=p.room_id
       where p.id=$1 and p.token_hash=$2${lock?' for update of r,p':''}`,[id,hash(token)]);
    if(!result.rowCount)throw error('quiz_player_not_found',404);
    const row=result.rows[0]!;
    return {room:row,player:{id:row.player_id,room_id:row.room_id,nickname:row.nickname,
      avatar:row.avatar,score:Number(row.score),streak:Number(row.streak),correct_count:Number(row.correct_count)}};
  }

  async join(input:{pin:string;nickname:string;avatar:string}) {
    const secret=randomBytes(32).toString('hex');
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const room=await client.query<Room>(
        `select * from live_quiz_rooms where pin=$1 and status='waiting' for update`,[input.pin]);
      if(!room.rowCount)throw error('quiz_room_not_found',404);
      const capacity=await client.query<{total:number}>(
        `select count(*)::int total from live_quiz_players where room_id=$1`,[room.rows[0]!.id]);
      if(Number(capacity.rows[0]?.total??0)>=60)throw error('quiz_room_full',409);
      const result=await client.query<{id:string}>(
        `insert into live_quiz_players(room_id,nickname,avatar,token_hash)
         values($1,$2,$3,$4) returning id`,[room.rows[0]!.id,input.nickname.trim(),input.avatar,hash(secret)]);
      await client.query('commit');
      return {playerId:result.rows[0]!.id,token:secret,pin:input.pin,roomId:room.rows[0]!.id};
    }catch(cause){
      await client.query('rollback');
      if((cause as {code?:string}).code==='23505')throw error('quiz_name_taken',409);
      throw cause;
    }finally{client.release();}
  }

  async command(actor:Actor,id:string,action:'start'|'reveal'|'next'|'finish'){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const room=await this.hostRoom(actor,id,client);
      let status:Status=room.status,index=room.question_index;
      if(action==='start'){
        if(status!=='waiting')throw error('quiz_invalid_state',409);
        const count=await client.query(`select 1 from live_quiz_players where room_id=$1 limit 1`,[id]);
        if(!count.rowCount)throw error('quiz_no_players',409);
        status='active';index=0;
      }else if(action==='reveal'){
        if(status!=='active')throw error('quiz_invalid_state',409);
        status='review';
      }else if(action==='next'){
        if(status!=='review')throw error('quiz_invalid_state',409);
        if(index+1>=room.questions.length)status='finished';
        else{status='active';index++;}
      }else if(action==='finish'){
        if(!['active','review'].includes(status))throw error('quiz_invalid_state',409);
        status='finished';
      }
      await client.query(`update live_quiz_rooms set status=$2,question_index=$3,
        question_started_at=case when $2='active' then now() else question_started_at end,
        finished_at=case when $2='finished' then now() else finished_at end,
        updated_at=now() where id=$1`,[id,status,index]);
      await client.query('commit');
      return {status,questionIndex:index};
    }catch(cause){await client.query('rollback');throw cause;}
    finally{client.release();}
  }

  /** The score is not published during an active question, so a peer cannot
   * infer a still-open correct option from a live point increase. */
  private async snapshot(room:Room,viewer?:Player){
    const cutoff=room.status==='active'?room.question_index:room.question_index+1;
    const players=await this.pool.query(
      `select p.id,p.nickname,p.avatar,
         coalesce(sum(a.points) filter(where a.question_index<$2),0)::int score,
         count(a.question_index) filter(where a.question_index=$3)::int as answered_now
       from live_quiz_players p left join live_quiz_answers a on a.player_id=p.id
       where p.room_id=$1 group by p.id order by score desc,p.joined_at asc`,
      [room.id,cutoff,room.question_index]);
    const answered=players.rows.filter(row=>Number(row.answered_now)>0).length;
    const canReveal=room.status==='review';
    const original=room.question_index>=0?room.questions[room.question_index]:undefined;
    const question=room.status==='finished'||!original?null:{id:original.id,index:room.question_index,
      prompt:original.prompt,options:original.options,sourceContext:original.sourceContext,
      ...(canReveal?{correctIndex:original.answerIndex,explanation:original.explanation}:{})};
    let ownAnswer:{choiceIndex:number;correct?:boolean;points?:number}|null=null;
    if(viewer&&room.question_index>=0){
      const row=await this.pool.query<Answer>(
        `select choice_index,correct,points from live_quiz_answers
         where player_id=$1 and question_index=$2`,[viewer.id,room.question_index]);
      if(row.rowCount){const result=row.rows[0]!;ownAnswer={choiceIndex:Number(result.choice_index),
        ...(canReveal?{correct:Boolean(result.correct),points:Number(result.points)}:{})};}
    }
    return {id:room.id,pin:room.pin,courseCode:room.course_code,status:room.status,
      questionCount:room.questions.length,questionIndex:room.question_index,
      questionSeconds:room.question_seconds,questionStartedAt:room.question_started_at,
      serverNow:new Date().toISOString(),players:players.rows.map(row=>({id:row.id,nickname:row.nickname,
        avatar:row.avatar,score:Number(row.score),answered:Boolean(Number(row.answered_now))})),
      answeredCount:answered,question,ownAnswer,
      ...(viewer?{selfId:viewer.id,nickname:viewer.nickname}:{})};
  }

  async teacherSnapshot(actor:Actor,id:string){return this.snapshot(await this.hostRoom(actor,id));}
  async guestSnapshot(id:string,token:string){const {room,player}=await this.playerRoom(id,token);return this.snapshot(room,player);}

  async answer(id:string,token:string,questionIndex:number,choiceIndex:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const {room,player}=await this.playerRoom(id,token,client);
      const current=room.questions[room.question_index];
      if(room.status!=='active'||questionIndex!==room.question_index||!current)throw error('quiz_answer_closed',409);
      const elapsed=Math.max(0,Date.now()-new Date(room.question_started_at!).getTime());
      if(elapsed>=room.question_seconds*1000)throw error('quiz_time_expired',409);
      const correct=choiceIndex===current.answerIndex;
      const points=liveQuizPoints(correct,elapsed,room.question_seconds,correct?player.streak+1:0);
      const result=await client.query<{player_id:string}>(
        `insert into live_quiz_answers(player_id,question_index,choice_index,correct,points,elapsed_ms)
         values($1,$2,$3,$4,$5,$6) on conflict(player_id,question_index) do nothing returning player_id`,
        [player.id,questionIndex,choiceIndex,correct,points,elapsed]);
      if(!result.rowCount)throw error('quiz_already_answered',409);
      await client.query(`update live_quiz_players set score=score+$2,
        correct_count=correct_count+$3,streak=$4 where id=$1`,
        [player.id,points,correct?1:0,correct?player.streak+1:0]);
      await client.query('commit');
      return {submitted:true,questionIndex};
    }catch(cause){await client.query('rollback');throw cause;}
    finally{client.release();}
  }

  private async report(room:Room,onlyPlayerId?:string){
    if(room.status!=='finished')throw error('quiz_results_not_ready',409);
    const count=Math.max(0,room.question_index+1);
    const results=await this.pool.query<Player&{question_index:number|null;choice_index:number|null;
      correct:boolean|null;points:number|null;elapsed_ms:number|null}>(
      `select p.id,p.room_id,p.nickname,p.avatar,p.score,p.correct_count,
        a.question_index,a.choice_index,a.correct,a.points,a.elapsed_ms
       from live_quiz_players p left join live_quiz_answers a on a.player_id=p.id
       where p.room_id=$1 and ($2::uuid is null or p.id=$2)
       order by p.score desc,p.joined_at,p.id,a.question_index`,[room.id,onlyPlayerId??null]);
    const grouped=new Map<string,{id:string;nickname:string;avatar:string;score:number;
      correct:number;answered:number;total:number;details:Array<{number:number;prompt:string;
      options:string[];choiceIndex:number|null;correctIndex:number;correct:boolean;points:number;
      explanation:string;sourceContext:string;status:'correct'|'wrong'|'skipped'}>}>();
    for(const row of results.rows){
      if(!grouped.has(row.id))grouped.set(row.id,{id:row.id,nickname:row.nickname,
        avatar:row.avatar,score:Number(row.score),correct:Number(row.correct_count),answered:0,total:count,
        details:room.questions.slice(0,count).map((question,index)=>({number:index+1,prompt:question.prompt,
          options:question.options,choiceIndex:null,correctIndex:question.answerIndex,correct:false,
          points:0,explanation:question.explanation,sourceContext:question.sourceContext,status:'skipped'}))});
      if(row.question_index!=null){
        const student=grouped.get(row.id)!;
        const detail=student.details[Number(row.question_index)];
        if(detail){detail.choiceIndex=Number(row.choice_index);detail.correct=Boolean(row.correct);
          detail.points=Number(row.points);detail.status=row.correct?'correct':'wrong';student.answered++;}
      }
    }
    return {id:room.id,pin:room.pin,courseCode:room.course_code,totalQuestions:count,
      finishedAt:room.finished_at,students:[...grouped.values()].sort((a,b)=>b.score-a.score||b.correct-a.correct||a.nickname.localeCompare(b.nickname))};
  }

  async teacherReport(actor:Actor,id:string){return this.report(await this.hostRoom(actor,id));}
  async guestReport(id:string,token:string){const {room,player}=await this.playerRoom(id,token);return this.report(room,player.id);}
}
