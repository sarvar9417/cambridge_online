import express from'express';
import request from'supertest';
import{describe,expect,it,vi}from'vitest';
import type{AssignmentsService}from'./services/assignments-service.js';
import type{GradingService}from'./services/grading-service.js';
import{createSubmissionsRouter}from'./routes/submissions.js';
import{createGradingsRouter}from'./routes/gradings.js';
import{createClassesRouter}from'./routes/classes.js';
import{createGradingRouter}from'./routes/grading.js';
import type{ClassesRepository}from'./repositories/classes-repository.js';

const id='2fe20e05-75b3-43a7-ac45-a81cb52b4ca8';
const actor={id,role:'student' as const,schoolId:id,fullName:'Student'};
const actorMiddleware:express.RequestHandler=(req,_res,next)=>{req.actor=actor;next()};

describe('canonical phase 1 routes',()=>{
  it('serves submission detail at /submissions/:id',async()=>{
    const submission=vi.fn().mockResolvedValue({id,status:'in_progress'});
    const app=express();app.use(express.json(),actorMiddleware,createSubmissionsRouter({submission}as unknown as AssignmentsService));
    const response=await request(app).get(`/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({id,status:'in_progress'});
    expect(submission).toHaveBeenCalledWith(actor,id);
  });

  it('serves released grading detail at /gradings/:id',async()=>{
    const detail=vi.fn().mockResolvedValue({id,status:'released'});
    const app=express();app.use(express.json(),actorMiddleware,createGradingsRouter({detail}as unknown as GradingService));
    const response=await request(app).get(`/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({id,status:'released'});
    expect(detail).toHaveBeenCalledWith(actor,id);
  });

  it('serves a scoped class assignment list at /classes/:id/assignments',async()=>{
    const findOne=vi.fn().mockResolvedValue({id});
    const list=vi.fn().mockResolvedValue([{id:'assignment-a'}]);
    const classes={findOne,findVisible:vi.fn(),enroll:vi.fn()}as unknown as ClassesRepository;
    const app=express();app.use(express.json(),actorMiddleware,createClassesRouter(classes,{list}as unknown as AssignmentsService));
    const response=await request(app).get(`/${id}/assignments`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{id:'assignment-a'}]);
    expect(list).toHaveBeenCalledWith(actor,id);
  });

  it('ignores Vercel catch-all metadata in grading queue filters',async()=>{
    const queue=vi.fn().mockResolvedValue([]);
    const app=express();app.use(express.json(),actorMiddleware,createGradingRouter({queue}as unknown as GradingService));
    const response=await request(app).get('/queue?mode=by_student&path=grading/queue');
    expect(response.status).toBe(200);
    expect(queue).toHaveBeenCalledWith(actor,{mode:'by_student'});
  });
});
