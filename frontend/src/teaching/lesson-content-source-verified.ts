import { SOURCE_COMPLETE_CHAPTER_1, SOURCE_COMPLETE_CHAPTER_13 } from './lesson-content-source-fidelity';
import type { HodderLessonChapter, LessonRichBlock } from './lesson-content-hodder-types';

const exactFigure18: LessonRichBlock = {
  kind:'figure',
  figure:{
    kind:'grid',
    title:'Figure 1.8 reconstructed · exact four-colour RGB run pattern',
    rows:[
      'BBGGGGBB',
      'BWWWWWWB',
      'GGRRRRGG',
      'GGWRRWGG',
      'GGRRRRGG',
      'GGWWWWGG',
      'BWWRRWWB',
      'BBGGGGBB',
    ],
    legend:[
      {symbol:'B',label:'black · 0,0,0'},
      {symbol:'W',label:'white · 255,255,255'},
      {symbol:'G',label:'green · 0,255,0'},
      {symbol:'R',label:'red · 255,0,0'},
    ],
    caption:'Exact 8 × 8 reconstruction from Hodder Figure 1.8. The source compares 192 uncompressed RGB values with 92 RLE values.',
  },
};

const applyVerifiedSourceCorrections=(chapter:HodderLessonChapter):HodderLessonChapter=>({
  ...chapter,
  slides:chapter.slides.map(slide=>{
    if(slide.id!=='h1-rle-images')return slide;
    let replaced=false;
    const richBlocks=(slide.richBlocks??[]).map(block=>{
      if(block.kind==='figure'&&block.figure.kind==='grid'&&block.figure.title.startsWith('Figure 1.8')){
        replaced=true;
        return exactFigure18;
      }
      return block;
    });
    if(!replaced)throw new Error('Missing Figure 1.8 source-fidelity block');
    return {
      ...slide,
      richBlocks,
      sourceElements:[...(slide.sourceElements??[]),'Figure 1.8 exact source-verified 8 × 8 pattern'],
    };
  }),
});

export const SOURCE_VERIFIED_CHAPTER_1=applyVerifiedSourceCorrections(SOURCE_COMPLETE_CHAPTER_1);
export const SOURCE_VERIFIED_CHAPTER_13=SOURCE_COMPLETE_CHAPTER_13;
