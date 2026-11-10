import express from 'express';
import request from 'supertest';
import {describe,expect,it,vi} from 'vitest';
import {createLiveExamsRouter} from './live-exams.js';
import type {LiveExamService} from '../services/live-exam-service.js';

const sessionId='11111111-1111-4111-8111-111111111111';
const teacher={id:'22222222-2222-4222-8222-222222222222',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
function appFor(service:Partial<LiveExamService>){
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-exams',createLiveExamsRouter(service as LiveExamService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:'validation'});return;}
    res.status(500).json({error:'internal'});
  });
  return app;
}
describe('live effects route',()=>{
  it('accepts a strict, bounded teacher policy and version',async()=>{
    const setLiveEffects=vi.fn().mockResolvedValue({version:4});
    const effects={animations:true,sound:false,intensity:'spectacular',publicCelebrations:true};
    await request(appFor({setLiveEffects})).post(`/live-exams/${sessionId}/effects`)
      .send({...effects,expectedVersion:3}).expect(200);
    expect(setLiveEffects).toHaveBeenCalledWith(teacher,sessionId,effects,3);
  });
  it('rejects unknown payload fields, unsupported intensity and missing version',async()=>{
    const setLiveEffects=vi.fn();
    const app=appFor({setLiveEffects});
    const base={animations:true,sound:false,intensity:'balanced',publicCelebrations:true};
    await request(app).post(`/live-exams/${sessionId}/effects`)
      .send(base).expect(400);
    await request(app).post(`/live-exams/${sessionId}/effects`)
      .send({...base,intensity:'danger',expectedVersion:3}).expect(400);
    await request(app).post(`/live-exams/${sessionId}/effects`)
      .send({...base,extraScore:100,expectedVersion:3}).expect(400);
    expect(setLiveEffects).not.toHaveBeenCalled();
  });
});
