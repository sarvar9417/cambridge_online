export type RawPdfSemanticDetailAnchor = {
  id: string;
  page: number;
  printedPage: number;
  lineCount: number;
};

/**
 * Independent inventory contract for the unbolded/source-detail semantic layer
 * curated from the three exact teacher-supplied PDF extracts.
 *
 * The actual source wording stays in the source-detail atom modules. This file
 * deliberately stores only immutable identity/page/count evidence so the
 * semantic audit cannot silently shrink when an atom or one of its teaching
 * lines is deleted from those modules.
 */
export const RAW_PDF_SEMANTIC_DETAIL_BASELINE = {
  1: [
    ['ch1-p1-file-objectives',1,1,13],
    ['ch1-p2-file-keyterms',2,2,11],
    ['ch1-p2-file-number-model',2,2,6],
    ['ch1-p3-file-conversion-complements',3,3,6],
    ['ch1-p4-file-signed-examples',4,4,5],
    ['ch1-p5-file-overflow-subtraction',5,5,6],
    ['ch1-p6-file-example-memory',6,6,4],
    ['ch1-p7-file-prefix-tables',7,7,5],
    ['ch1-p7-file-hex-weights',7,7,4],
    ['ch1-p8-file-hex-table',8,8,5],
    ['ch1-p9-file-hex-memorydump',9,9,4],
    ['ch1-p10-file-memorydump-table',10,10,8],
    ['ch1-p10-file-bcd-map',10,10,4],
    ['ch1-p11-file-bcd-use-correction',11,11,6],
    ['ch1-p12-file-bcd-ascii-history',12,12,5],
    ['ch1-p13-file-ascii-table',13,13,7],
    ['ch1-p14-file-unicode-detail',14,14,6],
    ['ch1-p15-file-multimedia-keyterms',15,15,12],
    ['ch1-p16-file-bitmap-detail',16,16,6],
    ['ch1-p17-file-scaling-size-detail',17,17,6],
    ['ch1-p18-file-vector-detail',18,18,7],
    ['ch1-p19-file-sound-physics',19,19,6],
    ['ch1-p20-file-sampling-editing-video',20,20,9],
    ['ch1-p21-file-compression-keyterms',21,21,10],
    ['ch1-p22-file-codec-rle-detail',22,22,8],
    ['ch1-p23-file-rle-detail',23,23,6],
    ['ch1-p24-file-colour-rle-general',24,24,5],
    ['ch1-p25-file-review-scope',25,25,3],
    ['ch1-p26-file-review-scope',26,26,4],
  ],
  13: [
    ['ch13-p1-file-objectives',1,304,12],
    ['ch13-p2-file-keyterms-enum',2,305,10],
    ['ch13-p3-file-pointer-detail',3,306,6],
    ['ch13-p4-file-composite-detail',4,307,6],
    ['ch13-p5-file-keyterms-serial',5,308,9],
    ['ch13-p6-file-org-access-detail',6,309,6],
    ['ch13-p7-file-access-hash-detail',7,310,7],
    ['ch13-p8-file-collision-detail',8,311,6],
    ['ch13-p9-file-prior-full',9,312,7],
    ['ch13-p10-file-float-keyterms',10,313,8],
    ['ch13-p11-file-example131-detail',11,314,4],
    ['ch13-p12-file-example132133-detail',12,315,4],
    ['ch13-p13-file-negative-float-detail',13,316,5],
    ['ch13-p14-file-activity13f-example135',14,317,4],
    ['ch13-p15-file-example135136-detail',15,318,5],
    ['ch13-p16-file-example136137-detail',16,319,5],
    ['ch13-p17-file-activity13g-approx',17,320,5],
    ['ch13-p18-file-588-detail',18,321,6],
    ['ch13-p19-file-normalisation-rules',19,322,6],
    ['ch13-p20-file-precision-range-extremes',20,323,7],
    ['ch13-p21-file-allocation-rounding',21,324,6],
    ['ch13-p22-file-over-under-zero-detail',22,325,5],
    ['ch13-p23-file-review-detail',23,326,4],
    ['ch13-p24-file-review-detail',24,327,6],
  ],
  7: [
    ['ch7-p258-full-objectives-maintenance',258,258,12],
    ['ch7-p259-findout-dressed',259,259,2],
    ['ch7-p260-findout-systems',260,260,3],
    ['ch7-p262-findout-teeth',262,262,2],
    ['ch7-p268-findout-program',268,268,2],
    ['ch7-p269-array-link',269,269,2],
    ['ch7-p278-typecheck-links',278,278,2],
    ['ch7-p279-isbn-findout',279,279,5],
    ['ch7-p280-parity-link',280,280,2],
    ['ch7-p291-findout-programs',291,291,3],
    ['ch7-p295-exam-q1-q2',295,295,2],
    ['ch7-p295-exam-q3',295,295,5],
    ['ch7-p295-exam-q4-q5',295,295,3],
    ['ch7-p296-exam-q6-flow',296,296,7],
    ['ch7-p297-exam-q6-data',297,297,5],
    ['ch7-p297-exam-q7',297,297,6],
    ['ch7-p297-298-exam-q8',298,298,6],
    ['ch7-p298-exam-q9',298,298,4],
  ],
} as const satisfies Record<1|7|13, readonly (readonly [string,number,number,number])[]>;

export const rawPdfSemanticDetailsForChapter = (chapter:1|7|13): RawPdfSemanticDetailAnchor[] =>
  RAW_PDF_SEMANTIC_DETAIL_BASELINE[chapter].map(([id,page,printedPage,lineCount]) => ({id,page,printedPage,lineCount}));

export const RAW_PDF_SEMANTIC_DETAIL_COUNTS = {
  1: RAW_PDF_SEMANTIC_DETAIL_BASELINE[1].length,
  7: RAW_PDF_SEMANTIC_DETAIL_BASELINE[7].length,
  13: RAW_PDF_SEMANTIC_DETAIL_BASELINE[13].length,
} as const;
