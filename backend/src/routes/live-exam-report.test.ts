import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamReportRouter } from './live-exam-report.js';
import type { LiveExamReportService } from '../services/live-exam-report-service.js';

const sessionId='11111111-1111-4111-8111-111111111111';
const actor={id:'22222222-2222-4222-8222-222222222222',role:'teacher' as const,schoolId:'33333333-3333-4333-8333-333333333333',fullName:'Teacher'};

function appFor(service:Partial<LiveExamReportService>){
  const app=express();
  app.use((req,_res,next)=>{req.actor=actor;next()});
  app.use('/live-exams',createLiveExamReportRouter(service as LiveExamReportService));
  return app;
}

describe('Live detailed report routes',()=>{
  it('returns private no-store JSON report',async()=>{
    const report=vi.fn().mockResolvedValue({session:{id:sessionId},students:[]});
    const response=await request(appFor({report})).get(`/live-exams/${sessionId}/detailed-report`).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.session.id).toBe(sessionId);
    expect(report).toHaveBeenCalledWith(actor,sessionId);
  });

  it('downloads UTF-8 CSV with an explicit attachment name',async()=>{
    const csv=vi.fn().mockResolvedValue(Buffer.from('\uFEFFA,B\r\n1,2','utf8'));
    const response=await request(appFor({csv})).get(`/live-exams/${sessionId}/detailed-report.csv`).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain(`live-challenge-${sessionId}-report.csv`);
    expect(Buffer.from(response.body).length).toBeGreaterThan(0);
  });

  it('downloads PDF with an explicit attachment name',async()=>{
    const pdf=vi.fn().mockResolvedValue(Buffer.from('%PDF-1.7\nreport'));
    const response=await request(appFor({pdf})).get(`/live-exams/${sessionId}/detailed-report.pdf`).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(`live-challenge-${sessionId}-report.pdf`);
    expect(response.body.toString()).toContain('%PDF');
  });
});
