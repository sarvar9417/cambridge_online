import {describe,expect,it,vi}from'vitest';
import type{Pool}from'pg';
import type{Actor}from'./lib/actor.js';
import{PgClassesRepository}from'./repositories/classes-repository.js';

const teacher:Actor={id:'teacher-b',role:'teacher',schoolId:'school-b',fullName:'Teacher B'};
const owner:Actor={id:'owner-a',role:'owner',schoolId:'school-a',fullName:'Owner A'};
const student:Actor={id:'student-a',role:'student',schoolId:'school-a',fullName:'Student A'};

describe('class resource scope',()=>{
  it('hides another teacher class as null',async()=>{
    const query=vi.fn().mockResolvedValue({rowCount:0,rows:[]});
    await expect(new PgClassesRepository({query}as unknown as Pool).findOne(teacher,'class-a')).resolves.toBeNull();
    expect(query.mock.calls[0]![0]).toContain('class_teachers');
    expect(query.mock.calls[0]![1]).toEqual(['class-a','teacher-b']);
  });

  it('scopes owners by school rather than user id',async()=>{
    const query=vi.fn().mockResolvedValue({rowCount:0,rows:[]});
    await new PgClassesRepository({query}as unknown as Pool).findOne(owner,'class-a');
    expect(query.mock.calls[0]![0]).toContain('c.school_id=$2');
    expect(query.mock.calls[0]![1]).toEqual(['class-a','school-a']);
  });

  it('rejects student self-enrollment before querying',async()=>{
    const query=vi.fn();
    await expect(new PgClassesRepository({query}as unknown as Pool).enroll(student,'class-a','student-a'))
      .rejects.toMatchObject({code:'staff_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a cross-school target with 403',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'class-a',name:'A',grade:10,level:'AS',academic_year:'2026/2027',student_count:'0'}]})
      .mockResolvedValueOnce({rowCount:0,rows:[]});
    await expect(new PgClassesRepository({query}as unknown as Pool).enroll(owner,'class-a','student-b'))
      .rejects.toMatchObject({code:'cross_school_enrollment',status:403});
    expect(query.mock.calls[1]![0]).toContain('u.school_id=c.school_id');
  });

  it('enrolls a same-school student idempotently',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'class-a',name:'A',grade:10,level:'AS',academic_year:'2026/2027',student_count:'0'}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{class_id:'class-a',student_id:'student-a'}]});
    await expect(new PgClassesRepository({query}as unknown as Pool).enroll(owner,'class-a','student-a'))
      .resolves.toEqual({classId:'class-a',studentId:'student-a'});
    expect(query.mock.calls[1]![0]).toContain('do update set left_at=null');
  });
});
