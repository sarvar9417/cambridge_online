import { CHAPTER_2_COMPLETE, withChapter2SourceFingerprints } from './lesson-content-chapter2-fidelity';
import { withChapter2EssentialTerms } from './chapter2-essential-terms';
import type { Chapter2Lesson } from './lesson-content-chapter2';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

const currentCheckpoint = (
  id: string,
  section: string,
  subtopicCode: '2.1' | '2.2',
  title: string,
  learningObjectiveCodes: string[],
  sourcePage: number,
  accent: HodderLessonSlide['accent'],
): HodderLessonSlide => ({
  id,
  section,
  subtopicCode,
  eyebrow: 'CAMBRIDGE CHECKPOINT · CURRENT 2026–2028 TARGET',
  title,
  lead: 'Work through approved Cambridge 9618 questions matched to the current 2026–2028 learning objectives. Earlier papers are included only through explicit equivalent/subtopic-compatible mappings; verified 2026 questions can match the current target directly.',
  learningObjectiveCodes,
  checkpointLabel: learningObjectiveCodes.join(' · '),
  checkpointSyllabusCode: '9618',
  checkpointYearFrom: 2021,
  checkpointYearTo: 2026,
  sourcePages: [sourcePage],
  sourceLabel: 'Cambridge 9618 · 2.1 Networks including the internet · current target',
  sourceElements: [
    'Current 2026–2028 2.1 learning objectives',
    'Explicit compatibility graph → approved 2021–2026 past-paper leaves',
  ],
  examPractice: true,
  accent,
});

const networkingCheckpoint = currentCheckpoint(
  'h2-cp-networking-full',
  '2.1 Networking',
  '2.1',
  'Cambridge checkpoint: networking devices, models, topologies, cloud, wired/wireless, Ethernet and bit streaming',
  ['2.1.1', '2.1.2', '2.1.3', '2.1.4', '2.1.5', '2.1.6', '2.1.7', '2.1.8', '2.1.9', '2.1.10', '2.1.11'],
  53,
  'indigo',
);

const internetCheckpoint = currentCheckpoint(
  'h2-cp-internet-full',
  '2.2 The internet',
  '2.2',
  'Cambridge checkpoint: internet, IP addresses, DNS and HTML',
  ['2.1.12', '2.1.13', '2.1.14', '2.1.15'],
  67,
  'cyan',
);

const hodderPractice = (
  id: string,
  title: string,
  printedPage: 65 | 66 | 67,
  prompt: string,
  sourceElements: string[],
  accent: HodderLessonSlide['accent'],
): HodderLessonSlide => ({
  id,
  section: 'Chapter 2 · Book practice',
  subtopicCode: printedPage === 65 ? '2.2' : '2.1',
  eyebrow: `HODDER BOOK PRACTICE · END OF CHAPTER · p.${printedPage}`,
  title,
  lead: 'Attempt independently before revealing or discussing a model. This is source-book practice, kept separate from the live Cambridge checkpoint bank.',
  activity: { title: 'End-of-chapter question', prompt },
  sourcePages: [printedPage],
  sourceLabel: `Hodder Chapter 2 · p.${printedPage} · End of chapter questions`,
  sourceElements: ['End of chapter questions', ...sourceElements],
  accent,
});

