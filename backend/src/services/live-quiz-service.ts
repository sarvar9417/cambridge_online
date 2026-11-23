import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { ContentService } from './content-service.js';
import { selectRelatedDistractors, type QuizDifficulty } from './live-quiz-distractors.js';

type Scope = { chapterNo:number;kind:'chapter'|'topic'|'section';code?:string };
type Quality = 'official_textbook_definition'|'supplementary_targeted_verified'|string;
type Term = {id:string;term:string;definition:string;status:string;isOfficialKeyTerm:boolean;
  definitionEvidenceStatus:Quality;chapterNo?:number;syllabusTopicCode?:string;
  hodderSectionCodes?:string[]};
type Question = {id:string;prompt:string;options:string[];answerIndex:number;
  explanation:string;sourceContext:string};
type Status = 'waiting'|'active'|'review'|'finished';
type GameMode = 'classic'|'treasure';
type QuestionOrder = 'random'|'ordered'|'mastery';
type Room = {id:string;host_id:string;pin:string;course_code:string;scopes:Scope[];
  questions:Question[];status:Status;question_index:number;question_seconds:number;
  question_started_at:Date|string|null;created_at:string;updated_at:Date|string;finished_at:string|null;
  game_mode:GameMode;duration_seconds:number;ends_at:Date|string|null;
  allow_late_join:boolean;show_correctness:boolean;random_names:boolean;
  treasure_goal:number;dragon_pool:number;question_order:QuestionOrder;
  incorrect_penalty_seconds:number};
type Player = {id:string;room_id:string;nickname:string;avatar:string;score:number;
  streak:number;correct_count:number;next_turn:number;question_started_at:Date|string;
  blocked_until:Date|string|null};
type Answer = {player_id:string;question_index:number;choice_index:number;correct:boolean;
  points:number;elapsed_ms:number};

const error=(code:string,status:400|403|404|409|429)=>new DomainError(code,status);
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const CLASSIC_REVIEW_SECONDS=5;
const randomStudentName=()=>`Player ${randomInt(10000,99999)}`;
const shuffled=<T,>(values:readonly T[]):T[]=>{
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=randomInt(i+1);[result[i],result[j]]=[result[j]!,result[i]!];}
  return result;
};

/** Answers remain server-only until a round is revealed; the room PIN is never
 * sufficient to read individual answers, reporting data or a participant token.
 */
export function buildLiveQuizQuestions(
  terms: readonly Term[], requested: number, order: QuestionOrder = 'random',
  difficulty: QuizDifficulty = 'standard',
): Question[] {
  const seenTerms = new Set<string>(), seenDefinitions = new Set<string>(), seenIds = new Set<string>();
  // Preserve the pre-existing source verification and distinct-answer gates.
  const canonical = (text: string) => text.normalize('NFKC').trim()
    .replace(/\s+/g, ' ').toLocaleLowerCase('en');
  const eligible = terms.filter(term => {
    if (term.status !== 'approved' || !(term.isOfficialKeyTerm ||
        ['official_textbook_definition', 'supplementary_targeted_verified']
          .includes(term.definitionEvidenceStatus))) return false;
    const label = canonical(term.term), description = canonical(term.definition);
    if (!label || !description || seenIds.has(term.id) ||
      seenTerms.has(label) || seenDefinitions.has(description)) return false;
    seenIds.add(term.id); seenTerms.add(label); seenDefinitions.add(description);
    return true;
  });
  if (eligible.length < 4) throw error('quiz_question_pool_small', 409);

  const ordered = order === 'ordered' ? [...eligible].sort((a, b) =>
    (a.chapterNo ?? 0) - (b.chapterNo ?? 0) ||
    (a.syllabusTopicCode ?? '').localeCompare(b.syllabusTopicCode ?? '') ||
    a.term.localeCompare(b.term)) : shuffled(eligible);
  const questions: Question[] = [];
  for (const term of ordered) {
    if (questions.length >= requested) break;
    // Shuffle before ranking so equally plausible alternatives rotate between sessions.
    const distractors = selectRelatedDistractors(term, shuffled(eligible), difficulty);
    if (distractors.length < 3) continue; // Never pad with unrelated terms.
    const choices = shuffled([term, ...distractors]);
    const answerIndex = choices.findIndex(candidate => candidate.id === term.id);
    questions.push({
      id: randomUUID(), prompt: term.definition.trim().replace(/\s+/g, ' '),
      options: choices.map(choice => choice.term.trim().replace(/\s+/g, ' ')),
      answerIndex,
      explanation: term.term.trim().replace(/\s+/g, ' ') + ' — ' +
        term.definition.trim().replace(/\s+/g, ' '),
      sourceContext: 'Chapter ' + (term.chapterNo ?? '?') +
        (term.syllabusTopicCode ? ' · Topic ' + term.syllabusTopicCode : ''),
    });
  }
  // A quiz with 1–3 answerable questions is not a fair 4-option classroom session.
  if (questions.length < 4) throw error('quiz_distractors_insufficient', 409);
  return questions;
}

