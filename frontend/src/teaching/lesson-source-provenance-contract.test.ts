import { describe, expect, it } from 'vitest';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';

const chapters=[...LESSON_CHAPTERS,CHAPTER_7];

describe('lesson source provenance contract',()=>{
  it('keeps source-backed slides attributable to a named source with inspectable evidence',()=>{
    const violations:string[]=[];

    for(const chapter of chapters){
      for(const slide of chapter.slides){
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
      for(const slide of chapter.slides){
        if(slide.examPractice)continue;
        if((slide.sourceElements?.length??0)===0)continue;
        const hasIdentity=(slide.sourcePages?.length??0)>0||(slide.sourceAtomEvidence?.length??0)>0;
        if(!hasIdentity)violations.push(`${chapter.number}:${slide.id}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
