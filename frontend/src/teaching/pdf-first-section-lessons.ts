import type { LessonSlide } from './lesson-content-full';
import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';
import type { PdfFirstChapter, PdfFirstSectionId } from './pdf-first-source-types';
import {
  PDF_FIRST_SECTION_ORDER,
  pdfFirstBlocksForSection,
  pdfFirstSectionsForChapter,
  pdfFirstSegmentsForSection,
  type PdfFirstSectionMeta,
} from './pdf-first-source-index';
import { applyCurrent9618CheckpointTargets } from './lesson-current-target-checkpoints';
import { CHAPTER_7_PAST_PAPER_CHECKPOINTS } from './chapter7-past-paper-checkpoints';

export type PdfFirstExamLens = {
  title: string;
  items: readonly string[];
  source: string;
};

/**
 * Section-end exam guidance. These are distilled from the existing approved
 * Cambridge QP/MS corpus and the supplied coursebook sections. They are not a
 * replacement for the original question or mark scheme.
 */
export const PDF_FIRST_SECTION_EXAM_LENS: Readonly<Record<PdfFirstSectionId, PdfFirstExamLens>> = {
  '1.1': {
    title:'Represent, convert and justify data representations accurately',
    items:[
      'Show working for binary, denary and hexadecimal conversions and keep fixed-width signed representations separate from ordinary unsigned values.',
      'For binary arithmetic, form two’s-complement negatives carefully and identify overflow from the representable range rather than from a carry alone.',
      'When asked about hexadecimal, BCD, ASCII or Unicode, connect the representation to the property that makes it suitable for the stated use.',
      'Keep decimal prefixes and IEC binary prefixes distinct when units are part of the question.',
    ],
    source:'Hodder Chapter 1 section 1.1 + approved Cambridge 9618 QP/MS corpus',
  },
  '1.2': {
    title:'Explain how multimedia data is represented and how representation choices affect quality and size',
    items:[
      'For bitmaps, connect resolution to pixel count and colour/bit depth to bits available per pixel; show file-size working before unit conversion.',
      'For vectors, explain storage in terms of geometric objects, coordinates and properties rather than pixels.',
      'For sound, separate sampling rate from sampling resolution and state how each affects fidelity and file size.',
      'When choosing bitmap or vector representation, justify the choice from the scenario rather than naming a format only.',
    ],
    source:'Hodder Chapter 1 section 1.2 + approved Cambridge 9618 QP/MS corpus',
  },
  '1.3': {
    title:'Choose and explain compression from the file’s purpose',
    items:[
      'State that compression reduces the number of bits needed for storage or transmission, then connect that benefit to the scenario.',
      'Lossless permits reconstruction of the original data; lossy permanently discards selected information.',
      'For RLE, encode adjacent repeated values as a run and explain why long runs compress well while rapidly changing data may not.',
      'For media compression, distinguish reduced data size from the quality trade-off and preserve the convention stated in the question.',
    ],
    source:'Hodder Chapter 1 section 1.3 + approved Cambridge 9618 QP/MS corpus',
  },
  '7.1': {
    title:'Program-development questions test the purpose of each stage',
    items:[
      'Analysis establishes requirements and identifies what the solution must do.',
      'Design specifies how the solution will work before implementation.',
      'Coding implements the design; iterative testing checks modules while they are developed.',
      'Final testing checks the completed program with planned data and expected outcomes.',
    ],
    source:'Supplied Chapter 7 section 7.1 + approved Cambridge 0478 QP/MS corpus',
  },
  '7.2': {
    title:'Decomposition, structure diagrams, flowcharts and pseudocode must remain precise',
    items:[
      'Break a system into sub-systems until each part performs a manageable action and identify inputs, processes, outputs and storage explicitly.',
      'Use structure diagrams for hierarchy; use flowcharts or pseudocode for the ordered algorithm inside a component.',
      'Use standard flowchart symbols, labelled decision branches and Cambridge-style pseudocode conventions consistently.',
      'Choose sequence, selection and iteration structures that match the required behaviour.',
    ],
    source:'Supplied Chapter 7 section 7.2 + approved Cambridge 0478 QP/MS corpus',
  },
  '7.3': {
    title:'Explain what an algorithm achieves before describing individual lines',
    items:[
      'State the overall purpose in terms of the input, processing and resulting output.',
      'Then identify the important processes that make that purpose happen.',
      'Use the actual variables, conditions and outputs in the supplied algorithm as evidence.',
    ],
    source:'Supplied Chapter 7 section 7.3 + approved Cambridge 0478 QP/MS corpus',
  },
  '7.4': {
    title:'Recognise standard algorithm patterns and initialise them correctly',
    items:[
      'Totals and counters need suitable initial values before repetition.',
      'Maximum/minimum algorithms compare each item with the current stored extreme; initial values must be safe for the permitted data.',
      'Linear search checks items in sequence until the target is found or the search is exhausted.',
      'Bubble sort repeatedly compares adjacent values and swaps those in the wrong order until no further swap is required.',
    ],
    source:'Supplied Chapter 7 section 7.4 + approved Cambridge 0478 QP/MS corpus',
  },
  '7.5': {
    title:'Validation and verification are different exam concepts',
    items:[
      'Validation automatically checks whether input is reasonable using rules such as range, length, type, presence, format or check digit.',
      'Verification checks that data has been copied accurately, for example by double entry or a visual/screen check.',
      'When writing validation pseudocode, show both the test and the route used when input is rejected and re-entered.',
    ],
    source:'Supplied Chapter 7 section 7.5 + approved Cambridge 0478 QP/MS corpus',
  },
  '7.6': {
    title:'Test data is selected to prove different behaviours',
    items:[
      'Normal data should be accepted and produce a known expected result.',
      'Abnormal/erroneous data should be rejected.',
      'Extreme data is the largest or smallest valid value.',
      'Boundary testing uses values on and immediately outside each boundary and states the expected acceptance/rejection.',
    ],
    source:'Supplied Chapter 7 section 7.6 + approved Cambridge 0478 QP/MS corpus',
  },
  '7.7': {
    title:'A trace table records every value change and every output',
    items:[
      'Record initial values before the first iteration when the algorithm assigns them.',
      'Record a variable again whenever its value changes and record each output in the output column.',
      'Follow conditions and loop order exactly; the trace is evidence of the dry run, not just a route to the final answer.',
    ],
    source:'Supplied Chapter 7 section 7.7 + approved Cambridge 0478 QP/MS corpus',
  },
  '7.8': {
    title:'Error-correction questions require diagnosis, repair and retesting',
    items:[
      'Identify the exact line, symbol, initial value, branch or condition that causes the error.',
      'Show the corrected algorithm rather than only saying that an error exists.',
      'Retest after the fix using data that would expose the original fault and any new edge case.',
    ],
    source:'Supplied Chapter 7 section 7.8 + approved Cambridge 0478 QP/MS corpus',
  },
  '7.9': {
    title:'Writing algorithms is assessed through correct logic and Cambridge pseudocode conventions',
    items:[
      'Choose sequence, selection and iteration structures that match the required behaviour.',
      'Keep initialisation, loop termination, validation and output placement logically consistent.',
      'Use meaningful identifiers and preserve exact strings or identifiers when the question specifies them.',
      'Plan test data and dry runs so the algorithm can be checked and amended systematically.',
    ],
    source:'Supplied Chapter 7 section 7.9 + approved Cambridge 0478 QP/MS corpus',
  },
  '13.1': {
    title:'Choose and use a user-defined type from the constraints of the data',
    items:[
      'An enumeration explicitly lists permitted ordered values; those values are identifiers rather than ordinary quoted strings.',
      'A pointer stores a typed address; dereferencing accesses the data stored at that address.',
      'Records group named fields, sets model unordered elements with set operations, and classes combine data with methods.',
      'Justify the chosen type from the problem rather than only naming the type.',
    ],
    source:'Hodder Chapter 13 section 13.1 + approved Cambridge 9618 QP/MS corpus',
  },
  '13.2': {
    title:'Separate file organisation from file access and justify both from the workload',
    items:[
      'Serial means arrival order, sequential means a defined key order, and random means records can occupy available locations found through a hash.',
      'Sequential access reads from the physical start; direct access reaches a selected record without reading every earlier record.',
      'For hashing, calculate the home location exactly as specified, identify collisions and explain the open/closed-hash resolution path.',
      'Use the scenario, hit rate and retrieval pattern to justify organisation/access choices.',
    ],
    source:'Hodder Chapter 13 section 13.2 + approved Cambridge 9618 QP/MS corpus',
  },
  '13.3': {
    title:'Treat floating point as a signed mantissa/exponent representation with finite precision',
    items:[
      'Interpret or build the mantissa first, including two’s-complement negatives, then interpret the signed exponent and power-of-two scaling.',
      'Normalise by shifting the mantissa to the required 0.1 or 1.0 form and compensate with the exponent so the represented value is unchanged.',
      'More mantissa bits improve precision while more exponent bits increase range; the allocation is a trade-off.',
      'Explain approximation, rounding, overflow and underflow from the finite representation rather than only naming the error.',
    ],
    source:'Hodder Chapter 13 section 13.3 + approved Cambridge 9618 QP/MS corpus',
  },
};