export function liveQuizPoints(correct:boolean,elapsedMs:number,limitSeconds:number,streak:number) {
  if(!correct)return 0;
  const timeFraction=1-Math.min(1,Math.max(0,elapsedMs)/(limitSeconds*1000));
  return Math.min(1000,600+Math.floor(300*timeFraction)+Math.min(100,Math.max(0,streak)*25));
}

export type TreasureReward='gold'|'double'|'triple'|'empty'|'take'|'swap'|'dragon'|'dragon_treasure';
/** Server-side random chest probabilities; the client can never choose the reward. */
export function drawTreasureReward():TreasureReward {
  const roll=randomInt(100);
  if(roll<43)return 'gold';
  if(roll<55)return 'double';
  if(roll<58)return 'triple';
  if(roll<66)return 'empty';
  if(roll<79)return 'take';
  if(roll<86)return 'swap';
  if(roll<97)return 'dragon';
  return 'dragon_treasure';
}

export function settleTreasureBalance(reward:TreasureReward,balance:number,dragonPool:number){
  if(reward==='gold')return {balance:balance+randomInt(100,501),dragonPool};
  if(reward==='double')return {balance:balance*2,dragonPool};
  if(reward==='triple')return {balance:balance*3,dragonPool};
  if(reward==='dragon'){
    const lost=Math.floor(balance*(randomInt(2)===0?.1:.25));
    return {balance:balance-lost,dragonPool:dragonPool+lost};
  }
  if(reward==='dragon_treasure')return {balance:balance+dragonPool,dragonPool:0};
  return {balance,dragonPool};
}

export class LiveQuizService {
  private content:ContentService;
  constructor(private pool:Pool,content?:ContentService){this.content=content??new ContentService(pool);}

  private teacher(actor:Actor){if(actor.role==='student')throw error('quiz_teacher_only',403);}

  async create(actor:Actor,input:{classId?:string;courseCode:'9618'|'0478';scopes:Scope[];count:number;seconds:number;
    mode?:GameMode;durationSeconds?:number;allowLateJoin?:boolean;showCorrectness?:boolean;
    randomNames?:boolean;treasureGoal?:number;questionOrder?:QuestionOrder;
    questionDifficulty?:QuizDifficulty;
    incorrectPenaltySeconds?:number}) {
    this.teacher(actor);
    if(input.classId){
      const authorized=await this.pool.query(
        `select 1 from classes c where c.id=$1 and c.archived_at is null and (
           ($2='owner' and c.school_id=$3) or
           ($2='teacher' and (c.owner_id=$4 or exists (
             select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
           )))
         )`,[input.classId,actor.role,actor.schoolId,actor.id]);
      if(!authorized.rowCount)throw error('quiz_class_not_found',404);
    }
    const collection=await this.content.interactiveGameCollection(actor,{courseCode:input.courseCode,scopes:input.scopes});
    const questions=buildLiveQuizQuestions(collection.pairs,input.count,input.questionOrder,
      input.questionDifficulty??'standard');
    for(let i=0;i<8;i++){
      const pin=String(randomInt(100000,1000000));
      try{
        const result=await this.pool.query<{id:string}>(
          `insert into live_quiz_rooms(host_id,class_id,pin,course_code,scopes,questions,question_seconds,
             game_mode,duration_seconds,allow_late_join,show_correctness,random_names,treasure_goal,
             question_order,incorrect_penalty_seconds)
           select $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15
           where not exists(select 1 from live_quiz_rooms
             where pin=$3 and created_at>now()-interval '24 hours')
           returning id`,
          [actor.id,input.classId??null,pin,input.courseCode,JSON.stringify(collection.scopes),JSON.stringify(questions),input.seconds,
            input.mode??'classic',input.durationSeconds??420,input.allowLateJoin??false,
            input.showCorrectness??true,input.randomNames??false,input.treasureGoal??10000,
            input.questionOrder??'random',input.incorrectPenaltySeconds??2],
        );
        if(result.rowCount)return {id:result.rows[0]!.id,pin,questionCount:questions.length};
      }catch(cause){if((cause as {code?:string}).code!=='23505')throw cause;}
    }
    throw error('quiz_pin_unavailable',409);
  }

  async history(actor:Actor){
    this.teacher(actor);
    const rows=await this.pool.query(
      `select r.id,r.pin,r.course_code,r.status,r.created_at,r.finished_at,r.game_mode,
        jsonb_array_length(r.questions) question_count,
        (select count(*)::int from live_quiz_players p where p.room_id=r.id) player_count
       from live_quiz_rooms r where r.host_id=$1 order by r.created_at desc limit 25`,[actor.id]);
    return rows.rows.map(row=>({id:row.id,pin:row.pin,courseCode:row.course_code,status:row.status,mode:row.game_mode,
      createdAt:row.created_at,finishedAt:row.finished_at,questionCount:Number(row.question_count),
      playerCount:Number(row.player_count)}));
  }

