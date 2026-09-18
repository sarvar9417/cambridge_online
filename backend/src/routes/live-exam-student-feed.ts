import { Router, type Response } from 'express';
import type { LiveExamStudentFeedService } from '../services/live-exam-student-feed-service.js';

function privateNoStore(res:Response){
  res.set('Cache-Control','private, no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('Vary','Authorization, Cookie');
}

export function createLiveExamStudentFeedRouter(service:LiveExamStudentFeedService){
  const router=Router();
  router.get('/student-feed',async(req,res)=>{
    privateNoStore(res);
    res.json({data:await service.feed(req.actor!)});
  });
  return router;
}
