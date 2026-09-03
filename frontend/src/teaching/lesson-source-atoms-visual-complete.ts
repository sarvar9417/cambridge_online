import type { LessonSourceAtom } from './lesson-source-atoms';

export const VISUAL_COMPLETE_SOURCE_ATOMS: LessonSourceAtom[] = [
  { id:'ch1-p16-figures-1-1-1-2', chapter:1, page:16, kind:'figure', sourceRef:'Figures 1.1–1.2', targetSlideId:'h1-bitmap-resolution', needles:['4096 × 3192','1920 × 1080','cropped','rotated through 90°'] },
  { id:'ch1-p16-extension-1b', chapter:1, page:16, kind:'extension', sourceRef:'Extension Activity 1B', targetSlideId:'h1-bitmap-resolution', needles:['HTML','colour of each pixel','web page screen layout'] },
  { id:'ch1-p17-figure-1-3', chapter:1, page:17, kind:'figure', sourceRef:'Figure 1.3', targetSlideId:'h1-bitmap-resolution', needles:['1024 × 798','A · original','E · enlarged','pixelated'] },
  { id:'ch1-p17-extension-1c', chapter:1, page:17, kind:'extension', sourceRef:'Extension Activity 1C', targetSlideId:'h1-bitmap-size', needles:['UHD television','Calculate the file size'] },
  { id:'ch1-p18-figure-1-4', chapter:1, page:18, kind:'figure', sourceRef:'Figure 1.4', targetSlideId:'h1-122-vector', needles:['robot','geometric shapes','drawing list'] },
  { id:'ch1-p14-table-1-6', chapter:1, page:14, kind:'table', sourceRef:'Table 1.6', targetSlideId:'h1-115-unicode', needles:['Extended ASCII','128','255','80','FF'] },
  { id:'ch1-p15-table-1-7', chapter:1, page:15, kind:'table', sourceRef:'Table 1.7', targetSlideId:'h1-115-unicode', needles:['Unicode','Russian','Greek','Romanian','Croatian'] },
  { id:'ch1-p18-table-1-8', chapter:1, page:18, kind:'table', sourceRef:'Table 1.8', targetSlideId:'h1-bitmap-vector-choice', needles:['geometric shapes','pixels','file size','realistic','.svg','.jpeg'] },
  { id:'ch1-p22-extension-1d', chapter:1, page:22, kind:'extension', sourceRef:'Extension Activity 1D', targetSlideId:'h1-131-mp3-jpeg', needles:['photograph','without noticeably reducing','run-length encoding'] },
];