  /** Only the host may permanently remove a finished room and its dependent reports. */
  async deleteFinished(actor:Actor,id:string){
    this.teacher(actor);
    const deleted=await this.pool.query<{id:string}>(
      `delete from live_quiz_rooms where id=$1 and host_id=$2 and status='finished' returning id`,
      [id,actor.id]);
    if(!deleted.rowCount){
      // Do not reveal whether someone else's room exists.
      await this.hostRoom(actor,id);
      throw error('quiz_must_finish_before_delete',409);
    }
    return {deleted:true};
  }

  async availableForStudent(actor:Actor){
    if(actor.role!=='student')throw error('quiz_student_only',403);
    if(!actor.schoolId)return [];
    const result=await this.pool.query<{
      id:string;pin:string;class_name:string;course_code:string;status:'waiting'|'active'|'review';
      game_mode:GameMode;created_at:Date|string;player_count:number;
    }>(
      `select r.id,r.pin,c.name class_name,r.course_code,r.status,r.game_mode,r.created_at,
        (select count(*)::int from live_quiz_players p where p.room_id=r.id) player_count
       from live_quiz_rooms r join classes c on c.id=r.class_id
       where c.school_id=$2 and c.archived_at is null
         and exists(select 1 from enrollments e where e.class_id=c.id
           and e.student_id=$1 and e.left_at is null)
         and r.created_at>now()-interval '24 hours'
         and (r.status='waiting' or (r.status in ('active','review') and r.allow_late_join=true
           and (r.ends_at is null or r.ends_at>now())))
       order by r.created_at desc limit 5`,[actor.id,actor.schoolId]);
    return result.rows.map(row=>({id:row.id,pin:row.pin,className:row.class_name,
      courseCode:row.course_code,status:row.status,mode:row.game_mode,
      createdAt:row.created_at,playerCount:Number(row.player_count)}));
  }