const sectionLabel = (meta:PdfFirstSectionMeta) => `${meta.id} ${meta.title}`;

/**
 * Keep the extracted source transcript on the physical PDF page it came from.
 * The earlier implementation chunked a whole section every seven fragments,
 * which could silently mix two source pages and then attach the mixed content to
 * the lower page number. Page identity is part of source provenance, so it must
 * never be inferred from an arbitrary presentation chunk.
 */
const sourceSlidesForSection = (meta:PdfFirstSectionMeta): HodderLessonSlide[] => {
  const segments=pdfFirstSegmentsForSection(meta.id);
  const pdfPages=[...new Set(segments.map(segment=>segment.pdfPage))];
  return pdfPages.map((pdfPage,index)=>{
    const pageSegments=segments.filter(segment=>segment.pdfPage===pdfPage);
    const units=pageSegments.flatMap(segment=>segment.blocks.map((text,blockIndex)=>({
      text,
      pdfPage:segment.pdfPage,
      printedPage:segment.printedPage,
      part:segment.part,
      blockIndex,
    })));
    const printedPages=[...new Set(units.map(item=>item.printedPage))];
    const printedLabel=printedPages.join(', ');
    return {
      id:`pdf-first-${meta.id.replace('.','')}-${String(index+1).padStart(2,'0')}`,
      section:sectionLabel(meta),
      subtopicCode:meta.id,
      eyebrow:`${meta.id} · COURSEBOOK SOURCE · p.${printedLabel}`,
      title:`${meta.title} · source page ${printedLabel}`,
      lead:'Exact extracted text from the supplied coursebook page, kept together on its physical source page. Cambridge Exam Lens and Past Paper practice follow after the topic study pages.',
      bullets:units.map(item=>item.text),
      sourcePages:printedPages,
      sourceElements:units.map(item=>`PDF p.${item.printedPage} · part ${item.part} · block ${item.blockIndex+1}`),
      sourceAtomEvidence:units.map((item,evidenceIndex)=>({
        id:`pdf-first-${meta.id.replace('.','')}-${index+1}-${evidenceIndex+1}`,
        page:item.pdfPage,
        kind:'concept' as const,
        sourceRef:`Exact extracted PDF p.${item.printedPage} · ${meta.id}`,
        lines:[item.text],
      })),
      sourceLabel:`${meta.sourceLabel} · exact extracted PDF source`,
      accent:meta.accent,
    };
  });
};

