import type { PdfFirstChapter, PdfFirstSectionId, PdfFirstSourceSegment } from './pdf-first-source-types';
import { PDF_FIRST_SECTION_1_1_A } from './pdf-first-source-1-1-a';
import { PDF_FIRST_SECTION_1_1_B } from './pdf-first-source-1-1-b';
import { PDF_FIRST_SECTION_1_1_C } from './pdf-first-source-1-1-c';
import { PDF_FIRST_SECTION_1_1_D } from './pdf-first-source-1-1-d';
import { PDF_FIRST_SECTION_1_1_E } from './pdf-first-source-1-1-e';
import { PDF_FIRST_SECTION_1_2_A } from './pdf-first-source-1-2-a';
import { PDF_FIRST_SECTION_1_2_B } from './pdf-first-source-1-2-b';
import { PDF_FIRST_SECTION_1_2_C } from './pdf-first-source-1-2-c';
import { PDF_FIRST_SECTION_1_3_A } from './pdf-first-source-1-3-a';
import { PDF_FIRST_SECTION_1_3_B } from './pdf-first-source-1-3-b';
import { PDF_FIRST_SECTION_1_3_C } from './pdf-first-source-1-3-c';
import { PDF_FIRST_SECTION_7_1_A } from './pdf-first-source-7-1-a';
import { PDF_FIRST_SECTION_7_2_A } from './pdf-first-source-7-2-a';
import { PDF_FIRST_SECTION_7_2_B } from './pdf-first-source-7-2-b';
import { PDF_FIRST_SECTION_7_2_C } from './pdf-first-source-7-2-c';
import { PDF_FIRST_SECTION_7_2_D } from './pdf-first-source-7-2-d';
import { PDF_FIRST_SECTION_7_3_A } from './pdf-first-source-7-3-a';
import { PDF_FIRST_SECTION_7_4_A } from './pdf-first-source-7-4-a';
import { PDF_FIRST_SECTION_7_4_B } from './pdf-first-source-7-4-b';
import { PDF_FIRST_SECTION_7_5_A } from './pdf-first-source-7-5-a';
import { PDF_FIRST_SECTION_7_5_B } from './pdf-first-source-7-5-b';
import { PDF_FIRST_SECTION_7_6_A } from './pdf-first-source-7-6-a';
import { PDF_FIRST_SECTION_7_7_A } from './pdf-first-source-7-7-a';
import { PDF_FIRST_SECTION_7_8_A } from './pdf-first-source-7-8-a';
import { PDF_FIRST_SECTION_7_9_A } from './pdf-first-source-7-9-a';
import { PDF_FIRST_SECTION_7_9_B } from './pdf-first-source-7-9-b';
import { PDF_FIRST_SECTION_7_9_C } from './pdf-first-source-7-9-c';
import { PDF_FIRST_SECTION_7_9_D } from './pdf-first-source-7-9-d';
import { PDF_FIRST_SECTION_13_1_A } from './pdf-first-source-13-1-a';
import { PDF_FIRST_SECTION_13_1_B } from './pdf-first-source-13-1-b';
import { PDF_FIRST_SECTION_13_2_A } from './pdf-first-source-13-2-a';
import { PDF_FIRST_SECTION_13_2_B } from './pdf-first-source-13-2-b';
import { PDF_FIRST_SECTION_13_3_A } from './pdf-first-source-13-3-a';
import { PDF_FIRST_SECTION_13_3_B } from './pdf-first-source-13-3-b';
import { PDF_FIRST_SECTION_13_3_C } from './pdf-first-source-13-3-c';
import { PDF_FIRST_SECTION_13_3_D } from './pdf-first-source-13-3-d';
import { PDF_FIRST_SECTION_13_3_E } from './pdf-first-source-13-3-e';

export type PdfFirstSectionMeta = {
  id: PdfFirstSectionId;
  chapter: PdfFirstChapter;
  title: string;
  sourceLabel: string;
  accent: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose';
};

