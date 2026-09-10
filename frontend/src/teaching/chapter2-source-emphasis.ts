/**
 * Chapter 2 (9618 · Communication) source emphasis baseline.
 *
 * Curated directly from bold/emphasised spans in the exact supplied Hodder
 * Chapter 2 PDF (41 extract pages, printed pages 27–67). Independent of the
 * slide content: the presentation route must fail visibly if typographically
 * emphasised coursebook content is lost before it reaches a learner screen.
 *
 * Formal key-term glossaries carry the exact book definition AND a short
 * student-friendly explanation written for classroom delivery.
 */

export type Chapter2KeyTerm = {
  term: string;
  /** Exact definition from the coursebook key-terms block. */
  definition: string;
  /** Short plain-language explanation prepared for the presentation route. */
  simple: string;
  /** Printed coursebook page the definition comes from. */
  page: number;
};

export type Chapter2EmphasisAnchor = { page: number; printedPage: number; text: string };

/** Printed page = extract page + 26 for Chapter 2 (extract p.2 = printed p.28). */
const printed = (page: number) => page + 26;

/**
 * 2.1 Networking key terms — exact coursebook glossary (printed p.28).
 * `simple` lines are classroom explanations, not replacement definitions.
 */
export const CHAPTER_2_KEY_TERMS_2_1: Chapter2KeyTerm[] = [
  { term: 'ARPAnet', definition: 'Advanced Research Projects Agency Network.', simple: 'An early packet-switched WAN that linked US defence research computers around 1970 and helped establish the technical foundations of the internet.', page: 28 },
  { term: 'WAN', definition: 'Wide area network (network covering a very large geographical area).', simple: 'A network that links devices across a very large area, such as different cities or countries.', page: 28 },
  { term: 'LAN', definition: 'Local area network (network covering a small area such as a single building).', simple: 'A network covering a small site, such as one school or office building.', page: 28 },
  { term: 'MAN', definition: 'Metropolitan area network (network which is larger than a LAN but smaller than a WAN, which can cover several buildings in a single city, such as a university campus).', simple: 'A network between LAN and WAN scale that can link several buildings across one city.', page: 28 },
  { term: 'File server', definition: 'A server on a network where central files and other data are stored. They can be accessed by a user logged onto the network.', simple: 'A central computer that stores shared files for authorised network users.', page: 28 },
  { term: 'Hub', definition: 'Hardware used to connect together a number of devices to form a LAN that directs incoming data packets to all devices on the network (LAN).', simple: 'It copies every incoming packet to every connected device, wasting bandwidth and exposing the packet to all nodes.', page: 28 },
  { term: 'Switch', definition: 'Hardware used to connect together a number of devices to form a LAN that directs incoming data packets to a specific destination address only.', simple: 'It reads the destination and forwards a packet only to the intended device or devices.', page: 28 },
  { term: 'Router', definition: 'Device which enables data packets to be routed between different networks (for example, can join LANs to form a WAN).', simple: 'It moves packets between networks and selects a route towards the destination network.', page: 28 },
  { term: 'Modem', definition: 'Modulator demodulator. A device that converts digital data to analogue data (to be sent down a telephone wire); conversely it also converts analogue data to digital data (which a computer can process).', simple: 'It converts computer data between digital and analogue forms for transmission over public communication channels.', page: 28 },
  { term: 'WLAN', definition: 'Wireless LAN.', simple: 'A local area network in which devices communicate without network cables.', page: 28 },
  { term: '(W)AP', definition: '(Wireless) access point which allows a device to access a LAN without a wired connection.', simple: 'It provides a wireless entry point into an existing LAN.', page: 28 },
  { term: 'PAN', definition: 'Network that is centred around a person or their workspace.', simple: 'A small network connecting devices around one person, such as a phone, laptop and headset.', page: 28 },
  { term: 'Client-server', definition: 'Network that uses separate dedicated servers and specific client workstations. All client computers are connected to the dedicated servers.', simple: 'Dedicated servers provide central services, files and security to connected client computers.', page: 28 },
  { term: 'Spread spectrum technology', definition: 'Wideband radio frequency with a range of 30 to 50 metres.', simple: 'A wideband radio technique used for short-range wireless communication.', page: 28 },
  { term: 'Node', definition: 'Device connected to a network (it can be a computer, storage device or peripheral device).', simple: 'Any computer, storage device or peripheral connected to a network.', page: 28 },
  { term: 'Peer-to-peer', definition: 'Network in which each node can share its files with all the other nodes. Each node has its own data and there is no central server.', simple: 'There is no central server; each node can both supply and use resources.', page: 28 },
  { term: 'Thin client', definition: 'Device that needs access to the internet for it to work and depends on a more powerful computer for processing.', simple: 'It depends on a more powerful server or online service for most processing.', page: 28 },
  { term: 'Thick client', definition: 'Device which can work both off line and on line and is able to do some processing even if not connected to a network/internet.', simple: 'It has enough local processing and storage to continue working without a network connection.', page: 28 },
  { term: 'Bus network topology', definition: 'Network using single central cable in which all devices are connected to this cable so data can only travel in one direction and only one device is allowed to transmit at a time.', simple: 'Every device shares one central cable, and only one device can transmit at a time.', page: 28 },
  { term: 'Packet', definition: 'Message/data sent over a network from node to node (packets include the address of the node sending the packet, the address of the packet recipient and the actual data).', simple: 'A unit of network data containing source and destination addresses together with the payload.', page: 28 },
  { term: 'Star network topology', definition: 'A network that uses a central hub/switch with all devices connected to this central hub/switch so all data packets are directed through this central hub/switch.', simple: 'Every node has its own link to one central hub or switch.', page: 28 },
  { term: 'Mesh network topology', definition: 'Interlinked computers/devices, which use routing logic so data packets are sent from sending stations to receiving stations only by the shortest route.', simple: 'Interlinked nodes allow routing logic to select the shortest available path.', page: 28 },
  { term: 'Hybrid network', definition: 'Network made up of a combination of other network topologies.', simple: 'A network built by combining two or more topology types.', page: 28 },
  { term: 'Cloud storage', definition: 'Method of data storage where data is stored on off-site servers.', simple: 'Files are stored on remote provider servers instead of only on the local device.', page: 28 },
  { term: 'Data redundancy', definition: 'Situation in which the same data is stored on several servers in case of maintenance or repair.', simple: 'Several copies of the same data protect access when a server is repaired or unavailable.', page: 28 },
  { term: 'Wi-Fi', definition: 'Wireless connectivity that uses radio waves, microwaves. Implements IEEE 802.11 protocols.', simple: 'Wireless network connectivity based on the IEEE 802.11 protocol family.', page: 28 },
  { term: 'Bluetooth', definition: 'Wireless connectivity that uses radio waves in the 2.45 GHz frequency band.', simple: 'Short-range wireless communication using radio waves centred on 2.45 GHz.', page: 28 },
  { term: 'Spread spectrum frequency hopping', definition: 'A method of transmitting radio signals in which a device picks one of 79 channels at random. If the chosen channel is already in use, it randomly chooses another channel. It has a range up to 100 metres.', simple: 'A communicating pair changes among 79 channels so that a busy channel can be avoided.', page: 28 },
  { term: 'WPAN', definition: 'Wireless personal area network. A local wireless network which connects together devices in very close proximity (such as in a user’s house).', simple: 'A short-range wireless network for devices close to one person or within a home.', page: 28 },
  { term: 'Twisted pair cable', definition: 'Type of cable in which two wires of a single circuit are twisted together. Several twisted pairs make up a single cable.', simple: 'Pairs of copper wires are twisted together to reduce interference.', page: 28 },
  { term: 'Coaxial cable', definition: 'Cable made up of central copper core, insulation, copper mesh and outer insulation.', simple: 'A copper core is protected by insulation and a metallic mesh shield.', page: 28 },
  { term: 'Fibre optic cable', definition: 'Cable made up of glass fibre wires which use pulses of light (rather than electricity) to transmit data.', simple: 'Glass fibres carry data as light pulses, providing high capacity and low attenuation.', page: 28 },
  { term: 'Gateway', definition: 'Device that connects LANs which use DIFFERENT protocols.', simple: 'It links networks that use different communication rules by converting between protocols.', page: 28 },
  { term: 'Repeater', definition: 'Device used to boost a signal on both wired and wireless networks.', simple: 'It boosts an attenuated signal so that the signal can travel farther.', page: 28 },
  { term: 'Repeating hubs', definition: 'Network devices which are a hybrid of hub and repeater unit.', simple: 'This device combines hub broadcasting with signal boosting.', page: 28 },
  { term: 'Bridge', definition: 'Device that connects LANs which use the SAME protocols.', simple: 'It joins LANs or LAN sections that follow the same communication protocol.', page: 28 },
  { term: 'Softmodem', definition: 'Abbreviation for software modem; a software-based modem that uses minimal hardware.', simple: 'Software running on the host uses its processor and RAM to replace most modem hardware.', page: 28 },
  { term: 'NIC', definition: 'Network interface card. These cards allow devices to connect to a network/internet (usually associated with a MAC address set at the factory).', simple: 'The network interface connects a device and normally carries its factory-assigned MAC address.', page: 28 },
];

