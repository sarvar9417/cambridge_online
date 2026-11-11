/** Curated 9618 comparison statements, paraphrased from supplied Hodder chapters.
 * Provisional bank: unlike glossary entries, these have not all been individually
 * reconciled with every official 9618 Mark Scheme; do not claim exhaustive coverage.
 */
export type CompareSide = 'A' | 'B' | 'AB';
export interface CompareDeck {
  id: string;
  chapterNo: number;
  a: string;
  b: string;
  pages: string;
  cards: Array<readonly [statement: string, answer: CompareSide]>;
}
export const COMPARE_DECKS: CompareDeck[] = [
  { id:'lan-wan', chapterNo:2, a:'LAN', b:'WAN', pages:'28–32', cards:[
    ['Usually covers a relatively small area such as a single building.','A'],
    ['Links devices or networks across cities, countries or continents.','B'],
    ['Typically under the control of one organisation at one site.','A'],
    ['Can connect several local area networks using routers.','B'],
    ['May use leased lines or public telecommunications infrastructure.','B'],
    ['Connects computers and other devices so that they can communicate.','AB'],
    ['Allows authorised users to exchange data and access shared resources.','AB'],
    ['Commonly connects devices in a school building or small office.','A'],
    ['Common for geographically separated bank branches or multinational offices.','B'],
    ['Can require network security controls to prevent unauthorised access.','AB']
  ]},
  { id:'dram-sram', chapterNo:3, a:'DRAM', b:'SRAM', pages:'68–71', cards:[
    ['Stores each bit using a capacitor that must be refreshed.','A'],
    ['Stores each bit using flip-flop circuits.','B'],
    ['Needs regular refreshing to retain stored bits.','A'],
    ['Does not need refreshing while powered.','B'],
    ['Generally provides faster access than DRAM.','B'],
    ['Generally costs less per bit than SRAM.','A'],
    ['Offers a higher capacity for a given cost than SRAM.','A'],
    ['Commonly used for a computer’s main memory.','A'],
    ['Commonly used for processor cache memory.','B'],
    ['Both are types of volatile random-access memory.','AB']
  ]},
  { id:'compiler-interpreter', chapterNo:5, a:'Compiler', b:'Interpreter', pages:'151–152', cards:[
    ['Translates a whole source program into object or executable code.','A'],
    ['Translates and executes source statements as the program runs.','B'],
    ['A translated program can usually run again without retranslation.','A'],
    ['Can help identify an error at the statement being executed.','B'],
    ['Can execute and test an incomplete program during development.','B'],
    ['Usually produces object code that can be stored.','A'],
    ['Does not normally produce a separate stored executable file.','B'],
    ['Repeated interpretation may make execution slower.','B'],
    ['Both can be used to translate programs written in a high-level language.','AB'],
    ['Both enable high-level language programs to be processed by a computer.','AB'],
    ['The end user may be supplied with only the executable program.','A'],
    ['Useful for testing and debugging while writing a program.','B']
  ]},
  { id:'validation-verification', chapterNo:6, a:'Validation', b:'Verification', pages:'169–172', cards:[
    ['Checks that input data is reasonable and meets specified rules.','A'],
    ['Checks that data has been copied or entered accurately against a source.','B'],
    ['A range check rejects values outside an allowed interval.','A'],
    ['A format check tests whether an entry follows a required pattern.','A'],
    ['A presence check tests that a required field is not empty.','A'],
    ['Double entry compares two independently entered copies.','B'],
    ['A visual check compares the entered data with the original.','B'],
    ['A value can pass this check even if it is factually wrong.','A'],
    ['Both methods are used to reduce data-entry errors.','AB'],
    ['Both help protect the integrity of data.','AB']
  ]},
  { id:'packet-circuit', chapterNo:14, a:'Packet switching', b:'Circuit switching', pages:'338–343', cards:[
    ['Splits a message into packets that may travel by different routes.','A'],
    ['Establishes a dedicated communication path for the duration of the connection.','B'],
    ['Other users can share available network bandwidth while packets are sent.','A'],
    ['Packets can be rerouted if a network link becomes unavailable.','A'],
    ['Once the circuit is established, data can arrive in a consistent sequence.','B'],
    ['Packets may arrive out of order and require reassembly.','A'],
    ['Congestion or retransmission can introduce variable delays.','A'],
    ['Reserved capacity may be wasted when no data is being transferred.','B'],
    ['Both are methods of transferring data between network endpoints.','AB'],
    ['Both support communication across a network.','AB'],
    ['Resources are reserved along the selected communication path.','B'],
    ['Packet headers contain routing or addressing information.','A']
  ]},
  { id:'risc-cisc', chapterNo:15, a:'RISC', b:'CISC', pages:'347–349', cards:[
    ['Uses a relatively small set of simpler machine instructions.','A'],
    ['Offers a larger range of complex machine instructions.','B'],
    ['Instructions are typically designed to take one clock cycle.','A'],
    ['May use multi-cycle instructions.','B'],
    ['Typically uses fixed-length instructions.','A'],
    ['May use variable-length instructions.','B'],
    ['Simpler instruction formats support efficient pipelining.','A'],
    ['Complex instruction decoding makes pipelining harder.','B'],
    ['Typically provides fewer addressing modes.','A'],
    ['Typically provides more addressing modes.','B'],
    ['Both are CPU instruction-set architecture approaches.','AB'],
    ['Both execute machine instructions to process data.','AB']
  ]},
  { id:'symmetric-asymmetric', chapterNo:17, a:'Symmetric encryption', b:'Asymmetric encryption', pages:'410–415', cards:[
    ['Uses one shared secret key for encryption and decryption.','A'],
    ['Uses a mathematically linked public-key and private-key pair.','B'],
    ['The sender and receiver need access to the same secret key.','A'],
    ['Secure distribution of the shared secret key can be a problem.','A'],
    ['A public key can be shared openly while its matching private key stays secret.','B'],
    ['A sender can encrypt a confidential message with the recipient’s public key.','B'],
    ['The recipient can decrypt that message using the matching private key.','B'],
    ['Both are methods for protecting confidentiality of information.','AB'],
    ['Both use cryptographic keys and encryption algorithms.','AB'],
    ['Both turn readable plaintext into ciphertext.','AB'],
    ['The same secret key must remain known only to authorised parties.','A'],
    ['The private key must not be disclosed to others.','B']
  ]}
,
{"id":"client-peer","chapterNo":2,"a":"Client-server network","b":"Peer-to-peer network","pages":"32–35","cards":[["Uses dedicated server computers to provide services to client workstations.","A"],["Devices share resources directly without a dedicated central server.","B"],["Centralised user accounts and access permissions can improve administration.","A"],["Can be inexpensive to set up for a small number of devices.","B"],["A failed central server may disrupt access to shared services.","A"],["Managing consistent security and backups across peers is more difficult.","B"],["Central file servers can manage shared storage and backups.","A"],["Each node may act as both a client and a provider of resources.","B"],["Allows connected computers to exchange files or share resources.","AB"],["Security measures are needed to protect shared resources.","AB"]]},
{"id":"hub-switch","chapterNo":2,"a":"Hub","b":"Switch","pages":"28–31","cards":[["Forwards an incoming data packet to every connected device.","A"],["Forwards data selectively to the appropriate destination port.","B"],["Uses hardware addresses to make forwarding decisions on a LAN.","B"],["Unnecessary traffic is sent to devices that are not the destination.","A"],["Reduces unnecessary traffic compared with a hub.","B"],["Used to connect multiple devices within a local network.","AB"],["Operates as network hardware rather than an application protocol.","AB"],["All attached devices receive a copy of transmitted data.","A"]]},
{"id":"hdd-ssd","chapterNo":3,"a":"Hard disk drive (HDD)","b":"Solid-state drive (SSD)","pages":"72–75","cards":[["Records data magnetically on rotating platters.","A"],["Stores data electronically in solid-state memory cells.","B"],["Uses moving read/write heads and a spinning disk.","A"],["Has no mechanical moving parts for data access.","B"],["Avoids the rotational latency of a hard disk drive.","B"],["Mechanical movement makes it more vulnerable to physical shock.","A"],["Often provides large storage capacity at relatively low cost.","A"],["Retains saved files when electrical power is switched off.","AB"],["Can be used as secondary storage for an operating system, applications and files.","AB"],["Commonly uses NAND flash storage technology.","B"]]},
{"id":"mar-mdr","chapterNo":4,"a":"Memory Address Register (MAR)","b":"Memory Data Register (MDR)","pages":"110–114","cards":[["Holds the address of the memory location to access.","A"],["Holds data just read from memory or about to be written to memory.","B"],["Works with the address bus when locating memory.","A"],["Works with the data bus when transferring values.","B"],["Identifies which memory location is involved in a read or write.","A"],["Temporarily contains the value travelling between CPU and memory.","B"],["Both are CPU registers involved in memory access.","AB"],["Both participate in the fetch–execute cycle.","AB"],["Stores an address, not the content stored at that address.","A"],["Stores the content being transferred, not the location identifier.","B"]]},
{"id":"phishing-pharming","chapterNo":6,"a":"Phishing","b":"Pharming","pages":"160–168","cards":[["Uses deceptive messages, often emails, to persuade a victim to reveal information.","A"],["Redirects a user to a fraudulent website without the user necessarily noticing.","B"],["Often contains a link asking the victim to sign in or disclose credentials.","A"],["Can involve tampering with DNS mappings or redirecting website requests.","B"],["May direct a victim to a website pretending to be legitimate.","AB"],["Can be used to steal usernames, passwords or financial information.","AB"],["Threatens users’ privacy and account security.","AB"],["Frequently relies on social engineering through a message.","A"],["May send users to the wrong website even if they type a genuine address.","B"],["The attacker attempts to impersonate a trusted service.","AB"]]}
];