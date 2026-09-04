import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from './lib/actor.js';
import { ResultsService } from './services/results-service.js';

const student: Actor = { id: 'student-a', role: 'student', schoolId: 'school-a', fullName: 'Student A' };
const teacher: Actor = { id: 'teacher-b', role: 'teacher', schoolId: 'school-b', fullName: 'Teacher B' };

describe('results detail authorization', () => {
  it('hides unreleased or inaccessible student results behind 404', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });

    await expect(new ResultsService({ query } as unknown as Pool).detail(student, 'submission-b'))
      .rejects.toMatchObject({ code: 'not_found', status: 404 });

    expect(query.mock.calls[0]![0]).toContain('s.released_at is not null');
    expect(query.mock.calls[0]![1]).toEqual(['submission-b', 'student', 'student-a', 'school-a']);
  });

  it('does not reveal whether an out-of-scope result exists to a teacher', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });

    await expect(new ResultsService({ query } as unknown as Pool).detail(teacher, 'other-school-submission'))
      .rejects.toMatchObject({ code: 'not_found', status: 404 });
  });

  it('maps a released visible legacy result with numeric scores and mark points', async () => {
    const points = [{ code: 'M1', text: 'Method', matched: true, marks: 1 }];
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{
        id:'question-1',grading_id: 'grading-1', appeal_status: null, display_ref: '1(a)', stem_md: 'Solve', marks: 2,
        text: 'x = 2', final_score: '1.5', teacher_feedback_md: 'Good method', points,
        content_json:null,content_version:null,
      }],
    });

    await expect(new ResultsService({ query } as unknown as Pool).detail(student, 'submission-a')).resolves.toEqual([{
      gradingId: 'grading-1', appealStatus: null, displayRef: '1(a)', stemMd: 'Solve', marks: 2,
      answerText: 'x = 2', finalScore: 1.5, feedback: 'Good method', points,
      contentJson:null,contentVersion:null,assetUrls:{},
    }]);
  });

  it('returns source-backed result content with only short-lived signed assets', async () => {
    const assetId='22222222-2222-4222-8222-222222222222';
    const content={
      version:1,
      source:{paperId:'11111111-1111-4111-8111-111111111111',sha256:'b'.repeat(64)},
      blocks:[
        {type:'text',style:'task',text:'Use the diagram.',source:{page:2}},
        {type:'asset',kind:'diagram',assetId,altText:'Logic diagram',source:{page:2}},
      ],
    };
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{
        id:'33333333-3333-4333-8333-333333333333',grading_id:'grading-2',appeal_status:null,
        display_ref:'2(a)',stem_md:'Legacy',marks:2,text:'Answer',final_score:'2',teacher_feedback_md:null,points:[],
        content_json:content,content_version:1,
      }]})
      .mockResolvedValueOnce({rowCount:1,rows:[{id:assetId,storage_path:'supabase://question-assets/q/diagram.png'}]});
    const signer={signStoragePath:vi.fn().mockResolvedValue('https://signed.example/diagram.png')};

    const [detail]=await new ResultsService({query} as unknown as Pool,signer).detail(student,'submission-a');
    expect(detail?.contentVersion).toBe(1);
    expect(detail?.contentJson).toEqual(content);
    expect(detail?.assetUrls).toEqual({[assetId]:'https://signed.example/diagram.png'});
    expect(signer.signStoragePath).toHaveBeenCalledWith('supabase://question-assets/q/diagram.png',300);
    expect(JSON.stringify(detail)).not.toContain('supabase://');
  });
});
