import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';
import { CURRENT_9618_CHECKPOINT_TARGETS } from './lesson-current-target-checkpoints';

const liveCheckpoints=(chapterNo:1|13)=>{
  const chapter=lessonChapter(chapterNo);
  if(!chapter)throw new Error(`Missing lesson chapter ${chapterNo}`);
  return chapter.slides.filter(slide=>slide.examPractice&&Boolean(slide.learningObjectiveCodes?.length));
};

describe('9618 Lesson Studio current-target checkpoint contract',()=>{
  it('maps every live Chapter 1 and Chapter 13 checkpoint to a current 2026–2028 LO and through 2026',()=>{
    const chapter1=liveCheckpoints(1);
    const chapter13=liveCheckpoints(13);
    expect(chapter1).toHaveLength(17);
    expect(chapter13).toHaveLength(16);
    expect(Object.keys(CURRENT_9618_CHECKPOINT_TARGETS)).toHaveLength(33);

    for(const slide of [...chapter1,...chapter13]){
      expect(CURRENT_9618_CHECKPOINT_TARGETS[slide.id]).toBeDefined();
      expect(slide.learningObjectiveCodes).toEqual(CURRENT_9618_CHECKPOINT_TARGETS[slide.id]);
      expect(slide.learningObjectiveCodes?.every(code=>/^(?:1\.[123]|13\.[123])\.\d+$/.test(code))).toBe(true);
      expect(slide.learningObjectiveCodes?.some(code=>code.includes('-lo-'))).toBe(false);
      expect(slide.eyebrow).toContain('CURRENT 2026–2028 TARGET');
      expect(slide.checkpointYearFrom).toBe(2021);
      expect(slide.checkpointYearTo).toBe(2026);
    }
  });

  it('keeps split/combined current syllabus objectives explicit',()=>{
    const byId=new Map([...liveCheckpoints(1),...liveCheckpoints(13)].map(slide=>[slide.id,slide]));
    expect(byId.get('h1-cp-arithmetic')?.learningObjectiveCodes).toEqual(['1.1.4','1.1.5']);
    expect(byId.get('h1-cp-hex')?.learningObjectiveCodes).toEqual(['1.1.3','1.1.6']);
    expect(byId.get('h1-cp-bcd')?.learningObjectiveCodes).toEqual(['1.1.3','1.1.6']);
    expect(byId.get('h1-cp-bitmap')?.learningObjectiveCodes).toEqual(['1.2.1','1.2.2','1.2.3']);
    expect(byId.get('h13-cp-float-to-denary')?.learningObjectiveCodes).toEqual(['13.3.2']);
    expect(byId.get('h13-cp-denary-to-float')?.learningObjectiveCodes).toEqual(['13.3.2']);
  });

  it('keeps deliberate no-direct-question states outside the current-target map',()=>{
    const chapter=lessonChapter(1)!;
    for(const id of ['h1-cp-video','h1-cp-sound-editing','h1-cp-general-reduction']){
      const slide=chapter.slides.find(item=>item.id===id);
      expect(slide?.examPractice).toBe(true);
      expect(slide?.learningObjectiveCodes).toBeUndefined();
      expect(slide?.checkpointUnavailableReason).toBeTruthy();
      expect(CURRENT_9618_CHECKPOINT_TARGETS[id]).toBeUndefined();
    }
  });
});
