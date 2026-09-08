import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Lessons classroom course UI', () => {
  it('opens a chapter hub before opening one bounded classroom lesson', () => {
    const studio = source('LessonStudioV2.tsx');
    expect(studio).toContain("const lessonNo=Number(route.params.get('lesson')||0);");
    expect(studio).toContain('if(!activeUnit)return <section className={`lesson-chapter-hub chapter-${chosen.number}`}');
    expect(studio).toContain('classroom lessons');
    expect(studio).toContain('MAX_LESSON_SCREENS');
  });

  it('uses only the active lesson slides for progress, dots and next navigation', () => {
    const studio = source('LessonStudioV2.tsx');
    expect(studio).toContain('const activeSlides=activeUnit?.slides??[];');
    expect(studio).toContain('index+1}/{activeSlides.length}');
    expect(studio).toContain('activeSlides.map((item,i)');
    expect(studio).toContain("'Keyingi dars →'");
    expect(studio).toContain('lesson-${lessonNo}-slide-${i+1}');
  });

  it('loads the chapter-course visual layer before the established scroll repairs', () => {
    const wrapper = source('LessonStudio.tsx');
    const course = wrapper.indexOf("import './lesson-course-structure.css';");
    const scroll = wrapper.indexOf("import './lesson-studio-scroll-fix.css';");
    expect(course).toBeGreaterThan(-1);
    expect(scroll).toBeGreaterThan(course);
  });

  it('provides responsive section and lesson catalogue layouts', () => {
    const css = source('lesson-course-structure.css');
    expect(css).toContain('.lesson-chapter-hub');
    expect(css).toContain('.lesson-course-section');
    expect(css).toContain('.lesson-course-units');
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
    expect(css).toContain('@media (max-width: 600px)');
  });
});
