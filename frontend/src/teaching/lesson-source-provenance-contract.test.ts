import { describe, expect, it } from 'vitest';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

const chapters=[...LESSON_CHAPTERS,CHAPTER_7];
const slidesFor=(chapter:(typeof chapters)[number])=>chapter.slides as HodderLessonSlide[];

describe('lesson source provenance contract',()=>{
  it('keeps source-backed study slides attributable to a named source with inspectable evidence',()=>{
    const violations:string[]=[];

    for(const chapter of chapters){
      for(const slide of slidesFor(chapter)){
        if(slide.examPractice)continue;
        const hasPageEvidence=(slide.sourcePages?.length??0)>0||(slide.sourceAtomEvidence?.length??0)>0;
        if(!hasPageEvidence)continue;
        if(!slide.sourceLabel?.trim())violations.push(`${chapter.number}:${slide.id}:missing sourceLabel`);
        const hasElements=(slide.sourceElements?.length??0)>0;
        const hasAtoms=(slide.sourceAtomEvidence?.length??0)>0;
        if(!hasElements&&!hasAtoms)violations.push(`${chapter.number}:${slide.id}:missing sourceElements/sourceAtomEvidence`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('does not let a study slide claim source elements without any source identity',()=>{
    const violations:string[]=[];

    for(const chapter of chapters){
      for(const slide of slidesFor(chapter)){
        if(slide.examPractice)continue;
        if((slide.sourceElements?.length??0)===0)continue;
        const hasIdentity=(slide.sourcePages?.length??0)>0||(slide.sourceAtomEvidence?.length??0)>0;
        if(!hasIdentity)violations.push(`${chapter.number}:${slide.id}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps live-practice provenance distinct from coursebook provenance',()=>{
    const violations:string[]=[];

    for(const chapter of chapters){
      for(const slide of slidesFor(chapter)){
        if(!slide.examPractice)continue;
        const mapped=(slide.learningObjectiveCodes?.length??0)>0;
        const explicitlyUnavailable=Boolean(slide.checkpointUnavailableReason?.trim());
        if(!mapped&&!explicitlyUnavailable)violations.push(`${chapter.number}:${slide.id}:checkpoint mapping state`);
        if(mapped&&!slide.checkpointSyllabusCode)violations.push(`${chapter.number}:${slide.id}:checkpoint syllabus`);
      }
    }

    expect(violations).toEqual([]);
  });
});
