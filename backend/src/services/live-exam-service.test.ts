import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { assignPeerReviewers, LiveExamService } from './live-exam-service.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';

describe('assignPeerReviewers', () => {
  const answers = [
    { answerId:'a1',studentId:'s1' },
    { answerId:'a2',studentId:'s2' },
    { answerId:'a3',studentId:'s3' },
    { answerId:'a4',studentId:'s4' },
  ];

  it('assigns every answer once without self marking', () => {
    const assigned = assignPeerReviewers(answers, 'session-question');
    expect(assigned).toHaveLength(answers.length);
    expect(new Set(assigned.map((item) => item.reviewerId))).toEqual(new Set(answers.map((item) => item.studentId)));
    expect(assigned.every((item) => item.reviewerId !== answers.find((answer) => answer.answerId === item.answerId)!.studentId)).toBe(true);
    expect(assigned.every((item) => item.kind === 'peer')).toBe(true);
  });

  it('is deterministic across a retried reveal transition', () => {
    expect(assignPeerReviewers(answers, 'same-seed')).toEqual(assignPeerReviewers([...answers].reverse(), 'same-seed'));
  });

  it('uses the session seed to produce a different anonymous rotation', () => {
    expect(assignPeerReviewers(answers, 'first-session')).not.toEqual(assignPeerReviewers(answers, 'second-session'));
  });

  it('falls back to real self-assessment for one submitted answer', () => {
    expect(assignPeerReviewers([answers[0]!], 'seed')).toEqual([
      { ...answers[0]!, reviewerId:'s1', kind:'self' },
    ]);
  });
});

describe('LiveExamService role boundary', () => {
  it('rejects a staff account trying to join before querying the database', async () => {
    const query = vi.fn();
    const service = new LiveExamService(
      { query } as unknown as Pool,
      {} as PgQuestionsRepository,
    );
    await expect(service.join({ id:'t1',role:'teacher',schoolId:'school',fullName:'Teacher' }, '123456'))
      .rejects.toMatchObject({ code:'students_only',status:403 });
    expect(query).not.toHaveBeenCalled();
  });
});

describe('LiveExamService active participation visibility', () => {
  it('does not list rooms that a student already left in the lobby', async () => {
    const query=vi.fn().mockResolvedValue({rowCount:0,rows:[]});
    const service=new LiveExamService(
      {query} as unknown as Pool,
      {} as PgQuestionsRepository,
    );
    await expect(service.list({id:'s1',role:'student',schoolId:'school',fullName:'Student'})).resolves.toEqual([]);
    const sql=String(query.mock.calls[0]?.[0]??'');
    expect(sql).toContain('lep.student_id=$2 and lep.left_at is null');
    expect(sql).toContain('les.archived_at is null');
  });
});

