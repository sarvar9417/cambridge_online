import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { ContentService } from './content-service.js';

const student:Actor={id:'student-1',role:'student',schoolId:'school-1',fullName:'Student One'};
const teacher:Actor={id:'teacher-1',role:'teacher',schoolId:'school-1',fullName:'Teacher One'};

describe('student lesson progress service',()=>{
  it('scopes progress reads to the signed-in student',async()=>{
    const query=vi.fn().mockResolvedValue({rows:[{chapter_no:1,slide_id:'c1-01',visited_at:'2026-09-04T10:00:00Z',completed_at:null}]});
    const data=await new ContentService({query} as unknown as Pool).lessonProgress(student);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('where student_id=$1'),['student-1']);
    expect(data).toEqual([{chapterNo:1,slideId:'c1-01',visitedAt:'2026-09-04T10:00:00Z',completedAt:null}]);
  });

  it('upserts visit/completion without ever clearing an existing completion',async()=>{
    const query=vi.fn().mockResolvedValue({rows:[{chapter_no:7,slide_id:'ch7-01',visited_at:'2026-09-04T10:10:00Z',completed_at:'2026-09-04T10:09:00Z'}]});
    const saved=await new ContentService({query} as unknown as Pool).touchLesson(student,{chapterNo:7,slideId:'ch7-01',completed:true});
    expect(query.mock.calls[0]?.[0]).toContain('coalesce(student_lesson_progress.completed_at,now())');
    expect(query.mock.calls[0]?.[1]).toEqual(['student-1',7,'ch7-01',true]);
    expect(saved.completedAt).toBe('2026-09-04T10:09:00Z');
  });

  it('does not expose student progress writes to staff',async()=>{
    const query=vi.fn();
    const service=new ContentService({query} as unknown as Pool);
    await expect(service.touchLesson(teacher,{chapterNo:1,slideId:'c1-01',completed:false})).rejects.toMatchObject({code:'students_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });
});
