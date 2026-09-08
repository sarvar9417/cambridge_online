import type { PdfFirstSourceSegment } from './pdf-first-source-types';

export const PDF_FIRST_SECTION_7_4_B: readonly PdfFirstSourceSegment[] = [
  {"chapter":7,"pdfPage":19,"printedPage":276,"section":"7.4","part":1,"blocks":["7 Algorithm design and problem solving","For example, the bubble sort algorithm can be used to sort a list of ten temperatures stored in the array, Temperature[], into ascending order. It could be written in pseudocode as:","First ← 1","Last ← 10","REPEAT","Swap ← FALSE","FOR Index ← First TO Last - 1","IF Temperature[Index] > temperature[Index + 1]","THEN","Temp ← Temperature[Index]","Temperature[Index] ← Temperature[Index + 1]","Temperature[Index + 1] ← Temp","Swap ← TRUE","The IF..THEN condition checks if temperatures are in ascending order and swaps them if they are not, using the Temp variable (short for temporary)","ENDIF","NEXT Index","Last ← Last - 1","UNTIL (NOT Swap) OR Last = 1"]},
];