describe('LiveExamService source fidelity', () => {
  const actor = { id:'t1',role:'teacher' as const,schoolId:'school',fullName:'Teacher' };
  const input = {
    classId:'00000000-0000-4000-8000-000000000001',
    title:'Network revision',
    topicIds:['00000000-0000-4000-8000-000000000002'],
    subtopicIds:[],
    questionCount:1,
    markingMode:'teacher' as const,
    includeDiagrams:false,
    excludeSeen:false,
  };

  it('selects only the deterministic canonical mark scheme for the live question pool', async () => {
    const query = vi.fn(async (sql:string, _params?: unknown[]) => {
      if (sql.includes('from classes c')) return { rowCount:1,rows:[{ id:input.classId,name:'AS' }] };
      if (sql.includes('select distinct q.id')) return { rowCount:0,rows:[] };
      throw new Error(`unexpected query: ${sql}`);
    });
    const service = new LiveExamService({ query } as unknown as Pool, {} as PgQuestionsRepository);
    await expect(service.create(actor,input)).rejects.toMatchObject({ code:'live_question_pool_small' });
    const selectionCall = query.mock.calls.find(([sql])=>String(sql).includes('select distinct q.id'));
    const selectionSql = selectionCall?.[0];
    expect(selectionSql).toContain('join canonical_mark_schemes ms on ms.question_id=q.id');
    expect(selectionSql).not.toContain('join mark_schemes ms on ms.question_id=q.id');
    expect(selectionSql).toContain('with recursive source_visual_chain');
    expect(selectionSql).toContain("coalesce(qa.svg_markup,'')");
    expect(selectionSql).toContain("qa.kind in ('diagram','image')");

  });

  it('excludes diagrams inherited from any parent context when diagrams are disabled', async () => {
    const query = vi.fn(async (sql:string, _params?: unknown[]) => {
      if (sql.includes('from classes c')) return { rowCount:1,rows:[{ id:input.classId,name:'AS' }] };
      if (sql.includes('select distinct q.id')) return { rowCount:0,rows:[] };
      throw new Error(`unexpected query: ${sql}`);
    });
    const service = new LiveExamService({ query } as unknown as Pool, {} as PgQuestionsRepository);
    await expect(service.create(actor,{ ...input,excludeSeen:true })).rejects.toMatchObject({ code:'live_question_pool_small' });
    const selectionCall = query.mock.calls.find(([sql])=>String(sql).includes('select distinct q.id'));
    const selectionSql = selectionCall?.[0];
    expect(selectionSql).toContain('with recursive ancestry');
    expect(selectionSql).toContain('join question_assets qa on qa.question_id=ancestry.id');
    expect(selectionSql).toContain('from question_learning_objectives qlo');
    expect(selectionSql).toContain("compat.relation in ('equivalent','subtopic_compatible')");
    expect(selectionSql).toContain('target_t.syllabus_id=live_class.syllabus_id');
    expect(selectionSql).toContain('qst.is_primary');
    expect(selectionSql).toContain('coalesce(qst.confidence,0)>=0.95');
    expect(selectionSql).toContain('target_t.number=source_t.number');
    expect(selectionSql).toContain('target_st.code=source_st.code');
    expect(selectionSql).not.toContain('q.parent_id is not null');
    expect(selectionSql).not.toContain('not exists(select 1 from question_dependencies qd where qd.question_id=q.id)');
    expect(selectionSql).toContain('select candidate.id');
    expect(selectionSql).toContain(') candidate');
    expect(selectionSql).toContain('order by md5(candidate.id::text || $1::text)');
    expect(selectionSql).toContain('selected_topic.id=any($3::uuid[])');
    expect(selectionSql).toContain('from class_question_exposures exposure');
    expect(selectionSql).toContain("exposure.source_type='live'");
    expect(selectionSql).toContain('from live_question_readiness_state state');
    expect(selectionSql).toContain('state.cache_revision=state.corpus_revision');
    expect(selectionSql).toContain('join live_question_readiness readiness');
    expect(selectionSql).toContain('readiness.target_syllabus_id=readiness_class.syllabus_id');
    expect(selectionSql).toContain('readiness.live_ready');
    expect(selectionSql).toContain('and not readiness.has_visual');
    expect(selectionSql).not.toContain('previous.started_at is not null');
    expect(selectionCall?.[1]).toEqual([expect.any(String), input.classId, input.topicIds, input.questionCount]);
  });

  it('refuses a visual question whose private source asset cannot be rendered', async () => {
    const query = vi.fn(async (sql:string) => {
      if (sql.includes('from classes c')) return { rowCount:1,rows:[{ id:input.classId,name:'AS' }] };
      if (sql.includes('select distinct q.id')) return { rowCount:1,rows:[{ id:'q1' }] };
      if (sql.includes('with recursive closure(question_id)')) return { rowCount:1,rows:[{
        question_id:'q1',status:'approved',marks:1,mark_scheme_ready:true,dependencies:[],
      }] };
      if (sql.includes('from canonical_mark_schemes ms')) return { rowCount:1,rows:[{ scheme:{ id:'ms1',schemeType:'all_required',maxMarks:1,guidanceMd:null,points:[],groups:[] } }] };
      throw new Error(`unexpected query: ${sql}`);
    });
    const questions = { portable:vi.fn().mockResolvedValue({
      leaf:{ id:'q1',rootId:'root',label:'a',path:'1.a',displayRef:'9618/11/M/J/26/1(a)',stem:'State one fact.',commandWord:'State',marks:1,answerKind:'text',answerLines:1 },
      chain:[],dependencies:[],sourceRef:'9618/11/M/J/26/1(a)',
      contextBlocks:[{ id:'root',label:'1',displayRef:'9618/11/M/J/26/1',depth:0,context:null,assets:[{
        id:'asset1',kind:'diagram',storagePath:'legacy/private.png',url:null,contentMd:null,altText:'Diagram',sortOrder:0,sourcePage:2,
      }] }],
    }) } as unknown as PgQuestionsRepository;
    const service = new LiveExamService({ query } as unknown as Pool, questions);
    await expect(service.create(actor,{ ...input,includeDiagrams:true })).rejects.toMatchObject({ code:'live_assets_unavailable' });
    const schemeCall = query.mock.calls.find(([sql])=>String(sql).includes('from canonical_mark_schemes ms'));
    expect(schemeCall).toBeTruthy();
  });
});


