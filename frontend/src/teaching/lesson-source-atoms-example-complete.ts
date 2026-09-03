import type { LessonSourceAtom } from './lesson-source-atoms';

export const EXAMPLE_COMPLETE_SOURCE_ATOMS: LessonSourceAtom[] = [
  { id:'ch1-p8-example-1-5', chapter:1, page:8, kind:'example', sourceRef:'Example 1.5', targetSlideId:'h1-113-hex', needles:['101111100001','BE1'] },
  { id:'ch1-p8-example-1-6', chapter:1, page:8, kind:'example', sourceRef:'Example 1.6', targetSlideId:'h1-113-hex', needles:['10000111111101','21FD'] },
  { id:'ch1-p9-example-1-7', chapter:1, page:9, kind:'example', sourceRef:'Example 1.7', targetSlideId:'h1-113-hex', needles:['45A','010001011010'] },
  { id:'ch1-p9-example-1-8', chapter:1, page:9, kind:'example', sourceRef:'Example 1.8', targetSlideId:'h1-113-hex', needles:['BF08','1011111100001000'] },
  { id:'ch13-p19-example-13-8', chapter:13, page:19, kind:'example', sourceRef:'Example 13.8', targetSlideId:'h13-normalisation', needles:['0.0011100 00000101','0.1110000 00000011'] },
  { id:'ch13-p19-example-13-9', chapter:13, page:19, kind:'example', sourceRef:'Example 13.9', targetSlideId:'h13-normalisation', needles:['1.1101100 00001010','1.0110000 00001000'] },
];
