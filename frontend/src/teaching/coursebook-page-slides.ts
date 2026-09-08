import type { LessonSlide } from './lesson-content-full';
import type { HodderLessonChapter, HodderLessonSlide, LessonRichBlock } from './lesson-content-hodder-types';
import { sourceAtomsForChapter, type LessonSourceAtom } from './lesson-source-atom-registry';
import { CHAPTER_7_ALL_SOURCE_ATOMS } from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_KEY_TERMS } from './chapter7-source-keyterms';

const normalizeKey = (value:string) => value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();

const codeLike = (lines:string[]) => lines.some((line) =>
  /←|^\s*(?:DECLARE|TYPE|DEFINE|FOR|NEXT|OUTPUT|INPUT|IF|THEN|ELSE|ENDIF|ENDFOR|WHILE|ENDWHILE|REPEAT|UNTIL|CASE|ENDCASE|PROCEDURE|FUNCTION|RETURN|CALL|PRINT|READ|WRITE|OPENFILE|CLOSEFILE)\b/i.test(line),
);

const sourceKindLabel = (kind:LessonSourceAtom['kind']) => {
  if(kind==='prior')return 'PRIOR KNOWLEDGE';
  if(kind==='example')return 'WORKED EXAMPLE';
  if(kind==='activity')return 'ACTIVITY';
  if(kind==='extension')return 'EXTENSION';
  if(kind==='table')return 'TABLE';
  if(kind==='figure')return 'FIGURE / DIAGRAM';
  if(kind==='review')return 'CHAPTER REVIEW';
  return 'COURSEBOOK DETAIL';
};

const blocksFor9618Atom = (atom:LessonSourceAtom):LessonRichBlock[] => {
  const lines=atom.needles.map((line)=>line.trim()).filter(Boolean);
  if(!lines.length)return [];
  const [first,...rest]=lines;
  const tone:'info'|'activity'|'extension' = atom.kind==='activity'||atom.kind==='prior'||atom.kind==='review'
    ? 'activity'
    : atom.kind==='extension'
      ? 'extension'
      : 'info';
  const blocks:LessonRichBlock[]=[{
    kind:'callout',
    tone,
    title:`${sourceKindLabel(atom.kind)} · ${atom.sourceRef}`,
    text:first!,
  }];
  if(rest.length){
    blocks.push(codeLike(rest)
      ? {kind:'code',title:'Coursebook code / task data',lines:rest}
      : {kind:'bullets',items:rest});
  }
  return blocks;
};

export type FormalCoursebookTerm={term:string;definition:string;page:number;sourceRef:string};

export const formal9618Terms = (chapter:1|13):FormalCoursebookTerm[] => {
  const result:FormalCoursebookTerm[]=[];
  const seen=new Set<string>();
  for(const atom of sourceAtomsForChapter(chapter)){
    if(!/key terms/i.test(atom.sourceRef))continue;
    for(const line of atom.needles){
      const match=line.match(/^(.+?)\s+[–—-]\s+(.+)$/);
      if(!match?.[1]||!match[2])continue;
      const term=match[1].trim(),definition=match[2].trim();
      const key=normalizeKey(term);
      if(!key||seen.has(key))continue;
      seen.add(key);
      result.push({term,definition,page:atom.page,sourceRef:atom.sourceRef});
    }
  }
  return result;
};

const chunk=<T,>(items:T[],size:number)=>Array.from({length:Math.ceil(items.length/size)},(_,index)=>items.slice(index*size,(index+1)*size));

export const coursebookGlossarySlides9618 = (chapter:1|13):HodderLessonSlide[] => {
  const terms=formal9618Terms(chapter);
  return chunk(terms,10).map((group,index)=>({
    id:`h${chapter}-coursebook-glossary-${index+1}`,
    section:'Coursebook glossary',
    eyebrow:`COURSEBOOK GLOSSARY · ${index+1}/${Math.ceil(terms.length/10)}`,
    title:`Formal key terms · Chapter ${chapter}`,
    lead:'Every formal key term from the supplied coursebook extract is collected here with its source definition so no keyword is hidden inside audit metadata.',
    keyTerms:group.map(({term,definition})=>({term,definition})),
    sourcePages:[...new Set(group.map((item)=>item.page))].sort((a,b)=>a-b),
    sourceElements:group.map((item)=>`${item.sourceRef} · ${item.term}`),
    sourceLabel:'Supplied coursebook glossary',
    accent:'emerald',
  }));
};