describe('LiveExamService eligible pool totals', () => {
  it('reports the whole eligible pool while loading preview rows in one batch', async () => {
    const actor={id:'t1',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
    const classId='00000000-0000-4000-8000-000000000001';
    const query=vi.fn(async (sql:string) => {
      if(sql.includes('from classes c'))return{rowCount:1,rows:[{id:classId,name:'AS'}]};
      if(sql.includes('select distinct q.id'))return{rowCount:1,rows:[{id:'q1',total_count:137}]};
      if(sql.includes('count(distinct q.id)::int total'))return{rowCount:1,rows:[{total:142}]};
      if(sql.includes('with recursive selected(question_id,ordinality)'))return{rowCount:1,rows:[{
        id:'q1',display_ref:'9618/11/M/J/26 Q1(a)',marks:2,command_word:'State',
        stem:'State one fact.',has_assets:false,dependency_count:0,
      }]};
      throw new Error(`unexpected query: ${sql}`);
    });
    const questions={portable:vi.fn()} as unknown as PgQuestionsRepository;
    const service=new LiveExamService({query} as unknown as Pool,questions);
    await expect(service.eligibleQuestions(actor,{
      classId,
      topicIds:['00000000-0000-4000-8000-000000000002'],
      subtopicIds:[],
      includeDiagrams:true,
      excludeSeen:false,
      limit:1,
      allowLateJoin:false,
      autoCloseWhenAllSubmitted:false,
      teacherOverrideEnabled:true,
      leaderboardMode:'marks',
      questionOrder:'fixed',
    })).resolves.toMatchObject({
      total:137,
      counts:{database:142,liveReady:137,available:137},
      data:[{id:'q1',displayRef:'9618/11/M/J/26 Q1(a)'}],
    });
    expect(questions.portable).not.toHaveBeenCalled();
    expect(query.mock.calls.filter(([sql])=>String(sql).includes('with recursive selected(question_id,ordinality)'))).toHaveLength(1);
  });

  it('skips portable question hydration for count-only picker requests', async () => {
    const actor={id:'t1',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
    const classId='00000000-0000-4000-8000-000000000001';
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from classes c'))return{rowCount:1,rows:[{id:classId,name:'AS'}]};
      if(sql.includes('select candidate.id'))return{rowCount:1,rows:[{id:'q1',total_count:137}]};
      throw new Error(`unexpected query: ${sql}`);
    });
    const questions={portable:vi.fn()} as unknown as PgQuestionsRepository;
    const service=new LiveExamService({query} as unknown as Pool,questions);
    const result=await service.eligibleQuestions(actor,{
      classId,topicIds:['00000000-0000-4000-8000-000000000002'],subtopicIds:[],
      includeDiagrams:true,excludeSeen:false,limit:1,includeData:false,includeCounts:false,
      allowLateJoin:false,autoCloseWhenAllSubmitted:false,teacherOverrideEnabled:true,
      leaderboardMode:'marks',questionOrder:'fixed',
    });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(137);
    expect(result.counts).toBeUndefined();
    expect(questions.portable).not.toHaveBeenCalled();
  });
});

