import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const studentSource=(name:string)=>readFileSync(resolve(process.cwd(),`src/student/${name}`),'utf8');

describe('Student Darslar topic Past Paper contract',()=>{
  it('renders actual question text instead of an LO/checkpoint dashboard',()=>{
    const component=studentSource('StudentTopicPastPaper.tsx');
    const lessons=studentSource('StudentLessons.tsx');
    expect(component).toContain('/lesson-checkpoints?');
    expect(component).toContain('result.data.map(question=>[question.id,question]');
    expect(component).toContain('question.stem');
    expect(component).toContain('question.contextMd');
    expect(component).toContain('question.displayRef');
    expect(component).toContain('[{question.marks}]');
    expect(lessons).toContain('<StudentTopicPastPaper page={page} topic={topic}/>');
    expect(component).not.toContain('learningObjectiveCodes.map');
    expect(component).not.toContain('<code');
  });

  it('never renders a known incomplete diagram/dependency preview as if it were a complete question',()=>{
    const component=studentSource('StudentTopicPastPaper.tsx');
    expect(component).toContain('const completeQuestions=questions.filter(question=>!question.hasDiagram&&!question.hasDependency);');
    expect(component).toContain('Savolni to‘liq ko‘rsatish uchun source context yetarli emas.');
    expect(component).not.toContain('Exact approved question text');
    expect(component).not.toContain('Incomplete preview blocked');
  });

  it('removes decorative and instructional chrome from each question',()=>{
    const component=studentSource('StudentTopicPastPaper.tsx');
    expect(component).not.toContain('student-topic-exam-number');
    expect(component).not.toContain('student-topic-exam-intro');
    expect(component).not.toContain('<footer>');
    expect(component).not.toContain('Mashqda ishlash');
    expect(component).not.toContain('Cambridge Past Paper</small>');
  });

  it('uses a plain exam-paper layout and never clamps question text',()=>{
    const css=studentSource('student-topic-past-paper.css');
    expect(css).toContain('.student-topic-exam-question');
    expect(css).toContain('border-bottom: 1px solid var(--border);');
    expect(css).toContain('border-radius: 0;');
    expect(css).toContain('max-height: none;');
    expect(css).toContain('-webkit-line-clamp: unset;');
    expect(css).toContain('overflow: visible;');
    expect(css).toContain('@media (max-width: 620px)');
  });
});