const examLensSlideForSection = (meta:PdfFirstSectionMeta): HodderLessonSlide => {
  const lens=PDF_FIRST_SECTION_EXAM_LENS[meta.id];
  return {
    id:`pdf-first-lens-${meta.id.replace('.','')}`,
    section:sectionLabel(meta),
    subtopicCode:meta.id,
    eyebrow:`CAMBRIDGE EXAM LENS · ${meta.id}`,
    title:lens.title,
    lead:'Use these exam-facing reminders after completing the supplied coursebook section and before opening live Past Paper practice.',
    bullets:[...lens.items],
    sourceElements:[`Exam enrichment source · ${lens.source}`],
    sourceLabel:lens.source,
    accent:meta.accent,
  };
};

const belongsToSection = (slide:LessonSlide, id:PdfFirstSectionId) =>
  slide.subtopicCode===id || slide.section.toLowerCase().startsWith(id.toLowerCase());

const checkpointTargetsSection = (slide:HodderLessonSlide, id:PdfFirstSectionId) =>
  belongsToSection(slide,id)
  || (slide.learningObjectiveCodes??[]).some(code=>code.startsWith(`${id}.`) || code===id);

const cloneIntoSection = (slide:HodderLessonSlide, meta:PdfFirstSectionMeta):HodderLessonSlide => ({
  ...slide,
  section:sectionLabel(meta),
  subtopicCode:meta.id,
});

