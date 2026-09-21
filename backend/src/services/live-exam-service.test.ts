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

  it('fails closed instead of self-marking when only one peer answer exists', () => {
    expect(() => assignPeerReviewers([answers[0]!], 'seed'))
      .toThrowError(expect.objectContaining({ code:'live_peer_assignment_impossible' }));
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
  });

  it('excludes diagrams inherited from any parent context when diagrams are disabled', async () => {
    const query = vi.fn(async (sql:string, _params?: unknown[]) => {
      if (sql.includes('from classes c')) return { rowCount:1,rows:[{ id:input.classId,name:'AS' }] };
      if (sql.includes('select distinct q.id')) return { rowCount:0,rows:[] };
      throw new Error(`unexpected query: ${sql}`);
    });
    const service = new LiveExamService({ query } as unknown as Pool, {} as PgQuestionsRepository);
    await expect(service.create(actor,input)).rejects.toMatchObject({ code:'live_question_pool_small' });
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
