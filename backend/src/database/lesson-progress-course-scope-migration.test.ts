import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0208_lesson_progress_course_scope.sql',import.meta.url),'utf8');

describe('lesson progress course scope migration',()=>{
  it('supports the complete Cambridge chapter range and both lesson catalogs',()=>{
    expect(sql).toContain("course_code IN ('9618','0478')");
    expect(sql).toContain('chapter_no BETWEEN 1 AND 20');
  });

  it('makes course part of the durable progress identity while retaining rolling-deploy compatibility',()=>{
    expect(sql).toContain('PRIMARY KEY (student_id,course_code,chapter_no,slide_id)');
    expect(sql).toContain('UNIQUE (student_id,chapter_no,slide_id)');
  });
});
