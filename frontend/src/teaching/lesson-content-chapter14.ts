import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';

export type Chapter14Lesson = Omit<HodderLessonChapter, 'number'> & { number: 14 };

const source = (printedPage: number, elements: string[] = []) => ({
  sourcePages: [printedPage],
  sourceLabel: `Hodder Chapter 14 · p.${printedPage}`,
  sourceElements: [`Hodder p.${printedPage}`, ...elements],
});

const slides: HodderLessonSlide[] = [
  {
    id: 'h14-overview',
    section: 'Chapter overview',
    eyebrow: 'CHAPTER 14 · COMMUNICATION AND INTERNET TECHNOLOGIES',
    title: 'Communication and internet technologies',
    lead: 'A source-grounded presentation route through network protocols, TCP/IP, application protocols, local-link protocols, BitTorrent, circuit switching, packet switching, packet headers, routers and routing tables.',
    bullets: [
      'Explain why agreed protocols are required for successful communication.',
      'Describe the four TCP/IP layers and apply them when a message moves from one host to another.',
      'Explain HTTP, FTP, SMTP, MIME, POP3/4, IMAP and BitTorrent.',
      'Compare circuit switching with packet switching and explain how routers forward packets.',
    ],
    richBlocks: [
      {
        kind: 'steps',
        title: 'What you should already know',
        items: [
          'Explain IP and TCP, and state why protocols are used.',
          'Explain peer-to-peer networking and its advantages/disadvantages.',
          'Explain stack and queue structures and give an example of each.',
          'Explain Ethernet and IP conflicts, including how conflicts can be overcome.',
          'Explain DNS, HTTP and the role of status flags.',
        ],
      },
    ],
    accent: 'indigo',
    ...source(328, ['Chapter 14 learning objectives', '14.1 What you should already know']),
  },

  {
    id: 'h14-key-terms-141',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: '14.1 · KEY TERMS',
    title: 'Protocol vocabulary you must use precisely',
    lead: 'These definitions establish the language used throughout the protocol section.',
    keyTerms: [
      { term: 'Protocol', definition: 'A set of rules governing communication across a network; the rules are agreed by sender and recipient.' },
      { term: 'HTTP', definition: 'Hypertext transfer protocol.' },
      { term: 'Packet', definition: 'A smaller group of bits produced when a message/data is split for network transmission.' },
      { term: 'Segment', definition: 'A unit of data (packet) associated with transport-layer protocols.' },
      { term: 'FTP', definition: 'File transfer protocol.' },
      { term: 'SMTP', definition: 'Simple mail transfer protocol.' },
      { term: 'Push protocol', definition: 'A sending-email protocol in which the client opens and keeps a server connection active, then uploads new email.' },
      { term: 'Binary file', definition: 'A file that does not contain text only; it is machine-readable rather than human-readable.' },
      { term: 'MIME', definition: 'Multi-purpose internet mail extension; allows email attachments containing media as well as text to be sent.' },
      { term: 'POP', definition: 'Post office protocol.' },
      { term: 'IMAP', definition: 'Internet message access protocol.' },
      { term: 'TCP', definition: 'Transmission control protocol.' },
      { term: 'Pull protocol', definition: 'A receiving-email protocol in which the client periodically connects, checks/downloads new email, then closes the connection.' },
      { term: 'Host-to-host', definition: 'A protocol used by TCP when communicating between two devices.' },
      { term: 'Host', definition: 'A computer or device that can communicate with other computers or devices on a network.' },
      { term: 'BitTorrent', definition: 'A protocol used in peer-to-peer networks when sharing files between peers.' },
      { term: 'Peer', definition: 'A client that is part of a peer-to-peer network/file-sharing community.' },
      { term: 'Metadata', definition: 'Data that describes and gives information about other data.' },
      { term: 'Pieces', definition: 'The segments into which a file is split for peer-to-peer file sharing.' },
      { term: 'Tracker', definition: 'A central server that stores details of computers in the swarm.' },
      { term: 'Swarm', definition: 'Connected peers that share a torrent/tracker.' },
      { term: 'Seed', definition: 'A peer that has downloaded a file or pieces and makes them available to other peers.' },
      { term: 'Leech', definition: 'A peer with negative feedback/negative impact because its sharing ratio is poor.' },
      { term: 'Lurker', definition: 'A client that downloads files but does not supply new content to the community.' },
    ],
    accent: 'cyan',
    ...source(329, ['14.1 Key terms']),
  },

  {
    id: 'h14-need-protocols',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: '14.1.1 · THE NEED FOR PROTOCOLS',
    title: 'Communication only works when both sides agree the rules',
    lead: 'Sender and receiver must use an agreed protocol so that the same transmitted data is interpreted and checked in the same way.',
    bullets: [
      'A protocol defines agreed communication rules.',
      'The sender and receiver must use the same rules for communication to succeed.',
      'Parity checking illustrates the point: both sides must agree whether even or odd parity is being used.',
      'Different internet activities require different protocols.',
      'Protocol families can be organised as layers in a stack.',
    ],
    richBlocks: [
      {
        kind: 'callout',
        tone: 'info',
        title: 'Decomposition',
        text: 'Layering breaks a large communication process into manageable self-contained modules, which makes development and hardware/software compatibility easier.',
      },
    ],
    accent: 'indigo',
    ...source(329, ['14.1.1 The need for protocols']),
  },

  {
    id: 'h14-tcpip-stack',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: '14.1.2 · TCP/IP PROTOCOLS',
    title: 'The four-layer TCP/IP stack',
    lead: 'When sending, data moves from Application down to Link. When receiving, it moves from Link up to Application.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Figure 14.1 reconstructed · sending',
          items: [
            { label: '4 · APPLICATION LAYER', note: 'Programs and application protocols create/exchange data.' },
            { label: '3 · TRANSPORT LAYER', note: 'Breaks data into transport segments and manages reliable delivery.' },
            { label: '2 · INTERNET (NETWORK) LAYER', note: 'Adds addressing/routing information using IP.' },
            { label: '1 · LINK NETWORK', note: 'Moves frames across the local network using physical/MAC addressing.' },
          ],
          caption: 'Sending: 4 → 3 → 2 → 1. Receiving reverses the order: 1 → 2 → 3 → 4.',
        },
      },
    ],
    bullets: [
      'Each layer is implemented using software.',
      'Each layer performs a focused role and uses services provided by lower layers.',
      'The layered structure is a practical example of decomposition.',
    ],
    accent: 'emerald',
    ...source(329, ['14.1.2 TCP/IP protocols', 'Figure 14.1']),
  },

  {
    id: 'h14-packet-names',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: '14.1.2 · ENCAPSULATION TERMINOLOGY',
    title: 'The unit changes name as each layer adds its own header',
    lead: 'The book distinguishes the same transmitted information by layer because each layer adds layer-specific control information.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Layer-by-layer data-unit names',
          items: [
            { label: 'Application data', note: 'Created by software such as a browser or mail client.' },
            { label: 'Segment', note: 'Transport-layer unit.' },
            { label: 'Datagram', note: 'Internet-layer IP unit.' },
            { label: 'Frame', note: 'Data-link-layer unit for local transmission.' },
          ],
          caption: 'Do not confuse data-link frames with memory-management frames.',
        },
      },
    ],
    accent: 'cyan',
    ...source(330, ['Packet/router terminology', 'Segment/datagram/frame terminology']),
  },

  {
    id: 'h14-application-layer',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: '14.1.2 · APPLICATION LAYER',
    title: 'Application protocols define how user-facing services exchange data',
    lead: 'The application layer contains programs such as web browsers and server software and defines protocols used by applications.',
    richBlocks: [
      {
        kind: 'table',
        table: {
          caption: 'Table 14.1 · protocols associated with the application layer',
          headers: ['Protocol', 'Purpose'],
          rows: [
            ['HTTP', 'Correct transfer of files that make up web pages on the World Wide Web.'],
            ['SMTP', 'Sending email.'],
            ['POP3/4', 'Receiving email.'],
            ['IMAP', 'Receiving email.'],
            ['DNS', 'Finding an IP address from a domain name.'],
            ['FTP', 'Transferring files/messages and attachments.'],
            ['RIP', 'Routers exchange routing information over an IP network.'],
            ['SNMP', 'Exchange of network-management information between management systems and network devices.'],
          ],
        },
      },
    ],
    accent: 'indigo',
    ...source(330, ['Application layer', 'Table 14.1']),
  },

  {
    id: 'h14-http',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'APPLICATION PROTOCOL · HTTP',
    title: 'HTTP uses a client/server request–response model',
    lead: 'A browser requests web resources from a web server; HTTP defines the format of the request and response messages.',
    bullets: [
      'The browser initiates the web-page request.',
      'The browser receives HTML and interprets it for display, or sends media data to the appropriate player.',
      'The requested page can reference text, images, video and advertising resources held on different servers.',
    ],
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Figure 14.2 reconstructed · fetching a web page',
          items: [
            { label: 'User enters a URL', note: 'The browser begins the request.' },
            { label: 'HTTP(S) passes the request to TCP', note: 'Application layer → transport layer.' },
            { label: 'DNS resolves the domain name', note: 'The matching IP address is found.' },
            { label: 'TCP creates packets and establishes communication', note: 'The source describes transmission via port 80 and an acknowledgement.' },
            { label: 'Web server returns HTML', note: 'Referenced resources may come from other servers.' },
            { label: 'Browser interprets the response', note: 'The page is displayed or media is passed to a player.' },
          ],
          caption: 'Animated/reveal sequence is intended for Board/Presentation mode.',
        },
      },
    ],
    accent: 'emerald',
    ...source(331, ['Figure 14.2', 'HTTP web-page request sequence']),
  },

  {
    id: 'h14-ftp',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'APPLICATION PROTOCOL · FTP',
    title: 'FTP is dedicated to transferring files over a network',
    lead: 'FTP transfers files between computers/devices. A session identifies the remote host and normally uses a user ID and password before file commands are issued.',
    bullets: [
      'Anonymous FTP allows access without identifying a specific user to the server.',
      'FTP commands can delete, close or rename files and can change remote/local directories (cd and lcd).',
      'An FTP server stores files that users can download.',
      'A browser can connect to an FTP address in a way similar to HTTP.',
    ],
    richBlocks: [
      {
        kind: 'steps',
        title: 'Typical FTP session',
        items: ['Enter the remote host name.', 'Provide user ID and password when required.', 'Issue FTP commands.', 'Transfer or manage files on the FTP server.'],
      },
    ],
    accent: 'cyan',
    ...source(331, ['File transfer protocol (FTP)']),
  },

  {
    id: 'h14-smtp-mime',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'EMAIL · SMTP + MIME',
    title: 'SMTP sends email; MIME enables non-text attachments',
    lead: 'SMTP is described as a text-based, connection-based push protocol. MIME is needed when an email carries media/binary attachments.',
    bullets: [
      'SMTP is used when sending email and when transferring email between mail servers.',
      'As a push protocol, the client opens a connection to a server, keeps it active, and uploads new mail.',
      'SMTP alone is text-based and does not handle binary/media files.',
      'MIME places a header at the beginning of the transmission so the client can identify the required media handling.',
    ],
    accent: 'rose',
    ...source(332, ['Simple mail transfer protocol (SMTP)', 'MIME']),
  },

  {
    id: 'h14-pop-imap',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'EMAIL · POP3/4 VS IMAP',
    title: 'POP3/4 and IMAP receive email, but they differ in synchronisation',
    lead: 'Both are pull protocols: the client periodically connects to a mail server, checks for/downloads new messages and then closes the connection.',
    richBlocks: [
      {
        kind: 'comparison',
        leftTitle: 'POP3/4',
        rightTitle: 'IMAP',
        rows: [
          ['Does not keep client and server synchronised.', 'Keeps client and server synchronised.'],
          ['Downloaded email is deleted from the server in the coursebook model.', 'A copy is downloaded while the original remains on the server until manually deleted.'],
          ['Local mailbox becomes the main copy after download.', 'Server mailbox remains authoritative for synchronisation across clients.'],
        ],
      },
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Figures 14.3–14.4 reconstructed · email protocol flow',
          items: [
            { label: 'Sender/client', note: 'Creates email and any attachments.' },
            { label: 'SMTP/MIME', note: 'Sends text email and attachment metadata/content.' },
            { label: 'Sender ISP mail server', note: 'Transfers mail across the internet.' },
            { label: 'Recipient domain mail server', note: 'Stores mail for the recipient.' },
            { label: 'POP/IMAP', note: 'Recipient pulls/synchronises messages.' },
            { label: 'Recipient', note: 'Reads the delivered message.' },
          ],
        },
      },
    ],
    accent: 'indigo',
    ...source(332, ['Figure 14.3', 'POP3/4 and IMAP']),
  },

  {
    id: 'h14-email-detail',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'EMAIL FLOW · DETAILED VIEW',
    title: 'Email protocols cooperate across several systems',
    lead: 'The source diagram separates the sender-side SMTP/MIME path from the recipient-side POP/IMAP path across the internet.',
    richBlocks: [
      {
        kind: 'steps',
        title: 'Figure 14.4 flow',
        items: [
          'Client sends through the client ISP email server using SMTP/MIME.',
          'The message crosses the internet to the recipient domain email server.',
          'The recipient retrieves/synchronises the message using POP/IMAP.',
        ],
      },
    ],
    accent: 'emerald',
    ...source(333, ['Figure 14.4', 'Table 14.2']),
  },

  {
    id: 'h14-transport-layer',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'TCP/IP · TRANSPORT LAYER',
    title: 'The transport layer manages reliable end-to-end delivery',
    lead: 'The transport layer regulates connections, breaks data into packets/segments and helps ensure ordered, error-free delivery.',
    bullets: [
      'Packets are sent onward to the internet/network layer.',
      'Acknowledgements are exchanged.',
      'Lost or corrupted packets can be retransmitted.',
      'The source identifies TCP, UDP and SCTP as transport protocols, but focuses on TCP.',
    ],
    accent: 'cyan',
    ...source(333, ['Transport layer']),
  },

  {
    id: 'h14-tcp-par',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'TRANSPORT PROTOCOL · TCP',
    title: 'TCP uses acknowledgement, retransmission and a connection',
    lead: 'TCP is responsible for safe delivery by creating packets and using positive acknowledgement with retransmission (PAR).',
    keyTerms: [
      { term: 'PAR', definition: 'Positive acknowledgement with retransmission: a packet is automatically resent if a positive acknowledgement is not received.' },
      { term: 'Connection-oriented', definition: 'An end-to-end connection is established between the two hosts before data transfer.' },
      { term: 'Host-to-host', definition: 'TCP communication between two network hosts such as clients and servers.' },
    ],
    accent: 'rose',
    ...source(333, ['Transmission control protocol (TCP)', 'PAR']),
  },

  {
    id: 'h14-tcp-handshake',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'TCP · HOST-TO-HOST HANDSHAKE',
    title: 'Three exchanges establish the connection before data transfer',
    lead: 'The source describes synchronisation sequence bits and acknowledgements exchanged between host X and host Y.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'TCP handshake reconstructed',
          items: [
            { label: '1 · X → Y: SYN/sequence information', note: 'Host X sends a segment containing synchronisation sequence bits.' },
            { label: '2 · Y → X: ACK + own synchronisation', note: 'Host Y acknowledges X and sends its own sequence information.' },
            { label: '3 · X → Y: ACK', note: 'Host X acknowledges the segment from Y.' },
            { label: '4 · Data transfer', note: 'Communication can now take place.' },
          ],
          caption: 'Use presentation mode to reveal the exchange step by step.',
        },
      },
    ],
    accent: 'emerald',
    ...source(334, ['TCP host-to-host steps']),
  },

  {
    id: 'h14-internet-link',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'TCP/IP · INTERNET + LINK LAYERS',
    title: 'IP identifies networks/hosts; the link layer moves frames locally',
    lead: 'The internet layer identifies the intended network and host. The data-link layer encapsulates IP packets into frames and maps IP addresses to MAC addresses.',
    bullets: [
      'IP ensures correct routing across the internet/network and handles communication between networks.',
      'IP takes the transport-layer packet and adds a header containing sender and recipient IP addresses.',
      'The resulting IP packet/datagram passes to the data-link layer.',
      'The data-link layer assembles datagrams into frames for transmission and identifies the network protocol in the header.',
      'The physical network layer specifies hardware requirements.',
    ],
    accent: 'indigo',
    ...source(334, ['Internet/network layer and network/data-link layer', 'IP functions']),
  },

  {
    id: 'h14-ethernet-frame',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'LINK LAYER · ETHERNET',
    title: 'Ethernet frames carry local-network addressing, payload and integrity data',
    lead: 'Ethernet connects computers/devices in a LAN and controls frame movement. IP is required above Ethernet for communication beyond the local network.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'bitfield',
          title: 'Figure 14.5 reconstructed · typical Ethernet frame',
          fields: [
            { label: 'Pre-amble', bits: '8 bytes' },
            { label: 'Start frame', bits: '1 byte' },
            { label: 'Destination', bits: '6 bytes', detail: 'Destination MAC address.' },
            { label: 'Source', bits: '6 bytes', detail: 'Source MAC address.' },
            { label: 'Ethernet type/length', bits: '2 bytes' },
            { label: 'Actual message', bits: '46–1500 bytes' },
            { label: 'Frame check sequence', bits: '4 bytes', detail: 'Includes a checksum for integrity checking.' },
            { label: 'Interpacket gap', bits: '12 bytes' },
          ],
          caption: 'The source labels Ethernet data as 64–1518 bytes and notes a larger size when VLAN is used.',
        },
      },
    ],
    accent: 'cyan',
    ...source(334, ['Ethernet protocols', 'Figure 14.5']),
  },

  {
    id: 'h14-ethernet-fields',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'ETHERNET · FIELD MEANING',
    title: 'Destination, source, type/length and frame check are the core Ethernet data fields',
    lead: 'The frame tells a LAN where the data came from, where it should go, what it carries and whether it arrived intact.',
    bullets: [
      'Destination stores the destination MAC address; FF:FF:FF:FF:FF:FF can target every device when broadcasting.',
      'Source stores the source MAC address (6 bytes).',
      'Ethernet type/length identifies frame length for shorter frames or the network-layer type (for example IPv4/IPv6) according to the source description.',
      'Frame check includes a checksum to check data integrity after transmission.',
    ],
    accent: 'amber',
    ...source(335, ['Ethernet frame field descriptions']),
  },

  {
    id: 'h14-wireless',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'LOCAL WIRELESS PROTOCOLS',
    title: 'WiFi, Bluetooth and WiMax use different IEEE protocol families',
    lead: 'The source contrasts three wireless technologies by standard and intended scale.',
    richBlocks: [
      {
        kind: 'table',
        table: {
          headers: ['Technology', 'Standard / mechanism', 'Source description'],
          rows: [
            ['WiFi', 'IEEE 802.11 · CSMA/CA + DCF', 'A device transmits only when a free channel is available; missing acknowledgement leads to a random wait before retrying.'],
            ['Bluetooth', 'IEEE 802.15', 'Short-range data transmission/communication.'],
            ['WiMax', 'IEEE 802.16', 'Designed originally for wireless MANs; fixed and mobile variants use related standards.'],
          ],
        },
      },
    ],
    bullets: [
      'CSMA/CA is collision avoidance and is not the same concept as CSMA/CD.',
      'DCF uses acknowledgements; if none arrives, the device assumes a collision risk and waits a random interval before retrying.',
    ],
    accent: 'emerald',
    ...source(335, ['Wireless (WiFi) protocols', 'Bluetooth protocols', 'WiMax']),
  },

  {
    id: 'h14-bittorrent-intro',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'PEER-TO-PEER · BITTORRENT',
    title: 'BitTorrent distributes file pieces between many peers',
    lead: 'Instead of every downloader receiving the full file from one web server, peers can become sources for the pieces they already possess.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'BitTorrent file-sharing process',
          items: [
            { label: 'Create a .torrent file', note: 'It contains metadata describing the file to be shared.' },
            { label: 'Split the file into pieces', note: 'The source gives 20 MiB → 20 × 1 MiB as a typical illustration.' },
            { label: 'Peers obtain the torrent and contact a tracker', note: 'The tracker stores details of connected computers.' },
            { label: 'Peers download pieces from available sources', note: 'A peer becomes a source for each piece it receives.' },
            { label: 'Pieces are reassembled', note: 'They may arrive out of sequence and must be restored to the correct order.' },
            { label: 'Completed peers can seed', note: 'More seeds generally speed up downloading for the swarm.' },
          ],
        },
      },
    ],
    accent: 'indigo',
    ...source(335, ['Peer-to-peer file sharing/BitTorrent protocol']),
  },

  {
    id: 'h14-bittorrent-swarm',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'BITTORRENT · SWARM ROLES',
    title: 'Tracker, swarm, seed, leech and lurker describe different roles',
    lead: 'The BitTorrent model depends on peers contributing pieces while a tracker helps peers locate one another.',
    keyTerms: [
      { term: 'Swarm', definition: 'A group of connected peers sharing a torrent; availability reflects complete copies distributed across the swarm.' },
      { term: 'Seed', definition: 'A peer that has downloaded a file/pieces and makes them available to others.' },
      { term: 'Tracker', definition: 'A central server storing details/IP addresses of peers downloading or uploading the file.' },
      { term: 'Leech', definition: 'A peer with a poor share ratio that downloads much more than it uploads.' },
      { term: 'Lurker', definition: 'A peer that downloads files but contributes no new content to the community.' },
    ],
    formula: 'share ratio = amount uploaded / amount downloaded',
    bullets: [
      'Ratio > 1: positive impact on the swarm.',
      'Ratio < 1: negative impact on the swarm.',
      'Logging off immediately after completing a download is discouraged because it removes a potential seed.',
    ],
    accent: 'rose',
    ...source(336, ['BitTorrent term summary']),
  },

  {
    id: 'h14-bittorrent-figure',
    section: '14.1 Protocols',
    subtopicCode: '14.1',
    eyebrow: 'FIGURE 14.6 · SWARM',
    title: 'A tracker coordinates peers with different upload/download roles',
    lead: 'The coursebook example shows 12 peers: one original uploader, six seeds, two leeches and three new peers requesting the file.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Figure 14.6 reconstructed · swarm roles',
          items: [
            { label: 'Tracker', note: 'Central point containing peer connection details.' },
            { label: 'Original peer', note: 'Begins uploading the file.' },
            { label: 'Seeds × 6', note: 'Upload pieces to other peers.' },
            { label: 'Leeches × 2', note: 'Download more than they contribute.' },
            { label: 'New peers × 3', note: 'Request the video file and begin downloading pieces.' },
          ],
        },
      },
    ],
    accent: 'cyan',
    ...source(337, ['Figure 14.6']),
  },

  {
    id: 'h14-key-terms-142',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: '14.2 · KEY TERMS',
    title: 'Switching and routing vocabulary',
    lead: 'These definitions are the foundation for the second half of the chapter.',
    keyTerms: [
      { term: 'Circuit switching', definition: 'A transmission method in which a dedicated circuit/channel lasts throughout the communication.' },
      { term: 'Packet switching', definition: 'A transmission method in which a message is broken into packets that can travel independently.' },
      { term: 'Hop number / hopping', definition: 'A packet-header number that prevents packets that never reach their destination from clogging routes.' },
      { term: 'Header (data packet)', definition: 'The packet part that stores control data such as destination IP address and sequence number.' },
      { term: 'Routing table', definition: 'A data table containing information needed to forward a packet along the shortest/best route to its destination.' },
    ],
    richBlocks: [
      {
        kind: 'steps',
        title: 'What you should already know',
        items: [
          'Explain how PSTN is used to make a phone call.',
          'Explain how VoIP can be used for a video call over the internet.',
          'Draw a route for a three-packet message from computer A to computer B.',
        ],
      },
    ],
    accent: 'indigo',
    ...source(337, ['14.2 What you should already know', '14.2 Key terms']),
  },

  {
    id: 'h14-circuit-basics',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: '14.2.1 · CIRCUIT SWITCHING',
    title: 'Circuit switching reserves one route for the whole communication',
    lead: 'A dedicated circuit/channel is established before data moves and remains tied up until communication ends.',
    richBlocks: [
      {
        kind: 'steps',
        title: 'Three stages',
        items: [
          'Establish a circuit/channel between sender and receiver.',
          'Transfer data, usually bi-directionally; data may be analogue or digital.',
          'Terminate the connection when data transfer is complete.',
        ],
      },
    ],
    bullets: ['Main uses listed in the source include public telephone, private telephone and private data networks.'],
    accent: 'emerald',
    ...source(338, ['14.2.1 Circuit switching']),
  },

  {
    id: 'h14-circuit-pros-cons',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'CIRCUIT SWITCHING · PROS / CONS',
    title: 'Dedicated bandwidth improves continuity but reduces flexibility',
    lead: 'The same property—a reserved route—creates most of circuit switching’s strengths and weaknesses.',
    richBlocks: [
      {
        kind: 'comparison',
        leftTitle: 'Benefits',
        rightTitle: 'Drawbacks',
        rows: [
          ['Circuit is dedicated to one transmission.', 'Not flexible; a single dedicated line is required and empty frames may still be sent.'],
          ['Whole bandwidth is available.', 'Nobody else can use the channel even when it is idle.'],
          ['Data transfer can be faster than packet switching.', 'The circuit remains reserved whether used or not.'],
          ['Frames arrive in the order sent.', 'A fault on the dedicated line has no alternative route.'],
          ['Packets cannot get lost by taking different routes.', 'Dedicated channels require greater bandwidth.'],
          ['Works well for real-time applications.', 'Establishing the link before transmission can take time.'],
        ],
      },
    ],
    accent: 'cyan',
    ...source(338, ['Table 14.3']),
  },

  {
    id: 'h14-circuit-route',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'FIGURE 14.7 · DEDICATED ROUTE',
    title: 'Every frame follows the same established path',
    lead: 'In the source example the route is A → R2 → R5 → R8 → R7 → R10 → B.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Figure 14.7 reconstructed · circuit route',
          items: [
            { label: 'Device A → Router A' },
            { label: 'R2' },
            { label: 'R5' },
            { label: 'R8' },
            { label: 'R7' },
            { label: 'R10' },
            { label: 'Router B → Device B' },
          ],
          caption: 'All frames use this one route for the duration of the communication.',
        },
      },
    ],
    accent: 'amber',
    ...source(338, ['Figure 14.7']),
  },

  {
    id: 'h14-packet-basics',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: '14.2.2 · PACKET SWITCHING',
    title: 'Packet switching lets each packet choose its own route',
    lead: 'The message is divided into packets that travel independently and must be reassembled in the correct order at the destination.',
    bullets: [
      'Each packet may follow a different path.',
      'Routing selection depends on packets waiting at routers/nodes.',
      'The shortest available path is selected according to the source description.',
      'Packets can arrive in a different order from the order in which they were sent.',
    ],
    accent: 'indigo',
    ...source(339, ['14.2.2 Packet switching']),
  },

  {
    id: 'h14-packet-route',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'FIGURE 14.8 · INDEPENDENT PACKETS',
    title: 'Different packets can traverse different routers and arrive out of order',
    lead: 'The source figure sends four packets from computer A to computer B over different network paths.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Figure 14.8 reconstructed · packet switching',
          items: [
            { label: 'Split message into packets 1–4', note: 'Each packet carries control information in its header.' },
            { label: 'Packet 1 chooses a route', note: 'Router decisions reflect current routing information/queue state.' },
            { label: 'Packet 2 chooses another route' },
            { label: 'Packet 3 chooses another route' },
            { label: 'Packet 4 chooses another route' },
            { label: 'Destination reassembles by sequence number', note: 'Arrival order does not have to match send order.' },
          ],
          caption: 'In presentation mode, reveal this sequence to model packets moving independently.',
        },
      },
    ],
    accent: 'cyan',
    ...source(339, ['Figure 14.8']),
  },

  {
    id: 'h14-packet-pros-cons',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'PACKET SWITCHING · PROS / CONS',
    title: 'Shared, reroutable paths improve utilisation but add overhead and delay',
    lead: 'Packet switching is flexible and resilient, but reassembly, shared bandwidth and retransmission can affect time-sensitive communication.',
    richBlocks: [
      {
        kind: 'comparison',
        leftTitle: 'Benefits',
        rightTitle: 'Drawbacks',
        rows: [
          ['No need to tie up one communication line.', 'Packet-switching protocols can be more complex.'],
          ['Failed/faulty lines can be bypassed by rerouting packets.', 'A lost packet must be resent.'],
          ['Traffic usage can be expanded easily.', 'Does not work as well with real-time streams in the source comparison.'],
          ['Users are charged for connectivity duration rather than a dedicated distance/time circuit in the source model.', 'Bandwidth is shared with other packets.'],
          ['High data transmission is possible.', 'Destination may wait while packets are reassembled.'],
          ['Uses digital networks for direct digital transmission.', 'Large amounts of RAM may be needed to handle data.'],
        ],
      },
    ],
    accent: 'rose',
    ...source(340, ['Table 14.4']),
  },

  {
    id: 'h14-switching-compare',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'TABLE 14.5 · COMPARISON',
    title: 'Circuit switching and packet switching differ in route, order and bandwidth use',
    lead: 'Use these properties to justify which method better matches a scenario.',
    richBlocks: [
      {
        kind: 'table',
        table: {
          headers: ['Feature', 'Circuit switching', 'Packet switching'],
          rows: [
            ['Route must be set up before transmission', 'Yes', 'No'],
            ['Dedicated transmission path required', 'Yes', 'No'],
            ['Each packet uses the same route', 'Yes', 'No'],
            ['Packets arrive in the correct order', 'Yes', 'Not guaranteed'],
            ['All channel bandwidth is reserved', 'Yes', 'No'],
            ['Can bandwidth be wasted?', 'Yes', 'Less likely because capacity is shared'],
          ],
        },
      },
    ],
    accent: 'emerald',
    ...source(340, ['Table 14.5']),
  },

  {
    id: 'h14-hop-checksum-priority',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'PACKET CONTROL · HOPS, ERROR CHECKING, PRIORITY',
    title: 'Headers prevent endless packets and support integrity and queueing',
    lead: 'Packet headers contain control values used by routers and the destination.',
    bullets: [
      'A hop number is reduced by 1 each time the packet passes through a router.',
      'If the destination has not been reached and the hop number reaches 0, the packet is deleted at the next router.',
      'A checksum or parity check can detect transmission errors; a failed checksum causes a resend request.',
      'A priority value can indicate which packet queue should be used.',
    ],
    accent: 'amber',
    ...source(340, ['Hopping', 'Checksum/parity', 'Priority']),
  },

  {
    id: 'h14-packet-header',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'FIGURE 14.9 · PACKET HEADER',
    title: 'A TCP/IP packet header carries addressing, sequencing, lifetime and integrity information',
    lead: 'The source identifies both the high-level header fields and a more detailed bit allocation.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'bitfield',
          title: 'Figure 14.9 reconstructed · main header fields',
          fields: [
            { label: 'Source IP address', bits: '32 bits' },
            { label: 'Destination IP address', bits: '32 bits' },
            { label: 'Hop number', bits: '8 bits' },
            { label: 'Packet length', bits: '16 bits' },
            { label: 'Number of packets', bits: '16 bits' },
            { label: 'Sequence number', bits: '16 bits', detail: 'Allows reassembly into the original order.' },
            { label: 'Header checksum', bits: '16 bits' },
          ],
        },
      },
      {
        kind: 'table',
        table: {
          caption: 'Additional fields described on p.341',
          headers: ['Field', 'Bits / meaning'],
          rows: [
            ['Protocol version', '4 bits (for example IPv4/IPv6)'],
            ['Header length', '4 bits, in multiples of four'],
            ['Packet priority', '8 bits'],
            ['Fragmentation flags', '3 bits: includes DF and MF flags'],
            ['Fragment offset', '13 bits'],
            ['Transport protocol', '8 bits (for example TCP/UDP)'],
          ],
        },
      },
    ],
    accent: 'indigo',
    ...source(341, ['Figure 14.9', 'Packet header field list']),
  },

  {
    id: 'h14-routing-table',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'ROUTERS · ROUTING TABLES',
    title: 'A router compares the packet header with its routing table to choose the next hop',
    lead: 'Routing tables hold the information needed to forward a packet along the shortest/best available route.',
    richBlocks: [
      {
        kind: 'table',
        table: {
          headers: ['Routing-table item', 'Purpose in the source'],
          rows: [
            ['Number of hops', 'Contributes to route choice / remaining path information.'],
            ['Next router MAC address', 'Identifies where the packet should be forwarded next.'],
            ['Metrics', 'Assign costs so an efficient route/path can be selected.'],
            ['Network destination / network ID', 'Identifies the target network/pathway.'],
            ['Gateway', 'Points to the gateway/next hop through which the target network can be reached.'],
            ['Netmask', 'Used to generate the network ID.'],
            ['Interface', 'Identifies the local interface responsible for reaching the gateway.'],
          ],
        },
      },
    ],
    accent: 'cyan',
    ...source(341, ['Routing tables']),
  },

  {
    id: 'h14-router-process',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'FIGURE 14.10 · ROUTER DECISION',
    title: 'Router forwarding is a repeated header → table → next-hop decision',
    lead: 'Every router examines the arriving packet and either forwards it toward the next router or deletes it if no route is possible / the hop value has expired.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Figure 14.10 reconstructed · router forwarding',
          items: [
            { label: 'Packet arrives at router', note: 'Router reads the packet header.' },
            { label: 'Compare header with routing table', note: 'Destination and route information are examined.' },
            { label: 'Choose next router', note: 'The shortest/best route is selected from available alternatives.' },
            { label: 'Update next-hop MAC address', note: 'The source describes adding the new MAC address for the next router.' },
            { label: 'Forward packet', note: 'Repeat at the next router.' },
            { label: 'Delete when no route / hop number = 0', note: 'Prevents undeliverable packets from circulating indefinitely.' },
          ],
        },
      },
    ],
    accent: 'emerald',
    ...source(342, ['Figure 14.10']),
  },

  {
    id: 'h14-example-141',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'EXAMPLE 14.1 · VIDEO CONFERENCING',
    title: 'Why packet switching can cause poor real-time performance',
    lead: 'The worked example links observable video-call problems to packet arrival behaviour and then explains why circuit switching can improve continuity.',
    richBlocks: [
      {
        kind: 'comparison',
        leftTitle: 'Possible poor performance',
        rightTitle: 'Why / circuit-switching improvement',
        rows: [
          ['Picture and sound out of synchronisation.', 'Packets arrive at different times; one fixed circuit keeps a consistent ordered route.'],
          ['Video pauses.', 'Reassembly adds delay; a dedicated circuit avoids waiting for independently routed packets.'],
          ['Degraded sound/video quality.', 'Competing traffic can reduce available capacity; a dedicated circuit gives the full channel bandwidth.'],
          ['Drop-out.', 'Packets can take different paths and may be lost; one circuit keeps all data on the same path.'],
        ],
      },
    ],
    accent: 'rose',
    ...source(342, ['Example 14.1']),
  },

  {
    id: 'h14-example-142',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'EXAMPLE 14.2 · WEB PAGE DOWNLOAD',
    title: 'Packet switching moves a web page as independently routed packets',
    lead: 'The worked solution traces the page from segmentation to router decisions and final reassembly.',
    richBlocks: [
      {
        kind: 'steps',
        title: 'Worked answer structure',
        items: [
          'Divide the web page into data packets.',
          'Put the destination IP address and other control data in each packet header.',
          'At each router compare the header with the routing table.',
          'Determine the next router/hop and add the next-router MAC address as described in the source.',
          'Check the hop value.',
          'Allow different packets to travel by different routes.',
          'Reassemble the packets at the destination to rebuild the page.',
        ],
      },
    ],
    accent: 'indigo',
    ...source(343, ['Example 14.2']),
  },

  {
    id: 'h14-activity-14a',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'ACTIVITY 14A · CONSOLIDATION',
    title: 'Apply the chapter concepts before the end-of-chapter questions',
    lead: 'Use these source tasks as a structured whole-chapter review.',
    richBlocks: [
      {
        kind: 'steps',
        items: [
          'Name the four TCP/IP layers and one protocol associated with each; describe protocols used for sending/receiving email and distinguish SMTP from MIME.',
          'Define Ethernet, describe the contents of an Ethernet frame and explain how Ethernet reaches devices outside a LAN.',
          'Explain peer, swarm, tracker, leech and seed in BitTorrent and suggest how leech behaviour could be addressed.',
          'Distinguish a packet header from a routing table and explain how both are used to route a packet.',
          'Explain packet switching for a VoIP video call and describe problems that may occur.',
        ],
      },
    ],
    accent: 'amber',
    ...source(343, ['Activity 14A']),
  },

  {
    id: 'h14-eoc-1',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'END-OF-CHAPTER · QUESTION 1',
    title: 'Peer-to-peer terms, TCP/IP layers and email protocols',
    lead: 'The first review question checks exact vocabulary and protocol roles.',
    activity: {
      title: 'Question 1',
      prompt: 'Match lurker, leech, seed, tracker and BitTorrent to their descriptions; complete a TCP/IP layer diagram; then describe protocols used for sending and receiving emails.',
    },
    accent: 'cyan',
    ...source(344, ['End of chapter questions · Q1']),
  },

  {
    id: 'h14-eoc-2',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'END-OF-CHAPTER · QUESTION 2',
    title: 'Ethernet data, metadata and BitTorrent file sharing',
    lead: 'This question combines link-layer frame structure with peer-to-peer terminology.',
    activity: {
      title: 'Question 2',
      prompt: 'Complete the missing Ethernet-data fields, state what metadata means, and describe how files are shared using BitTorrent.',
    },
    accent: 'emerald',
    ...source(344, ['End of chapter questions · Q2']),
  },

  {
    id: 'h14-eoc-3',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'END-OF-CHAPTER · QUESTION 3',
    title: 'Circuit switching and packet switching in real applications',
    lead: 'This question asks for explanation rather than isolated definitions.',
    activity: {
      title: 'Question 3',
      prompt: 'Explain circuit switching; explain why it can be preferable for video conferencing; explain how a web page is transferred using packet switching.',
    },
    accent: 'rose',
    ...source(344, ['End of chapter questions · Q3', 'Cambridge International AS & A Level Computer Science 9608 Paper 32 Q3 November 2015']),
  },

  {
    id: 'h14-eoc-4',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'END-OF-CHAPTER · QUESTION 4',
    title: 'True/false switching comparison and packet-control terms',
    lead: 'The final source page begins with a comparison table and asks learners to explain hop number/hopping and related packet-routing ideas.',
    richBlocks: [
      {
        kind: 'table',
        table: {
          headers: ['Statement', 'Circuit switching', 'Packet switching'],
          rows: [
            ['A dedicated circuit/path is needed at all times', 'Evaluate', 'Evaluate'],
            ['The same route/circuit is used for every packet', 'Evaluate', 'Evaluate'],
            ['Bandwidth is shared with other packets', 'Evaluate', 'Evaluate'],
            ['None of the available bandwidth is wasted during transmission', 'Evaluate', 'Evaluate'],
            ['Packets arrive at the destination in the correct order', 'Evaluate', 'Evaluate'],
          ],
        },
      },
    ],
    activity: {
      title: 'Question 4',
      prompt: 'Complete the true/false comparison and explain the terms used when sending packets across a network, beginning with hop number/hopping.',
    },
    accent: 'indigo',
    ...source(345, ['End of chapter questions · Q4']),
  },

  {
    id: 'h14-recap',
    section: '14.2 Circuit switching and packet switching',
    subtopicCode: '14.2',
    eyebrow: 'CHAPTER 14 · RECAP',
    title: 'From application protocol to routed packet',
    lead: 'A complete explanation should connect the application request, the TCP/IP layers, local framing, router decisions and the final reassembly.',
    richBlocks: [
      {
        kind: 'figure',
        figure: {
          kind: 'sequence',
          title: 'Whole-chapter mental model',
          items: [
            { label: 'Application chooses a protocol', note: 'HTTP / FTP / SMTP / POP / IMAP / BitTorrent depending on the task.' },
            { label: 'Transport prepares segments', note: 'TCP manages connection, sequence, acknowledgements and retransmission.' },
            { label: 'Internet layer adds IP addressing', note: 'Datagrams are routed between networks.' },
            { label: 'Link layer builds frames', note: 'Ethernet/WiFi moves data over a local segment.' },
            { label: 'Routers read headers + routing tables', note: 'Packets are forwarded hop by hop.' },
            { label: 'Destination reassembles and delivers upward', note: 'Receiving reverses the layer order.' },
          ],
        },
      },
    ],
    teacherPrompt: 'Finish with one exam-style question: “Explain how a web page requested in a browser can reach a remote computer using the TCP/IP stack and packet switching.”',
    accent: 'emerald',
    ...source(345, ['Chapter 14 recap']),
  },
];

export const CHAPTER_14: Chapter14Lesson = {
  number: 14,
  level: 'AS Level',
  title: 'Communication and internet technologies',
  subtitle: 'Protocols, TCP/IP, application services, Ethernet and wireless protocols, BitTorrent, circuit switching, packet switching, routers and routing tables.',
  subtopics: ['14.1 Protocols', '14.2 Circuit switching and packet switching'],
  sourceNote: 'Built from the supplied Hodder Chapter 14 extract, printed pages 328–345. Terminology and worked-example framing follow the uploaded source.',
  coverage: '18/18 supplied source pages represented · Figures 14.1–14.10 reconstructed with board-readable sequence/bitfield visuals · Tables 14.1–14.5 represented · Activity 14A and end-of-chapter questions represented',
  slides,
};