describe('LiveExamService dependency closure', () => {
  it('orders every required prerequisite before the selected dependent question', async () => {
    const query = vi.fn(async (sql:string) => {
      if (sql.includes('with recursive closure(question_id)')) {
        return {
          rowCount:2,
          rows:[
            { question_id:'q-dependent',status:'approved',marks:2,mark_scheme_ready:true,dependencies:['q-prerequisite'] },
            { question_id:'q-prerequisite',status:'approved',marks:1,mark_scheme_ready:true,dependencies:[] },
          ],
        };
      }
      throw new Error(`unexpected query: ${sql}`);
    });
    const service = new LiveExamService(
      { query } as unknown as Pool,
      {} as PgQuestionsRepository,
    );
    const expanded = await (service as unknown as {
      expandRequiredDependencies(ids:string[]):Promise<string[]>
    }).expandRequiredDependencies(['q-dependent']);
    expect(expanded).toEqual(['q-prerequisite','q-dependent']);
  });

  it('does not impose the old 60-question dependency bundle ceiling', async () => {
    const rows=Array.from({length:75},(_,index)=>({
      question_id:`q-${index}`,status:'approved',marks:1,mark_scheme_ready:true,dependencies:[],
    }));
    const query=vi.fn(async (sql:string)=>{
      if(sql.includes('with recursive closure(question_id)'))return{rowCount:rows.length,rows};
      throw new Error(`unexpected query: ${sql}`);
    });
    const service=new LiveExamService({query} as unknown as Pool,{} as PgQuestionsRepository);
    const ids=rows.map((row)=>row.question_id);
    await expect((service as unknown as {
      expandRequiredDependencies(ids:string[]):Promise<string[]>
    }).expandRequiredDependencies(ids)).resolves.toHaveLength(75);
  });

  it('fails closed when a required dependency cycle exists', async () => {
    const query = vi.fn(async (sql:string) => {
      if (sql.includes('with recursive closure(question_id)')) {
        return {
          rowCount:2,
          rows:[
            { question_id:'q-a',status:'approved',marks:1,mark_scheme_ready:true,dependencies:['q-b'] },
            { question_id:'q-b',status:'approved',marks:1,mark_scheme_ready:true,dependencies:['q-a'] },
          ],
        };
      }
      throw new Error(`unexpected query: ${sql}`);
    });
    const service = new LiveExamService(
      { query } as unknown as Pool,
      {} as PgQuestionsRepository,
    );
    await expect((service as unknown as {
      expandRequiredDependencies(ids:string[]):Promise<string[]>
    }).expandRequiredDependencies(['q-a'])).rejects.toMatchObject({ code:'live_dependency_cycle',status:409 });
  });
});

