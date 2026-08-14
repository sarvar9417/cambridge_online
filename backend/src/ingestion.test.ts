import{describe,expect,it,vi}from'vitest';import type{Pool}from'pg';import{IngestionService}from'./services/ingestion-service.js';const student={id:'s',role:'student' as const,schoolId:'x',fullName:'S'};const owner={id:'o',role:'owner' as const,schoolId:'x',fullName:'O'};
describe('ingestion authorization',()=>{it('student cannot list jobs',async()=>{const query=vi.fn();await expect(new IngestionService({query}as unknown as Pool).jobs(student)).rejects.toMatchObject({status:403});expect(query).not.toHaveBeenCalled()});it('student cannot register papers',async()=>{const connect=vi.fn();await expect(new IngestionService({connect}as unknown as Pool).register(student,{syllabusId:'s',componentId:'c',year:2026,series:'MJ',variant:1,kind:'QP',storagePath:'x',sha256:'a'.repeat(64)})).rejects.toMatchObject({status:403});expect(connect).not.toHaveBeenCalled()});it('owner review query is scoped to needs_review',async()=>{const query=vi.fn().mockResolvedValue({rows:[]});await new IngestionService({query}as unknown as Pool).review(owner);expect(query.mock.calls[0]![0]).toContain("q.status='needs_review'")})});

describe('ingestion paper pairing',()=>{
  const input={syllabusId:'11111111-1111-1111-1111-111111111111',componentId:'22222222-2222-2222-2222-222222222222',year:2026,series:'MJ' as const,variant:1,storagePath:'paper.pdf'};
  it('waits without enqueueing when only the question paper exists',async()=>{
    const client={query:vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({rows:[{id:'qp',sha256:'a'}]}).mockResolvedValueOnce({rows:[{id:'run',qp_paper_id:'qp',ms_paper_id:null}]}).mockResolvedValueOnce({}),release:vi.fn()};
    const query=vi.fn(),pool={connect:vi.fn().mockResolvedValue(client),query}as unknown as Pool;
    await expect(new IngestionService(pool).register(owner,{...input,kind:'QP',sha256:'a'.repeat(64)})).resolves.toMatchObject({ingestionRunId:'run',waitingForPair:true});
    expect(query).not.toHaveBeenCalled();expect(client.release).toHaveBeenCalled();
  });

  it('enqueues one bundle when the matching mark scheme arrives',async()=>{
    const client={query:vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({rows:[{id:'ms',sha256:'b'}]}).mockResolvedValueOnce({rows:[{id:'run',qp_paper_id:'qp',ms_paper_id:'ms'}]}).mockResolvedValueOnce({}),release:vi.fn()};
    const query=vi.fn().mockResolvedValueOnce({rows:[{id:'job'}]}).mockResolvedValueOnce({rowCount:1}),pool={connect:vi.fn().mockResolvedValue(client),query}as unknown as Pool;
    await expect(new IngestionService(pool).register(owner,{...input,kind:'MS',sha256:'b'.repeat(64)})).resolves.toMatchObject({ingestionRunId:'run',waitingForPair:false});
    expect(query.mock.calls[0]![1]).toEqual(expect.arrayContaining(['ingest-bundle',expect.objectContaining({runId:'run',qpPaperId:'qp',msPaperId:'ms'})]));
    expect(query.mock.calls[1]![0]).toContain("status='queued'");
  });
});
