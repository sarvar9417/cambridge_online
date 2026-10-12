import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { logRequestFailure, observablePath, requestObservability } from './request-observability.js';

describe('request observability', () => {
  it('reuses a valid request id and emits a privacy-safe completion record without bodies or raw ids', async () => {
    const lines:string[]=[];
    const app=express();
    app.use(express.json());
    app.use(requestObservability((line)=>lines.push(line)));
    app.post('/api/v1/live-exams/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/123456/answer', (req,res)=>{
      res.status(201).json({ok:true});
    });

    const response=await request(app)
      .post('/api/v1/live-exams/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/123456/answer')
      .set('x-request-id','client-request-123')
      .send({text:'private student answer'});

    expect(response.headers['x-request-id']).toBe('client-request-123');
    expect(lines).toHaveLength(1);
    const record=JSON.parse(lines[0]!) as Record<string,unknown>;
    expect(record).toMatchObject({
      event:'http.request',
      requestId:'client-request-123',
      method:'POST',
      path:'/api/v1/live-exams/:uuid/:code/answer',
      status:201,
    });
    expect(lines[0]).not.toContain('private student answer');
    expect(lines[0]).not.toContain('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(lines[0]).not.toContain('123456');
  });

  it('replaces invalid external request ids and redacts identifiers from observable paths', async () => {
    const lines:string[]=[];
    const app=express();
    app.use(requestObservability((line)=>lines.push(line)));
    app.get('/api/v1/live-exams/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (_req,res)=>res.json({ok:true}));

    const response=await request(app)
      .get('/api/v1/live-exams/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      .set('x-request-id','bad id with spaces');

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(lines[0]!).path).toBe('/api/v1/live-exams/:uuid');
  });

  it('logs failures by category and correlation id without serializing an error message', () => {
    const write=vi.fn();
    const req={
      method:'POST',
      path:'/api/v1/live-exams/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/answer',
      actor:{role:'student'},
    } as unknown as express.Request;
    const res={locals:{requestId:'request-xyz'}} as unknown as express.Response;
    logRequestFailure(req,res,Object.assign(new Error('answer=secret'),{code:'XX001'}),'internal_error',write);
    const line=String(write.mock.calls[0]?.[0]);
    expect(line).toContain('"requestId":"request-xyz"');
    expect(line).toContain('"errorCode":"XX001"');
    expect(line).toContain('"path":"/api/v1/live-exams/:uuid/answer"');
    expect(line).not.toContain('answer=secret');
  });

  it('redacts UUID and six-digit code segments', () => {
    expect(observablePath('/x/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/654321/y'))
      .toBe('/x/:uuid/:code/y');
  });
});