/**
 * 2.2 The internet key terms — exact coursebook glossary (printed p.54).
 */
export const CHAPTER_2_KEY_TERMS_2_2: Chapter2KeyTerm[] = [
  { term: 'Internet', definition: 'Massive network of networks, made up of computers and other electronic devices; uses TCP/IP communication protocols.', simple: 'A worldwide network of networks whose devices communicate using TCP/IP.', page: 54 },
  { term: 'World Wide Web (WWW)', definition: 'Collection of multimedia web pages stored on a website, which uses the internet to access information from servers and other computers.', simple: 'A collection of linked multimedia pages delivered over the internet; it is one internet service rather than the internet itself.', page: 54 },
  { term: 'HyperText Mark-up Language (HTML)', definition: 'Used to design web pages and to write http(s) protocols, for example.', simple: 'A markup language that defines the structure and content of a web page.', page: 54 },
  { term: 'Uniform resource locator (URL)', definition: 'Specifies location of a web page (for example, www.hoddereducation.co.uk).', simple: 'The address that identifies the location of a resource on the web.', page: 54 },
  { term: 'Web browser', definition: 'Software that connects to DNS to locate IP addresses; interprets web pages sent to a user’s computer so that documents and multimedia can be read or watched/listened to.', simple: 'Software that locates a web server and interprets page content for the user.', page: 54 },
  { term: 'Internet service provider (ISP)', definition: 'Company which allows a user to connect to the internet. They will usually charge a monthly fee for the service they provide.', simple: 'A company that supplies a customer with an internet connection.', page: 54 },
  { term: 'Public switched telephone network (PSTN)', definition: 'Network used by traditional telephones when making calls or when sending faxes.', simple: 'The traditional telephone network used for voice calls and fax transmission.', page: 54 },
  { term: 'Voice over Internet Protocol (VoIP)', definition: 'Converts voice and webcam images into digital packages to be sent over the internet.', simple: 'Voice and video are converted into digital packets and carried over the internet.', page: 54 },
  { term: 'Internet protocol (IP)', definition: 'Uses IPv4 or IPv6 to give addresses to devices connected to the internet.', simple: 'The protocol that addresses devices so packets can be routed to them.', page: 54 },
  { term: 'IPv4', definition: 'IP address format which uses 32 bits, such as 200.21.100.6.', simple: 'A 32-bit address normally written as four denary numbers separated by dots.', page: 54 },
  { term: 'Classless inter-domain routing (CIDR)', definition: 'Increases IPv4 flexibility by adding a suffix to the IP address, such as 200.21.100.6/18.', simple: 'The suffix states how many leading address bits identify the network.', page: 54 },
  { term: 'IPv6', definition: 'Newer IP address format which uses 128 bits, such as A8F0:7FFF:F0F1:F000:3DD0:256A:22FF:AA00.', simple: 'A 128-bit format introduced to provide a much larger address space than IPv4.', page: 54 },
  { term: 'Zero compression', definition: 'Way of reducing the length of an IPv6 address by replacing groups of zeroes by a double colon (::); this can only be applied once to an address to avoid ambiguity.', simple: 'One run of zero groups may be replaced by a double colon once in an IPv6 address.', page: 54 },
  { term: 'Sub-netting', definition: 'Practice of dividing networks into two or more sub-networks.', simple: 'A larger network is divided into smaller logical networks for control and management.', page: 54 },
  { term: 'Private IP address', definition: 'An IP address reserved for internal network use behind a router.', simple: 'An address used only inside a private network behind a router.', page: 54 },
  { term: 'Public IP address', definition: 'An IP address allocated by the user’s ISP to identify the location of their device on the internet.', simple: 'An ISP-assigned address that identifies an internet-facing location.', page: 54 },
  { term: 'Domain name service (DNS)', definition: 'Gives domain names for internet hosts and is a system for finding IP addresses of a domain name.', simple: 'A distributed service that finds the IP address associated with a domain name.', page: 54 },
  { term: 'JavaScript', definition: 'Object-orientated (or scripting) programming language used mainly on the web to enhance HTML pages.', simple: 'A scripting language used to add behaviour and interaction to web pages.', page: 54 },
  { term: 'PHP', definition: 'Hypertext processor; an HTML-embedded scripting language used to write web pages.', simple: 'A server-side scripting language that can generate page content within HTML.', page: 54 },
];

