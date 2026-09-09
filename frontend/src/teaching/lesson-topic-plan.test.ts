import { describe, expect, it } from 'vitest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import type { HodderLessonSlide } from './lesson-content-hodder-types';
import { buildTopicPlan, flattenTopicPages, sourceFilePageForSlide } from './lesson-topic-plan';

const chapters = [...LESSON_CHAPTERS, CHAPTER_7];
const pdfFirstTranscriptChapters = chapters.filter(chapter => chapter.number === 1 || chapter.number === 7 || chapter.number === 13);

const fixtureSlide=(id:string,title:string,sourcePages:number[],extra:Partial<HodderLessonSlide>={}):HodderLessonSlide=>({
  id,
  section:'13.3 Floating-point numbers',
  subtopicCode:'13.3',
  eyebrow:'13.3 · TEST',
  title,
  lead:'Fixture learning content',
  sourcePages,
  accent:'indigo',
  ...extra,
});

const allNormalisedSourcePages=(topicCode:string,slide:HodderLessonSlide)=>[
  ...(slide.sourcePages??[]).map(page=>sourceFilePageForSlide(topicCode,{...slide,sourcePages:[page],sourceAtomEvidence:[]})),
  ...(slide.sourceAtomEvidence??[]).map(item=>sourceFilePageForSlide(topicCode,{...slide,sourcePages:[],sourceAtomEvidence:[item]})),
].filter((page):page is number=>page!=null);

describe('book-like topic plan', () => {
  it('places every active-route slide exactly once into topic pages', () => {
    for (const chapter of chapters) {
      const topics = buildTopicPlan(chapter.slides, chapter.subtopics);
      const routed = flattenTopicPages(topics).flatMap(item => item.page.slides.map(slide => slide.id));
      expect(routed, `Chapter ${chapter.number} routed slide count`).toHaveLength(chapter.slides.length);
      expect(new Set(routed).size, `Chapter ${chapter.number} unique slide ids`).toBe(chapter.slides.length);
      expect(new Set(routed), `Chapter ${chapter.number} exact slide ids`).toEqual(new Set(chapter.slides.map(slide => slide.id)));
    }
  });

  it('keeps topic-specific Past Paper practice as the final page of every topic that has checkpoints', () => {
    for (const chapter of chapters) {
      const topics = buildTopicPlan(chapter.slides, chapter.subtopics);
      topics.filter(topic => topic.code !== 'overview').forEach(topic => {
        const topicSlides = chapter.slides.filter(slide => slide.subtopicCode === topic.code || slide.section.startsWith(topic.code));
        const hasCheckpoint = topicSlides.some(slide => slide.examPractice);
        if (!hasCheckpoint) return;
        const last = topic.pages.at(-1);
        expect(last?.kind, `${chapter.number} ${topic.code} last page`).toBe('practice');
        expect(last?.title, `${chapter.number} ${topic.code} practice label`).toBe('Past Paper practice');
        expect(last?.slides.some(slide => slide.examPractice), `${chapter.number} ${topic.code} checkpoint included`).toBe(true);
      });
    }
  });

  it('groups a book subsection as one scrollable semantic page even when it spans physical PDF pages', () => {
    const slides:HodderLessonSlide[]=[
      fixtureSlide('normalise-a','Normalisation',[309]),
      fixtureSlide('normalise-b','Why normalisation matters',[310]),
      fixtureSlide('precision-a','Precision versus range',[311]),
      fixtureSlide('pdf-first-133-01','Floating point · source page 309',[309],{bullets:['Normalisation']}),
      fixtureSlide('pdf-first-133-02','Floating point · source page 310',[310],{bullets:['Normalisation continued']}),
      fixtureSlide('pdf-first-133-03','Floating point · source page 311',[311],{bullets:['Precision versus range']}),
      fixtureSlide('checkpoint','Past Paper',[311],{examPractice:true}),
    ];
    const [topic]=buildTopicPlan(slides,['13.3 Floating-point numbers']);
    expect(topic?.pages.map(page=>page.title)).toEqual(['Normalisation','Precision versus range','Past Paper practice']);
    expect(topic?.pages[0]?.bookPages).toEqual([6,7]);
    expect(topic?.pages[0]?.slides.map(slide=>slide.id)).toEqual(expect.arrayContaining(['normalise-a','normalise-b','pdf-first-133-01','pdf-first-133-02']));
    expect(topic?.pages[1]?.bookPages).toEqual([8]);
  });

  it('treats physical source pages as provenance rather than forced learner-page boundaries', () => {
    for (const chapter of chapters) {
      const topics = buildTopicPlan(chapter.slides, chapter.subtopics);
      const studyPages = flattenTopicPages(topics).filter(item => item.page.kind === 'study' && item.topic.code !== 'overview');
      expect(studyPages.length, `Chapter ${chapter.number} study pages`).toBeGreaterThan(0);
      studyPages.forEach(({ topic, page }) => {
        const represented=[...new Set(page.slides.flatMap(slide=>allNormalisedSourcePages(topic.code,slide)))].sort((a,b)=>a-b);
        expect(page.bookPages, `${chapter.number} ${page.id} source provenance`).toEqual(represented);
        expect(page.bookPage, `${chapter.number} ${page.id} first source page`).toBe(represented[0] ?? null);
      });
    }
  });

  it('never mixes two physical source-file pages inside one exact transcript slide', () => {
    for(const chapter of pdfFirstTranscriptChapters){
      const exact=(chapter.slides as HodderLessonSlide[]).filter(slide=>slide.id.startsWith('pdf-first-')&&!slide.id.startsWith('pdf-first-lens-'));
      expect(exact.length,`Chapter ${chapter.number} exact transcript pages`).toBeGreaterThan(0);
      exact.forEach(slide=>{
        const code=slide.subtopicCode!;
        const evidencePages=new Set((slide.sourceAtomEvidence??[]).map(item=>sourceFilePageForSlide(code,{...slide,sourcePages:[],sourceAtomEvidence:[item]})));
        expect(evidencePages.size,`${slide.id} physical source pages`).toBe(1);
        expect(slide.sourcePages?.length,`${slide.id} printed source page`).toBe(1);
      });
    }
  });

  it('uses page vocabulary instead of stale screen/presentation vocabulary in exact PDF-first source transcripts', () => {
    for(const chapter of pdfFirstTranscriptChapters){
      (chapter.slides as HodderLessonSlide[])
        .filter(slide=>slide.id.startsWith('pdf-first-')&&!slide.id.startsWith('pdf-first-lens-'))
        .forEach(slide=>{
          expect(slide.eyebrow).toContain('COURSEBOOK SOURCE');
          expect(slide.eyebrow).not.toContain('COURSEBOOK LESSON');
          expect(slide.title.toLowerCase()).not.toContain('coursebook sequence');
          expect(slide.lead.toLowerCase()).not.toContain('next screen');
        });
    }
  });
});
