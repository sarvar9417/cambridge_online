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

const NETWORKING_LESSONS: readonly LessonFrame[] = [
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

const INTERNET_LESSONS: readonly LessonFrame[] = [
  {
    number: 1,
    title: 'Internet, web and long-distance communication',
    question: 'How do devices reach internet services and how does internet communication differ from traditional telephony?',
    pages: [54,55,56],
    objectives: [
      'Distinguish the internet from the World Wide Web.',
      'Trace the hardware path from a user device through an ISP to a destination server.',
      'Compare PSTN circuit switching with VoIP packet switching.',
      'Compare GEO, MEO and LEO satellites by orbit, period and use.',
    ],
    starter: 'You open a web page and then start a voice call over the internet. Which parts of the communication path are shared, and which are different?',
    recap: [
      'Explain the difference between the internet and the World Wide Web.',
      'Trace a request from a home device to a remote website server.',
      'Compare PSTN and VoIP in terms of switching, connection use and transmitted data.',
      'Select GEO, MEO or LEO for a stated communication purpose and justify the choice.',
    ],
  },
  {
    number: 2,
    boundary: 'h2-223-ipv4',
    title: 'How are internet hosts addressed?',
    question: 'How do IPv4, CIDR and IPv6 identify hosts while coping with a growing internet?',
    pages: [56,57,58],
    objectives: [
      'Explain the 32-bit structure of IPv4 and the purpose of netID and hostID.',
      'Interpret the coursebook IPv4 class examples and binary address form.',
      'Explain why CIDR changes the netID/hostID boundary.',
      'Explain the 128-bit hexadecimal structure of IPv6 and apply zero compression correctly.',
    ],
    starter: 'Why can a 32-bit address space become a problem even when many individual organisations use only a small fraction of their allocated addresses?',
    recap: [
      'Explain why IPv4 uses four 8-bit groups.',
      'Identify netID and hostID information in the coursebook class examples.',
      'Explain what the /18 means in 192.30.250.00/18.',
      'State why :: can be used only once in a compressed IPv6 address.',
    ],
  },
  {
    number: 3,
    boundary: 'h2-223-subnetting',
    title: 'How can one network be divided safely and efficiently?',
    question: 'How do subnetting, masks, private addresses and public addresses organise network communication?',
    pages: [58,59,60],
    objectives: [
      'Explain why subnetting can reduce traffic and hide overall network complexity.',
      'Use the Hodder university example to relate subnet bits, host bits and department netIDs.',
      'Explain how an AND mask is used to obtain the netID from an IPv4 address.',
      'Distinguish private and public IP addresses and explain the role of NAT.',
    ],
    starter: 'A university has eight departments on one network. What problems might appear if every device remains in one undivided address space?',
    recap: [
      'Explain how three subnet bits can create eight department subnets.',
      'Describe the purpose of an AND mask in subnetting.',
      'State the three private IPv4 ranges shown in the coursebook.',
      'Explain why a private-IP device is not directly reachable from the public internet.',
    ],
  },
  {
    number: 4,
    boundary: 'h2-224-urls',
    title: 'How does a browser find and run a web resource?',
    question: 'How do URLs, DNS, HTML and client/server-side scripting work together when a user requests a web page?',
    pages: [60,61,62,63,64],
    objectives: [
      'Break a URL into protocol, website address, path and resource.',
      'Explain the complete five-step DNS process, including caching and the later website-server connection.',
      'Explain how HTML tags structure a web page and how a browser interprets downloaded HTML.',
      'Distinguish client-side JavaScript from server-side PHP using the Hodder examples.',
    ],
    starter: 'A browser can display a site when you type a domain name, even though network communication ultimately uses an IP address. What service closes that gap?',
    recap: [
      'Label the protocol, website address and path in a URL.',
      'Reconstruct all five steps of the Hodder DNS example in the correct order.',
      'Explain the role of HTML in a downloaded web page.',
      'Compare where JavaScript and PHP execute and what is sent back to the requesting computer.',
    ],
  },
] as const;

function frame(
  lesson: LessonFrame,
  prefix: 'h2n' | 'h2i',
  topicLabel: string,
  suffix: 'cover' | 'objectives' | 'starter' | 'recap',
): LessonPresentationBeat {
  const common = {
    id: `${prefix}-l${lesson.number}-${suffix}`,
    slideId: `${prefix}-l${lesson.number}-${suffix}`,
    eyebrow: `LESSON ${lesson.number} OF 4 · ${topicLabel}`,
    sourcePages: lesson.pages,
    showSource: false,
    visual: prefix === 'h2n' ? ('networking' as const) : ('internet' as const),
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

function opening(lesson: LessonFrame, prefix:'h2n'|'h2i', topicLabel:string) {
  return [
    frame(lesson,prefix,topicLabel,'cover'),
    frame(lesson,prefix,topicLabel,'objectives'),
    frame(lesson,prefix,topicLabel,'starter'),
  ];
}

function frameLessonSequence(
  teaching: LessonPresentationBeat[],
  appendix: LessonPresentationBeat[],
  lessons: readonly LessonFrame[],
  prefix:'h2n'|'h2i',
  topicLabel:string,
) {
  const result: LessonPresentationBeat[] = [...opening(lessons[0]!,prefix,topicLabel)];
  let active = 0;
  const inserted = new Set<number>([0]);

  for (const beat of teaching) {
    const nextIndex = lessons.findIndex((lesson,index)=>index>0&&lesson.boundary===beat.slideId);
    if (nextIndex > active && !inserted.has(nextIndex)) {
      result.push(frame(lessons[active]!,prefix,topicLabel,'recap'),...opening(lessons[nextIndex]!,prefix,topicLabel));
      inserted.add(nextIndex);
      active = nextIndex;
    }
    result.push(beat);
  }

  result.push(frame(lessons[active]!,prefix,topicLabel,'recap'));
  if (appendix.length) result.push({
    id: `${prefix}-reference-appendix`,
    slideId: `${prefix}-reference-appendix`,
    kind: 'source',
    sceneRole: 'recap',
    eyebrow: `${topicLabel} · OPTIONAL REFERENCE`,
    title: 'Coursebook vocabulary and source-detail appendix',
    lead: 'Use the following screens for targeted revision, vocabulary checks or additional explanation. The four main lessons end before this appendix.',
    sourcePages: [...new Set(lessons.flatMap(lesson=>lesson.pages))],
    showSource: false,
    visual: prefix === 'h2n' ? 'networking' : 'internet',
  },...appendix);
  return result;
}

/**
 * Turns the complete source-backed 2.1 sequence into four teachable classroom
 * decks while retaining the source-completeness appendix after the final recap.
 */
export function frameChapter2NetworkingPresentation(
  teaching: LessonPresentationBeat[],
  appendix: LessonPresentationBeat[],
) {
  return frameLessonSequence(
    teaching,
    appendix,
    NETWORKING_LESSONS,
    'h2n',
    'CHAPTER 2.1 NETWORKING',
  );
}

/**
 * Turns Hodder 2.2 (pp.54–64) into four classroom-ready decks. The source
 * sequence remains authoritative: framing only inserts lesson covers,
 * objectives, retrieval starters and recaps around the existing source-backed
 * beats.
 */
export function frameChapter2InternetPresentation(
  teaching: LessonPresentationBeat[],
  appendix: LessonPresentationBeat[],
) {
  return frameLessonSequence(
    teaching,
    appendix,
    INTERNET_LESSONS,
    'h2i',
    'CHAPTER 2.2 THE INTERNET',
  );
}

export const CHAPTER_2_NETWORKING_LESSON_COUNT = NETWORKING_LESSONS.length;
export const CHAPTER_2_INTERNET_LESSON_COUNT = INTERNET_LESSONS.length;
