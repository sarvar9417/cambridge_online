import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Lessons topic/page UI', () => {
  it('routes a chapter directly into book-like topics and pages', () => {
    const studio = source('LessonStudioV2.tsx');
    expect(studio).toContain("const topicParam=route.params.get('topic')||'';");
    expect(studio).toContain("const pageParam=Number(route.params.get('page')||1);");
    expect(studio).toContain('buildTopicPlan(chosen.slides,chosen.subtopics)');
    expect(studio).toContain('lesson-topic-outline');
    expect(studio).toContain('lesson-topic-nav-pages');
    expect(studio).not.toContain('MAX_LESSON_SCREENS');
    expect(studio).not.toContain('classroom lessons');
  });

  it('renders one scrollable page with topic-scoped previous and next navigation', () => {
    const studio = source('LessonStudioV2.tsx');
    expect(studio).toContain('data-page-id={activePage.id}');
    expect(studio).toContain("activePage.kind==='practice'");
    expect(studio).toContain("'Keyingi topic →'");
    expect(studio).toContain("'Keyingi page →'");
    expect(studio).toContain('activeTopic.pages.map((page,pageIndex)');
  });

  it('loads the topic-page visual layer after the established scroll repairs', () => {
    const wrapper = source('LessonStudio.tsx');
    const scroll = wrapper.indexOf("import './lesson-studio-board-scroll-fix.css';");
    const topic = wrapper.indexOf("import './lesson-topic-pages.css';");
    expect(scroll).toBeGreaterThan(-1);
    expect(topic).toBeGreaterThan(scroll);
  });

  it('provides a real vertical reading surface and responsive topic rail', () => {
    const css = source('lesson-topic-pages.css');
    expect(css).toContain('.lesson-topic-outline');
    expect(css).toContain('.lesson-topic-nav-pages');
    expect(css).toContain('.lesson-slide.lesson-topic-page');
    expect(css).toContain('overflow-y: auto !important;');
    expect(css).toContain('@media (max-width: 860px)');
  });
});
