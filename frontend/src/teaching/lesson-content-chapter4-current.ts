import { CHAPTER_4_DRAFT, CHAPTER_4_PROCESSOR_SLIDES } from './lesson-content-chapter4';
import { CHAPTER_4_FETCH_ASSEMBLY_SLIDES } from './lesson-content-chapter4-fetch-assembly';

export const CHAPTER_4_CURRENT_SLIDES = [
  ...CHAPTER_4_PROCESSOR_SLIDES,
  ...CHAPTER_4_FETCH_ASSEMBLY_SLIDES,
];

/**
 * Source-grounded working Chapter 4 candidate.
 * The full chapter ends on printed p.135, so the active source gate must remain
 * closed until pp.124-135 are implemented and checked against the Hodder PDF.
 */
export const CHAPTER_4_CURRENT_DRAFT = {
  ...CHAPTER_4_DRAFT,
  sourceNote: 'Source-grounded from the connected Hodder 9618 Coursebook. This working draft covers printed pp.107–123; pp.124–135 remain explicitly unresolved in this implementation.',
  coverage: 'Source-complete through p.123: CPU architecture and ports; Tables 4.2–4.3; fetch-execute cycle and Figures 4.5–4.6; Register Transfer Notation; interrupts; Activity 4A; the 4.2 assembly-language prior knowledge/key terms; assembly versus machine code; and two-pass assembly with the Hodder forward-reference/symbol-table example.',
  slides: CHAPTER_4_CURRENT_SLIDES,
};