/**
 * Rebuild a 9618 chapter without the old glossary/page-by-page learner appendix.
 * Existing curated teaching slides stay in their source section, exact PDF
 * page transcripts follow in source-page order, then one Exam Lens and finally
 * all live/current Past Paper checkpoints for that section.
 */
export function buildPdfFirst9618Chapter(baseChapter:HodderLessonChapter):HodderLessonChapter {
  const current=applyCurrent9618CheckpointTargets(baseChapter);
  const metas=pdfFirstSectionsForChapter(baseChapter.number);
  const routedIds=new Set<string>();
  const routed:HodderLessonSlide[]=[];

  for(const meta of metas){
    const teaching=current.slides.filter(slide=>!slide.examPractice&&belongsToSection(slide,meta.id));
    const checkpoints=current.slides.filter(slide=>slide.examPractice&&checkpointTargetsSection(slide,meta.id));
    [...teaching,...checkpoints].forEach(slide=>routedIds.add(slide.id));
    routed.push(
      ...teaching.map(slide=>cloneIntoSection(slide,meta)),
      ...sourceSlidesForSection(meta),
      examLensSlideForSection(meta),
      ...checkpoints.map(slide=>cloneIntoSection(slide,meta)),
    );
  }

  const prelude=current.slides.filter(slide=>!routedIds.has(slide.id)&&!slide.examPractice);
  const orphanCheckpoints=current.slides.filter(slide=>!routedIds.has(slide.id)&&slide.examPractice);
  if(orphanCheckpoints.length){
    throw new Error(`Unrouted 9618 checkpoints in Chapter ${baseChapter.number}: ${orphanCheckpoints.map(slide=>slide.id).join(', ')}`);
  }

  const sourceBlockCount=metas.reduce((total,meta)=>total+pdfFirstBlocksForSection(meta.id).length,0);
  return {
    ...current,
    subtitle:`${current.subtitle} Exact supplied-PDF teaching now runs section-first: source → Cambridge Exam Lens → live Past Papers.`,
    subtopics:metas.map(sectionLabel),
    coverage:`${current.coverage} · PDF-first active route · ${sourceBlockCount}/${sourceBlockCount} exact source blocks assigned to physical source pages · glossary/page-by-page appendix removed from learner route`,
    slides:[...prelude,...routed],
  };
}

/** Build the Chapter 7 book route in strict 7.1→7.9 order. */
export function buildPdfFirstChapter7Route(bookSlides:LessonSlide[]):HodderLessonSlide[] {
  const routed:HodderLessonSlide[]=[];
  for(const meta of PDF_FIRST_SECTION_ORDER.filter(item=>item.chapter===7)){
    const teaching=bookSlides.filter(slide=>belongsToSection(slide,meta.id));
    const checkpoint=CHAPTER_7_PAST_PAPER_CHECKPOINTS.find(slide=>slide.subtopicCode===meta.id);
    if(!checkpoint)throw new Error(`Missing Chapter 7 Past Paper checkpoint for ${meta.id}`);
    routed.push(
      ...teaching.map(slide=>cloneIntoSection(slide as HodderLessonSlide,meta)),
      ...sourceSlidesForSection(meta),
      examLensSlideForSection(meta),
      cloneIntoSection(checkpoint,meta),
    );
  }
  return routed;
}

export const pdfFirstSourceSlidesForChapter = (chapter:PdfFirstChapter) =>
  pdfFirstSectionsForChapter(chapter).flatMap(sourceSlidesForSection);