import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamBoardRouter } from './live-exam-board.js';
import type { LiveExamBoardService } from '../services/live-exam-board-service.js';

const teacher = { id:'11111111-1111-4111-8111-111111111111',role:'teacher' as const,schoolId:'school',fullName:'Teacher' };

function appFor(service:Partial<LiveExamBoardService>) {
  const app=express();
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-exams',createLiveExamBoardRouter(service as LiveExamBoardService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    if(error&&typeof error==='object'&&'status'in error&&'code'in error){
      res.status(Number(error.status)).json({error:{code:String(error.code)}});return;
    }
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam board route', () => {
  it('returns a private, non-cacheable board projection', async () => {
    const board=vi.fn().mockResolvedValue({session:{id:'session-1'},question:null,markScheme:null});
    const sessionId='33333333-3333-4333-8333-333333333333';
    const response=await request(appFor({board})).get(`/live-exams/${sessionId}/board`).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(board).toHaveBeenCalledWith(teacher,sessionId);
  });

  it('rejects malformed session ids before calling the service', async () => {
    const board=vi.fn();
    await request(appFor({board})).get('/live-exams/not-a-uuid/board').expect(400);
    expect(board).not.toHaveBeenCalled();
  });
});
