import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(name:string)=>readFileSync(resolve(process.cwd(),'src/teaching/'+name),'utf8');

describe('Attestatsiya-style Cambridge lesson flow',()=>{
  it('uses library -> chapter -> topic rather than jumping straight into the first lesson',()=>{
    const experience=source('LessonExperience.tsx');
    expect(experience).toContain('function ChapterOverview');
    expect(experience).toContain('chapterUrl(audience,syllabus,chapter.number)');
    expect(experience).toContain('Nazariya → bilimni tekshirish → natija');
  });

  it('gives students the explicit learn -> check -> result stage contract',()=>{
    const experience=source('LessonExperience.tsx');
    expect(experience).toContain("label:'O‘rganish'");
    expect(experience).toContain("label:'Bilimni tekshirish'");
    expect(experience).toContain("label:'Natija'");
    expect(experience).toContain('LessonSelfAssessment');
  });

  it('keeps teacher presentation while turning the student checkpoint into evidence-based self-assessment',()=>{
    const experience=source('LessonExperience.tsx');
    const past=source('LessonPastPaper.tsx');
    expect(experience).toContain("audience==='teacher'?<ModeTabs");
    expect(experience).toContain('Present chapter');
    expect(past).toContain('Avval mustaqil javob yozing.');
    expect(past).toContain('Bu o‘z-o‘zini baholash — teacher grade emas.');
  });

  it('adds a BookReader-style topic section navigator with completion state',()=>{
    const experience=source('LessonExperience.tsx');
    expect(experience).toContain('function TopicSectionNav');
    expect(experience).toContain('className="lx-topic-section-dots"');
    expect(experience).toContain("completed.has(page.id)?'is-complete'");
  });

  it('shows per-question self-assessment evidence on the result stage',()=>{
    const experience=source('LessonExperience.tsx');
    const past=source('LessonPastPaper.tsx');
    expect(past).toContain('questions:LessonSelfAssessmentQuestion[]');
    expect(past).toContain('breakdown.push({');
    expect(experience).toContain('lx-result-breakdown');
    expect(experience).toContain('Qayta ko‘rish:');
  });

  it('scopes progress by course and sends learners to a topic check after its final study section',()=>{
    const experience=source('LessonExperience.tsx');
    expect(experience).toContain('item.courseCode===courseCode(chapter)');
    expect(experience).toContain('courseCode:syllabus');
    expect(experience).toContain('className="lx-check-cta"');
  });
});
