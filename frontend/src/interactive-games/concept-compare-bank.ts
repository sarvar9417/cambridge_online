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
  /** Printed Hodder section codes, not necessarily identical to the Cambridge syllabus topic. */
  sectionCodes: string[];
  syllabusTopicCode: string;
  /** Topic-level MS cross-references; NOT proof that every statement is an awarded point. */
  markSchemeExamples?: string[];
  extensionOnly?: boolean;
  cards: Array<readonly [statement: string, answer: CompareSide]>;
}
export const COMPARE_DECKS: CompareDeck[] = [
  { id:'lan-wan', chapterNo:2, a:'LAN', b:'WAN', pages:'28–32',sectionCodes:["2.1.1"],syllabusTopicCode:"2.1", cards:[
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
  { id:'dram-sram', chapterNo:3, a:'DRAM', b:'SRAM', pages:'68–71',sectionCodes:["3.1.1"],syllabusTopicCode:"3.1", cards:[
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
  { id:'compiler-interpreter', chapterNo:5, a:'Compiler', b:'Interpreter', pages:'151–152',sectionCodes:["5.2.1","5.2.2"],syllabusTopicCode:"5.2",markSchemeExamples:["9618/12/M/J/21 Q7(b)(i)"], cards:[
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
  { id:'validation-verification', chapterNo:6, a:'Validation', b:'Verification', pages:'169–172',sectionCodes:["6.2.1","6.2.2"],syllabusTopicCode:"6.2",markSchemeExamples:["9618/12/O/N/21 Q1"], cards:[
    ['Checks that input data is reasonable and meets specified rules.','A'],
    ['Checks that data has been copied or entered accurately against a source.','B'],
    ['A range check rejects values outside an allowed interval.','A'],
    ['A format check tests whether an entry follows a required pattern.','A'],
    ['A presence check tests that a required field is not empty.','A'],
    ['Double entry compares two independently entered copies.','B'],
    ['A visual check compares the entered data with the original.','B'],
    ['A field can pass a range or format validation test without proving that its value is factually correct.','A'],
    ['Both methods are used to reduce data-entry errors.','AB'],
    ['Both help protect the integrity of data.','AB']
  ]},
  { id:'packet-circuit', chapterNo:14, a:'Packet switching', b:'Circuit switching', pages:'338–343',sectionCodes:["14.2.1","14.2.2"],syllabusTopicCode:"14.2",markSchemeExamples:["9618/31/M/J/21 Q6"], cards:[
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
  { id:'risc-cisc', chapterNo:15, a:'RISC', b:'CISC', pages:'347–349',sectionCodes:["15.1.1"],syllabusTopicCode:"15.1", cards:[
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
  { id:'symmetric-asymmetric', chapterNo:17, a:'Symmetric encryption', b:'Asymmetric encryption', pages:'410–415',sectionCodes:["17.1.2","17.1.3"],syllabusTopicCode:"17.1", cards:[
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
{"id":"client-peer","chapterNo":2,"a":"Client-server network","b":"Peer-to-peer network","pages":"32–35",sectionCodes:["2.1.2"],syllabusTopicCode:"2.1","cards":[["Uses dedicated server computers to provide services to client workstations.","A"],["Devices share resources directly without a dedicated central server.","B"],["Centralised user accounts and access permissions can improve administration.","A"],["Can be inexpensive to set up for a small number of devices.","B"],["A failed central server may disrupt access to shared services.","A"],["Managing consistent security and backups across peers is more difficult.","B"],["Central file servers can manage shared storage and backups.","A"],["Each node may act as both a client and a provider of resources.","B"],["Allows connected computers to exchange files or share resources.","AB"],["Security measures are needed to protect shared resources.","AB"]]},
{"id":"hub-switch","chapterNo":2,"a":"Hub","b":"Switch","pages":"28–31",sectionCodes:["2.1.6"],syllabusTopicCode:"2.1",extensionOnly:true,"cards":[["Forwards an incoming data packet to every connected device.","A"],["Forwards data selectively to the appropriate destination port.","B"],["Uses hardware addresses to make forwarding decisions on a LAN.","B"],["Unnecessary traffic is sent to devices that are not the destination.","A"],["Reduces unnecessary traffic compared with a hub.","B"],["Used to connect multiple devices within a local network.","AB"],["Operates as network hardware rather than an application protocol.","AB"],["All attached devices receive a copy of transmitted data.","A"]]},
{"id":"hdd-ssd","chapterNo":3,"a":"Hard disk drive (HDD)","b":"Solid-state drive (SSD)","pages":"72–75",sectionCodes:["3.1.1"],syllabusTopicCode:"3.1","cards":[["Records data magnetically on rotating platters.","A"],["Stores data electronically in solid-state memory cells.","B"],["Uses moving read/write heads and a spinning disk.","A"],["Has no mechanical moving parts for data access.","B"],["Avoids the rotational latency of a hard disk drive.","B"],["Mechanical movement makes it more vulnerable to physical shock.","A"],["Often provides large storage capacity at relatively low cost.","A"],["Retains saved files when electrical power is switched off.","AB"],["Can be used as secondary storage for an operating system, applications and files.","AB"],["Commonly uses NAND flash storage technology.","B"]]},
{"id":"mar-mdr","chapterNo":4,"a":"Memory Address Register (MAR)","b":"Memory Data Register (MDR)","pages":"110–114",sectionCodes:["4.1.3"],syllabusTopicCode:"4.1","cards":[["Holds the address of the memory location to access.","A"],["Holds data just read from memory or about to be written to memory.","B"],["Works with the address bus when locating memory.","A"],["Works with the data bus when transferring values.","B"],["Identifies which memory location is involved in a read or write.","A"],["Temporarily contains the value travelling between CPU and memory.","B"],["Both are CPU registers involved in memory access.","AB"],["Both participate in the fetch–execute cycle.","AB"],["Stores an address, not the content stored at that address.","A"],["Stores the content being transferred, not the location identifier.","B"]]},
{"id":"phishing-pharming","chapterNo":6,"a":"Phishing","b":"Pharming","pages":"160–168",sectionCodes:["6.1.3"],syllabusTopicCode:"6.1","cards":[["Uses deceptive messages, often emails, to persuade a victim to reveal information.","A"],["Redirects a user to a fraudulent website without the user necessarily noticing.","B"],["Often contains a link asking the victim to sign in or disclose credentials.","A"],["Can involve tampering with DNS mappings or redirecting website requests.","B"],["May direct a victim to a website pretending to be legitimate.","AB"],["Can be used to steal usernames, passwords or financial information.","AB"],["Threatens users’ privacy and account security.","AB"],["Frequently relies on social engineering through a message.","A"],["May send users to the wrong website even if they type a genuine address.","B"],["The attacker attempts to impersonate a trusted service.","AB"]]}
,
{"id":"security-privacy","chapterNo":6,"a":"Data security","b":"Data privacy","pages":"159–160",sectionCodes:["6.1.1","6.1.2"],syllabusTopicCode:"6.1",markSchemeExamples:["9618/12/M/J/21 Q8(a)"],"cards":[["Focuses on keeping data safe from loss, damage or unauthorised modification.","A"],["Focuses on preventing personal or confidential data from being viewed by unauthorised people.","B"],["Includes recovering information when it has been accidentally lost.","A"],["Requires personal information to be disclosed only to authorised people.","B"],["Backups can help restore data after a failure.","A"],["Access permissions can restrict who can read confidential data.","B"],["Strong authentication and access controls can support this objective.","AB"],["Both help protect information against harmful consequences.","AB"],["A corrupted or deleted file is a major concern.","A"],["Unauthorised disclosure of confidential records is a major concern.","B"]]},
{"id":"shareware-commercial","chapterNo":7,"a":"Shareware","b":"Commercial/proprietary software","pages":"186–190",sectionCodes:["7.2.3"],syllabusTopicCode:"7.1","cards":[["Offers an initial free trial as its defining distribution arrangement.","A"],["Can be purchased as a licensed product without first taking a free trial.","B"],["May require payment to continue using the software after the trial.","A"],["Typically does not provide its users with the program's source code.","AB"],["Can be distributed under licensing conditions set by the owner.","AB"],["Use of the software may be restricted by a licence agreement.","AB"],["Lets users try a program before committing to payment.","A"],["Designed primarily for commercial sale or licensing.","B"],["Copyright law may protect the program against unauthorised copying.","AB"]]},
{"id":"open-share","chapterNo":7,"a":"Open-source software","b":"Shareware","pages":"186–190",sectionCodes:["7.2.3"],syllabusTopicCode:"7.1","cards":[["Supplies source code under a licence permitting inspection and modification.","A"],["Often provides a limited trial before requiring payment.","B"],["A licence may permit redistribution of modified versions under specified terms.","A"],["A trial may expire or restrict functionality until a fee is paid.","B"],["Software is distributed under conditions defined by a licence.","AB"],["Copyright still applies even when a program is distributed widely.","AB"],["Source code availability is a central property.","A"],["Source code need not be provided to the user.","B"]]},
{"id":"pk-fk","chapterNo":8,"a":"Primary key","b":"Foreign key","pages":"197–201",sectionCodes:["8.1.3"],syllabusTopicCode:"8.1","cards":[["Uniquely identifies each row in its own table.","A"],["References the primary key of another related table.","B"],["No two records in the table can share the same primary-key value.","A"],["Values can repeat in the referencing table.","B"],["Used to establish a relationship between tables.","B"],["Supports unique identification of a stored entity instance.","A"],["Can consist of more than one attribute.","AB"],["Is formed using one or more columns in a relational table.","AB"],["Referential integrity checks can apply to its values.","B"],["Chosen from candidate keys to act as the table’s main identifier.","A"]]},
{"id":"ddl-dml","chapterNo":8,"a":"DDL","b":"DML","pages":"210–214",sectionCodes:["8.3.2","8.3.3"],syllabusTopicCode:"8.3","cards":[["Used to define or change database structures.","A"],["Used to query and manipulate data stored in a database.","B"],["CREATE TABLE is an example of this type of SQL command.","A"],["ALTER TABLE can change a database table definition.","A"],["SELECT retrieves matching rows.","B"],["INSERT adds new records to a table.","B"],["UPDATE changes existing data values.","B"],["DELETE removes specified rows.","B"],["Both can be expressed using SQL statements.","AB"],["Both are used when working with relational databases.","AB"]]}
,
{"id":"pop-imap","chapterNo":14,"a":"POP3","b":"IMAP","pages":"332–334",sectionCodes:["14.1.2"],syllabusTopicCode:"14.1","cards":[["Retrieves emails from a mail server, often downloading them to a device.","A"],["Allows mail to be managed and synchronised while remaining on a mail server.","B"],["Can be configured to remove a message from the server after download.","A"],["Supports synchronising mail folders and message status between devices.","B"],["Well suited to using the same email account on several devices.","B"],["Downloaded messages are normally kept locally rather than continuously synchronised with the server.","A"],["Both are protocols used by email clients to access received messages.","AB"],["Both communicate with a mail server.","AB"],["A server-side mailbox is treated as the main copy.","B"],["A client may use local storage as the main copy of downloaded messages.","A"]]},
{"id":"simd-mimd","chapterNo":15,"a":"SIMD","b":"MIMD","pages":"350–353",sectionCodes:["15.1.2"],syllabusTopicCode:"15.1","cards":[["Multiple processing units apply the same instruction to different data.","A"],["Multiple processors can execute different instructions on different data.","B"],["All processing units are coordinated under one instruction stream.","A"],["Separate processors may run independently with distinct instruction streams.","B"],["Useful when the same operation is applied repeatedly to many values, such as image pixels.","A"],["Useful for independent tasks that do not all require the same instructions.","B"],["Both can operate on multiple data items in parallel.","AB"],["Can improve throughput by using more than one processing unit.","AB"],["Classified as single-instruction, multiple-data.","A"],["Classified as multiple-instruction, multiple-data.","B"]]},
{"id":"paging-seg","chapterNo":16,"a":"Paging","b":"Segmentation","pages":"382–385",sectionCodes:["16.1.4"],syllabusTopicCode:"16.1","cards":[["Divides logical memory into fixed-size pages.","A"],["Divides logical memory into variable-size logical segments.","B"],["Uses page tables to map pages to physical frames.","A"],["Uses segment tables to map segments to physical memory.","B"],["Can suffer internal fragmentation when allocated pages are not fully used.","A"],["Can suffer external fragmentation because segment sizes vary.","B"],["Usually transparent to the programmer.","A"],["Can reflect the logical structure of programs and data.","B"],["Both are memory-management techniques that translate logical addresses.","AB"],["Both enable an operating system to manage process memory.","AB"]]},
{"id":"preemptive-non","chapterNo":16,"a":"Preemptive scheduling","b":"Non-preemptive scheduling","pages":"376–381",sectionCodes:["16.1.2","16.1.3"],syllabusTopicCode:"16.1","cards":[["The scheduler can interrupt a running process and give CPU time to another.","A"],["A running process keeps the CPU until it finishes or blocks.","B"],["Time slicing in round-robin scheduling is an example.","A"],["A process is not forcibly removed merely because its time slice has expired.","B"],["Can make interactive systems more responsive.","A"],["Avoids some forced context-switching overhead.","B"],["May require more frequent context switches.","A"],["A long CPU-bound task may delay later jobs.","B"],["Both decide how processes share the CPU.","AB"],["Both are part of operating-system process management.","AB"]]},
{"id":"ssl-tls","chapterNo":17,"a":"SSL","b":"TLS","pages":"416–418",sectionCodes:["17.3.1","17.3.2"],syllabusTopicCode:"17.1","cards":[["An older family of protocols designed to secure network communication.","A"],["The more modern successor to SSL for securing network communication.","B"],["Older protocol versions are considered less secure than modern TLS.","A"],["Supports more modern secure communication mechanisms.","B"],["Compared with older SSL, TLS is described as the more secure successor.","B"],["Can provide encrypted communication between client and server.","AB"],["Supports authentication of communicating parties.","AB"],["Helps protect traffic against eavesdropping.","AB"],["Used historically or currently to protect connections to online services.","AB"],["Uses handshake and record protocols as part of secure client-server communication.","AB"]]}
,
{"id":"dijkstra-astar","chapterNo":18,"a":"Dijkstra’s algorithm","b":"A* algorithm","pages":"425–434",sectionCodes:["18.1.1","18.1.2"],syllabusTopicCode:"18.1","cards":[["Finds shortest paths by systematically exploring the least-cost known distances.","A"],["Combines path cost with a heuristic estimate of distance to the destination.","B"],["Does not use a destination-directed heuristic to prioritise nodes.","A"],["Prioritises promising routes using an estimated remaining cost.","B"],["Can explore nodes that lead away from the target, increasing search effort.","A"],["Uses a heuristic value as part of its route selection.","B"],["Both work on graphs containing nodes and weighted edges.","AB"],["Both can be used to find a shortest route through a network.","AB"],["Both consider accumulated travel cost when evaluating routes.","AB"],["Both can be used in route-planning problems.","AB"]]},
{"id":"supervised-unsupervised","chapterNo":18,"a":"Supervised learning","b":"Unsupervised learning","pages":"434–439",sectionCodes:["18.2.2"],syllabusTopicCode:"18.1","cards":[["Learns from examples that include known target outputs.","A"],["Identifies structure or patterns without supplied target answers.","B"],["Uses labelled training data.","A"],["Typically uses unlabelled input data.","B"],["Can learn to classify emails as spam or not spam using labelled examples.","A"],["Can group customers with similar purchasing behaviour.","B"],["Predictions can be checked against known expected outputs during training.","A"],["Can reveal clusters, similarities or anomalies in a dataset.","B"],["Both are forms of machine learning.","AB"],["Both use data to identify useful relationships.","AB"]]}
];

/** Category sequences were restored from the prior authored deck-data JSON.
 * Each character maps to the statement at the same index, never to a shuffled index.
 */
export type CompareCategory = 'Definition' | 'Feature' | 'Advantage' | 'Disadvantage' |
  'Purpose' | 'Method' | 'Use' | 'Example' | 'Measure' | 'Function';
const COMPARE_CATEGORY_KEYS: Record<string, string> = {
  "lan-wan": "ddffffafff",
  "client-peer": "ddaannfffn",
  "hub-switch": "ddfnaffn",
  "dram-sram": "ddffaaauuf",
  "hdd-ssd": "ddffanafuf",
  "mar-mdr": "ddffggffff",
  "compiler-interpreter": "ddaaaffnffau",
  "validation-verification": "ddmmmmmffp",
  "phishing-pharming": "ddmmfpnmmf",
  "security-privacy": "ddppvvvpff",
  "shareware-commercial": "ddffffppf",
  "open-share": "ddffffff",
  "pk-fk": "ddffppffff",
  "ddl-dml": "ddeeeeeeff",
  "packet-circuit": "ddaaannnfpff",
  "pop-imap": "ddffaaffff",
  "risc-cisc": "ddffffanfffp",
  "simd-mimd": "ddffuufaff",
  "paging-seg": "ddffnnffff",
  "preemptive-non": "ddffaannff",
  "symmetric-asymmetric": "ddfnfmmpffff",
  "ssl-tls": "ddfffffpuf",
  "dijkstra-astar": "ddffnffpfu",
  "supervised-unsupervised": "ddffuufffp"
};
const categoryNames: Record<string, CompareCategory> = {
 d: 'Definition', f: 'Feature', a: 'Advantage', n: 'Disadvantage',
 p: 'Purpose', m: 'Method', u: 'Use', e: 'Example', v: 'Measure', g: 'Function',
};
export function compareCategoryFor(deck: CompareDeck, index: number): CompareCategory | undefined {
 return categoryNames[COMPARE_CATEGORY_KEYS[deck.id]?.[index] ?? ''];
}
export type CompareScope = { chapterNo: number; kind: 'chapter' | 'section' | 'topic'; code?: string };
/** Book sections and Cambridge syllabus topic codes follow DIFFERENT structures.
 * Match each separately to prevent a narrow selection leaking unrelated decks.
 */
export function compareDeckMatchesScope(deck: CompareDeck, scope: CompareScope): boolean {
 if (deck.chapterNo !== scope.chapterNo) return false;
 if (scope.kind === 'chapter') return true;
 if (!scope.code) return false;
 if (scope.kind === 'topic') return scope.code === deck.syllabusTopicCode;
 return deck.sectionCodes.some(section => section === scope.code || section.startsWith(scope.code + '.'));
}