describe('LiveExamService deadline reconciliation', () => {
  it('finds only unpaused open rounds beyond the shared deadline grace', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:0,rows:[] });
    const service = new LiveExamService(
      { query } as unknown as Pool,
      {} as PgQuestionsRepository,
    );

    await expect(service.closeExpired(25)).resolves.toBe(0);
    expect(String(query.mock.calls[0]?.[0])).toContain("status='question_open'");
    expect(String(query.mock.calls[0]?.[0])).toContain('paused_at is null');
    expect(String(query.mock.calls[0]?.[0])).toContain("question_time_limit_s * interval '1 second'");
    expect(query.mock.calls[0]?.[1]).toEqual([10,25]);
  });

  it('does not queue multiple expiry reconcilers behind the same row lock', async () => {
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit'||sql==='rollback')return{rowCount:0,rows:[]};
      if(sql.includes('for update skip locked'))return{rowCount:0,rows:[]};
      throw new Error(`unexpected query: ${sql}`);
    });
    const release=vi.fn();
    const service=new LiveExamService(
      {connect:vi.fn().mockResolvedValue({query:clientQuery,release})} as unknown as Pool,
      {} as PgQuestionsRepository,
    );
    await expect(service.reconcileExpired('session-1')).resolves.toBe(false);
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).includes('for update skip locked'))).toBe(true);
    expect(release).toHaveBeenCalledOnce();
  });

  it('does not lock the shared session row on a normal student heartbeat', async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount:1,
      rows:[{ id:'participant-1',deadline_expired:false }],
    });
    const connect = vi.fn();
    const service = new LiveExamService(
      { query,connect } as unknown as Pool,
      {} as PgQuestionsRepository,
    );

    await expect(service.heartbeat(
      { id:'student-1',role:'student',schoolId:'school-1',fullName:'Student' },
      'session-1',
    )).resolves.toEqual({ serverNow:expect.any(Date) });
    expect(String(query.mock.calls[0]?.[0])).toContain('returning lep.id,(');
    expect(query.mock.calls[0]?.[1]).toEqual(['session-1','student-1',10]);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe('LiveExamService snapshot consistency', () => {
  it('rebuilds a torn snapshot when the session version advances during hydration', async () => {
    let accessCount = 0;
    let latestCount = 0;
    const baseSession = {
      id:'session-1',class_id:'class-1',host_id:'teacher-1',title:'Live',join_code:'123456',
      status:'lobby',marking_mode:'self',question_time_limit_s:null,current_question_index:0,
      question_started_at:null,started_at:null,finished_at:null,paused_at:null,pause_remaining_s:null,
      settings:{},created_at:new Date(),updated_at:new Date(),class_name:'AS',host_name:'Teacher',
      is_staff:true,participant_id:null,
    };
    const query = vi.fn(async (sql:string) => {
      if (sql.includes('select les.*,c.name class_name')) {
        accessCount += 1;
        return { rowCount:1,rows:[{ ...baseSession,version:accessCount }] };
      }
      if (sql.includes('select id,question_id,position,marks')) return { rowCount:0,rows:[] };
      if (sql.includes('join users u on u.id=lep.student_id')) {
        return { rowCount:3,rows:[
          { id:'p1',student_id:'s1',full_name:'One',joined_at:new Date(),last_seen_at:new Date(),submitted_at:null,final_score:null,score_source:null },
          { id:'p2',student_id:'s2',full_name:'Two',joined_at:new Date(),last_seen_at:new Date(),submitted_at:null,final_score:null,score_source:null },
          { id:'p3',student_id:'s3',full_name:'Three',joined_at:new Date(),last_seen_at:new Date(),submitted_at:null,final_score:null,score_source:null },
        ] };
      }
      if (sql.includes('select count(*)::int participant_count')) {
        return { rowCount:1,rows:[{ participant_count:3,submitted_count:0 }] };
      }
      if (sql.includes('select version,status::text')) {
        latestCount += 1;
        return { rowCount:1,rows:[{ version:2,status:'lobby' }] };
      }
      throw new Error(`unexpected pool query: ${sql}`);
    });
    const clientQuery = vi.fn(async (sql:string) => {
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rowCount:0,rows:[] };
      if (sql.includes('select * from live_exam_sessions')) return { rowCount:1,rows:[{ ...baseSession,version:accessCount }] };
      throw new Error(`unexpected client query: ${sql}`);
    });
    const connect = vi.fn().mockResolvedValue({ query:clientQuery,release:vi.fn() });
    const pool = { query,connect } as unknown as Pool;
    const service = new LiveExamService(pool, {} as PgQuestionsRepository);

    const result = await service.snapshot({ id:'teacher-1',role:'teacher',schoolId:'school-1',fullName:'Teacher' }, 'session-1');
    expect((result.session as { version:number }).version).toBe(2);
    expect(accessCount).toBe(2);
    expect(latestCount).toBe(2);
    expect(connect).not.toHaveBeenCalled();
  });
});
