import { createHash, randomBytes, randomInt } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

const deny = (code:string,status:400|403|404|409) => new DomainError(code,status);
const digest = (token:string) => createHash('sha256').update(token).digest('hex');
const n = (x:unknown) => Number(x??0);
const cleanName = (value:string) => value.normalize('NFKC').trim().replace(/\s+/g,' ');

export class AssessmentCodeService {
  constructor(private readonly pool:Pool) {}
  private async own(actor:Actor,id:string,db:Pool|PoolClient=this.pool){
    if(actor.role==='student'||!actor.schoolId)throw deny('teacher_only',403);
    const result=await db.query(
      `SELECT s.*,t.title,t.duration_minutes,t.grade_label,t.course_code
         FROM assessment_code_sessions s JOIN assessment_center_tests t ON t.id=s.test_id
        WHERE s.id=$1 AND s.school_id=$2 AND (s.host_id=$3 OR $4='owner')`,
      [id,actor.schoolId,actor.id,actor.role]);
    if(!result.rowCount)throw deny('test_session_not_found',404);
    return result.rows[0];
  }
  async create(actor:Actor,testId:string,sourceReviewed:boolean){
    if(actor.role==='student'||!actor.schoolId)throw deny('teacher_only',403);
    if(!sourceReviewed)throw deny('test_source_review_required',409);
    const t=await this.pool.query(
      `SELECT t.id,t.title,t.school_id,t.duration_minutes,t.grade_label,t.status,
        (SELECT count(*)::int FROM assessment_center_questions q WHERE q.test_id=t.id) count,
        (SELECT count(*)::int FROM assessment_center_questions q WHERE q.test_id=t.id AND q.correct_index IS NULL) missing
       FROM assessment_center_tests t
       WHERE t.id=$1 AND t.school_id=$2 AND (t.created_by=$3 OR $4='owner')`,
      [testId,actor.schoolId,actor.id,actor.role]);
    const test=t.rows[0];
    if(!test)throw deny('test_not_found',404);
    if(test.status==='archived')throw deny('test_archived',409);
    if(!n(test.count)||n(test.missing))throw deny('test_answer_keys_missing',409);
    for(let attempt=0;attempt<10;attempt++){
      const code=String(randomInt(100000,1000000));
      try{
        const r=await this.pool.query(
          `INSERT INTO assessment_code_sessions(test_id,school_id,host_id,code)
           VALUES($1,$2,$3,$4) RETURNING id,code,created_at,expires_at`,
          [testId,actor.schoolId,actor.id,code]);
        return {id:r.rows[0].id,code,createdAt:r.rows[0].created_at,
          expiresAt:r.rows[0].expires_at,title:test.title,
          durationMinutes:n(test.duration_minutes),status:'open'};
      }catch(error){
        if((error as {code?:string}).code==='23505')continue;
        throw error;
      }
    }
    throw deny('test_code_unavailable',409);
  }
  async list(actor:Actor){
    if(actor.role==='student'||!actor.schoolId)throw deny('teacher_only',403);
    const r=await this.pool.query(
      `SELECT s.id,s.test_id,s.code,s.status,s.created_at,s.expires_at,
        t.title,t.duration_minutes,t.grade_label,
        (SELECT count(*)::int FROM assessment_code_players p WHERE p.session_id=s.id) joined,
        (SELECT count(*)::int FROM assessment_code_players p WHERE p.session_id=s.id AND p.submitted_at IS NOT NULL) submitted
       FROM assessment_code_sessions s JOIN assessment_center_tests t ON t.id=s.test_id
       WHERE s.school_id=$1 AND (s.host_id=$2 OR $3='owner')
       ORDER BY s.created_at DESC LIMIT 150`,[actor.schoolId,actor.id,actor.role]);
    return r.rows.map(s=>({id:s.id,testId:s.test_id,code:s.code,
      status:s.status==='open'&&new Date(s.expires_at).getTime()<Date.now()?'expired':s.status,
      title:s.title,gradeLabel:s.grade_label,durationMinutes:n(s.duration_minutes),
      joined:n(s.joined),submitted:n(s.submitted),createdAt:s.created_at,expiresAt:s.expires_at}));
  }
  async close(actor:Actor,id:string){
    await this.own(actor,id);
    const db=await this.pool.connect();
    try {
      await db.query('BEGIN');
      await db.query(`UPDATE assessment_code_sessions SET status='closed',closed_at=COALESCE(closed_at,now())
                      WHERE id=$1`,[id]);
      const r=await db.query('SELECT id FROM assessment_code_players WHERE session_id=$1 AND submitted_at IS NULL ORDER BY id FOR UPDATE',[id]);
      for(const player of r.rows)await this.finalize(player.id,db);
      await db.query('COMMIT');
      return {closed:true};
    }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  }
  private async finalize(playerId:string,db:PoolClient){
    const r=await db.query(
      `SELECT COALESCE(sum(q.marks) FILTER (WHERE a.choice_index=q.correct_index),0)::int score,
              COALESCE(sum(q.marks),0)::int maximum
         FROM assessment_code_players p JOIN assessment_code_sessions s ON s.id=p.session_id
         JOIN assessment_center_questions q ON q.test_id=s.test_id
         LEFT JOIN assessment_code_answers a ON a.player_id=p.id AND a.question_id=q.id
        WHERE p.id=$1`,[playerId]);
    await db.query(
      `UPDATE assessment_code_players SET submitted_at=now(),score=$2,max_score=$3
        WHERE id=$1 AND submitted_at IS NULL`,
      [playerId,n(r.rows[0]?.score),n(r.rows[0]?.maximum)]);
  }
  private async settleExpired(id:string){
    const r=await this.pool.query(
      `SELECT p.id FROM assessment_code_players p
        JOIN assessment_code_sessions s ON s.id=p.session_id
        WHERE s.id=$1 AND p.submitted_at IS NULL
        AND (p.deadline_at<=now() OR s.status='closed' OR s.expires_at<=now())
        ORDER BY p.deadline_at LIMIT 120`,[id]);
    for(const row of r.rows){
      const db=await this.pool.connect();
      try{
        await db.query('BEGIN');
        const lock=await db.query('SELECT submitted_at FROM assessment_code_players WHERE id=$1 FOR UPDATE',[row.id]);
        if(lock.rows[0]&&!lock.rows[0].submitted_at)await this.finalize(row.id,db);
        await db.query('COMMIT');
      }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
    }
  }
  async report(actor:Actor,id:string){
    const session=await this.own(actor,id);
    await this.settleExpired(id);
    const [players,answers]=await Promise.all([
      this.pool.query(
        `SELECT p.id,p.nickname,p.started_at,p.deadline_at,p.submitted_at,p.score,p.max_score,
           (SELECT count(*)::int FROM assessment_code_answers a WHERE a.player_id=p.id) answered
         FROM assessment_code_players p WHERE p.session_id=$1 ORDER BY p.started_at,p.nickname`,[id]),
      this.pool.query(
        `SELECT q.position,q.prompt,q.options,q.correct_index,q.marks,q.topic,
                p.id player_id,a.choice_index
         FROM assessment_center_questions q
         JOIN assessment_code_sessions s ON s.test_id=q.test_id
         LEFT JOIN assessment_code_players p ON p.session_id=s.id
         LEFT JOIN assessment_code_answers a ON a.player_id=p.id AND a.question_id=q.id
         WHERE s.id=$1 ORDER BY q.position`,[id])
    ]);
    const details=new Map<string,Array<{number:number;prompt:string;choiceIndex:number|null;correctIndex:number;correct:boolean;topic:string}>>();
    for(const row of answers.rows){
      if(!row.player_id)continue;
      const list=details.get(row.player_id)??[];
      list.push({number:n(row.position),prompt:row.prompt,choiceIndex:row.choice_index==null?null:n(row.choice_index),
        correctIndex:n(row.correct_index),correct:row.choice_index!=null&&n(row.choice_index)===n(row.correct_index),topic:row.topic});
      details.set(row.player_id,list);
    }
    return {id,code:session.code,title:session.title,status:session.status,
      expiresAt:session.expires_at,questions:new Set(answers.rows.map(q=>q.position)).size,
      students:players.rows.map(p=>({id:p.id,name:p.nickname,answered:n(p.answered),
        submittedAt:p.submitted_at,score:p.score==null?null:n(p.score),
        maxScore:p.max_score==null?null:n(p.max_score),
        details:details.get(p.id)??[]}))};
  }
  async lobby(code:string){
    const r=await this.pool.query(
      `SELECT s.id,s.status,s.expires_at,t.title,t.duration_minutes,
        (SELECT count(*)::int FROM assessment_center_questions q WHERE q.test_id=t.id) questions
       FROM assessment_code_sessions s JOIN assessment_center_tests t ON t.id=s.test_id
       WHERE s.code=$1`,[code]);
    const s=r.rows[0];
    if(!s||s.status!=='open'||new Date(s.expires_at).getTime()<=Date.now())throw deny('test_code_not_found',404);
    return {code,title:s.title,durationMinutes:n(s.duration_minutes),questionCount:n(s.questions)};
  }
  async join(code:string,nameInput:string){
    const name=cleanName(nameInput);
    if(name.length<2||name.length>48||/[\u0000-\u001f\u007f]/.test(name))throw deny('test_name_invalid',400);
    const token=randomBytes(32).toString('hex');
    const db=await this.pool.connect();
    try{
      await db.query('BEGIN');
      const r=await db.query(
        `SELECT s.id,s.status,s.expires_at,t.duration_minutes
         FROM assessment_code_sessions s JOIN assessment_center_tests t ON t.id=s.test_id
         WHERE s.code=$1 FOR SHARE OF s`,[code]);
      const s=r.rows[0];
      if(!s||s.status!=='open'||new Date(s.expires_at).getTime()<=Date.now())throw deny('test_code_not_found',404);
      const row=await db.query(
        `INSERT INTO assessment_code_players(session_id,nickname,token_hash,deadline_at)
         VALUES($1,$2,$3,LEAST(now()+($4::int*interval '1 minute'),$5::timestamptz))
         RETURNING id`,[s.id,name,digest(token),n(s.duration_minutes),s.expires_at]);
      await db.query('COMMIT');
      return {playerId:row.rows[0].id,token,code,name};
    }catch(e){
      await db.query('ROLLBACK');
      if((e as {code?:string}).code==='23505')throw deny('test_name_taken',409);
      throw e;
    }finally{db.release();}
  }
  private async authorizedPlayer(playerId:string,token:string){
    if(!/^[0-9a-f]{64}$/i.test(token))throw deny('test_player_forbidden',403);
    const r=await this.pool.query(
      `SELECT p.*,s.status session_status,s.expires_at,t.id test_id,t.title
       FROM assessment_code_players p JOIN assessment_code_sessions s ON s.id=p.session_id
       JOIN assessment_center_tests t ON t.id=s.test_id
       WHERE p.id=$1 AND p.token_hash=$2`,[playerId,digest(token)]);
    if(!r.rowCount)throw deny('test_player_forbidden',403);
    return r.rows[0];
  }
  async snapshot(playerId:string,token:string){
    const p=await this.authorizedPlayer(playerId,token);
    await this.settleExpired(p.session_id);
    const fresh=await this.authorizedPlayer(playerId,token);
    const r=await this.pool.query(
      `SELECT q.id,q.position,q.prompt,q.options,q.marks,
       a.choice_index FROM assessment_center_questions q
       LEFT JOIN assessment_code_answers a ON a.question_id=q.id AND a.player_id=$2
       WHERE q.test_id=$1 ORDER BY q.position`,[p.test_id,playerId]);
    return {playerId,name:p.nickname,title:p.title,serverNow:new Date().toISOString(),
      deadlineAt:fresh.deadline_at,submittedAt:fresh.submitted_at,
      score:fresh.submitted_at?n(fresh.score):null,maxScore:fresh.submitted_at?n(fresh.max_score):null,
      questions:r.rows.map(q=>({id:q.id,number:n(q.position),prompt:q.prompt,options:q.options,
        marks:n(q.marks),choiceIndex:q.choice_index==null?null:n(q.choice_index)}))};
  }
  async answer(playerId:string,token:string,questionId:string,choiceIndex:number){
    await this.authorizedPlayer(playerId,token);
    const db=await this.pool.connect();
    try{
      await db.query('BEGIN');
      const r=await db.query(
        `SELECT p.id,p.session_id,p.submitted_at,p.deadline_at,s.status,s.expires_at
         FROM assessment_code_players p JOIN assessment_code_sessions s ON s.id=p.session_id
         WHERE p.id=$1 AND p.token_hash=$2 FOR UPDATE OF p`,[playerId,digest(token)]);
      const p=r.rows[0];
      if(!p)throw deny('test_player_forbidden',403);
      if(p.submitted_at||p.status!=='open'||Date.now()>=new Date(p.deadline_at).getTime()||
         Date.now()>=new Date(p.expires_at).getTime())throw deny('test_time_expired',409);
      const saved=await db.query(
        `INSERT INTO assessment_code_answers(player_id,question_id,choice_index)
         SELECT $1,q.id,$3 FROM assessment_center_questions q
         JOIN assessment_code_sessions s ON s.test_id=q.test_id
         WHERE q.id=$2 AND s.id=$4
         ON CONFLICT(player_id,question_id) DO UPDATE SET choice_index=EXCLUDED.choice_index,answered_at=now()
         RETURNING question_id`,[playerId,questionId,choiceIndex,p.session_id]);
      if(!saved.rowCount)throw deny('test_question_not_found',404);
      await db.query('COMMIT');
      return {saved:true};
    }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  }
  async submit(playerId:string,token:string){
    await this.authorizedPlayer(playerId,token);
    const db=await this.pool.connect();
    try {
      await db.query('BEGIN');
      const r=await db.query('SELECT submitted_at FROM assessment_code_players WHERE id=$1 AND token_hash=$2 FOR UPDATE',[playerId,digest(token)]);
      if(!r.rowCount)throw deny('test_player_forbidden',403);
      if(!r.rows[0].submitted_at)await this.finalize(playerId,db);
      await db.query('COMMIT');
    }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
    return this.snapshot(playerId,token);
  }
}

