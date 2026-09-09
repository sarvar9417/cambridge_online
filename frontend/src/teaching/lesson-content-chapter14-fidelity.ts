import { CHAPTER_14, type Chapter14Lesson } from './lesson-content-chapter14';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

const source = (printedPage: number, elements: string[] = []) => ({
  sourcePages: [printedPage],
  sourceLabel: `Hodder Chapter 14 · p.${printedPage}`,
  sourceElements: [`Hodder p.${printedPage}`, ...elements],
});

type Insert = { after: string; slides: HodderLessonSlide[] };

/**
 * High-value source details that are easy to lose when a textbook paragraph is
 * transformed into a classroom presentation. These screens deliberately retain
 * the source's wording/figures where the detail is examinable or useful for a
 * faithful explanation. They are inserted next to the relevant concept rather
 * than collected in an appendix.
 */
const INSERTS: Insert[] = [
  {
    after: 'h14-http',
    slides: [
      {
        id: 'h14-http-source-detail',
        section: '14.1 Protocols',
        subtopicCode: '14.1',
        eyebrow: 'HTTP · SOURCE DETAIL',
        title: 'A web-page request combines HTTP, TCP and DNS',
        lead: 'The coursebook traces the request from the URL entered in the browser through DNS lookup and TCP acknowledgement to the returned HTML page.',
        bullets: [
          'The source describes HTTP as a client/server protocol: the browser sends request messages and the web server responds.',
          'The source states that hyperlinks provide rules for transferring data over the internet.',
          'The browser is part of the application layer and converts HTML into a displayable form or passes media to a media player.',
          'TCP creates data packets and the source example describes sending them via port 80 to the destination port(s).',
          'The DNS server stores URLs with matching IP addresses and uses the domain name to locate the website IP address.',
          'The server TCP sends an acknowledgement before the web server sends the page back in HTML format.',
        ],
        richBlocks: [
          {
            kind: 'table',
            table: {
              caption: 'Figure 14.2 · page resources shown in the source diagram',
              headers: ['Web-page element', 'Possible source shown'],
              rows: [
                ['Layout and page text', 'Web server'],
                ['Images', 'Web / linked resources'],
                ['Video links', 'Video server'],
                ['Advert links', 'Adverts server'],
              ],
            },
          },
        ],
        accent: 'emerald',
        ...source(331, ['HTTP client/server detail', 'Figure 14.2 resource breakdown', 'HTTP request sequence detail']),
      },
    ],
  },
  {
    after: 'h14-ftp',
    slides: [
      {
        id: 'h14-ftp-source-detail',
        section: '14.1 Protocols',
        subtopicCode: '14.1',
        eyebrow: 'FTP · SOURCE DETAIL',
        title: 'Anonymous access and FTP commands are part of the source example',
        lead: 'The coursebook gives concrete session and command examples in addition to the general definition of FTP.',
        bullets: [
          'Example FTP address in the source: ftp://username@ftp.example.gov/',
          'Example anonymous-access response: “331 Anonymous access allowed”.',
          'Example FTP commands listed: delete, close, rename, cd and lcd.',
          'cd changes directory on a remote machine; lcd changes directory on a local machine.',
          'A session starts by entering the remote ftp host_name, followed by a user ID and password, then FTP commands can be used.',
        ],
        accent: 'cyan',
        ...source(332, ['Anonymous FTP example', 'FTP command examples', 'FTP session sequence']),
      },
    ],
  },
  {
    after: 'h14-pop-imap',
    slides: [
      {
        id: 'h14-email-source-detail',
        section: '14.1 Protocols',
        subtopicCode: '14.1',
        eyebrow: 'EMAIL · SOURCE DETAIL',
        title: 'The source places POP/IMAP and SMTP in their wider email context',
        lead: 'POP3/4 and IMAP are presented as receiving protocols, while SMTP remains the sending protocol between email servers.',
        bullets: [
          'POP3/4 and IMAP are pull protocols: the client periodically connects, checks/downloads new email, closes the connection and repeats the process.',
          'The source describes IMAP as more recent than POP3/4.',
          'The source states that both POP3/4 and IMAP have largely been superseded by increasing use of HTTP protocols.',
          'SMTP is still used when transferring email between email servers.',
        ],
        accent: 'indigo',
        ...source(332, ['POP3/4 and IMAP wider context', 'SMTP between email servers']),
      },
    ],
  },
  {
    after: 'h14-ethernet-fields',
    slides: [
      {
        id: 'h14-ethernet-source-detail',
        section: '14.1 Protocols',
        subtopicCode: '14.1',
        eyebrow: 'ETHERNET · SOURCE DETAIL',
        title: 'Ethernet is local; IP is required for external communication',
        lead: 'The source distinguishes Ethernet frame control inside a LAN from IP communication beyond the LAN.',
        bullets: [
          'Ethernet connects computers/devices to form a LAN and uses protocols to control movement of frames.',
          'Its protocols avoid simultaneous transmission by two or more devices.',
          'Ethernet itself is local and does not provide communication with external devices; IP sits on top of Ethernet for that purpose.',
          'The source states that if VLAN is used, Ethernet data size increases from 1539 bytes to around 9000 bytes per frame.',
          'For the Ethernet type/length field, the source uses ≤1539 for frame length and >1539 for Ethernet type (IPv4 or IPv6 in the example).',
        ],
        richBlocks: [
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Source fidelity note',
            text: 'The numeric thresholds above reproduce the supplied coursebook wording; this screen does not silently replace them with a different external convention.',
          },
        ],
        accent: 'amber',
        ...source(334, ['Ethernet local/external distinction', 'VLAN size statement']),
      },
    ],
  },
  {
    after: 'h14-wireless',
    slides: [
      {
        id: 'h14-wireless-source-detail',
        section: '14.1 Protocols',
        subtopicCode: '14.1',
        eyebrow: 'WIRELESS · IEEE DETAILS',
        title: 'The coursebook identifies the exact IEEE families and WiMax variants',
        lead: 'These standards and mechanisms are retained because they are explicit source details.',
        richBlocks: [
          {
            kind: 'table',
            table: {
              headers: ['Technology', 'Exact source detail'],
              rows: [
                ['WiFi', 'IEEE 802.11; CSMA/CA uses distributed control function (DCF).'],
                ['DCF behaviour', 'Transmit only when a free channel is available; if acknowledgement is missing, wait a random interval and try again.'],
                ['WiFi purpose stated', 'The source links this protocol to security and integrity of data sent over a WLAN.'],
                ['Bluetooth', 'IEEE 802.15 for short-range transmission/communication; additional Bluetooth protocols are outside the textbook scope.'],
                ['Fixed WiMax', 'IEEE 802.16-2004.'],
                ['Mobile WiMax', 'IEEE 802.16-2005.'],
              ],
            },
          },
        ],
        accent: 'emerald',
        ...source(335, ['WiFi DCF detail', 'Bluetooth scope note', 'WiMax exact variants']),
      },
    ],
  },
  {
    after: 'h14-bittorrent-swarm',
    slides: [
      {
        id: 'h14-bittorrent-source-detail',
        section: '14.1 Protocols',
        subtopicCode: '14.1',
        eyebrow: 'BITTORRENT · SOURCE DETAIL',
        title: 'Availability, piece order and historical traffic figures complete the source explanation',
        lead: 'The coursebook adds several details beyond the basic peer/tracker/seed model.',
        bullets: [
          'The source contrasts small peer-to-peer networks with BitTorrent, which can connect thousands of users over the internet.',
          'A peer becomes a source for each piece as soon as that piece is received.',
          'Pieces do not have to be downloaded sequentially; BitTorrent rearranges them into the correct order to recreate the final file.',
          'Availability means the number of complete copies of the torrent contents distributed among the swarm.',
          'The source notes that a torrent is the name given to a file being shared on the peer-to-peer network.',
          'At the time of writing, the source reports BitTorrent at about 12% of video file sharing and YouTube at about 50%; these are historical coursebook figures, not current measurements.',
        ],
        accent: 'rose',
        ...source(336, ['BitTorrent scale', 'Piece reassembly', 'Swarm availability', 'Historical 12% and 50% traffic figures']),
      },
    ],
  },
  {
    after: 'h14-switching-compare',
    slides: [
      {
        id: 'h14-switching-compare-source',
        section: '14.2 Circuit switching and packet switching',
        subtopicCode: '14.2',
        eyebrow: 'TABLE 14.5 · SOURCE CHECK',
        title: 'Use the source comparison as a six-feature quick check',
        lead: 'The table reduces the distinction between switching methods to route setup, path dedication, order and bandwidth use.',
        richBlocks: [
          {
            kind: 'table',
            table: {
              headers: ['Feature', 'Circuit switching', 'Packet switching'],
              rows: [
                ['Actual route needs to be set up before transmission', 'Yes', 'No'],
                ['A dedicated transmission path is required', 'Yes', 'No'],
                ['Each packet uses the same route', 'Yes', 'No'],
                ['Packets arrive at the destination in the correct order', 'Yes', 'No'],
                ['All bandwidth of the channel is required/reserved', 'Yes', 'No'],
                ['Is bandwidth wasted?', 'Yes', 'No'],
              ],
            },
          },
        ],
        accent: 'cyan',
        ...source(340, ['Table 14.5 exact comparison']),
      },
    ],
  },
  {
    after: 'h14-eoc-4',
    slides: [
      {
        id: 'h14-eoc-4-complete',
        section: '14.2 Circuit switching and packet switching',
        subtopicCode: '14.2',
        eyebrow: 'END-OF-CHAPTER · QUESTION 4 COMPLETE',
        title: 'Hop number, checksum, headers and routing tables',
        lead: 'The final page continues Question 4 beyond the true/false switching table.',
        activity: {
          title: 'Question 4b–c',
          prompt: 'Explain hop number/hopping and why it is used [2]. Explain checksum and why it is used [2]. Then describe how headers and routing tables are used to route packets efficiently from a sender to a recipient [5].',
        },
        accent: 'indigo',
        ...source(345, ['End of chapter questions · Q4b hop number/hopping', 'End of chapter questions · Q4b checksum', 'End of chapter questions · Q4c headers and routing tables']),
      },
    ],
  },
];

function withInserts(slides: readonly HodderLessonSlide[]) {
  const byAnchor = new Map(INSERTS.map(item => [item.after, item.slides] as const));
  return slides.flatMap(slide => [slide, ...(byAnchor.get(slide.id) ?? [])]);
}

export const CHAPTER_14_COMPLETE: Chapter14Lesson = {
  ...CHAPTER_14,
  coverage: '18/18 supplied source pages represented · Figures 14.1–14.10 reconstructed · Tables 14.1–14.5 represented · source-detail fidelity screens retained · Activity 14A and end-of-chapter Q1–Q4 represented',
  slides: withInserts(CHAPTER_14.slides),
};
