import type { Chapter7SourceAtom } from './chapter7-source-atoms';

/**
 * Extra activity-level source atoms for places where merely naming the Activity
 * would be too weak. These preserve the textbook's actual prompts, values and
 * expected-result relationships for the test-data sequence on pp.281–282.
 */
export const CHAPTER_7_SOURCE_ACTIVITY_ATOMS: Chapter7SourceAtom[] = [
  {
    id: 'ch7-p281-activity78-exact',
    printedPage: 281,
    kind: 'activity',
    sourceRef: 'Activity 7.8',
    targetSlideId: 'ch7-book-76-activity78',
    needles: [
      'Explain why the following input data also needs to be verified',
      'Entering a telephone number',
      'Entering a pupil’s name',
      'Entering a part number in the form XXX999, when X must be a letter and 9 must be a digit',
    ],
  },
  {
    id: 'ch7-p281-normal-example-activity79-exact',
    printedPage: 281,
    kind: 'activity',
    sourceRef: 'Normal-data example · Activity 7.9',
    targetSlideId: 'ch7-book-76-normal',
    needles: [
      'ten end-of-term examinations',
      'percentage marks entered as whole numbers',
      'Normal test data: 50, 50, 50, 50, 50, 50, 50, 50, 50, 50',
      'Expected result: 50',
      'Activity 7.9: provide a more realistic set of test data and its expected result',
    ],
  },
  {
    id: 'ch7-p282-abnormal-activity710-exact',
    printedPage: 282,
    kind: 'activity',
    sourceRef: 'Abnormal-data example · Activity 7.10',
    targetSlideId: 'ch7-book-76-abnormal',
    needles: [
      'Erroneous/abnormal data: -12, eleven',
      'Expected results: both values should be rejected',
      'Activity 7.10: provide some more erroneous/abnormal data and its expected results',
    ],
  },
  {
    id: 'ch7-p282-extreme-boundary-activity711-exact',
    printedPage: 282,
    kind: 'activity',
    sourceRef: 'Extreme/boundary examples · Activity 7.11',
    targetSlideId: 'ch7-book-76-extreme-boundary',
    needles: [
      'Extreme data: 0, 100',
      'Expected results: 0 and 100 should be accepted',
      'Boundary data for 0: -1, 0',
      'Expected results: -1 rejected, 0 accepted',
      'Activity 7.11: provide boundary data for the upper end of the 0–100 whole-number range',
      'end-of-term examinations are now marked out of 20',
      'provide two normal sets, abnormal data, two boundary sets and expected results',
    ],
  },
];
