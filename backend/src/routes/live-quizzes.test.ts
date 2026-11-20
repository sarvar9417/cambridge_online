import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { LiveQuizService } from '../services/live-quiz-service.js';
import { createLiveQuizGuestRouter, createLiveQuizHostRouter } from './live-quizzes.js';

const playerId='2bbcc2fa-38c9-4ebd-8120-111111111111';
const roomId='a8918dd9-6325-4e32-a602-222222222222';
const token='a'.repeat(64);

function fixture(){
  const service={
    join:vi.fn(async(input:unknown)=>({playerId,token,pin:'123456',roomId,input})),
    lobby:vi.fn(async(pin:string)=>({pin,mode:'treasure',status:'waiting',randomNames:true,playerCount:2})),
    treasureReward:vi.fn(async()=>({rewardType:'gold',needsTarget:false,newScore:150})),
    answer:vi.fn(async()=>({submitted:true})),
    guestSnapshot:vi.fn(async()=>({status:'active'})),
    guestReport:vi.fn(async()=>({students:[]})),
    create:vi.fn(async()=>({id:roomId,pin:'123456'})),
    availableForStudent:vi.fn(async()=>[{id:roomId,pin:'123456',className:'11-A'}]),
    history:vi.fn(async()=>[]),
    teacherSnapshot:vi.fn(async()=>({status:'waiting'})),
    teacherReport:vi.fn(async()=>({students:[]})),
    command:vi.fn(async()=>({status:'active'})),
    deleteFinished:vi.fn(async()=>({deleted:true})),
  };
  const app=express();app.use(express.json());
  app.use('/guest',createLiveQuizGuestRouter(service as unknown as LiveQuizService));
  app.use('/host',(req,_res,next)=>{
    req.actor={id:roomId,role:'teacher',schoolId:null,fullName:'Teacher'};next();
  },createLiveQuizHostRouter(service as unknown as LiveQuizService));
  app.use('/student',(req,_res,next)=>{
    req.actor={id:playerId,role:'student',schoolId:roomId,fullName:'Aziza'};next();
  },createLiveQuizHostRouter(service as unknown as LiveQuizService));
  app.use((err:Error,_req:Request,res:Response,_next:NextFunction)=>{
    res.status(400).json({error:{message:err.message}});
  });
  return {app,service};
}

describe('Live Quiz game mode HTTP validation',()=>{
  it('allows anonymous PIN lookup and random-name joining without sending a nickname',async()=>{
    const {app,service}=fixture();
    const lobby=await request(app).get('/guest/lobby/123456');
    expect(lobby.status).toBe(200);
    expect(lobby.body.data).toMatchObject({mode:'treasure',randomNames:true});
    const response=await request(app).post('/guest/join').send({pin:'123456',avatar:'🦊'});
    expect(response.status).toBe(201);
    expect(service.join).toHaveBeenCalledWith({pin:'123456',avatar:'🦊'});
  });

  it('rejects malformed player actions and never invokes the reward service',async()=>{
    const {app,service}=fixture();
    const response=await request(app).post(`/guest/${playerId}/reward`)
      .set('Authorization','Quiz '+token).send({turnIndex:-1,chestIndex:11,targetId:'wrong'});
    expect(response.status).toBe(400);
    expect(service.treasureReward).not.toHaveBeenCalled();
  });

  it('passes the secret separately from the PIN, and validates target selection',async()=>{
    const {app,service}=fixture();
    const response=await request(app).post(`/guest/${playerId}/reward`)
      .set('Authorization','Quiz '+token).send({turnIndex:4,targetId:roomId});
    expect(response.status).toBe(200);
    expect(service.treasureReward).toHaveBeenCalledWith(playerId,token,
      {turnIndex:4,targetId:roomId});
  });

  it('accepts both Cambridge modes with host-controlled safety settings',async()=>{
    const {app,service}=fixture();
    const payload={classId:roomId,courseCode:'9618',scopes:[{chapterNo:17,kind:'chapter'}],count:15,
      seconds:20,mode:'treasure',durationSeconds:420,treasureGoal:10000,
      allowLateJoin:true,randomNames:true,showCorrectness:false};
    const response=await request(app).post('/host').send(payload);
    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({id:roomId}),payload);
  });

  it('allows a code-only game without assigning a class',async()=>{
    const {app,service}=fixture();
    const payload={courseCode:'9618',scopes:[{chapterNo:17,kind:'chapter'}],count:15,seconds:20};
    const response=await request(app).post('/host').send(payload);
    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({role:'teacher'}),payload);
  });

  it('returns automatic classroom links through the signed-in student route',async()=>{
    const {app,service}=fixture();
    const response=await request(app).get('/student/available');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data[0]).toMatchObject({pin:'123456',className:'11-A'});
    expect(service.availableForStudent).toHaveBeenCalledWith(expect.objectContaining({role:'student',id:playerId}));
  });

  it('lets a full class behind one school IP check a PIN and join without a shared rate-limit collision',async()=>{
    const {app,service}=fixture();
    for(let student=0;student<60;student++){
      const lobby=await request(app).get('/guest/lobby/123456');
      expect(lobby.status).toBe(200);
      const joined=await request(app).post('/guest/join')
        .send({pin:'123456',nickname:`Student ${student}`,avatar:'🦊'});
      expect(joined.status).toBe(201);
    }
    expect(service.join).toHaveBeenCalledTimes(60);
    expect(service.lobby).toHaveBeenCalledTimes(60);
  });

  it('sends the expected question index with host controls to reject stale clicks',async()=>{
    const {app,service}=fixture();
    const response=await request(app).post(`/host/${roomId}/action`)
      .send({action:'next',expectedQuestionIndex:2});
    expect(response.status).toBe(200);
    expect(service.command).toHaveBeenCalledWith(expect.objectContaining({id:roomId}),roomId,'next',2);
  });

  it('routes confirmed deletion of a completed game to the owning host',async()=>{
    const {app,service}=fixture();
    const response=await request(app).delete(`/host/${roomId}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({deleted:true});
    expect(service.deleteFinished).toHaveBeenCalledWith(expect.objectContaining({role:'teacher'}),roomId);
    const invalid=await request(app).delete('/host/not-a-uuid');
    expect(invalid.status).toBe(400);
  });
});
