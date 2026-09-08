export type PdfFirstChapter = 1 | 7 | 13;
export type PdfFirstSectionCode =
  | '1.1' | '1.2' | '1.3'
  | '7.1' | '7.2' | '7.3' | '7.4' | '7.5' | '7.6' | '7.7' | '7.8' | '7.9'
  | '13.1' | '13.2' | '13.3';

export type PdfFirstSourceSegment = {
  chapter: PdfFirstChapter;
  pdfPage: number;
  printedPage: number;
  section: PdfFirstSectionCode;
  part: number;
  blocks: string[];
};
