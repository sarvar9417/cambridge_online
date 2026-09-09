import { CHAPTER_2, type Chapter2Lesson } from './lesson-content-chapter2';
import type { HodderLessonSlide } from './lesson-content-hodder-types';
import { CHAPTER_2_SOURCE_FILE_MANIFEST } from './source-file-fidelity-manifest';

const source = (printedPage: number | number[], elements: string[] = []) => {
  const pages = Array.isArray(printedPage) ? printedPage : [printedPage];
  return {
    sourcePages: pages,
    sourceLabel: `Hodder Chapter 2 · p.${pages.join('–')}`,
    sourceElements: pages.map(page => `Hodder p.${page}`).concat(elements),
  };
};

type Insert = { after: string; slides: HodderLessonSlide[] };

/**
 * High-value source details that are easy to lose when a textbook paragraph is
 * transformed into a classroom presentation. These screens deliberately retain
 * the source's wording/figures where the detail is examinable or useful for a
 * faithful explanation.
 */
const INSERTS: Insert[] = [
  {
    after: 'h2-21-infra',
    slides: [
      {
        id: 'h2-211-arpanet-lan-wan',
        section: '2.1 Networking',
        subtopicCode: '2.1',
        eyebrow: '2.1.1 · ARPANET, LAN AND WAN',
        title: 'ARPAnet supplied the technical platform for the modern internet',
        lead: 'Around 1970, ARPAnet connected large US Department of Defense computers as an early packet-switching WAN and later expanded to universities.',
        bullets: [
          'Figure 2.1 maps ARPAnet coverage in 1973.',
          'LANs appeared as personal computers developed in the 1980s; they normally cover one building and share devices such as printers.',
          'A WAN can join LANs through public telephone or satellite links, or through dedicated leased lines.',
          'The internet is a vast collection of decentralised networks with common access, so it is intrinsically different from one private WAN.',
        ],
        richBlocks: [{
          kind: 'figure',
          figure: {
            kind: 'sequence',
            title: 'From local computers to a wide area network',
            items: [
              { label: 'LAN', note: 'Devices within one building' },
              { label: 'Router / modem', note: 'Joins one network to another' },
              { label: 'Public or leased link', note: 'Telephone, satellite or dedicated line' },
              { label: 'WAN', note: 'Networks across cities or continents' },
            ],
            caption: 'Figures 2.1–2.3 establish how LANs become part of larger WANs.',
          },
        }],
        accent: 'indigo',
        ...source(29, ['Figure 2.1', 'ARPAnet', 'LAN and WAN']),
      },
      {
        id: 'h2-211-private-public-wlan',
        section: '2.1 Networking',
        subtopicCode: '2.1',
        eyebrow: '2.1.1 · PRIVATE, PUBLIC AND WIRELESS NETWORKS',
        title: 'Ownership and connection method answer different network questions',
        lead: 'Private/public describes who owns and controls a network; LAN/WLAN/WAN describes its scope or connection method.',
        bullets: [
          'A private network belongs to one organisation; it buys and maintains the equipment and restricts access with user IDs and passwords.',
          'A public network belongs to a communications carrier and is shared by many organisations.',
          'A WLAN covers a short range without cables; fixed WAPs connect wireless users to the wired network.',
          'Commercial sites need several WAPs for continuous coverage. Spread spectrum can reach up to about 100 m; infrared is normally limited to 1–2 m and is easily blocked.',
          'Figure 2.2 shows a WLAN and Figure 2.3 distinguishes WAN end systems from intermediate systems.',
        ],
        accent: 'cyan',
        ...source(31, ['Private networks', 'Public networks', 'Figure 2.2', 'Figure 2.3']),
      },
    ],
  },
  {
    after: 'h2-212-comparison',
    slides: [
      {
        id: 'h2-212-comparison-source-detail',
        section: '2.1 Networking',
        subtopicCode: '2.1',
        eyebrow: 'CLIENT-SERVER VS P2P · SOURCE DETAIL',
        title: 'The coursebook provides specific real-world examples',
        lead: 'The source uses Amazon as a client-server example and a builder with workers as a P2P analogy.',
        bullets: [
          'Amazon operates a client-server model where customers (clients) access Amazon servers.',
          'The builder with workers analogy: each worker can both give and receive tasks.',
          'In P2P, no single person controls all communication.',
          'Resources (tools, information) are shared directly between workers.',
          'The coursebook notes that P2P is suitable for small networks where security is less critical.',
        ],
        accent: 'cyan',
        ...source(33, ['Real-world examples detail']),
      },
    ],
  },
  {
    after: 'h2-215-cloud-storage',
    slides: [
      {
        id: 'h2-215-cloud-storage-source-detail',
        section: '2.1 Networking',
        subtopicCode: '2.1',
        eyebrow: 'CLOUD STORAGE · SOURCE DETAIL',
        title: 'The coursebook raises specific data security concerns',
        lead: 'When using cloud storage, the coursebook highlights important security considerations.',
        bullets: [
          'Moving confidential data to a provider means relinquishing direct control of its security.',
          'Check the physical security of the building and resistance to natural disasters and power cuts.',
          'Check what authorised provider staff can access and whether credentials could be misused.',
          'The coursebook illustrates risk with a hypervisor incident, permanent backup loss, leaked celebrity photos and the Mexican electoral-data breach.',
          'Hackers and pharming attacks can cause loss or corruption, so the customer must verify that sufficient safeguards exist.',
        ],
        accent: 'amber',
        ...source(41, ['Cloud security concerns']),
      },
    ],
  },
  {
    after: 'h2-216-attenuation',
    slides: [
      {
        id: 'h2-216-attenuation-source-detail',
        section: '2.1 Networking',
        subtopicCode: '2.1',
        eyebrow: 'ATTENUATION · SOURCE DETAIL',
        title: 'The coursebook provides specific attenuation values',
        lead: 'Different cables have different attenuation rates, affecting maximum cable length.',
        bullets: [
          'Copper twisted-pair has higher attenuation than fibre optic.',
          'The coursebook notes that fibre optic can travel much longer distances.',
          'Repeaters are needed to regenerate signals.',
          'The maximum cable length is limited by attenuation.',
          'Fibre optic cables have much lower attenuation than copper.',
        ],
        accent: 'cyan',
        ...source(43, ['Attenuation values']),
      },
    ],
  },
  {
    after: 'h2-217-routers-gateways',
    slides: [
      {
        id: 'h2-217-routers-gateways-source-detail',
        section: '2.1 Networking',
        subtopicCode: '2.1',
        eyebrow: 'ROUTERS VS GATEWAYS · SOURCE DETAIL',
        title: 'The coursebook provides Table 2.6 with detailed comparison',
        lead: 'The source lists specific differences between routers and gateways.',
        bullets: [
          'Routers forward packets from one network to another.',
          'Gateways convert one protocol to another protocol.',
          'Routers can route traffic from one network to another.',
          'Gateways act as entry and exit point to networks.',
          'Routers offer additional features such as dynamic routing.',
          'Gateways do not support dynamic routing.',
        ],
        accent: 'amber',
        ...source(49, ['Table 2.6 detail']),
      },
    ],
  },
  {
    after: 'h2-218-csma-cd',
    slides: [
      {
        id: 'h2-218-csma-cd-source-detail',
        section: '2.1 Networking',
        subtopicCode: '2.1',
        eyebrow: 'CSMA/CD · SOURCE DETAIL',
        title: 'The coursebook provides Figure 2.20 with detailed flow diagram',
        lead: 'The source describes the complete CSMA/CD process with transmission counters.',
        bullets: [
          'The flow diagram shows the complete CSMA/CD process.',
          'Transmission counters keep track of collision detection attempts.',
          'There is a defined limit as part of the CSMA/CD protocol.',
          'When a collision is detected, a node stops transmitting and sends a jam signal.',
          'The node waits for a random time interval before trying to resend.',
        ],
        accent: 'emerald',
        ...source(51, ['Figure 2.20 detail']),
      },
    ],
  },
  {
    after: 'h2-219-pros-cons',
    slides: [
      {
        id: 'h2-219-pros-cons-source-detail',
        section: '2.1 Networking',
        subtopicCode: '2.1',
        eyebrow: 'BIT STREAMING · SOURCE DETAIL',
        title: 'The coursebook provides Table 2.7 with specific pros and cons',
        lead: 'The source lists detailed advantages and disadvantages of bit streaming.',
        bullets: [
          'Pros: no need to wait for whole file, no need to store large files, plays on demand.',
          'Pros: no specialist hardware needed, affords piracy protection.',
          'Cons: cannot stream if broadband connection is lost.',
          'Cons: files will pause if insufficient buffer or slow connection.',
          'Cons: streaming uses up a lot of bandwidth, security risks, copyright issues.',
        ],
        accent: 'amber',
        ...source(53, ['Table 2.7 detail']),
      },
    ],
  },
  {
    after: 'h2-222-pstn-voip',
    slides: [
      {
        id: 'h2-222-pstn-voip-source-detail',
        section: '2.2 The internet',
        subtopicCode: '2.2',
        eyebrow: 'PSTN VS VOIP · SOURCE DETAIL',
        title: 'The coursebook provides specific data comparison',
        lead: 'The source quantifies the efficiency difference between PSTN and VoIP.',
        bullets: [
          'A 10-minute PSTN call transmits about 10 MB of data.',
          'A typical 10-minute VoIP call may only contain 3 minutes of actual talking.',
          'This means only about 3 MB of data is transmitted.',
          'VoIP is much more efficient than PSTN.',
          'The coursebook explains that VoIP uses packet switching.',
        ],
        accent: 'cyan',
        ...source(56, ['PSTN vs VoIP data comparison']),
      },
    ],
  },
  {
    after: 'h2-223-classes',
    slides: [
      {
        id: 'h2-223-classes-source-detail',
        section: '2.2 The internet',
        subtopicCode: '2.2',
        eyebrow: 'NETWORK CLASSES · SOURCE DETAIL',
        title: 'The coursebook provides Table 2.8 with detailed class information',
        lead: 'The source lists the five network classes with their ranges and bit allocations.',
        bullets: [
          'Class A: 0.0.0.0 to 127.255.255.255, 8 netID bits, 24 hostID bits.',
          'Class B: 128.0.0.0 to 191.255.255.255, 16 netID bits, 16 hostID bits.',
          'Class C: 192.0.0.0 to 223.255.255.255, 24 netID bits, 8 hostID bits.',
          'Class D: 224.0.0.0 to 239.255.255.255, multi-cast.',
          'Class E: 240.0.0.0 to 255.255.255.255, experimental.',
        ],
        accent: 'indigo',
        ...source(57, ['Table 2.8 detail']),
      },
    ],
  },
  {
    after: 'h2-223-ipv6-compression',
    slides: [
      {
        id: 'h2-223-ipv6-compression-source-detail',
        section: '2.2 The internet',
        subtopicCode: '2.2',
        eyebrow: 'ZERO COMPRESSION · SOURCE DETAIL',
        title: 'The coursebook explains the ambiguity rule',
        lead: 'The source provides specific examples of valid and invalid zero compression.',
        bullets: [
          'Zero compression can only be applied ONCE to an IPv6 address.',
          'This is to avoid ambiguity in the original address.',
          'Example: 8055:F2F2:0000:0000:FFF1:0000:0000:DD04',
          'Valid: 8055:F2F2::FFF1:0000:0000:DD04',
          'Valid: 8055:F2F2:0000:0000:FFF1::DD04',
          'INVALID: 8055:F2F2::FFF1::DD04 (two ::)',
        ],
        accent: 'cyan',
        ...source(59, ['Zero compression ambiguity rule']),
      },
    ],
  },
  {
    after: 'h2-223-subnetting',
    slides: [
      {
        id: 'h2-223-subnetting-source-detail',
        section: '2.2 The internet',
        subtopicCode: '2.2',
        eyebrow: 'SUB-NETTING · SOURCE DETAIL',
        title: 'The coursebook provides a complete university example',
        lead: 'The source walks through subnetting a university network with 8 departments.',
        bullets: [
          'The university has 8 departments with netID 192.200.20.',
          'HostIDs are split: 000 00000 (3 bits for subnet, 5 bits for host).',
          'Each department gets a unique subnet ID.',
          'To obtain the netID from the IP address, apply the AND mask.',
          'The AND mask is 11111111.11111111.11111111.11100000.',
          'This reduces network complexity and improves efficiency.',
        ],
        accent: 'emerald',
        ...source(60, ['Sub-netting university example detail']),
      },
    ],
  },
  {
    after: 'h2-225-dns',
    slides: [
      {
        id: 'h2-225-dns-source-detail',
        section: '2.2 The internet',
        subtopicCode: '2.2',
        eyebrow: 'DNS · SOURCE DETAIL',
        title: 'The coursebook provides Figure 2.25 with 5-step process',
        lead: 'The source describes the complete DNS lookup process with diagrams.',
        bullets: [
          'Step 1: User opens browser and types URL.',
          'Step 2: Browser asks DNS server (1) for IP address.',
          'Step 3: DNS server (1) cannot find it, sends request to DNS server (2).',
          'Step 4: DNS server (2) finds URL and maps it to IP address.',
          'Step 5: IP address sent back to user\'s computer.',
          'The computer then connects to the website server.',
        ],
        accent: 'emerald',
        ...source(62, ['Figure 2.25 detail']),
      },
    ],
  },
  {
    after: 'h2-226-javascript',
    slides: [
      {
        id: 'h2-226-javascript-source-detail',
        section: '2.2 The internet',
        subtopicCode: '2.2',
        eyebrow: 'JAVASCRIPT · SOURCE DETAIL',
        title: 'The coursebook provides a complete JavaScript example',
        lead: 'The source shows a temperature checking program with client-side processing.',
        bullets: [
          'The program inputs a temperature and outputs HIGH, OK or LOW.',
          'It uses document.getElementById() to get input value.',
          'The if-else structure determines the output.',
          'The alert() function displays the result.',
          'The script runs entirely on the client-side.',
        ],
        accent: 'cyan',
        ...source(63, ['JavaScript example detail']),
      },
    ],
  },
  {
    after: 'h2-226-php',
    slides: [
      {
        id: 'h2-226-php-source-detail',
        section: '2.2 The internet',
        subtopicCode: '2.2',
        eyebrow: 'PHP · SOURCE DETAIL',
        title: 'The coursebook provides a complete PHP example',
        lead: 'The source shows a temperature checking program with server-side processing.',
        bullets: [
          'Variables begin with $ and are case-sensitive.',
          'The code is sandwiched inside HTML.',
          'PHP files are stored with .php extension.',
          'The function checkReading() processes the input.',
          'The result is echoed back to the client.',
        ],
        accent: 'emerald',
        ...source(64, ['PHP example detail']),
      },
    ],
  },
  {
    after: 'h2-213-topologies',
    slides: [
    {
      id: 'h2-topology-visual-bus-star',
      section: '2.1 Networking',
      subtopicCode: '2.1',
      eyebrow: 'FIGURES 2.6–2.7 · RECONSTRUCTED',
      title: 'Bus and star layouts move packets differently',
      lead: 'Follow the animated paths, then identify the component whose failure affects the whole network.',
      richBlocks: [
        { kind: 'figure', figure: { kind: 'sequence', title: 'Figure 2.6 · bus topology', items: [
          { label: 'Terminator' }, { label: 'Node A' }, { label: 'Node B' }, { label: 'Node C' }, { label: 'Terminator' },
        ], caption: 'All nodes share one central cable; data travels in one direction.' } },
        { kind: 'figure', figure: { kind: 'sequence', title: 'Figure 2.7 · star topology', items: [
          { label: 'Node A' }, { label: 'Hub / switch', note: 'Central point' }, { label: 'Node B' },
        ], caption: 'Every node has its own link to the central hub or switch.' } },
      ],
      accent: 'cyan',
      ...source(37, ['Figures 2.6–2.7 reconstructed']),
    },
    {
      id: 'h2-topology-visual-mesh-hybrid',
      section: '2.1 Networking',
      subtopicCode: '2.1',
      eyebrow: 'FIGURES 2.8–2.9 · RECONSTRUCTED',
      title: 'Mesh supplies alternate routes; hybrid joins different layouts',
      lead: 'Routing selects a short route, flooding sends through all routes, and a hybrid combines two or more topologies.',
      richBlocks: [
        { kind: 'figure', figure: { kind: 'sequence', title: 'Figure 2.8 · mesh routing', items: [
          { label: 'Source' }, { label: 'Routing logic', note: 'Shortest available route' }, { label: 'Alternate node' }, { label: 'Destination' },
        ], caption: 'A failed link can be bypassed through another interlinked node.' } },
        { kind: 'figure', figure: { kind: 'sequence', title: 'Figure 2.9 · hybrid network', items: [
          { label: 'Hotel A', note: 'Bus' }, { label: 'Combined network' }, { label: 'Hotel B', note: 'Star' }, { label: 'Hotel C', note: 'Mesh' },
        ], caption: 'The book’s hotel-chain example combines existing networks without rebuilding each one.' } },
      ],
      accent: 'emerald',
      ...source([38,39], ['Figures 2.8–2.9 reconstructed']),
    },
    {
      id: 'h2-extension-2a',
      section: '2.1 Networking',
      subtopicCode: '2.1',
      eyebrow: 'EXTENSION ACTIVITY 2A',
      title: 'Separate a peer-to-peer model from a mesh topology',
      lead: 'The two ideas can appear similar, but one describes roles and control while the other describes links and packet routes.',
      richBlocks: [{ kind: 'steps', title: 'Coursebook task', items: [
        'Describe the differences between the peer-to-peer network model and the mesh network model.',
        'Use these prompts: central server, equality of nodes, physical/logical links, routing, flooding and shortest route.',
      ] }],
      teacherPrompt: 'Require one model difference and one topology difference before accepting the answer.',
      accent: 'amber',
      ...source(39, ['EXTENSION ACTIVITY 2A']),
    }],
  },
  {
    after: 'h2-216-attenuation',
    slides: [{
      id: 'h2-extension-2b',
      section: '2.1 Networking',
      subtopicCode: '2.1',
      eyebrow: 'EXTENSION ACTIVITY 2B',
      title: 'Confirm electromagnetic frequency values',
      lead: 'Use f = c / λ, where c = 3 × 10⁸ m/s, to check the frequency values in the coursebook spectrum table.',
      richBlocks: [{ kind: 'steps', title: 'Calculation route', items: [
        'Choose a wavelength from Table 2.4.',
        'Substitute the wavelength in metres into f = c / λ.',
        'State the answer with the correct Hz unit and prefix, then compare it with the table.',
      ] }],
      accent: 'amber',
      ...source(42, ['EXTENSION ACTIVITY 2B', 'Table 2.4']),
    }],
  },
  {
    after: 'h2-217-routers-gateways',
    slides: [{
      id: 'h2-extension-2c',
      section: '2.1 Networking',
      subtopicCode: '2.1',
      eyebrow: 'EXTENSION ACTIVITY 2C',
      title: 'Design a gateway connection for three incompatible LANs',
      lead: 'Draw how a gateway can join three LANs that use different protocols.',
      richBlocks: [{ kind: 'steps', title: 'Required labels', items: [
        'Show all three LANs and name their different protocols.',
        'Include the gateways, connecting hardware and cables.',
        'Use arrows to show where protocol conversion takes place.',
      ] }],
      accent: 'amber',
      ...source(49, ['EXTENSION ACTIVITY 2C']),
    }],
  },
  {
    after: 'h2-218-csma-cd',
    slides: [{
      id: 'h2-extension-2d',
      section: '2.1 Networking',
      subtopicCode: '2.1',
      eyebrow: 'EXTENSION ACTIVITY 2D',
      title: 'Prevent an endless CSMA/CD retry loop',
      lead: 'Review Figure 2.20 and modify the flow so a failed data channel cannot hold up the computer indefinitely.',
      richBlocks: [{ kind: 'steps', title: 'Design prompt', items: [
        'Add a retry counter or elapsed-time limit.',
        'After the limit, terminate transmission and report the channel problem.',
        'Explain why a random wait alone does not guarantee termination.',
      ] }],
      accent: 'amber',
      ...source(52, ['EXTENSION ACTIVITY 2D', 'Figure 2.20']),
    }],
  },
  {
    after: 'h2-223-cidr',
    slides: [{
      id: 'h2-extension-2e',
      section: '2.2 The internet',
      subtopicCode: '2.2',
      eyebrow: 'EXTENSION ACTIVITY 2E',
      title: 'Investigate network address translation',
      lead: 'Find out how NAT lets many private addresses share a smaller number of public addresses.',
      richBlocks: [{ kind: 'steps', title: 'Research questions', items: [
        'What translation table does the router maintain?',
        'How are source addresses and port numbers changed for outgoing packets?',
        'How does the returning packet reach the correct private device?',
      ] }],
      accent: 'amber',
      ...source(58, ['EXTENSION ACTIVITY 2E', 'Network address translation (NAT)']),
    }],
  },
  {
    after: 'h2-226-client-server-side',
    slides: [{
      id: 'h2-extension-2f',
      section: '2.2 The internet',
      subtopicCode: '2.2',
      eyebrow: 'EXTENSION ACTIVITY 2F',
      title: 'Read the JavaScript and PHP programs line by line',
      lead: 'Compare the two temperature programs and identify variables, outputs and the purpose of specified statements.',
      richBlocks: [{ kind: 'steps', title: 'Coursebook questions', items: [
        'Write down two variable names used in each program.',
        'Identify the output statement or statements in each program.',
        'Explain JavaScript line 09 and PHP line 03.',
        'Explain the purpose of JavaScript line 05.',
      ] }],
      accent: 'amber',
      ...source(64, ['EXTENSION ACTIVITY 2F', 'JavaScript and PHP comparison']),
    }],
  },
];