/** Hodder pp.65–67, kept as five question groups rather than one overloaded slide. */
export const CHAPTER_2_END_OF_CHAPTER_PRACTICE: readonly HodderLessonSlide[] = [
  hodderPractice(
    'h2-book-eoc-q1',
    'Q1 · Topologies and network models',
    65,
    'For star and mesh LAN topologies, state one benefit and one drawback of each [4]. Then classify the source descriptions as client-server or peer-to-peer [4]: connectivity is most important; dedicated servers/workstations; no central storage or user authentication; sharing is most important; no central server and each workstation shares files/data; performance/management problems can occur above ten workstations; logged-in users only access manager-authorised resources; centralised backup makes the system more stable.',
    ['Q1(a) star/mesh benefits and drawbacks [4]', 'Q1(b) client-server vs peer-to-peer matching [4]'],
    'indigo',
  ),
  hodderPractice(
    'h2-book-eoc-q2',
    'Q2 · Cabling, satellites and Bluetooth',
    66,
    'Explain the difference between copper and fibre-optic cabling [2], then give two benefits and two drawbacks of both cabling types [4]. Compare GEO, MEO and LEO satellites [3]. Finally explain attenuation [2] and spread-spectrum frequency hopping [2].',
    ['Q2(a) copper vs fibre', 'Q2(b) GEO/MEO/LEO', 'Q2(c) attenuation and spread spectrum'],
    'cyan',
  ),
  hodderPractice(
    'h2-book-eoc-q3',
    'Q3 · Bit streaming',
    66,
    'Explain bit streaming [2]. For a film streamed to a tablet, give two benefits [2] and two potential problems [2]. Explain on-demand bit streaming and real-time bit streaming [4].',
    ['Q3(a) bit streaming', 'Q3(b) benefits/problems', 'Q3(c) on-demand vs real-time'],
    'emerald',
  ),
  hodderPractice(
    'h2-book-eoc-q4',
    'Q4 · Buffer calculation',
    67,
    'A buffer is 2 MiB; lower limit 200 KiB; higher limit 1.8 MiB. Data arrives at 1.5 Mbps and the player consumes 600 kbps. Assume 1 megabit = 1,048,576 bits and 1 kilobit = 1024 bits. Explain why the buffer is needed [2]. Starting with 200 KiB, calculate the amount stored after 2 seconds [4]. Use further time values to determine when the buffer reaches 1.8 MiB [5]. Describe how to allow a 30-minute video to play without frequent pauses [2].',
    ['Q4 buffer 2 MiB', '200 KiB lower limit', '1.8 MiB higher limit', '1.5 Mbps input', '600 kbps playback'],
    'amber',
  ),
  hodderPractice(
    'h2-book-eoc-q5',
    'Q5 · Collision handling and network devices',
    67,
    'Explain data collision [2], describe how CSMA/CD detects collisions [1], and explain how CSMA/CD resolves a collision [2]. Then match gateway, switch, hub, router and bridge to the five source descriptions: packet analysis/routing; connecting different-protocol networks; connecting same-protocol LANs; redirecting only to matching LAN destinations; broadcasting received packets to every device [5].',
    ['Q5(a) data collision and CSMA/CD [5]', 'Q5(b) gateway/switch/hub/router/bridge matching [5]'],
    'rose',
  ),
];

function withSectionEndCheckpoints(slides: readonly HodderLessonSlide[]) {
  const result: HodderLessonSlide[] = [];
  const studySlides = slides
    .filter(slide => !slide.examPractice)
    .map((slide, index) => ({ slide, index }))
    .sort((left, right) => {
      const reviewOrder = (slide: HodderLessonSlide) => {
        if ((slide as { emphasisBoard?: boolean }).emphasisBoard) return 1000;
        if (slide.id === 'h2-review-terms') return 1100;
        if (slide.id === 'h2-review-activity') return 1200;
        return Math.min(...(slide.sourcePages ?? [999]));
      };
      return reviewOrder(left.slide) - reviewOrder(right.slide) || left.index - right.index;
    })
    .map(item => item.slide);

  for (const slide of studySlides) {
    result.push(slide);
    if (slide.id === 'h2-219-real-time') result.push(networkingCheckpoint);
    if (slide.id === 'h2-226-client-server-side') result.push(internetCheckpoint);
  }
  result.push(...CHAPTER_2_END_OF_CHAPTER_PRACTICE);
  return result;
}

/**
 * Final active Chapter 2 route: source-complete presentation content followed
 * by topic-level Cambridge practice and the Hodder end-of-chapter question set.
 */
const chapterWithEssentialTerms = withChapter2EssentialTerms(CHAPTER_2_COMPLETE);

export const CHAPTER_2_FINAL: Chapter2Lesson = {
  ...CHAPTER_2_COMPLETE,
  coverage: `${CHAPTER_2_COMPLETE.coverage} · current 2026–2028 checkpoints query approved 2021–2026 Cambridge papers · Hodder pp.65–67 end-of-chapter questions represented`,
  slides: withChapter2SourceFingerprints(withSectionEndCheckpoints(chapterWithEssentialTerms.slides)),
};
