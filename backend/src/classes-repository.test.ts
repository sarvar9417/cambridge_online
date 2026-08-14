import {describe,expect,it,vi}from'vitest';
import type{Pool}from'pg';
import type{Actor}from'./lib/actor.js';
import{PgClassesRepository}from'./repositories/classes-repository.js';

const teacher:Actor={id:'teacher-b',role:'teacher',schoolId:'school-b',fullName:'Teacher B'};
const owner:Actor={id:'owner-a',role:'owner',schoolId:'school-a',fullName:'Owner A'};

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
});
