/*
 * Exact teaching phrases that are visually emphasised in the supplied PDFs but
 * were lost when earlier inventories compressed a page into paraphrased detail.
 *
 * These are additive: the original atom lines remain intact. The Lesson Studio
 * source-atom layer renders these additions on the same target lesson screen,
 * so source fidelity and learner visibility share one contract.
 */
export const SOURCE_ATOM_VISIBLE_SOURCE_ADDITIONS: Readonly<Record<string, readonly string[]>> = {
  'ch1-p18-file-vector-detail': [
    'Comparison between vector graphics and bit-map images',
    'Vector graphic images',
    'Bit-map images',
  ],
  'ch1-p21-file-compression-keyterms': [
    'MPEG-3 (MP3) and MPEG-4 (MP4)',
    'MPEG-3 (MP3) uses technology known as audio compression to convert music and other sounds into an MP3 file format.',
  ],
  'ch1-p22-file-codec-rle-detail': [
    'MPEG-4 (MP4) files are slightly different to MP3 files.',
    'Run-length encoding (RLE)',
  ],
  'ch13-p20-file-precision-range-extremes': [
    'Precision versus range',
    'The maximum positive number which can be stored is: 01111111 01111111 = 127/128 × 2^127',
    'The smallest positive number which can be stored is: 01000000 10000000 = 1/2 × 2^−128',
    'The smallest magnitude negative number which can be stored is: 10111111 10000000 = −65/128 × 2^−128',
    'The largest magnitude negative number which can be stored is: 10000000 01111111 = −1 × 2^127',
  ],
};
