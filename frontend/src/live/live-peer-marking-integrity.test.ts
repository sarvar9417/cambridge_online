import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('Live Challenge peer marking integrity',()=>{
  it('does not present the score a reviewer awarded as the reviewer own result',()=>{
    expect(page).toContain('Bu sizning natijangiz emas.');
    expect(page).not.toContain('{snapshot.review.awardedMarks}/{snapshot.question?.marks} ball');
  });

  it('labels peer marks as provisional for staff until release',()=>{
    expect(page).toContain('vaqtinchalik');
    expect(page).toContain('answer.provisionalScore');
    expect(page).toContain('Yakuniy ball faqat natijalar ochilganda release qilinadi.');
  });

  it('uses teacher fallback instead of the old force-zero control',()=>{
    expect(page).toContain('Kutilayotganlarni o‘qituvchiga olish');
    expect(page).toContain('Hech kimga avtomatik 0 ball berilmaydi.');
    expect(page).toContain('TEACHER FALLBACK');
    expect(page).not.toContain('Tugallanmagan baholashlar 0 ball bilan yopilsinmi?');
  });
});
