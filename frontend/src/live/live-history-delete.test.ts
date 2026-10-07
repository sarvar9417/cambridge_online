import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('Live history delete control',()=>{
  it('shows delete only to staff for terminal sessions',()=>{
    expect(page).toContain("user.role!=='student'&&['finished','cancelled'].includes(session.status)");
    expect(page).toContain('title="Tarixdan o‘chirish"');
  });

  it('requires confirmation and removes the archived session from local history after success',()=>{
    expect(page).toContain('Natija va mastery evidence xavfsizlik uchun saqlanadi.');
    expect(page).toContain("method:'DELETE'");
    expect(page).toContain("setSessions((current)=>current.filter((item)=>item.id!==session.id))");
  });
});