export const PDF_FIRST_SECTION_ORDER: readonly PdfFirstSectionMeta[] = [
  { id:'1.1', chapter:1, title:'Data representation', sourceLabel:'Hodder 9618 Chapter 1', accent:'indigo' },
  { id:'1.2', chapter:1, title:'Multimedia', sourceLabel:'Hodder 9618 Chapter 1', accent:'cyan' },
  { id:'1.3', chapter:1, title:'File compression', sourceLabel:'Hodder 9618 Chapter 1', accent:'emerald' },
  { id:'7.1', chapter:7, title:'The program development life cycle', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'indigo' },
  { id:'7.2', chapter:7, title:'Computer systems, sub-systems and decomposition', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'cyan' },
  { id:'7.3', chapter:7, title:'Explaining the purpose of an algorithm', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'emerald' },
  { id:'7.4', chapter:7, title:'Standard methods of solution', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'amber' },
  { id:'7.5', chapter:7, title:'Validation and verification', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'rose' },
  { id:'7.6', chapter:7, title:'Test data', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'cyan' },
  { id:'7.7', chapter:7, title:'Trace tables to document dry runs of algorithms', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'indigo' },
  { id:'7.8', chapter:7, title:'Identifying errors in algorithms', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'rose' },
  { id:'7.9', chapter:7, title:'Writing and amending algorithms', sourceLabel:'Cambridge IGCSE/O Level Computer Science Chapter 7', accent:'emerald' },
  { id:'13.1', chapter:13, title:'User-defined data types', sourceLabel:'Hodder 9618 Chapter 13', accent:'indigo' },
  { id:'13.2', chapter:13, title:'File organisation and access', sourceLabel:'Hodder 9618 Chapter 13', accent:'cyan' },
  { id:'13.3', chapter:13, title:'Floating-point numbers, representation and manipulation', sourceLabel:'Hodder 9618 Chapter 13', accent:'emerald' },
] as const;

export const PDF_FIRST_SOURCE_SEGMENTS: readonly PdfFirstSourceSegment[] = [
  ...PDF_FIRST_SECTION_1_1_A,
  ...PDF_FIRST_SECTION_1_1_B,
  ...PDF_FIRST_SECTION_1_1_C,
  ...PDF_FIRST_SECTION_1_1_D,
  ...PDF_FIRST_SECTION_1_1_E,
  ...PDF_FIRST_SECTION_1_2_A,
  ...PDF_FIRST_SECTION_1_2_B,
  ...PDF_FIRST_SECTION_1_2_C,
  ...PDF_FIRST_SECTION_1_3_A,
  ...PDF_FIRST_SECTION_1_3_B,
  ...PDF_FIRST_SECTION_1_3_C,
  ...PDF_FIRST_SECTION_7_1_A,
  ...PDF_FIRST_SECTION_7_2_A,
  ...PDF_FIRST_SECTION_7_2_B,
  ...PDF_FIRST_SECTION_7_2_C,
  ...PDF_FIRST_SECTION_7_2_D,
  ...PDF_FIRST_SECTION_7_3_A,
  ...PDF_FIRST_SECTION_7_4_A,
  ...PDF_FIRST_SECTION_7_4_B,
  ...PDF_FIRST_SECTION_7_5_A,
  ...PDF_FIRST_SECTION_7_5_B,
  ...PDF_FIRST_SECTION_7_6_A,
  ...PDF_FIRST_SECTION_7_7_A,
  ...PDF_FIRST_SECTION_7_8_A,
  ...PDF_FIRST_SECTION_7_9_A,
  ...PDF_FIRST_SECTION_7_9_B,
  ...PDF_FIRST_SECTION_7_9_C,
  ...PDF_FIRST_SECTION_7_9_D,
  ...PDF_FIRST_SECTION_13_1_A,
  ...PDF_FIRST_SECTION_13_1_B,
  ...PDF_FIRST_SECTION_13_2_A,
  ...PDF_FIRST_SECTION_13_2_B,
  ...PDF_FIRST_SECTION_13_3_A,
  ...PDF_FIRST_SECTION_13_3_B,
  ...PDF_FIRST_SECTION_13_3_C,
  ...PDF_FIRST_SECTION_13_3_D,
  ...PDF_FIRST_SECTION_13_3_E,
] as const;

const metaById = new Map(PDF_FIRST_SECTION_ORDER.map(meta => [meta.id, meta] as const));

export const pdfFirstSectionMeta = (id: PdfFirstSectionId) => {
  const meta = metaById.get(id);
  if (!meta) throw new Error(`Unknown PDF-first section: ${id}`);
  return meta;
};

export const pdfFirstSectionsForChapter = (chapter: PdfFirstChapter) =>
  PDF_FIRST_SECTION_ORDER.filter(meta => meta.chapter === chapter);

export const pdfFirstSegmentsForSection = (section: PdfFirstSectionId) =>
  PDF_FIRST_SOURCE_SEGMENTS
    .filter(segment => segment.section === section)
    .slice()
    .sort((a,b) => a.pdfPage-b.pdfPage || a.part-b.part);

export const pdfFirstBlocksForSection = (section: PdfFirstSectionId) =>
  pdfFirstSegmentsForSection(section).flatMap(segment => segment.blocks);

export const pdfFirstSourcePagesForSection = (section: PdfFirstSectionId) =>
  [...new Set(pdfFirstSegmentsForSection(section).map(segment => segment.printedPage))];