  async lobby(pin:string){
    const result=await this.pool.query<Room&{player_count:number}>(
      `select r.pin,r.status,r.course_code,r.game_mode,r.random_names,r.allow_late_join,
         (select count(*)::int from live_quiz_players p where p.room_id=r.id) player_count
       from live_quiz_rooms r where r.pin=$1 and
       (r.status='waiting' or (r.status in ('active','review') and r.allow_late_join=true
         and (r.ends_at is null or r.ends_at>now())))`,[pin]);
    if(!result.rowCount)throw error('quiz_room_not_found',404);
    const room=result.rows[0]!;
    return {pin,courseCode:room.course_code,mode:room.game_mode,status:room.status,
      randomNames:room.random_names,allowLateJoin:room.allow_late_join,
      playerCount:Number(room.player_count)};
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
      player_id:string;room_id:string;nickname:string;avatar:string;score:number;streak:number;correct_count:number;
      next_turn:number;player_started_at:Date|string;blocked_until:Date|string|null}>(
      `select r.*,p.id player_id,p.room_id,p.nickname,p.avatar,p.score,p.streak,p.correct_count,
        p.next_turn,p.question_started_at player_started_at,p.blocked_until
       from live_quiz_players p join live_quiz_rooms r on r.id=p.room_id
       where p.id=$1 and p.token_hash=$2${lock?' for update of r,p':''}`,[id,hash(token)]);
    if(!result.rowCount)throw error('quiz_player_not_found',404);
    const row=result.rows[0]!;
    return {room:row,player:{id:row.player_id,room_id:row.room_id,nickname:row.nickname,
      avatar:row.avatar,score:Number(row.score),streak:Number(row.streak),correct_count:Number(row.correct_count),
      next_turn:Number(row.next_turn),question_started_at:row.player_started_at,blocked_until:row.blocked_until}};
  }

  async join(input:{pin:string;nickname?:string;avatar:string}) {
    const secret=randomBytes(32).toString('hex');
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const room=await client.query<Room>(
        `select * from live_quiz_rooms where pin=$1 and
          (status='waiting' or (status in ('active','review') and allow_late_join=true
            and (ends_at is null or ends_at>now()))) for update`,[input.pin]);
      if(!room.rowCount)throw error('quiz_room_not_found',404);
      const capacity=await client.query<{total:number}>(
        `select count(*)::int total from live_quiz_players where room_id=$1`,[room.rows[0]!.id]);
      if(Number(capacity.rows[0]?.total??0)>=60)throw error('quiz_room_full',409);
      let nickname=room.rows[0]!.random_names?randomStudentName():input.nickname?.trim();
      if(!nickname)throw error('quiz_name_required',400);
      if(room.rows[0]!.random_names){
        for(let i=0;i<8;i++){
          const duplicate=await client.query(`select 1 from live_quiz_players
            where room_id=$1 and lower(nickname)=lower($2) limit 1`,[room.rows[0]!.id,nickname]);
          if(!duplicate.rowCount)break;
          nickname=randomStudentName();
        }
      }
      const result=await client.query<{id:string}>(
        `insert into live_quiz_players(room_id,nickname,avatar,token_hash)
         values($1,$2,$3,$4) returning id`,[room.rows[0]!.id,nickname,input.avatar,hash(secret)]);
      await client.query('commit');
      return {playerId:result.rows[0]!.id,token:secret,pin:input.pin,roomId:room.rows[0]!.id};
    }catch(cause){
      await client.query('rollback');
      if((cause as {code?:string}).code==='23505')throw error('quiz_name_taken',409);
      throw cause;
    }finally{client.release();}
  }

  async command(actor:Actor,id:string,action:'start'|'reveal'|'next'|'finish',expectedQuestionIndex?:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const room=await this.hostRoom(actor,id,client);
      let status:Status=room.status,index=room.question_index;
      if(expectedQuestionIndex!==undefined&&expectedQuestionIndex!==index)
        throw error('quiz_invalid_state',409);
      if(action==='start'){
        if(status!=='waiting')throw error('quiz_invalid_state',409);
        const count=await client.query(`select 1 from live_quiz_players where room_id=$1 limit 1`,[id]);
        if(!count.rowCount)throw error('quiz_no_players',409);
        status='active';index=0;
        await client.query(`update live_quiz_players set question_started_at=now()
          where room_id=$1`,[id]);
      }else if(action==='reveal'){
        if(!['active','review'].includes(status)||room.game_mode==='treasure')throw error('quiz_invalid_state',409);
        if(status==='review'){
          await client.query('commit');
          return {status,questionIndex:index}; // Do not restart the review timer.
        }
        status='review';
      }else if(action==='next'){
        if(status!=='review'||room.game_mode==='treasure')throw error('quiz_invalid_state',409);
        if(index+1>=room.questions.length)status='finished';
        else{status='active';index++;}
      }else if(action==='finish'){
        if(!['waiting','active','review'].includes(status))throw error('quiz_invalid_state',409);
        status='finished';
      }
      await client.query(`update live_quiz_rooms set status=$2,question_index=$3,
        question_started_at=case when $2='active' then now() else question_started_at end,
        ends_at=case when $2='active' and $4='treasure' then now()+($5::text||' seconds')::interval
          else ends_at end,
        finished_at=case when $2='finished' then now() else finished_at end,
        updated_at=now() where id=$1`,[id,status,index,room.game_mode,room.duration_seconds]);
      await client.query('commit');
      return {status,questionIndex:index};
    }catch(cause){await client.query('rollback');throw cause;}
    finally{client.release();}
  }

  private async closeExpired(id:string){
    await this.pool.query(`update live_quiz_rooms set status='finished',finished_at=now(),updated_at=now()
      where id=$1 and game_mode='treasure' and status='active' and ends_at<=now()`,[id]);
    await this.pool.query(`update live_quiz_rooms r set status='review',updated_at=now()
      where r.id=$1 and r.game_mode='classic' and r.status='active'
      and (r.question_started_at+(r.question_seconds::text||' seconds')::interval<=now()
        or (exists(select 1 from live_quiz_players p where p.room_id=r.id)
          and not exists(
            select 1 from live_quiz_players p where p.room_id=r.id
            and not exists(select 1 from live_quiz_answers a
              where a.player_id=p.id and a.question_index=r.question_index))))`,[id]);
    // No browser owns the next-question timer. Whichever teacher or student
    // polls first advances the durable room after the five-second reveal.
    // This works across reloads, disconnected hosts and concurrent requests.
    await this.pool.query(`update live_quiz_rooms r set
        status=case when r.question_index+1>=jsonb_array_length(r.questions)
          then 'finished' else 'active' end,
        question_index=case when r.question_index+1>=jsonb_array_length(r.questions)
          then r.question_index else r.question_index+1 end,
        question_started_at=case when r.question_index+1>=jsonb_array_length(r.questions)
          then r.question_started_at else now() end,
        finished_at=case when r.question_index+1>=jsonb_array_length(r.questions)
          then now() else r.finished_at end,
        updated_at=now()
      where r.id=$1 and r.game_mode='classic' and r.status='review'
        and r.updated_at<=now()-($2::text||' seconds')::interval`,[id,CLASSIC_REVIEW_SECONDS]);
  }

  /** The score is not published during an active question, so a peer cannot
   * infer a still-open correct option from a live point increase. */
  private async snapshot(room:Room,viewer?:Player){
    if(room.game_mode==='treasure')return this.treasureSnapshot(room,viewer);
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
    const choiceCounts=canReveal?await this.pool.query<{choice_index:number;total:number}>(
      `select a.choice_index,count(*)::int total from live_quiz_answers a
       join live_quiz_players p on p.id=a.player_id
       where p.room_id=$1 and a.question_index=$2 group by a.choice_index`,
      [room.id,room.question_index]):null;
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
    return {id:room.id,pin:room.pin,courseCode:room.course_code,status:room.status,mode:'classic',
      allowLateJoin:room.allow_late_join,showCorrectness:room.show_correctness,randomNames:room.random_names,
      questionCount:room.questions.length,questionIndex:room.question_index,
      questionSeconds:room.question_seconds,questionStartedAt:room.question_started_at,
      ...(canReveal?{
        reviewEndsAt:new Date(new Date(room.updated_at).getTime()+CLASSIC_REVIEW_SECONDS*1000).toISOString(),
        answerCounts:Array.from({length:4},(_,index)=>Number(choiceCounts?.rows.find(row=>
          Number(row.choice_index)===index)?.total??0)),
      }:{}),
      serverNow:new Date().toISOString(),players:players.rows.map(row=>({id:row.id,nickname:row.nickname,
        avatar:row.avatar,score:Number(row.score),answered:Boolean(Number(row.answered_now))})),
      answeredCount:answered,question,ownAnswer,
      ...(viewer?{selfId:viewer.id,nickname:viewer.nickname}:{})};
  }

  private async treasureSnapshot(room:Room,viewer?:Player){
    const players=await this.pool.query<{
      id:string;nickname:string;avatar:string;score:number;correct_count:number;next_turn:number}>(
      `select id,nickname,avatar,score,correct_count,next_turn from live_quiz_players
       where room_id=$1 order by score desc,joined_at`,[room.id]);
    const attempts=await this.pool.query<{total:number}>(
      `select count(*)::int total from live_quiz_treasure_attempts a
       join live_quiz_players p on p.id=a.player_id where p.room_id=$1`,[room.id]);
    let question:null|{id:string;index:number;prompt:string;options:string[];sourceContext:string}=null;
    let pendingReward:null|{turnIndex:number;type:string|null;percent?:number;
      targets:Array<{id:string;nickname:string;avatar:string;score:number}>}=null;
    if(viewer&&room.status==='active'){
      const row=await this.pool.query<{turn_index:number;reward_type:string|null;reward_amount:number}>(
        `select turn_index,reward_type,reward_amount from live_quiz_treasure_attempts
         where player_id=$1 and turn_index=$2 and correct=true and resolved_at is null`,
        [viewer.id,viewer.next_turn]);
      if(row.rowCount){
        const pending=row.rows[0]!;
        pendingReward={turnIndex:viewer.next_turn,type:pending.reward_type,
          ...(pending.reward_type==='take'?{percent:pending.reward_amount}:{}),
          targets:players.rows.filter(p=>p.id!==viewer.id).map(p=>({id:p.id,nickname:p.nickname,
            avatar:p.avatar,score:Number(p.score)}))};
      }else if(viewer.next_turn<500){
        const questionIndex=await this.treasureQuestionIndex(room,viewer,this.pool);
        const current=room.questions[questionIndex]!;
        question={id:current.id,index:viewer.next_turn,prompt:current.prompt,
          options:current.options,sourceContext:current.sourceContext};
      }
    }
    return {id:room.id,pin:room.pin,courseCode:room.course_code,status:room.status,
      mode:'treasure' as const,questionCount:room.questions.length,questionIndex:viewer?.next_turn??0,
      questionSeconds:room.question_seconds,questionStartedAt:viewer?.question_started_at??null,
      serverNow:new Date().toISOString(),endsAt:room.ends_at,durationSeconds:room.duration_seconds,
      treasureGoal:room.treasure_goal,dragonPool:room.dragon_pool,
      allowLateJoin:room.allow_late_join,showCorrectness:room.show_correctness,randomNames:room.random_names,
      players:players.rows.map(p=>({id:p.id,nickname:p.nickname,avatar:p.avatar,
        score:Number(p.score),correct:Number(p.correct_count),answered:Number(p.next_turn),
        ready:false})),
      answeredCount:Number(attempts.rows[0]?.total??0),question,ownAnswer:null,pendingReward,
      blockedUntil:viewer?.blocked_until??null,
      ...(viewer?{selfId:viewer.id,nickname:viewer.nickname,ownScore:viewer.score,
        ownCorrect:viewer.correct_count,ownTurn:viewer.next_turn}:{})};
  }

  private async treasureQuestionIndex(room:Room,player:Player,db:Pool|PoolClient){
    const ordinary=player.next_turn%room.questions.length;
    if(room.question_order!=='mastery'||player.next_turn<room.questions.length||
      player.next_turn%3!==0)return ordinary;
    const attempts=await db.query<{question_index:number;correct:boolean}>(
      `select distinct on (question_index) question_index,correct
       from live_quiz_treasure_attempts where player_id=$1
       order by question_index,turn_index desc`,[player.id]);
    const misses=attempts.rows.filter(row=>!row.correct).map(row=>Number(row.question_index));
    return misses.length?misses[Math.floor(player.next_turn/3)%misses.length]!:ordinary;
  }

  async teacherSnapshot(actor:Actor,id:string){
    await this.closeExpired(id);return this.snapshot(await this.hostRoom(actor,id));
  }
  async guestSnapshot(id:string,token:string){
    await this.closeExpired((await this.playerRoom(id,token)).room.id);
    const {room,player}=await this.playerRoom(id,token);return this.snapshot(room,player);
  }

  async answer(id:string,token:string,questionIndex:number,choiceIndex:number){
    const initial=await this.playerRoom(id,token);
    if(initial.room.game_mode==='treasure')return this.treasureAnswer(id,token,questionIndex,choiceIndex);
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

  private async treasureAnswer(id:string,token:string,turnIndex:number,choiceIndex:number){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const {room,player}=await this.playerRoom(id,token,client);
      if(room.status!=='active'||(room.ends_at&&new Date(room.ends_at).getTime()<=Date.now())||
        player.next_turn!==turnIndex||turnIndex>=500)throw error('quiz_answer_closed',409);
      if(player.blocked_until&&new Date(player.blocked_until).getTime()>Date.now())
        throw error('quiz_penalty_active',409);
      const questionIndex=await this.treasureQuestionIndex(room,player,client);
      const current=room.questions[questionIndex]!;
      const elapsed=Math.max(0,Date.now()-new Date(player.question_started_at).getTime());
      const correct=choiceIndex===current.answerIndex;
      const result=await client.query(
        `insert into live_quiz_treasure_attempts
          (player_id,turn_index,question_index,choice_index,correct,elapsed_ms,reward_type,resolved_at)
         values($1,$2,$3,$4,$5,$6,$7,case when $5 then null else now() end)
         on conflict(player_id,turn_index) do nothing returning player_id`,
        [player.id,turnIndex,questionIndex,choiceIndex,correct,elapsed,
          correct?null:'none']);
      if(!result.rowCount)throw error('quiz_already_answered',409);
      await client.query(`update live_quiz_players set
        correct_count=correct_count+$2,streak=$3,
        next_turn=case when $2=1 then next_turn else next_turn+1 end,
        question_started_at=case when $2=1 then question_started_at
          else now()+($4::text||' seconds')::interval end,
        blocked_until=case when $2=1 then null
          else now()+($4::text||' seconds')::interval end
        where id=$1`,[player.id,correct?1:0,correct?player.streak+1:0,
          room.incorrect_penalty_seconds]);
      await client.query('commit');
      return {submitted:true,turnIndex,correct,rewardPending:correct,
        ...(room.show_correctness||correct?{correctIndex:current.answerIndex,
          explanation:current.explanation}:{})};
    }catch(cause){await client.query('rollback');throw cause;}
    finally{client.release();}
  }

  async treasureReward(id:string,token:string,input:{turnIndex:number;chestIndex?:number;targetId?:string}){
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const {room,player}=await this.playerRoom(id,token,client);
      if(room.game_mode!=='treasure'||room.status!=='active'||
        (room.ends_at&&new Date(room.ends_at).getTime()<=Date.now())||
        player.next_turn!==input.turnIndex)throw error('quiz_reward_closed',409);
      const query=await client.query<{reward_type:TreasureReward|null;reward_amount:number}>(
        `select reward_type,reward_amount from live_quiz_treasure_attempts
         where player_id=$1 and turn_index=$2 and correct=true and resolved_at is null for update`,
        [player.id,input.turnIndex]);
      if(!query.rowCount)throw error('quiz_reward_closed',409);
      const attempt=query.rows[0]!;
      let reward=attempt.reward_type;
      let percent=Number(attempt.reward_amount);
      if(reward===null){
        if(input.chestIndex===undefined||input.chestIndex<0||input.chestIndex>2)
          throw error('quiz_reward_selection_required',400);
        // The second, player-targeting step is available only after the sealed
        // chest has been opened. A client must not combine both steps.
        if(input.targetId)throw error('quiz_invalid_target',400);
        reward=drawTreasureReward();
        const rivals=await client.query(`select 1 from live_quiz_players where room_id=$1 and id<>$2 limit 1`,
          [room.id,player.id]);
        if(!rivals.rowCount&&['take','swap'].includes(reward))reward='gold';
        if(reward==='dragon_treasure'&&room.dragon_pool===0)reward='gold';
        percent=reward==='take'?(randomInt(2)?25:10):0;
        await client.query(`update live_quiz_treasure_attempts
          set reward_type=$3,reward_amount=$4 where player_id=$1 and turn_index=$2`,
          [player.id,input.turnIndex,reward,percent]);
      }
      let balance=player.score,dragonPool=room.dragon_pool;
      if(reward==='take'||reward==='swap'){
        if(!input.targetId){
          await client.query('commit');
          return {rewardType:reward,needsTarget:true,percent};
        }
        if(input.targetId===player.id)throw error('quiz_invalid_target',400);
        const target=await client.query<Player>(
          `select * from live_quiz_players where id=$1 and room_id=$2 for update`,
          [input.targetId,room.id]);
        if(!target.rowCount)throw error('quiz_invalid_target',400);
        const rival=target.rows[0]!;
        if(reward==='take'){
          const taken=Math.floor(Number(rival.score)*percent/100);
          balance+=taken;
          await client.query(`update live_quiz_players set score=score-$2 where id=$1`,[rival.id,taken]);
        }else{
          balance=Number(rival.score);
          await client.query(`update live_quiz_players set score=$2 where id=$1`,[rival.id,player.score]);
        }
      }else{
        if(input.targetId)throw error('quiz_invalid_target',400);
        const effect=settleTreasureBalance(reward,balance,dragonPool);
        balance=effect.balance;dragonPool=effect.dragonPool;
      }
      balance=Math.min(2_000_000,Math.max(0,balance));
      await client.query(`update live_quiz_players set score=$2,next_turn=next_turn+1,
        question_started_at=now(),blocked_until=null where id=$1`,[player.id,balance]);
      await client.query(`update live_quiz_rooms set dragon_pool=$2,updated_at=now() where id=$1`,
        [room.id,dragonPool]);
      await client.query(`update live_quiz_treasure_attempts set reward_amount=$3,
        reward_target_id=$4,resolved_at=now() where player_id=$1 and turn_index=$2`,
        [player.id,input.turnIndex,balance-player.score,input.targetId??null]);
      if(balance>=room.treasure_goal){
        await client.query(`update live_quiz_rooms set status='finished',finished_at=now(),updated_at=now()
          where id=$1 and status='active'`,[room.id]);
      }
      await client.query('commit');
      return {rewardType:reward,needsTarget:false,delta:balance-player.score,newScore:balance,
        gameFinished:balance>=room.treasure_goal};
    }catch(cause){await client.query('rollback');throw cause;}
    finally{client.release();}
  }

  private async report(room:Room,onlyPlayerId?:string){
    if(room.status!=='finished')throw error('quiz_results_not_ready',409);
    if(room.game_mode==='treasure')return this.treasureReport(room,onlyPlayerId);
    const count=Math.max(0,room.question_index+1);
    const results=await this.pool.query<Player&{question_index:number|null;choice_index:number|null;
      correct:boolean|null;points:number|null;elapsed_ms:number|null}>(
      `select p.id,p.room_id,p.nickname,p.avatar,p.score,p.correct_count,
        a.question_index,a.choice_index,a.correct,a.points,a.elapsed_ms
       from live_quiz_players p left join live_quiz_answers a on a.player_id=p.id
       where p.room_id=$1 and ($2::uuid is null or p.id=$2)
       order by p.score desc,p.joined_at,p.id,a.question_index`,[room.id,onlyPlayerId??null]);
    const grouped=new Map<string,{id:string;nickname:string;avatar:string;score:number;
      correct:number;answered:number;total:number;averageResponseMs:number;
      details:Array<{number:number;prompt:string;
      options:string[];choiceIndex:number|null;correctIndex:number;correct:boolean;points:number;
      explanation:string;sourceContext:string;status:'correct'|'wrong'|'skipped';elapsedMs:number}>}>();
    for(const row of results.rows){
      if(!grouped.has(row.id))grouped.set(row.id,{id:row.id,nickname:row.nickname,
        avatar:row.avatar,score:Number(row.score),correct:Number(row.correct_count),answered:0,total:count,
        averageResponseMs:0,
        details:room.questions.slice(0,count).map((question,index)=>({number:index+1,prompt:question.prompt,
          options:question.options,choiceIndex:null,correctIndex:question.answerIndex,correct:false,
          points:0,explanation:question.explanation,sourceContext:question.sourceContext,
          status:'skipped',elapsedMs:0}))});
      if(row.question_index!=null){
        const student=grouped.get(row.id)!;
        const detail=student.details[Number(row.question_index)];
        if(detail){detail.choiceIndex=Number(row.choice_index);detail.correct=Boolean(row.correct);
          detail.points=Number(row.points);detail.elapsedMs=Number(row.elapsed_ms);
          detail.status=row.correct?'correct':'wrong';student.answered++;
          student.averageResponseMs+=Number(row.elapsed_ms);}
      }
    }
    const students=[...grouped.values()].map(student=>({...student,
      averageResponseMs:student.answered?Math.round(student.averageResponseMs/student.answered):0,
    })).sort((a,b)=>b.score-a.score||b.correct-a.correct||a.nickname.localeCompare(b.nickname));
    return {id:room.id,pin:room.pin,courseCode:room.course_code,mode:'classic' as const,
      questionBankSize:room.questions.length,totalQuestions:count,finishedAt:room.finished_at,
      students,questionSummary:onlyPlayerId?[]:this.questionBreakdown(students)};
  }

  private questionBreakdown(students:Array<{id:string;nickname:string;details:Array<{
    number:number;prompt:string;sourceContext:string;correct:boolean;status:string;points:number;
    options:string[];choiceIndex:number|null;correctIndex:number;bankQuestionNo?:number}>}>) {
    const result=new Map<number,{number:number;prompt:string;sourceContext:string;
      correct:number;wrong:number;skipped:number;total:number;
      wrongStudents:Array<{id:string;nickname:string;answer:string;attemptNumber?:number}>}>();
    for(const student of students)for(const detail of student.details){
      const questionNo=detail.bankQuestionNo??detail.number;
      if(!result.has(questionNo))result.set(questionNo,{number:questionNo,
        prompt:detail.prompt,sourceContext:detail.sourceContext,correct:0,wrong:0,skipped:0,total:0,
        wrongStudents:[]});
      const summary=result.get(questionNo)!;
      summary.total++;
      if(detail.correct)summary.correct++;
      else{
        if(detail.status==='skipped')summary.skipped++;else summary.wrong++;
        summary.wrongStudents.push({id:student.id,nickname:student.nickname,
          answer:detail.choiceIndex===null?'No answer':detail.options[detail.choiceIndex]??'—',
          ...(detail.bankQuestionNo===undefined?{}:{attemptNumber:detail.number})});
      }
    }
    return [...result.values()].sort((a,b)=>a.number-b.number);
  }

  private async treasureReport(room:Room,onlyPlayerId?:string){
    const result=await this.pool.query<Player&{turn_index:number|null;question_index:number|null;
      choice_index:number|null;correct:boolean|null;reward_type:string|null;
      reward_amount:number|null;elapsed_ms:number|null}>(
      `select p.id,p.room_id,p.nickname,p.avatar,p.score,p.correct_count,
        a.turn_index,a.question_index,a.choice_index,a.correct,a.reward_type,
        a.reward_amount,a.elapsed_ms
       from live_quiz_players p left join live_quiz_treasure_attempts a on a.player_id=p.id
       where p.room_id=$1 and ($2::uuid is null or p.id=$2)
       order by p.score desc,p.joined_at,p.id,a.turn_index`,[room.id,onlyPlayerId??null]);
    const grouped=new Map<string,{id:string;nickname:string;avatar:string;score:number;
      correct:number;answered:number;total:number;averageResponseMs:number;
      details:Array<{number:number;prompt:string;options:string[];choiceIndex:number|null;
      correctIndex:number;correct:boolean;points:number;explanation:string;
      sourceContext:string;status:'correct'|'wrong'|'skipped';elapsedMs:number;
      rewardType:string|null;bankQuestionNo:number}>}>();
    for(const row of result.rows){
      if(!grouped.has(row.id))grouped.set(row.id,{id:row.id,nickname:row.nickname,
        avatar:row.avatar,score:Number(row.score),correct:Number(row.correct_count),answered:0,
        total:0,averageResponseMs:0,details:[]});
      const student=grouped.get(row.id)!;
      if(row.question_index!=null){
        const question=room.questions[Number(row.question_index)]!;
        student.details.push({number:Number(row.turn_index)+1,
          bankQuestionNo:Number(row.question_index)+1,prompt:question.prompt,
          options:question.options,choiceIndex:Number(row.choice_index),
          correctIndex:question.answerIndex,correct:Boolean(row.correct),points:0,
          explanation:question.explanation,sourceContext:question.sourceContext,
          status:row.correct?'correct':'wrong',elapsedMs:Number(row.elapsed_ms),
          rewardType:row.reward_type});
        student.averageResponseMs+=Number(row.elapsed_ms);
      }
    }
    const students=[...grouped.values()].map(student=>({
      ...student,total:student.details.length,answered:student.details.length,
      averageResponseMs:student.details.length?Math.round(student.averageResponseMs/student.details.length):0,
    })).sort((a,b)=>b.score-a.score||b.correct-a.correct||a.nickname.localeCompare(b.nickname));
    return {id:room.id,pin:room.pin,courseCode:room.course_code,mode:'treasure' as const,
      questionBankSize:room.questions.length,totalQuestions:room.questions.length,
      finishedAt:room.finished_at,students,
      questionSummary:onlyPlayerId?[]:this.questionBreakdown(students)};
  }

  async teacherReport(actor:Actor,id:string){
    const room=await this.hostRoom(actor,id);
    const report=await this.report(room);
    // Server-generated correct indices, shared with the host only after finish.
    // Include the entire bank, even questions nobody reached or answered.
    const answerKey=room.questions.map((question,index)=>({
      number:index+1,prompt:question.prompt,options:question.options,
      correctIndex:question.answerIndex,explanation:question.explanation,
      sourceContext:question.sourceContext,
    }));
    return {...report,answerKey};
  }
  async guestReport(id:string,token:string){const {room,player}=await this.playerRoom(id,token);return this.report(room,player.id);}
}
