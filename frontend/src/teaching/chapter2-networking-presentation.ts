import type { LessonPresentationBeat } from './lesson-experience-model';

type LessonFrame = {
  number: 1 | 2 | 3 | 4;
  boundary?: string;
  title: string;
  question: string;
  pages: number[];
  objectives: string[];
  starter: string;
  recap: string[];
};

const LESSONS: readonly LessonFrame[] = [
  {
    number: 1,
    title: 'Why build a network?',
    question: 'How do network scale, ownership and layout change the way devices communicate?',
    pages: [27,28,29,30,31,32,33,34,35,36,37,38],
    objectives: [
      'Explain why organisations connect computers and identify the infrastructure required.',
      'Distinguish PAN, LAN, MAN and WAN by scale and purpose.',
      'Compare client-server and peer-to-peer networks, including thin and thick clients.',
      'Select and justify bus, star, mesh or hybrid topology for a scenario.',
    ],
    starter: 'Your school loses its network for one hour. Which services stop first, and which could continue locally?',
    recap: [
      'Explain two benefits and two drawbacks of networking computers.',
      'Choose LAN, MAN or WAN for a university with buildings across one city and justify the choice.',
      'Explain why a client-server network is easier to secure than a peer-to-peer network.',
      'Recommend a topology for a small office and defend your decision.',
    ],
  },
  {
    number: 2,
    boundary: 'h2-215-cloud',
    title: 'How should the network connect?',
    question: 'Which cloud, cable and wireless choices best fit a real organisation?',
    pages: [39,40,41,42,43,44,45],
    objectives: [
      'Compare public, private and hybrid cloud computing and explain data redundancy.',
      'Compare twisted-pair, coaxial and fibre-optic cable.',
      'Explain bandwidth, penetration and attenuation for wireless transmission.',
      'Explain Wi-Fi, Bluetooth and spread spectrum frequency hopping.',
    ],
    starter: 'A hospital needs mobile tablets, reliable patient records and strong privacy. Which connections should be wired, wireless or cloud based?',
    recap: [
      'Explain why a private cloud may suit sensitive medical records.',
      'Select a cable for a long, high-bandwidth link and justify the choice.',
      'Explain how Bluetooth frequency hopping reduces interference.',
      'Choose wired, Wi-Fi or Bluetooth communication for a scenario and justify the choice.',
    ],
  },
  {
    number: 3,
    boundary: 'h2-216-wnic',
    title: 'What does each network device do?',
    question: 'Follow one packet through the hardware and explain every decision it meets.',
    pages: [45,46,47,48,49,50],
    objectives: [
      'Contrast how a hub and a switch distribute a packet.',
      'Explain why repeaters and bridges are used in larger networks.',
      'Explain routing between networks and protocol conversion at a gateway.',
      'Explain the roles of modems, softmodems, NICs and WNICs, including WNIC operating modes.',
    ],
    starter: 'A packet must travel from a laptop on one LAN to a server on another network. Name every device it may pass through.',
    recap: [
      'Describe what happens to the same packet when it enters a hub and when it enters a switch.',
      'Explain why a repeater cannot decide which signal should be boosted.',
      'Distinguish a bridge, router and gateway by the networks they connect.',
      'Trace the complete path from a wireless laptop to the internet.',
    ],
  },
  {
    number: 4,
    boundary: 'h2-218-ethernet',
    title: 'How does data move reliably?',
    question: 'How do Ethernet and buffering keep shared links and streamed media usable?',
    pages: [50,51,52,53],
    objectives: [
      'Describe nodes, media and frames in an Ethernet LAN.',
      'Explain IP conflicts and how CSMA/CD handles collisions.',
      'Explain bit rate, bit streaming and buffering.',
      'Compare real-time and on-demand streaming.',
    ],
    starter: 'Two computers transmit on the same shared medium at exactly the same time. Predict what each device must do next.',
    recap: [
      'Explain the complete CSMA/CD cycle after a collision is detected.',
      'State why random waiting reduces the chance of another collision.',
      'Explain why a stream pauses when its buffer empties.',
      'Compare a live video call with an on-demand film using latency, buffering and storage.',
    ],
  },
] as const;

function frame(
  lesson: LessonFrame,
  suffix: 'cover' | 'objectives' | 'starter' | 'recap',
): LessonPresentationBeat {
  const common = {
    id: `h2n-l${lesson.number}-${suffix}`,
    slideId: `h2n-l${lesson.number}-${suffix}`,
    eyebrow: `LESSON ${lesson.number} OF 4 · CHAPTER 2.1 NETWORKING`,
    sourcePages: lesson.pages,
    showSource: false,
    visual: 'networking' as const,
  };
  if (suffix === 'cover') return {
    ...common,
    kind: 'concept',
    sceneRole: 'hook',
    title: lesson.title,
    lead: lesson.question,
  };
  if (suffix === 'objectives') return {
    ...common,
    kind: 'key-idea',
    sceneRole: 'objective',
    title: 'Learning objectives',
    bullets: lesson.objectives,
  };
  if (suffix === 'starter') return {
    ...common,
    kind: 'check',
    sceneRole: 'challenge',
    title: 'Starter: think, pair, share',
    prompt: lesson.starter,
  };
  return {
    ...common,
    kind: 'check',
    sceneRole: 'recap',
    title: `Lesson ${lesson.number} retrieval check`,
    bullets: lesson.recap,
  };
}

function opening(lesson: LessonFrame) {
  return [frame(lesson,'cover'),frame(lesson,'objectives'),frame(lesson,'starter')];
}

/**
 * Turns the complete source-backed 2.1 sequence into four teachable classroom
 * decks while retaining the source-completeness appendix after the final recap.
 */
export function frameChapter2NetworkingPresentation(
  teaching: LessonPresentationBeat[],
  appendix: LessonPresentationBeat[],
) {
  const result: LessonPresentationBeat[] = [...opening(LESSONS[0])];
  let active = 0;
  const inserted = new Set<number>([0]);

  for (const beat of teaching) {
    const nextIndex = LESSONS.findIndex((lesson,index)=>index>0&&lesson.boundary===beat.slideId);
    if (nextIndex > active && !inserted.has(nextIndex)) {
      result.push(frame(LESSONS[active]!,'recap'),...opening(LESSONS[nextIndex]!));
      inserted.add(nextIndex);
      active = nextIndex;
    }
    result.push(beat);
  }

  result.push(frame(LESSONS[active]!,'recap'));
  if (appendix.length) result.push({
    id: 'h2n-reference-appendix',
    slideId: 'h2n-reference-appendix',
    kind: 'source',
    sceneRole: 'recap',
    eyebrow: 'CHAPTER 2.1 · OPTIONAL REFERENCE',
    title: 'Coursebook vocabulary and source-detail appendix',
    lead: 'Use the following screens for targeted revision, vocabulary checks or additional explanation. The four main lessons end before this appendix.',
    sourcePages: [27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53],
    showSource: false,
    visual: 'networking',
  },...appendix);
  return result;
}

export const CHAPTER_2_NETWORKING_LESSON_COUNT = LESSONS.length;