export const coursebookPageSlides9618 = (chapter:1|13):HodderLessonSlide[] => {
  const atoms=sourceAtomsForChapter(chapter);
  const pageCount=chapter===1?26:24;
  return Array.from({length:pageCount},(_,index)=>index+1).map((page)=>{
    const pageAtoms=atoms.filter((atom)=>atom.page===page);
    const labels=[...new Set(pageAtoms.map((atom)=>`${sourceKindLabel(atom.kind)} · ${atom.sourceRef}`))];
    return {
      id:`h${chapter}-coursebook-page-${String(page).padStart(2,'0')}`,
      section:'Coursebook page-by-page',
      eyebrow:`COURSEBOOK SOURCE · PAGE ${page}/${pageCount}`,
      title:`Chapter ${chapter} · source page ${page}`,
      lead:'This page-by-page screen exists to make the supplied PDF auditable from inside the lesson itself. Every inventoried teaching detail assigned to this source page is visible below.',
      bullets:labels,
      richBlocks:pageAtoms.flatMap(blocksFor9618Atom),
      sourcePages:[page],
      sourceElements:pageAtoms.map((atom)=>`${atom.id} · ${atom.sourceRef}`),
      sourceLabel:'Exact supplied coursebook page map',
      accent: pageAtoms.some((atom)=>atom.kind==='activity'||atom.kind==='review')?'emerald':'indigo',
    } satisfies HodderLessonSlide;
  });
};

export const withCoursebookReferenceSlides9618 = (chapter:HodderLessonChapter):HodderLessonChapter => {
  const glossary=coursebookGlossarySlides9618(chapter.number);
  const pages=coursebookPageSlides9618(chapter.number);
  return {
    ...chapter,
    subtopics:[...chapter.subtopics,'Coursebook glossary','Coursebook page-by-page'],
    coverage:`${chapter.coverage} · ${glossary.length} glossary screens · ${pages.length}/${pages.length} page-by-page source screens`,
    slides:[...chapter.slides,...glossary,...pages],
  };
};

const chapter7KindLabel = (kind:(typeof CHAPTER_7_ALL_SOURCE_ATOMS)[number]['kind']) => {
  if(kind==='objective')return 'LEARNING OUTLINE';
  if(kind==='keyword')return 'KEY TERM / IMPORTANT TERM';
  if(kind==='example')return 'WORKED EXAMPLE';
  if(kind==='activity')return 'ACTIVITY';
  if(kind==='extension')return 'EXTENSION';
  if(kind==='table')return 'TABLE';
  if(kind==='figure')return 'FIGURE / DIAGRAM';
  if(kind==='review')return 'SUMMARY / REVIEW';
  if(kind==='exam')return 'EXAM-STYLE PRACTICE';
  return 'COURSEBOOK DETAIL';
};

export const CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES:LessonSlide[] = chunk([...CHAPTER_7_SOURCE_KEY_TERMS],10).map((group,index)=>({
  id:`ch7-coursebook-glossary-${index+1}`,
  section:'Coursebook glossary',
  eyebrow:`COURSEBOOK GLOSSARY · ${index+1}/${Math.ceil(CHAPTER_7_SOURCE_KEY_TERMS.length/10)}`,
  title:'Formal key terms · Chapter 7',
  lead:'All formal key terms printed at the end of the supplied Chapter 7 extract are collected here with their source definitions.',
  keyTerms:group.map(({term,definition})=>({term,definition})),
  accent:'emerald',
}));

export const CHAPTER_7_COURSEBOOK_PAGE_SLIDES:LessonSlide[] = Array.from({length:41},(_,index)=>258+index).map((printedPage)=>{
  const atoms=CHAPTER_7_ALL_SOURCE_ATOMS.filter((atom)=>atom.printedPage===printedPage);
  return {
    id:`ch7-source-page-${printedPage}`,
    section:'Coursebook page-by-page',
    eyebrow:`COURSEBOOK SOURCE · PRINTED PAGE ${printedPage}`,
    title:`Chapter 7 · source page ${printedPage}`,
    lead:'Every inventoried teaching detail assigned to this exact coursebook page is listed here so source material cannot remain only in hidden audit data.',
    bullets:atoms.flatMap((atom)=>[
      `${chapter7KindLabel(atom.kind)} · ${atom.sourceRef}`,
      ...atom.needles,
    ]),
    accent:atoms.some((atom)=>atom.kind==='activity'||atom.kind==='review'||atom.kind==='exam')?'emerald':'indigo',
  };
});
