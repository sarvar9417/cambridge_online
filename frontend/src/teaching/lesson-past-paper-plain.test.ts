import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(name:string)=>readFileSync(resolve(process.cwd(),`src/teaching/${name}`),'utf8');

describe('Darslar Past Paper plain display contract',()=>{
  it('loads the plain Past Paper override after all classroom presentation layers',()=>{
    const wrapper=source('LessonStudio.tsx');
    const classroom=wrapper.indexOf("import './lesson-classroom-semantic-source-only.css';");
    const plain=wrapper.indexOf("import './lesson-past-paper-plain.css';");
    expect(classroom).toBeGreaterThan(-1);
    expect(plain).toBeGreaterThan(classroom);
  });

  it('removes non-question chrome from topic Past Paper pages',()=>{
    const css=source('lesson-past-paper-plain.css');
    for(const selector of [
      '.lesson-checkpoint-contract',
      '.lesson-practice-cycle',
      '.lesson-exam-years',
      '.lesson-exam-summary',
      '.lesson-exam-year-header',
      '.lesson-exam-card > footer',
      '.lesson-exam-number',
      '.lesson-question-card-actions',
    ]) expect(css).toContain(selector);
    expect(css).toContain('display: none !important;');
  });

  it('keeps only a simple reference/marks/question reading surface',()=>{
    const css=source('lesson-past-paper-plain.css');
    expect(css).toContain('.lesson-exam-meta');
    expect(css).toContain('.lesson-question-context');
    expect(css).toContain('.lesson-exam-card > p');
    expect(css).toContain('border-radius: 0 !important;');
    expect(css).toContain('box-shadow: none !important;');
  });

  it('never clips or line-clamps Past Paper context or stem text',()=>{
    const css=source('lesson-past-paper-plain.css');
    expect(css).toContain('max-height: none !important;');
    expect(css).toContain('overflow: visible !important;');
    expect(css).toContain('-webkit-line-clamp: unset !important;');
    expect(css).toContain('line-clamp: unset !important;');
    expect(css).toContain('mask-image: none !important;');
  });
});
