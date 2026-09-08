import type { HodderLessonSlide } from './lesson-content-hodder-types';

const MAX_SOURCE_FRAGMENTS_PER_SCREEN = 2;
const MAX_SOURCE_CHARS_PER_SCREEN = 620;
const MAX_SOURCE_FRAGMENT_CHARS = 360;

type PresentationChapterLike = {
  coverage:string;
  slides:readonly HodderLessonSlide[];
};

type SourceFragment = {
  text:string;
  blockIndex:number;
  fragmentIndex:number;
};

const isExactPdfSourceSlide = (slide:HodderLessonSlide) =>
  slide.id.startsWith('pdf-first-') && !slide.id.startsWith('pdf-first-lens-') && !slide.examPractice;

const isExamLensSlide = (slide:HodderLessonSlide) => slide.id.startsWith('pdf-first-lens-');

const printedPageFromElement = (value:string) => {
  const match=value.match(/PDF p\.(\d+)/i);
  return match ? Number(match[1]) : null;
};

const preferredCut = (text:string, maxChars:number) => {
  const window=text.slice(0,maxChars+1);
  const minimum=Math.floor(maxChars*.45);
  const boundaries=['. ','? ','! ','; ',': ',', '];
  let best=-1;
  for(const boundary of boundaries){
    const index=window.lastIndexOf(boundary);
    if(index>=minimum)best=Math.max(best,index+boundary.length-1);
  }
  if(best>=minimum)return best;
  const whitespace=window.lastIndexOf(' ');
  return whitespace>=minimum?whitespace:maxChars;
};

/**
 * Presentation fragments preserve every source word and punctuation mark in
 * order. Only whitespace at a screen boundary is normalised. Long textbook
 * paragraphs are therefore allowed to become several readable screens rather
 * than being shrunk or clipped on the projector.
 */
export const splitPdfSourceForPresentation = (text:string):string[] => {
  const parts:string[]=[];
  let remaining=text.trim();
  while(remaining.length>MAX_SOURCE_FRAGMENT_CHARS){
    const cut=preferredCut(remaining,MAX_SOURCE_FRAGMENT_CHARS);
    const fragment=remaining.slice(0,cut).trimEnd();
    if(!fragment.length)break;
    parts.push(fragment);
    remaining=remaining.slice(cut).trimStart();
  }
  if(remaining.length)parts.push(remaining);
  return parts.length?parts:[text];
};

/**
 * Expands the exact-PDF route into projector-sized teaching screens without
 * deleting or re-ordering source text. Short source blocks can share a screen;
 * long blocks are split at natural punctuation/word boundaries so the screen
 * keeps classroom-sized typography instead of becoming a scrolling article.
 */
export function presentationizePdfFirstChapter<T extends PresentationChapterLike>(chapter:T):T {
  const expanded:HodderLessonSlide[]=[];

  for(const slide of chapter.slides){
    if(isExamLensSlide(slide)){
      expanded.push({...slide,visual:'recap'});
      continue;
    }
    if(!isExactPdfSourceSlide(slide) || !(slide.bullets?.length)){
      expanded.push(slide);
      continue;
    }

    const bullets=slide.bullets;
    const evidence=slide.sourceAtomEvidence??[];
    const elements=slide.sourceElements??[];
    const fragments:SourceFragment[]=bullets.flatMap((text,blockIndex)=>
      splitPdfSourceForPresentation(text).map((fragment,fragmentIndex)=>({
        text:fragment,
        blockIndex,
        fragmentIndex,
      })),
    );
    let cursor=0;
    let groupIndex=0;

    while(cursor<fragments.length){
      const group:SourceFragment[]=[];
      let chars=0;
      while(cursor+group.length<fragments.length && group.length<MAX_SOURCE_FRAGMENTS_PER_SCREEN){
        const candidate=fragments[cursor+group.length]!;
        const candidateChars=candidate.text.trim().length;
        if(group.length>0 && chars+candidateChars>MAX_SOURCE_CHARS_PER_SCREEN)break;
        group.push(candidate);
        chars+=candidateChars;
      }
      if(!group.length)group.push(fragments[cursor]!);

      const blockIndexes=[...new Set(group.map(item=>item.blockIndex))];
      const groupElements=blockIndexes.map(index=>elements[index]).filter((item):item is string=>Boolean(item));
      const parsedPages=groupElements
        .map(printedPageFromElement)
        .filter((value):value is number=>value!==null);
      const groupEvidence=evidence.length===bullets.length
        ? group
            .filter(item=>item.fragmentIndex===0)
            .map(item=>evidence[item.blockIndex])
            .filter((item):item is NonNullable<typeof item>=>Boolean(item))
        : groupIndex===0?slide.sourceAtomEvidence:undefined;

      expanded.push({
        ...slide,
        id:`${slide.id}-screen-${String(groupIndex+1).padStart(2,'0')}`,
        title:slide.title.replace(/ · coursebook sequence \d+$/i,''),
        lead:'Read, explain and connect the exact coursebook statements on this screen. Continue only when the class can explain the idea in its own words.',
        bullets:group.map(item=>item.text),
        sourceElements:groupElements,
        sourcePages:parsedPages.length?[...new Set(parsedPages)]:slide.sourcePages,
        sourceAtomEvidence:groupEvidence,
      });

      cursor+=group.length;
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
    coverage:`${chapter.coverage} · presentation-first projector layout · max ${MAX_SOURCE_FRAGMENTS_PER_SCREEN} source fragments per generated coursebook screen`,
    slides,
  } as T;
}

export const PDF_FIRST_PRESENTATION_LIMITS = {
  maxFragmentsPerScreen:MAX_SOURCE_FRAGMENTS_PER_SCREEN,
  maxCharsPerScreen:MAX_SOURCE_CHARS_PER_SCREEN,
  maxFragmentChars:MAX_SOURCE_FRAGMENT_CHARS,
} as const;