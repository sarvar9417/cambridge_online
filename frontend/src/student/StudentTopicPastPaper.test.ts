import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const studentSource=(name:string)=>readFileSync(resolve(process.cwd(),`src/student/${name}`),'utf8');

describe('Student Darslar topic Past Paper contract',()=>{
  it('renders actual source-safe questions instead of an LO-only checkpoint summary',()=>{
    const component=studentSource('StudentTopicPastPaper.tsx');
    const lessons=studentSource('StudentLessons.tsx');
    expect(component).toContain('/lesson-checkpoints?');
    expect(component).toContain('result.data.map(question=>[question.id,question]');
    expect(component).toContain('question.stem');
    expect(component).toContain('question.contextMd');
    expect(lessons).toContain('<StudentTopicPastPaper page={page} topic={topic}/>');
    expect(lessons).not.toContain('learning objective uchun approved Cambridge checkpoint mavjud');
  });

  it('blocks incomplete diagram/dependency previews instead of showing a cut question',()=>{
    const component=studentSource('StudentTopicPastPaper.tsx');
    expect(component).toContain('const requiresSourceContext=question.hasDiagram||question.hasDependency;');
    expect(component).toContain('To‘liq source context kerak');
    expect(component).toContain('Dars sahifasida kesilgan savol ko‘rsatilmaydi.');
  });

  it('keeps corpus/source implementation metadata out of the student question cards',()=>{
    const component=studentSource('StudentTopicPastPaper.tsx');
    expect(component).toContain('Cambridge Past Paper');
    expect(component).toContain('Exact approved question text');
    expect(component).not.toContain('learningObjectiveCodes.map');
    expect(component).not.toContain('<code');
  });

  it('provides a responsive question-first visual hierarchy',()=>{
    const css=studentSource('student-topic-past-paper.css');
    expect(css).toContain('.student-topic-exam-question');
    expect(css).toContain('border-left: 4px solid var(--accent);');
    expect(css).toContain('.student-topic-exam-stem');
    expect(css).toContain('@media (max-width: 620px)');
  });
});
