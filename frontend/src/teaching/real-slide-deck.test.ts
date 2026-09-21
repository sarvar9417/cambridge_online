import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_3_PROJECT_PPTX_URL,
  CHAPTER_3_REAL_PPTX_DRIVE_URL,
  CHAPTER_3_REAL_SLIDE_COUNT,
  CHAPTER_4_PROJECT_PPTX_URL,
  CHAPTER_4_REAL_PPTX_DRIVE_URL,
  CHAPTER_4_REAL_SLIDE_COUNT,
  CHAPTER_5_PROJECT_PPTX_URL,
  CHAPTER_5_REAL_PPTX_DRIVE_URL,
  CHAPTER_5_REAL_SLIDE_COUNT,
  realSlideDeckFor,
} from './real-slide-decks';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const publicPath=(path:string)=>resolve(process.cwd(),'public',path.replace(/^\//,''));

function expectProjectDeck(course:string,chapter:number,topicCode:string,slideCount:number){
  const deck=realSlideDeckFor(course,chapter,topicCode);
  expect(deck).not.toBeNull();
  expect(deck?.slides).toHaveLength(slideCount);
  expect(deck?.slides[0]?.imageUrl).toContain(`/chapter-${String(chapter).padStart(2,'0')}/slides/slide-01.jpg`);
  expect(deck?.slides.at(-1)?.imageUrl).toContain(`slide-${String(slideCount).padStart(2,'0')}.jpg`);
  expect(existsSync(publicPath(deck!.projectPptxUrl))).toBe(true);
  expect(statSync(publicPath(deck!.projectPptxUrl)).size).toBeGreaterThan(1_000_000);
  for(const slide of deck!.slides){
    const path=publicPath(slide.imageUrl);
    expect(existsSync(path),slide.imageUrl).toBe(true);
    expect(statSync(path).size,slide.imageUrl).toBeGreaterThan(20_000);
  }
  return deck!;
}

describe('real PowerPoint lesson presentation routes',()=>{
  it('keeps Chapter 3 as the approved 22-slide real Hardware deck',()=>{
    expect(CHAPTER_3_REAL_SLIDE_COUNT).toBe(22);
    expectProjectDeck('9618',3,'3.1',22);
    expectProjectDeck('9618',3,'3.2',22);
    expect(CHAPTER_3_REAL_PPTX_DRIVE_URL).toContain('1hvWdQBlwXbwTJcX0TaofL39ogTxWbCoM');
    expect(CHAPTER_3_PROJECT_PPTX_URL).toContain('Project_Mirror.pptx');
  });

  it('registers Chapter 4 as a 29-slide real Processor Fundamentals deck',()=>{
    expect(CHAPTER_4_REAL_SLIDE_COUNT).toBe(29);
    const cpu=expectProjectDeck('9618',4,'4.1',29);
    const assembly=expectProjectDeck('9618',4,'4.2',29);
    const bits=expectProjectDeck('9618',4,'4.3',29);
    expect(cpu.title).toContain('CPU');
    expect(assembly.title).toBe('Assembly Language');
    expect(bits.title).toBe('Bit Manipulation');
    expect(bits.slides[27]?.sourceLabel).toContain('Cambridge 2026');
    expect(CHAPTER_4_REAL_PPTX_DRIVE_URL).toContain('19BNaVlBMDda967NYqRUIyAjAEkF6elYI');
    expect(CHAPTER_4_PROJECT_PPTX_URL).toContain('Chapter_04_Processor_Fundamentals_Project_Mirror.pptx');
  });

  it('registers Chapter 5 as a 24-slide real System Software deck',()=>{
    expect(CHAPTER_5_REAL_SLIDE_COUNT).toBe(24);
    const os=expectProjectDeck('9618',5,'5.1',24);
    const translators=expectProjectDeck('9618',5,'5.2',24);
    expect(os.title).toBe('Operating Systems');
    expect(translators.title).toBe('Language Translators');
    expect(translators.slides[22]?.sourceLabel).toContain('Cambridge 2026');
    expect(CHAPTER_5_REAL_PPTX_DRIVE_URL).toContain('1rfHQbyArf0CnPfMrAJ0hezWflWY__i5k');
    expect(CHAPTER_5_PROJECT_PPTX_URL).toContain('Chapter_05_System_Software_Project_Mirror.pptx');
    expect(realSlideDeckFor('9618',6,'6.1')).toBeNull();
  });

  it('renders configured decks with project-hosted slide images rather than an iframe',()=>{
    const experience=source('src/teaching/LessonExperience.tsx');
    const viewer=source('src/teaching/RealSlideDeckPresentation.tsx');
    expect(experience).toContain("import { RealSlideDeckPresentation } from './RealSlideDeckPresentation';");
    expect(experience).toContain('realSlideDeckFor(courseCode(chapter),chapter.number,activeTopic.code)');
    expect(experience).toContain('if(realDeck)return');
    expect(viewer).toContain('<img src={slide.imageUrl}');
    expect(viewer).not.toContain('<iframe');
    expect(viewer).toContain('CHAPTER {deck.chapter}');
    expect(viewer).toContain('projectPptxUrl');
    expect(viewer).toContain('pptxDriveUrl');
  });

  it('records Drive source and project storage for migrated chapters',()=>{
    for(const chapter of ['03','04','05']){
      const manifest=JSON.parse(source(`public/9618/presentations/chapter-${chapter}/manifest.json`));
      expect(manifest.delivery).toBe('project-slide-images');
      expect(manifest.sourcePptx.shared).toBe(true);
      expect(manifest.projectMirror.pptx).toContain('Project_Mirror.pptx');
      expect(manifest.runtime.htmlCssReconstruction).toBe(false);
      expect(manifest.runtime.sourceOfTruth).toBe('Drive PPTX');
      expect(manifest.slides).toHaveLength(manifest.slideCount);
    }
  });
});
