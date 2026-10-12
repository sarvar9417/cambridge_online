import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../lib/actor.js';
import { SystemService } from './system-service.js';

const owner:Actor={
  id:'11111111-1111-4111-8111-111111111111',
  role:'owner',
  schoolId:'22222222-2222-4222-8222-222222222222',
  fullName:'Owner',
};

describe('SystemService Live operations summary',()=>{
  it('surfaces actionable Live health without returning learner answers or identities',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{key:'ai.monthly_budget_usd',value:50,updated_at:'2026-10-12T07:00:00Z'}]})
      .mockResolvedValueOnce({rows:[]})
      .mockResolvedValueOnce({rows:[]})
      .mockResolvedValueOnce({rows:[]})
      .mockResolvedValueOnce({rows:[{
        active_sessions:3,
        expired_open_rounds:1,
        terminal_unarchived:4,
        archived_sessions:12,
        oldest_active_updated_at:'2026-10-12T06:00:00Z',
      }]})
      .mockResolvedValueOnce({rows:[{count:27}]})
      .mockResolvedValueOnce({rows:[{count:2}]});

    const summary=await new SystemService({query} as unknown as Pool).summary(owner);

    expect(summary.liveOperations).toEqual({
      activeSessions:3,
      expiredOpenRounds:1,
      terminalUnarchived:4,
      archivedSessions:12,
      eventsLastHour:27,
      staleParticipants:2,
      oldestActiveUpdatedAt:'2026-10-12T06:00:00Z',
    });
    expect(summary.liveRetention).toEqual({
      archiveMode:'manual_soft_archive_terminal_only',
      evidenceDeletion:'disabled',
      joinCodeRetentionHours:24,
      preserves:['questions','answers','reviews','events','score_overrides','learning_evidence'],
    });
    const sql=query.mock.calls.map((call)=>String(call[0])).join('\n');
    expect(sql).not.toContain('answer_text');
    expect(sql).not.toContain('full_name student');
    expect(sql).toContain('expired_open_rounds');
    expect(sql).toContain("p.last_seen_at < now() - interval '2 minutes'");
  });

  it('keeps the operations summary owner-only',async()=>{
    const service=new SystemService({query:vi.fn()} as unknown as Pool);
    await expect(service.summary({...owner,role:'teacher'})).rejects.toMatchObject({code:'owners_only',status:403});
  });
});
