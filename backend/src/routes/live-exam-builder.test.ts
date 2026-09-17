import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamBuilderRouter } from './live-exam-builder.js';
import type { LiveExamBuilderService } from '../services/live-exam-builder-service.js';

const teacher={
  id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  role:'teacher' as const,
  schoolId:'school',
  fullName:'Teacher',
};

function appFor(service:Partial<LiveExamBuilderService>){
 const app=express();app.use(express.json());app.use((req,_res,next)=>{req.actor=teacher;next()});
 app.use('/live-exams',createLiveExamBuilderRouter(service as LiveExamBuilderService));
 app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return;}
  if(error&&typeof error==='object'&&'status'in error&&'code'in error){res.status(Number(error.status)).json({error:{code:String(error.code)}});return;}
  res.status(500).json({error:{code:'internal_error'}});
 });return app;
}

describe('live exam builder routes',()=>{
 it('returns private non-cacheable builder options',async()=>{const builderOptions=vi.fn().mockResolvedValue({classes:[],topics:[],syllabi:[]});const response=await request(appFor({builderOptions})).get('/live-exams/builder-options').expect(200);expect(response.headers['cache-control']).toBe('private, no-store');expect(builderOptions).toHaveBeenCalledWith(teacher,undefined);});
 it('passes an authorised syllabus filter to builder options',async()=>{const builderOptions=vi.fn().mockResolvedValue({});const syllabusId='11111111-1111-4111-8111-111111111111';await request(appFor({builderOptions})).get(`/live-exams/builder-options?syllabusId=${syllabusId}`).expect(200);expect(builderOptions).toHaveBeenCalledWith(teacher,syllabusId);});
 it('requires a topic for eligible question discovery',async()=>{const eligibleQuestions=vi.fn();await request(appFor({eligibleQuestions})).get('/live-exams/eligible-questions?syllabusId=11111111-1111-4111-8111-111111111111').expect(400);expect(eligibleQuestions).not.toHaveBeenCalled();});
 it('normalises the eligible-question limit and keeps the response private',async()=>{const eligibleQuestions=vi.fn().mockResolvedValue([{id:'question-1'}]);const syllabusId='11111111-1111-4111-8111-111111111111';const topicId='22222222-2222-4222-8222-222222222222';const response=await request(appFor({eligibleQuestions})).get(`/live-exams/eligible-questions?syllabusId=${syllabusId}&topicId=${topicId}&limit=25`).expect(200);expect(response.headers['cache-control']).toBe('private, no-store');expect(eligibleQuestions).toHaveBeenCalledWith(teacher,{syllabusId,topicId,subtopicId:undefined,limit:25});});
 it('creates a draft without accepting a client supplied room code',async()=>{const createDraft=vi.fn().mockResolvedValue({id:'draft-1',status:'draft',version:1});const body={classId:'11111111-1111-4111-8111-111111111111',title:'Chapter 14 Live Challenge',topicId:'22222222-2222-4222-8222-222222222222',markingMode:'peer'};const response=await request(appFor({createDraft})).post('/live-exams/drafts').send(body).expect(201);expect(response.body.data.status).toBe('draft');expect(createDraft).toHaveBeenCalledWith(teacher,body);});
 it('uses one ordered replacement contract for manual select remove and reorder',async()=>{const replaceQuestions=vi.fn().mockResolvedValue({id:'session',status:'draft',version:8});const session='33333333-3333-4333-8333-333333333333';const questionIds=['44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555'];await request(appFor({replaceQuestions})).put(`/live-exams/${session}/questions`).send({questionIds,expectedVersion:7}).expect(200);expect(replaceQuestions).toHaveBeenCalledWith(teacher,session,questionIds,7);});
 it('requires expectedVersion for every draft mutation',async()=>{const replaceQuestions=vi.fn();await request(appFor({replaceQuestions})).put('/live-exams/33333333-3333-4333-8333-333333333333/questions').send({questionIds:[]}).expect(400);expect(replaceQuestions).not.toHaveBeenCalled();});
 it('supports deterministic auto selection with optimistic concurrency',async()=>{const autoSelect=vi.fn().mockResolvedValue({questionCount:5,version:9});const session='33333333-3333-4333-8333-333333333333';await request(appFor({autoSelect})).post(`/live-exams/${session}/questions/auto`).send({count:5,expectedVersion:8}).expect(200);expect(autoSelect).toHaveBeenCalledWith(teacher,session,5,8);});
 it('publishes only through an expected-version guarded transition',async()=>{const publish=vi.fn().mockResolvedValue({status:'published',joinCode:'123456',version:10});const session='33333333-3333-4333-8333-333333333333';const response=await request(appFor({publish})).post(`/live-exams/${session}/publish`).send({expectedVersion:9}).expect(200);expect(response.body.data.joinCode).toBe('123456');expect(publish).toHaveBeenCalledWith(teacher,session,9);});
 it('returns draft builder state as private non-cacheable teacher data',async()=>{const draft=vi.fn().mockResolvedValue({id:'draft',questions:[]});const session='33333333-3333-4333-8333-333333333333';const response=await request(appFor({draft})).get(`/live-exams/${session}/builder`).expect(200);expect(response.headers['cache-control']).toBe('private, no-store');expect(draft).toHaveBeenCalledWith(teacher,session);});
});