function insertAfter(slides: HodderLessonSlide[], insertions: Insert[]): HodderLessonSlide[] {
  const result: HodderLessonSlide[] = [];
  for (const slide of slides) {
    result.push(slide);
    const matching = insertions.filter((item) => item.after === slide.id);
    for (const insertion of matching) {
      result.push(...insertion.slides);
    }
  }
  return result;
}

export function withChapter2SourceFingerprints(slides: readonly HodderLessonSlide[]) {
  return slides.map(slide => {
    const fingerprints = (slide.sourcePages ?? []).flatMap(printedPage => {
      const page = CHAPTER_2_SOURCE_FILE_MANIFEST.pages.find(item => item.printedPage === printedPage);
      const fingerprint = page ? `SOURCE FILE PAGE ${printedPage} · sha256:${page.sha256}` : null;
      return fingerprint && !(slide.sourceElements ?? []).includes(fingerprint) ? [fingerprint] : [];
    });
    return fingerprints.length ? {
      ...slide,
      sourceElements: [...(slide.sourceElements ?? []), ...fingerprints],
    } : slide;
  });
}

/**
 * Final Chapter 2 route with source-faithful detail inserts.
 */
export const CHAPTER_2_COMPLETE: Chapter2Lesson = {
  ...CHAPTER_2,
  coverage: `${CHAPTER_2.coverage} · exact supplied PDF locked (41/41 page fingerprints) · source-faithful detail and extension-activity screens`,
  slides: withChapter2SourceFingerprints(insertAfter(CHAPTER_2.slides, INSERTS)),
};
