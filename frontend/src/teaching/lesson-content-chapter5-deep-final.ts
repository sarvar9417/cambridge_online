import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';
import { CHAPTER_5_FINAL as CHAPTER_5_SOURCE_ROUTE } from './lesson-content-chapter5-final';

function withPageCompleteEvidence(slide: HodderLessonSlide): HodderLessonSlide {
  if (slide.id === 'h5-52-key-terms') {
    return {
      ...slide,
      sourcePages: [149, 150],
      sourceLabel: 'Hodder Chapter 5 · pp.149–150',
      sourceElements: [
        ...(slide.sourceElements ?? []),
        'Hodder p.149 · 5.2 Language translators prior knowledge',
        'Hodder p.149 · Activity 5A',
        'Hodder p.149 · translator/compiler/interpreter/prettyprinting key terms',
      ],
      activity: {
        title: 'Bridge from operating systems to translators',
        prompt: 'Explain one OS need, distinguish a DLL from a static library routine, then choose an appropriate utility for compression, backup, defragmentation, malware checking and disk repair scenarios.',
      },
    };
  }

  if (slide.id === 'h5-524-debugger') {
    return {
      ...slide,
      sourcePages: [155, 156],
      sourceLabel: 'Hodder Chapter 5 · pp.155–156',
      sourceElements: [
        ...(slide.sourceElements ?? []),
        'Hodder p.156 · Figure 5.15 report window after single stepping',
        'Hodder p.156 · Figure 5.16 expression result in report window',
      ],
      bullets: [
        ...(slide.bullets ?? []),
        'The report window shows each variable together with its type and current contents at the paused point.',
        'The IDE can also display the value of calculations and expressions while the program is paused.',
      ],
    };
  }

  return slide;
}

export const CHAPTER_5_FINAL: HodderLessonChapter = {
  ...CHAPTER_5_SOURCE_ROUTE,
  sourceNote: 'Deep source-backed teaching route from the exact Hodder 9618 Chapter 5, printed pp.136–158, with every printed chapter page represented in slide provenance. The independently audited opening pp.136–141 is retained and extended through the remainder of the chapter.',
  coverage: '23/23 printed chapter pages represented (pp.136–158): chapter objectives and prior knowledge; OS need and interfaces; memory, security, process, hardware and file management; printer queues and buffers; utility software; program libraries and DLL trade-offs; translator prior knowledge and Activity 5A; assemblers, compilers and interpreters; partial compilation and bytecode; IDE editor, translator, debugger, report-window figures and auto-documentation; chapter review.',
  slides: CHAPTER_5_SOURCE_ROUTE.slides.map(withPageCompleteEvidence),
};