/**
 * Bold-typography anchors extracted from the supplied PDF. Noise-only
 * typography (chapter running headers, isolated answer letters such as “1 a)”,
 * multi-line label fragments split across columns, pure table cell labels) is
 * excluded; meaningful in-text emphasis, section-end activity labels, formal
 * terms and figure/table captions are retained.
 */
export const CHAPTER_2_SOURCE_EMPHASIS: Chapter2EmphasisAnchor[] = [
  { page: 1, printedPage: printed(1), text: 'In this chapter, you will learn about' },
  { page: 1, printedPage: printed(1), text: 'WHAT YOU SHOULD ALREADY KNOW' },
  // Formal glossary headings and terms (extract p.2 = printed p.28)
  { page: 2, printedPage: printed(2), text: 'Key terms' },
  ...CHAPTER_2_KEY_TERMS_2_1.map(item => ({ page: 2, printedPage: 28, text: item.term })),
  // 2.1.1 history, network sizes, hardware, Ethernet, bit streaming
  { page: 3, printedPage: printed(3), text: 'Advanced Research Projects Agency Network (ARPAnet)' },
  { page: 3, printedPage: printed(3), text: 'wide area network (WAN)' },
  { page: 3, printedPage: printed(3), text: 'Figure 2.1' },
  { page: 3, printedPage: printed(3), text: 'local area network (LAN)' },
  { page: 3, printedPage: printed(3), text: 'WNIC' },
  { page: 3, printedPage: printed(3), text: 'Ethernet' },
  { page: 3, printedPage: printed(3), text: 'Conflict' },
  { page: 3, printedPage: printed(3), text: 'Broadcast' },
  { page: 3, printedPage: printed(3), text: 'Collision' },
  { page: 3, printedPage: printed(3), text: 'CSMA/CD' },
  { page: 3, printedPage: printed(3), text: 'Bit streaming' },
  { page: 3, printedPage: printed(3), text: 'Buffering' },
  { page: 3, printedPage: printed(3), text: 'Bit rate' },
  { page: 3, printedPage: printed(3), text: 'On demand (bit streaming)' },
  { page: 3, printedPage: printed(3), text: 'Real-time (bit streaming)' },
  { page: 4, printedPage: printed(4), text: 'metropolitan area network (MAN)' },
  { page: 4, printedPage: printed(4), text: 'file server' },
  { page: 5, printedPage: printed(5), text: 'Private networks' },
  { page: 5, printedPage: printed(5), text: 'Public networks' },
  { page: 5, printedPage: printed(5), text: 'hubs' },
  { page: 5, printedPage: printed(5), text: 'switches' },
  { page: 5, printedPage: printed(5), text: 'router' },
  { page: 5, printedPage: printed(5), text: 'modem' },
  { page: 5, printedPage: printed(5), text: 'Wireless LANs (WLANs)' },
  { page: 5, printedPage: printed(5), text: 'wireless access points (WAPs)' },
  { page: 5, printedPage: printed(5), text: 'spread spectrum' },
  { page: 5, printedPage: printed(5), text: 'Figure 2.2' },
  { page: 6, printedPage: printed(6), text: 'Figure 2.3' },
  { page: 6, printedPage: printed(6), text: 'personal area network' },
  { page: 6, printedPage: printed(6), text: 'Figure 2.4' },
  { page: 7, printedPage: printed(7), text: 'client-server' },
  { page: 8, printedPage: printed(8), text: 'Figure 2.5' },
  { page: 8, printedPage: printed(8), text: 'node' },
  { page: 8, printedPage: printed(8), text: 'peer-to-peer' },
  { page: 9, printedPage: printed(9), text: 'thin clients' },
  { page: 9, printedPage: printed(9), text: 'thick clients' },
  { page: 10, printedPage: printed(10), text: 'Thick clients' },
  { page: 10, printedPage: printed(10), text: 'Thin clients' },
  { page: 10, printedPage: printed(10), text: 'Table 2.1' },
  { page: 10, printedPage: printed(10), text: 'Thin client software' },
  { page: 10, printedPage: printed(10), text: 'Thick client software' },
  { page: 10, printedPage: printed(10), text: 'Table 2.2' },
  { page: 10, printedPage: printed(10), text: 'ACTIVITY 2A' },
  { page: 11, printedPage: printed(11), text: 'bus network topology' },
  { page: 11, printedPage: printed(11), text: 'packet' },
  { page: 11, printedPage: printed(11), text: 'Figure 2.6' },
  { page: 11, printedPage: printed(11), text: 'star network topology' },
  { page: 11, printedPage: printed(11), text: 'Figure 2.7' },
  { page: 12, printedPage: printed(12), text: 'mesh network topologies' },
  { page: 12, printedPage: printed(12), text: 'routing' },
  { page: 12, printedPage: printed(12), text: 'flooding' },
  { page: 12, printedPage: printed(12), text: 'Figure 2.8' },
  { page: 13, printedPage: printed(13), text: 'EXTENSION ACTIVITY 2A' },
  { page: 13, printedPage: printed(13), text: 'hybrid network' },
  { page: 13, printedPage: printed(13), text: 'Figure 2.9' },
  { page: 13, printedPage: printed(13), text: 'Cloud storage' },
  { page: 14, printedPage: printed(14), text: 'data redundancy' },
  { page: 14, printedPage: printed(14), text: 'Public cloud' },
  { page: 14, printedPage: printed(14), text: 'Private cloud' },
  { page: 14, printedPage: printed(14), text: 'Hybrid cloud' },
  { page: 14, printedPage: printed(14), text: 'Pros of using cloud storage' },
  { page: 14, printedPage: printed(14), text: 'Cons of using cloud storage' },
  { page: 14, printedPage: printed(14), text: 'Table 2.3' },
  { page: 15, printedPage: printed(15), text: 'Wi-Fi' },
  { page: 15, printedPage: printed(15), text: 'Bluetooth' },
  { page: 16, printedPage: printed(16), text: 'EXTENSION ACTIVITY 2B' },
  { page: 16, printedPage: printed(16), text: 'Bandwidth' },
  { page: 16, printedPage: printed(16), text: 'Penetration' },
  { page: 16, printedPage: printed(16), text: 'Attenuation' },
  { page: 16, printedPage: printed(16), text: 'Table 2.4' },
  { page: 16, printedPage: printed(16), text: 'spread spectrum frequency hopping' },
  { page: 16, printedPage: printed(16), text: 'wireless personal area network (WPAN)' },
  { page: 16, printedPage: printed(16), text: 'radio waves' },
  { page: 16, printedPage: printed(16), text: 'microwaves' },
  { page: 16, printedPage: printed(16), text: 'infrared' },
  { page: 16, printedPage: printed(16), text: 'visible light' },
  { page: 16, printedPage: printed(16), text: 'ultra violet' },
  { page: 16, printedPage: printed(16), text: 'X-rays' },
  { page: 16, printedPage: printed(16), text: 'gamma rays' },
  { page: 17, printedPage: printed(17), text: 'Figure 2.10' },
  { page: 17, printedPage: printed(17), text: 'Figure 2.11' },
  { page: 18, printedPage: printed(18), text: 'Twisted pair cables' },
  { page: 18, printedPage: printed(18), text: 'Coaxial cables' },
  { page: 18, printedPage: printed(18), text: 'Fibre optic cables' },
  { page: 18, printedPage: printed(18), text: 'Figure 2.12' },
  { page: 19, printedPage: printed(19), text: 'gateway' },
  { page: 19, printedPage: printed(19), text: 'Figure 2.13' },
  { page: 20, printedPage: printed(20), text: 'Figure 2.14' },
  { page: 20, printedPage: printed(20), text: 'Repeaters' },
  { page: 20, printedPage: printed(20), text: 'repeating hubs' },
  { page: 21, printedPage: printed(21), text: 'Bridges' },
  { page: 21, printedPage: printed(21), text: 'Figure 2.15' },
  { page: 22, printedPage: printed(22), text: 'Figure 2.16' },
  { page: 23, printedPage: printed(23), text: 'Figure 2.17' },
  { page: 23, printedPage: printed(23), text: 'softmodem' },
  { page: 23, printedPage: printed(23), text: 'Routers' },
  { page: 23, printedPage: printed(23), text: 'Gateways' },
  { page: 23, printedPage: printed(23), text: 'Table 2.6' },
  { page: 23, printedPage: printed(23), text: 'EXTENSION ACTIVITY 2C' },
  { page: 23, printedPage: printed(23), text: 'network interface card (NIC)' },
  { page: 24, printedPage: printed(24), text: 'Wireless network interface cards/controllers (WNICs)' },
  { page: 24, printedPage: printed(24), text: 'Infrastructure mode' },
  { page: 24, printedPage: printed(24), text: 'Ad hoc mode' },
  { page: 24, printedPage: printed(24), text: 'Ethernet' },
  { page: 24, printedPage: printed(24), text: 'conflict' },
  { page: 24, printedPage: printed(24), text: 'broadcast' },
  { page: 24, printedPage: printed(24), text: 'Figure 2.18' },
  { page: 24, printedPage: printed(24), text: 'Figure 2.19' },
  { page: 25, printedPage: printed(25), text: 'collision' },
  { page: 25, printedPage: printed(25), text: 'Carrier sense' },
  { page: 25, printedPage: printed(25), text: 'multiple access with collision detection (CSMA/CD)' },
  { page: 25, printedPage: printed(25), text: 'Figure 2.20' },
  { page: 26, printedPage: printed(26), text: 'EXTENSION ACTIVITY 2D' },
  { page: 26, printedPage: printed(26), text: 'Bit streaming' },
  { page: 26, printedPage: printed(26), text: 'buffering' },
  { page: 26, printedPage: printed(26), text: 'bit rate' },
  { page: 26, printedPage: printed(26), text: 'Figure 2.21' },
  { page: 26, printedPage: printed(26), text: 'Pros of bit streaming' },
  { page: 26, printedPage: printed(26), text: 'Cons of bit streaming' },
  { page: 26, printedPage: printed(26), text: 'Table 2.7' },
  { page: 27, printedPage: printed(27), text: 'on demand' },
  { page: 27, printedPage: printed(27), text: 'real time' },
  { page: 27, printedPage: printed(27), text: 'ACTIVITY 2B' },
  // 2.2 The internet (extract p.28 = printed p.54)
  { page: 28, printedPage: printed(28), text: 'Key terms' },
  ...CHAPTER_2_KEY_TERMS_2_2.map(item => ({ page: 28, printedPage: 54, text: item.term })),
  { page: 29, printedPage: printed(29), text: 'HyperText Mark-up Language (HTML)' },
  { page: 29, printedPage: printed(29), text: 'Uniform resource locators (URLs)' },
  { page: 29, printedPage: printed(29), text: 'web browsers' },
  { page: 29, printedPage: printed(29), text: 'internet service provider (ISP)' },
  { page: 29, printedPage: printed(29), text: 'public switched telephone network (PSTN)' },
  { page: 29, printedPage: printed(29), text: 'Voice over Internet Protocol (VoIP)' },
  { page: 30, printedPage: printed(30), text: 'Figure 2.22' },
  { page: 31, printedPage: printed(31), text: 'internet protocols (IP)' },
  { page: 31, printedPage: printed(31), text: 'IP version 4 (IPv4)' },
  { page: 31, printedPage: printed(31), text: 'Table 2.8' },
  { page: 32, printedPage: printed(32), text: 'Classless inter-domain routing (CIDR)' },
  { page: 32, printedPage: printed(32), text: 'EXTENSION ACTIVITY 2E' },
  { page: 32, printedPage: printed(32), text: 'IPv6' },
  { page: 32, printedPage: printed(32), text: 'zero compression' },
  { page: 33, printedPage: printed(33), text: 'sub-netting' },
  { page: 33, printedPage: printed(33), text: 'Figure 2.23' },
  { page: 34, printedPage: printed(34), text: 'Table 2.9' },
  { page: 34, printedPage: printed(34), text: 'Figure 2.24' },
  { page: 35, printedPage: printed(35), text: 'Private IP addresses' },
  { page: 35, printedPage: printed(35), text: 'Public IP addresses' },
  { page: 35, printedPage: printed(35), text: 'Table 2.10' },
  { page: 35, printedPage: printed(35), text: 'domain name service (DNS)' },
  { page: 36, printedPage: printed(36), text: 'Figure 2.25' },
  { page: 37, printedPage: printed(37), text: 'JavaScript' },
  { page: 37, printedPage: printed(37), text: 'PHP' },
  { page: 38, printedPage: printed(38), text: 'EXTENSION ACTIVITY 2F' },
  { page: 38, printedPage: printed(38), text: 'ACTIVITY 2C' },
];

export const chapter2SourceEmphasis = (): Chapter2EmphasisAnchor[] => [...CHAPTER_2_SOURCE_EMPHASIS];
