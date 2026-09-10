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
    expect(studio).toContain("'Next topic →'");
    expect(studio).toContain("'Next page →'");
    expect(studio).toContain('activeTopic.pages.map((page,pageIndex)');
    expect(studio).toContain("aria-current={pageIndex===activePageIndex?'page':undefined}");
  });

  it('loads the topic hardening layer after every established scroll/topic layer', () => {
    const wrapper = source('LessonStudio.tsx');
    const scroll = wrapper.indexOf("import './lesson-studio-board-scroll-fix.css';");
    const topic = wrapper.indexOf("import './lesson-topic-pages.css';");
    const hardening = wrapper.indexOf("import './lesson-topic-pages-hardening.css';");
    expect(scroll).toBeGreaterThan(-1);
    expect(topic).toBeGreaterThan(scroll);
    expect(hardening).toBeGreaterThan(topic);
  });

  it('keeps topic pages as vertical reading surfaces even under legacy presentation CSS', () => {
    const css = source('lesson-topic-pages-hardening.css');
    expect(css).toContain('.lesson-topic-studio .lesson-topic-nav > div:not(.lesson-v3-nav-center)');
    expect(css).toContain('display: flex !important;');
    expect(css).toContain('.lesson-topic-page .lesson-page-fragment .lesson-bullets');
    expect(css).toContain('background: transparent !important;');
    expect(css).toContain('aspect-ratio: auto !important;');
    expect(css).toContain('overflow-y: auto !important;');
  });

  it('collapses duplicate exact extraction behind source transcript disclosure when curated teaching exists', () => {
    const studio = source('LessonStudioV2.tsx');
    expect(studio).toContain("const isExactSourceTranscript=(slide:LessonSlide)=>slide.id.startsWith('pdf-first-')");
    expect(studio).toContain('className="lesson-source-transcript"');
    expect(studio).toContain('open={!collapseExactSource}');
    expect(studio).toContain('hasCuratedStudyContent');
    expect(studio).toContain('<SlideBody slide={sourceSlide}/>');
  });

  it('fetches Past Paper once per topic and deduplicates overlapping question ids', () => {
    const studio = source('LessonStudioV2.tsx');
    expect(studio).toContain('function TopicExamPractice');
    expect(studio).toContain("const codes=[...new Set(liveSlides.flatMap(slide=>slide.learningObjectiveCodes??[]))];");
    expect(studio).toContain("new Map(result.data.map(question=>[question.id,question] as const))");
    expect(studio).toContain('<TopicExamPractice slides={checkpoints}/>');
    expect(studio).not.toContain('<ExamPractice slide=');
  });

  it('aggregates provenance for the whole semantic page instead of the first matching fragment', () => {
    const studio = source('LessonStudioV2.tsx');
    expect(studio).toContain('function PageSourceTrace');
    expect(studio).toContain('page.slides.flatMap(slide=>slide.sourcePages??[])');
    expect(studio).toContain('<PageSourceTrace page={activePage}/>');
  });
});
