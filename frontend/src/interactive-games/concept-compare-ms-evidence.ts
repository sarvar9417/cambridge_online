/**
 * Reviewed 9618 Paper 1 Question Paper + published Mark Scheme evidence.
 *
 * Card numbers are ONE-BASED, as displayed to learners. An entry is recorded
 * only when the stated concept is supported by the identified marking point.
 * It does not imply that the original Cambridge question was a Compare game
 * or that every card in the deck was examined.
 *
 * Reviewed against the 2021–2025 Paper 1 QP/MS collections on 2026-11-20.
 * The books and these original practice statements are not Cambridge MS text.
 */
export interface CompareMsFinding {
  question: string;
  cards: readonly number[];
  /** Short original-language summary of the marking point, not a quotation. */
  rationale: string;
}

export const COMPARE_P1_QUESTION_PAPERS = 'https://drive.google.com/file/d/1Cg_R_wvxuptGu88bEYJBFO4wG7m1rpfx/view';
export const COMPARE_P1_MARK_SCHEMES = 'https://drive.google.com/file/d/11110gjznNKnZeG4zo5RLJ90SHNmjwTfh/view';

export const COMPARE_MS_EVIDENCE: Readonly<Record<string, readonly CompareMsFinding[]>> = {
  'bcd-pure-binary': [
    { question: '9618/13/M/J/22 Q1(b)', cards: [1], rationale: 'A BCD example encodes each separate denary digit in a four-bit group.' },
  ],
  'ascii-unicode': [
    { question: '9618/11/O/N/22 Q1(c)', cards: [1, 2, 3, 6, 7], rationale: 'ASCII is a smaller character set; Unicode supports more characters and languages.' },
  ],
  'bitmap-vector': [
    { question: '9618/12/O/N/21 Q5(b)(i)', cards: [1, 2, 4], rationale: 'Pixel storage versus drawing instructions; enlargement and pixelation.' },
  ],
  'sampling-rate-resolution': [
    { question: '9618/13/O/N/23 Q1(b)', cards: [1, 2], rationale: 'Sampling rate counts samples per second; resolution is bits per sample.' },
    { question: '9618/13/M/J/23 Q3(c)(ii)', cards: [5, 6, 7], rationale: 'More frequent samples and more amplitude levels improve fidelity.' },
    { question: '9618/11/O/N/22 Q1(d)(ii)', cards: [8], rationale: 'Increasing sample resolution increases file size.' },
  ],
  'lossy-lossless': [
    { question: '9618/11/M/J/25 Q2(b)(ii)', cards: [1, 3, 7], rationale: 'Lossy compression achieves a smaller file at a possible quality cost.' },
  ],
  'rle-huffman': [
    { question: '9618/11/O/N/22 Q7(c)', cards: [1, 3], rationale: 'RLE records repeated runs; this question does not independently verify the Huffman side.' },
  ],
  'lan-wan': [
    { question: '9618/11/O/N/21 Q8(a)', cards: [1, 8], rationale: 'A LAN spans a small geographical area such as a building.' },
  ],
  'client-peer': [
    { question: '9618/11/M/J/21 Q4(b)', cards: [4, 6], rationale: 'Peer sharing has low setup overhead but decentralised backups and security risks.' },
  ],
  'bus-star': [
    { question: '9618/11/M/J/24 Q8(a)', cards: [1, 2], rationale: 'Bus uses a central cable; star connects devices to a central device.' },
    { question: '9618/11/O/N/23 Q2(d)', cards: [4], rationale: 'Star topology is more resilient to an individual cable fault.' },
  ],
  'star-mesh': [
    { question: '9618/11/M/J/24 Q8(a)', cards: [1, 2, 4], rationale: 'Star has a central device; mesh has alternative paths and fault resilience.' },
  ],
  'copper-fibre': [
    { question: '9618/12/M/J/22 Q9(b)', cards: [1, 2, 3, 4, 6], rationale: 'Electrical versus optical transmission; interference, bandwidth and range.' },
  ],
  'ipv4-ipv6': [
    { question: '9618/11/M/J/24 Q8(b)(ii)', cards: [1, 2, 3, 4], rationale: '32-bit dotted denary versus 128-bit hexadecimal groups.' },
  ],
  'public-private-ip': [
    { question: '9618/12/O/N/23 Q7(d)', cards: [1, 2], rationale: 'Public addresses permit direct internet access; private addresses serve internal LANs.' },
  ],
  'url-dns': [
    { question: '9618/11/O/N/25 Q7(c)', cards: [2, 4, 7, 8], rationale: 'A browser queries DNS to resolve a domain name to an IP address.' },
  ],
  'internet-www': [
    { question: '9618/11/M/J/21 Q4(d)', cards: [1, 2], rationale: 'Distinguishes internet infrastructure from accessing website content via WWW.' },
  ],
  'public-private-cloud': [
    { question: '9618/13/M/J/22 Q8(b)', cards: [1, 2, 4], rationale: 'Public cloud services from a provider versus an organisation-specific private cloud.' },
  ],
  'thin-thick-client': [
    { question: '9618/13/M/J/23 Q2(c)', cards: [1], rationale: 'Server performs work and storage; thin client mainly submits requests and displays results.' },
  ],
  'wired-wireless': [
    { question: '9618/13/M/J/23 Q2(d)', cards: [3, 4, 6], rationale: 'Wired connections are stable with less interference; wireless connections enable mobility.' },
  ],
  'dram-sram': [
    { question: '9618/11/O/N/24 Q3(c)', cards: [3, 4, 5], rationale: 'DRAM needs refreshing and has slower access than SRAM.' },
  ],
  'hdd-ssd': [
    { question: '9618/11/M/J/22 Q2(b)', cards: [1, 3], rationale: 'A magnetic HDD has rotating platters and a moving read/write head.' },
  ],
  'mar-mdr': [
    { question: '9618/12/O/N/21 Q8(a)(i)', cards: [1, 2, 5, 6, 9, 10], rationale: 'MAR stores the address; MDR holds data fetched from or sent to that address.' },
  ],
  'ram-rom': [
    { question: '9618/11/M/J/21 Q5(b)', cards: [1, 2], rationale: 'RAM holds working values; ROM supplies start-up instructions.' },
    { question: '9618/11/M/J/22 Q2(a)(i)', cards: [8], rationale: 'RAM and ROM are identified as primary memory.' },
  ],
  'prom-eprom': [
    { question: '9618/11/M/J/22 Q2(a)(ii)', cards: [1, 3, 6], rationale: 'PROM is programmable once; EPROM can be erased and reprogrammed.' },
  ],
  'primary-secondary': [
    { question: '9618/11/M/J/22 Q2(a)(i)', cards: [1], rationale: 'RAM is an example of primary memory used for running software.' },
  ],
  'magnetic-optical': [
    { question: '9618/11/M/J/22 Q2(b)', cards: [1, 3], rationale: 'A magnetic hard disk stores data by magnetising platter surfaces.' },
    { question: '9618/11/O/N/24 Q3(d)(i)', cards: [4], rationale: 'Optical discs are read using reflected laser light.' },
  ],
  'monitoring-control': [
    { question: '9618/11/O/N/25 Q9', cards: [1, 2, 3, 4], rationale: 'Monitoring observes and warns; control automatically acts on the environment.' },
  ],
  'and-or-gates': [
    { question: '9618/11/M/J/21 Q8', cards: [1], rationale: 'AND outputs one only when both inputs are one.' },
  ],
  'nand-nor-gates': [
    { question: '9618/11/O/N/21 Q3(c)', cards: [3, 4, 5, 6], rationale: 'The NOR and NAND truth tables specify their output for each input pair.' },
  ],
  'xor-or-gates': [
    { question: '9618/11/M/J/21 Q8', cards: [1, 7], rationale: 'XOR outputs one when inputs are different.' },
  ],
  'alu-cu': [
    { question: '9618/12/M/J/21 Q5(a)', cards: [1, 2], rationale: 'ALU computes; CU issues control signals to coordinate execution.' },
  ],
  'pc-cir': [
    { question: '9618/11/M/J/21 Q3(a)', cards: [1, 2], rationale: 'PC gives the next instruction address; CIR receives the fetched instruction.' },
  ],
  'address-data-bus': [
    { question: '9618/12/M/J/21 Q5(a)', cards: [1, 2, 3, 4], rationale: 'Address bus carries memory addresses and data bus transports values.' },
  ],
  'usb-hdmi': [
    { question: '9618/11/O/N/22 Q7(e)', cards: [4, 5], rationale: 'Question associates a USB port with a peripheral and HDMI with a monitor.' },
  ],
  'hardware-software-interrupt': [
    { question: '9618/12/O/N/21 Q7(a)', cards: [1, 2, 3, 4], rationale: 'Classifies hardware/device and software-generated interrupts.' },
  ],
  'assembly-machine-code': [
    { question: '9618/11/O/N/21 Q4(d)', cards: [3, 4], rationale: 'An assembler translates assembly instructions to directly executable binary/machine code.' },
  ],
  'assembler-pass1-pass2': [
    { question: '9618/12/M/J/23 Q3(a)', cards: [1, 2, 6], rationale: 'First pass handles labels; second pass generates object code.' },
    { question: '9618/11/O/N/22 Q6(c)', cards: [7, 8], rationale: 'Both passes process assembly source, with distinct tasks.' },
  ],
  'immediate-direct-address': [
    { question: '9618/12/M/J/23 Q3(b)', cards: [1, 2, 3, 4, 6], rationale: 'Immediate operand is literal data; direct operand is its address.' },
  ],
  'indirect-indexed-address': [
    { question: '9618/12/O/N/21 Q8(b)(iii)', cards: [1, 2, 3, 6], rationale: 'Indirect references an address stored in memory; indexed adds index register value.' },
  ],
  'logical-arithmetic-shift': [
    { question: '9618/13/O/N/24 Q8(c)', cards: [1, 2, 3], rationale: 'Logical right shift fills zeros; arithmetic right shift replicates sign bit.' },
  ],
  'compiler-interpreter': [
    { question: '9618/11/O/N/21 Q4(d)', cards: [1, 2, 3, 4, 5, 6, 7, 9, 10, 12], rationale: 'Compiler translates whole source and outputs executable; interpreter works one line at a time.' },
  ],
  'os-utility-software': [
    { question: '9618/11/M/J/21 Q2(b)', cards: [1, 3, 5], rationale: 'Operating system responsibilities include process, memory and hardware management.' },
    { question: '9618/12/O/N/23 Q8(b)', cards: [2, 4], rationale: 'Utilities maintain files/disks and compress files.' },
  ],
  'memory-process-management': [
    { question: '9618/13/O/N/22 Q4(b)', cards: [1, 2, 5, 6], rationale: 'OS memory allocation and processor scheduling are distinct functions.' },
  ],
  'defrag-compress': [
    { question: '9618/12/O/N/23 Q8(b)', cards: [1, 2, 3, 4], rationale: 'Defragmentation makes disk data contiguous; compression reduces file size.' },
  ],
  'static-dynamic-library': [
    { question: '9618/11/O/N/22 Q7(a)', cards: [2, 3, 4], rationale: 'Dynamic libraries reduce executable size and are loaded/shared as needed.' },
  ],
  'assembler-compiler': [
    { question: '9618/11/O/N/21 Q4(d)', cards: [1, 2], rationale: 'Assembler translates assembly; compiler translates a high-level program.' },
  ],
  'breakpoint-single-step': [
    { question: '9618/12/M/J/22 Q6(c)', cards: [1, 2, 3, 4], rationale: 'Breakpoint stops at a chosen point; single-step executes code one line at a time.' },
  ],
  'validation-verification': [
    { question: '9618/11/O/N/21 Q2(b)(i)', cards: [1, 8], rationale: 'Validation checks data against sensible constraints, not the actual original.' },
    { question: '9618/11/O/N/21 Q2(b)(ii)', cards: [2, 6, 7], rationale: 'Verification compares entered values with the source, for instance double entry.' },
    { question: '9618/11/M/J/22 Q4(d)', cards: [3, 5], rationale: 'Range and presence checks are given as validation examples.' },
  ],
  'phishing-pharming': [
    { question: '9618/13/O/N/23 Q8(b)', cards: [1, 2, 3, 5, 6, 8, 9, 10], rationale: 'Phishing tricks users through messages; pharming silently redirects to a fake site; both can steal information.' },
  ],
  'security-privacy': [
    { question: '9618/12/M/J/21 Q8(a)', cards: [1, 2, 3, 4, 9, 10], rationale: 'Security prevents loss; privacy prevents unauthorised access.' },
  ],
  'authentication-authorisation': [
    { question: '9618/11/O/N/25 Q5(a)(ii)', cards: [1, 2], rationale: 'OS authenticates users and applies access rights and permissions.' },
  ],
  'firewall-antivirus': [
    { question: '9618/13/M/J/23 Q6(b)', cards: [2], rationale: 'Antivirus scanning checks files for known malicious code.' },
  ],
  'virus-spyware': [
    { question: '9618/11/O/N/21 Q2(c)', cards: [1, 2, 4, 5], rationale: 'Virus replicates and may damage files; spyware silently records and transmits data.' },
  ],
  'range-check-format-check': [
    { question: '9618/13/M/J/22 Q5(b)(ii)', cards: [1, 3], rationale: 'A range check tests a value against upper and lower limits.' },
    { question: '9618/13/M/J/23 Q4(d)(i)', cards: [2, 4], rationale: 'A format check tests the prescribed arrangement of characters.' },
  ],
  'shareware-commercial': [
    { question: '9618/12/M/J/21 Q2(c)', cards: [1, 2, 3, 7, 8], rationale: 'Shareware includes trials; commercial software may require payment up front.' },
  ],
  'open-share': [
    { question: '9618/12/M/J/21 Q2(c)', cards: [1, 2, 7], rationale: 'Open-source licences allow code access and sharing; shareware provides a trial.' },
    { question: '9618/12/O/N/25 Q2(a)', cards: [3, 4], rationale: 'Open source permits modification/distribution; shareware is trial-based.' },
  ],
  'ethics-law': [
    { question: '9618/11/O/N/21 Q4(a)', cards: [1, 5], rationale: 'Professional ethical guidelines set expectations for responsible conduct.' },
  ],
  'copyright-plagiarism': [
    { question: '9618/11/M/J/21 Q1(d)', cards: [1], rationale: 'Copyright protects the creator’s intellectual property against unauthorised reproduction.' },
  ],
  'freeware-opensource': [
    { question: '9618/13/O/N/24 Q5(a)', cards: [2, 6], rationale: 'Open source allows access to source and user modification.' },
  ],
  'free-software-shareware': [
    { question: '9618/12/O/N/25 Q2(a)', cards: [2, 4, 6], rationale: 'Shareware may require payment to continue after a restricted trial.' },
  ],
  'pk-fk': [
    { question: '9618/12/M/J/21 Q1(a)', cards: [1, 2, 5, 6], rationale: 'Primary keys uniquely identify; foreign keys link to other tables’ primary keys.' },
  ],
  'ddl-dml': [
    { question: '9618/12/M/J/21 Q1(c)(i)', cards: [3], rationale: 'CREATE TABLE defines a relation and columns.' },
    { question: '9618/12/O/N/21 Q6(c)(ii)', cards: [4], rationale: 'ALTER TABLE changes an existing table by adding a field.' },
    { question: '9618/12/M/J/21 Q1(c)(ii)', cards: [5], rationale: 'SELECT retrieves records satisfying a query.' },
  ],
  'filebased-relational': [
    { question: '9618/11/M/J/21 Q7(a)', cards: [1, 3, 5], rationale: 'Flat files can duplicate data, cause inconsistency and complicate searches.' },
  ],
  'entity-attribute': [
    { question: '9618/12/M/J/21 Q1(a)', cards: [1, 2], rationale: 'Entity is a real-world object; field or attribute is a column describing it.' },
  ],
  'one-many-many-many': [
    { question: '9618/11/M/J/21 Q7(b)(i)', cards: [1, 2, 3], rationale: 'Provides examples of one-to-many and many-to-many relationships.' },
  ],
  '1nf-2nf': [
    { question: '9618/13/M/J/22 Q6(c)', cards: [1, 2, 3, 4, 5, 6], rationale: '1NF removes repeating groups; 2NF removes partial key dependencies.' },
  ],
  '2nf-3nf': [
    { question: '9618/13/M/J/22 Q6(c)', cards: [1, 2, 3, 4, 5, 7], rationale: '2NF demands full-key dependence; 3NF removes non-key/transitive dependencies.' },
  ],
  'candidate-composite-key': [
    { question: '9618/11/O/N/24 Q2(c)', cards: [1, 3, 5], rationale: 'A candidate key is a minimal potential primary key.' },
    { question: '9618/12/M/J/25 Q5(b)', cards: [2, 4, 6], rationale: 'Composite keys use more than one field to identify a record.' },
  ],
  'dbms-datadictionary': [
    { question: '9618/12/M/J/22 Q5(e)', cards: [1, 2, 4], rationale: 'DBMS includes a data dictionary storing field names and primary keys.' },
  ],
  'create-alter-table': [
    { question: '9618/12/M/J/21 Q1(c)(i)', cards: [1, 3, 7, 8], rationale: 'CREATE TABLE creates the initial schema, types and primary key.' },
    { question: '9618/12/O/N/21 Q6(c)(ii)', cards: [2, 4, 7, 8], rationale: 'ALTER TABLE adds a column with a data type to an existing table.' },
  ],
  'sql-where-having': [
    { question: '9618/12/M/J/21 Q1(c)(ii)', cards: [3, 5], rationale: 'WHERE filters rows in a SELECT query; HAVING is not evidenced in this question.' },
  ],
};

export function compareMsFindings(deckId: string, zeroBasedCardIndex: number): readonly CompareMsFinding[] {
  const cardNumber = zeroBasedCardIndex + 1;
  return (COMPARE_MS_EVIDENCE[deckId] ?? []).filter(entry => entry.cards.includes(cardNumber));
}
