import { CHAPTER_4_DRAFT, CHAPTER_4_PROCESSOR_SLIDES } from './lesson-content-chapter4';
import { CHAPTER_4_FETCH_ASSEMBLY_SLIDES } from './lesson-content-chapter4-fetch-assembly';
import { CHAPTER_4_INSTRUCTIONS_BITMANIPULATION_SLIDES } from './lesson-content-chapter4-instructions-bitmanipulation';

export const CHAPTER_4_CURRENT_SLIDES = [
  ...CHAPTER_4_PROCESSOR_SLIDES,
  ...CHAPTER_4_FETCH_ASSEMBLY_SLIDES,
  ...CHAPTER_4_INSTRUCTIONS_BITMANIPULATION_SLIDES,
];

/** Source-complete Chapter 4 candidate grounded in the exact connected Hodder PDF. */
export const CHAPTER_4_CURRENT_DRAFT = {
  ...CHAPTER_4_DRAFT,
  sourceNote: 'Source-grounded from the exact connected Hodder 9618 Coursebook. Printed pp.107–135 are implemented; the chapter closes on p.135.',
  coverage: 'Source-complete through p.135: processor architecture, registers and buses; ports; fetch-execute cycle and interrupts; assembly/machine code and two-pass assembly; Tables 4.4–4.11; addressing modes; both simple assembly worked traces; Activities 4A–4C; binary shifts and masking for monitoring/control; and end-of-chapter Questions 1–5.',
  slides: CHAPTER_4_CURRENT_SLIDES,
};
