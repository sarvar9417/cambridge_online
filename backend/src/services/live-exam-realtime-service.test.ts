import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveExamRealtimeService } from './live-exam-realtime-service.js';

const student = { id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student' };

function serviceFor(query: ReturnType<typeof vi.fn>) {
  return new LiveExamRealtimeService({ query } as unknown as Pool);
}

describe('LiveExamRealtimeService', () => {
  it('returns no event query when the client is already current', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount:1,rows:[{ version:7 }] });
    const result = await serviceFor(query).events(student,'11111111-1111-4111-8111-111111111111',7);
    expect(result).toEqual({
      sessionId:'11111111-1111-4111-8111-111111111111',
      currentVersion:7,
      changed:false,
      events:[],
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns only safe event metadata when the session advanced', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount:1,rows:[{ version:5 }] })
      .mockResolvedValueOnce({ rowCount:2,rows:[
        { session_version:4,event_type:'answer.submitted',created_at:new Date('2026-09-16T05:00:00Z'),payload:{ answerId:'secret' } },
        { session_version:5,event_type:'mark_scheme.revealed',created_at:new Date('2026-09-16T05:00:01Z'),payload:{ markingMode:'peer' } },
      ] });
    const result = await serviceFor(query).events(student,'11111111-1111-4111-8111-111111111111',3,20);
    expect(result.changed).toBe(true);
    expect(result.currentVersion).toBe(5);
    expect(result.events).toEqual([
      { version:4,type:'answer.submitted',createdAt:new Date('2026-09-16T05:00:00Z') },
      { version:5,type:'mark_scheme.revealed',createdAt:new Date('2026-09-16T05:00:01Z') },
    ]);
    expect(result.events[0]).not.toHaveProperty('payload');
    expect(result.events[0]).not.toHaveProperty('actorId');
  });

  it('fails closed when the actor cannot access the session', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount:0,rows:[] });
    await expect(serviceFor(query).events(student,'11111111-1111-4111-8111-111111111111',0))
      .rejects.toMatchObject({ code:'not_found',status:404 });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
