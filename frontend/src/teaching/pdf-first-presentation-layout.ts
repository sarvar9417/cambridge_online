import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';

const MAX_SOURCE_BLOCKS_PER_SCREEN = 2;
const MAX_SOURCE_CHARS_PER_SCREEN = 620;

const isExactPdfSourceSlide = (slide:HodderLessonSlide) =>
  slide.id.startsWith('pdf-first-') && !slide.id.startsWith('pdf-first-lens-') && !slide.examPractice;

const printedPageFromElement = (value:string) => {
  const match=value.match(/PDF p\.(\d+)/i);
  return match ? Number(match[1]) : null;
};

/**
 * Expands the exact-PDF route into projector-sized teaching screens without
 * changing, deleting or re-ordering a single source block. Source blocks stay
 * verbatim; only their screen grouping changes.
 */
export function presentationizePdfFirstChapter<T extends HodderLessonChapter>(chapter:T):T {
  const expanded:HodderLessonSlide[]=[];

  for(const slide of chapter.slides){
    if(!isExactPdfSourceSlide(slide) || !(slide.bullets?.length)){
      expanded.push(slide);
      continue;
    }

    const bullets=slide.bullets;
    const evidence=slide.sourceAtomEvidence??[];
    const elements=slide.sourceElements??[];
    let groupStart=0;
    let groupIndex=0;

    while(groupStart<bullets.length){
      const group:string[]=[];
      let chars=0;
      while(groupStart+group.length<bullets.length && group.length<MAX_SOURCE_BLOCKS_PER_SCREEN){
        const candidate=bullets[groupStart+group.length]!;
        const candidateChars=candidate.trim().length;
        if(group.length>0 && chars+candidateChars>MAX_SOURCE_CHARS_PER_SCREEN)break;
        group.push(candidate);
        chars+=candidateChars;
      }
      if(!group.length)group.push(bullets[groupStart]!);

      const from=groupStart;
      const to=groupStart+group.length;
      const groupElements=elements.slice(from,to);
      const parsedPages=groupElements
        .map(printedPageFromElement)
        .filter((value):value is number=>value!==null);

      expanded.push({
        ...slide,
        id:`${slide.id}-screen-${String(groupIndex+1).padStart(2,'0')}`,
        title:slide.title.replace(/ · coursebook sequence \d+$/i,''),
        lead:'Read, explain and connect the exact coursebook statements on this screen. Continue only when the class can explain the idea in its own words.',
        bullets:group,
        sourceElements:groupElements,
        sourcePages:parsedPages.length?[...new Set(parsedPages)]:slide.sourcePages,
        sourceAtomEvidence:evidence.length===bullets.length?evidence.slice(from,to):slide.sourceAtomEvidence,
      });

      groupStart=to;
      groupIndex+=1;
    }
  }

  const totals=new Map<string,number>();
  const seen=new Map<string,number>();
  for(const slide of expanded){
    if(!isExactPdfSourceSlide(slide))continue;
    const key=slide.subtopicCode??slide.section;
    totals.set(key,(totals.get(key)??0)+1);
  }

  const slides=expanded.map(slide=>{
    if(!isExactPdfSourceSlide(slide))return slide;
    const key=slide.subtopicCode??slide.section;
    const step=(seen.get(key)??0)+1;
    seen.set(key,step);
    return {
      ...slide,
      eyebrow:`${slide.subtopicCode??slide.section} · COURSEBOOK PRESENTATION · ${step}/${totals.get(key)??step}`,
    };
  });

  return {
    ...chapter,
    coverage:`${chapter.coverage} · presentation-first projector layout · max ${MAX_SOURCE_BLOCKS_PER_SCREEN} exact source blocks per generated coursebook screen`,
    slides,
  } as T;
}

export const PDF_FIRST_PRESENTATION_LIMITS = {
  maxBlocksPerScreen:MAX_SOURCE_BLOCKS_PER_SCREEN,
  maxCharsPerScreen:MAX_SOURCE_CHARS_PER_SCREEN,
} as const;
