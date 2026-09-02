export type LessonVisual =
  | 'binary'
  | 'bases'
  | 'arithmetic'
  | 'characters'
  | 'pixels'
  | 'vectors'
  | 'sound'
  | 'compression'
  | 'types'
  | 'files'
  | 'hashing'
  | 'floating'
  | 'precision'
  | 'recap';

export type LessonSlide = {
  id: string;
  section: string;
  subtopicCode?: string;
  eyebrow: string;
  title: string;
  lead: string;
  bullets?: string[];
  keyTerms?: Array<{ term: string; definition: string }>;
  formula?: string;
  example?: { title: string; lines: string[]; answer?: string };
  teacherPrompt?: string;
  visual?: LessonVisual;
  examPractice?: boolean;
  accent?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose';
};

export type LessonChapter = {
  number: 1 | 13;
  level: 'AS Level' | 'A Level';
  title: string;
  subtitle: string;
  subtopics: string[];
  sourceNote: string;
  slides: LessonSlide[];
};

const chapter1Slides: LessonSlide[] = [
  {
    id: 'ch1-opening', section: 'Chapter overview', eyebrow: 'CHAPTER 01 · AS LEVEL',
    title: 'Information Representation',
    lead: 'How does a computer turn numbers, text, images and sound into patterns of bits — and how can those patterns be made smaller without losing what matters?',
    bullets: ['1.1 Data Representation', '1.2 Multimedia — Graphics & Sound', '1.3 Compression'],
    teacherPrompt: 'Ask: “If every file is ultimately bits, what makes a photo different from a song?”',
    visual: 'binary', accent: 'indigo',
  },
  {
    id: 'ch1-prefixes', section: '1.1 Data Representation', subtopicCode: '1.1', eyebrow: '1.1 · MAGNITUDES & PREFIXES',
    title: 'Binary size is not the same as decimal size',
    lead: 'Computers naturally count in powers of two, while storage manufacturers often use powers of ten. The prefixes look similar but represent different quantities.',
    bullets: [
      'Decimal prefixes: kB = 10³ bytes, MB = 10⁶ bytes, GB = 10⁹ bytes.',
      'Binary prefixes: KiB = 2¹⁰ bytes, MiB = 2²⁰ bytes, GiB = 2³⁰ bytes.',
      'The gap becomes more noticeable as the magnitude increases.',
      'Always read the unit carefully before converting or comparing capacities.',
    ],
    formula: '1 KiB = 1024 bytes   ·   1 kB = 1000 bytes',
    visual: 'binary', accent: 'cyan',
  },
  {
    id: 'ch1-number-systems', section: '1.1 Data Representation', subtopicCode: '1.1', eyebrow: '1.1 · NUMBER SYSTEMS',
    title: 'One value, several representations',
    lead: 'A positional number system gives each digit a value according to its position and its base.',
    keyTerms: [
      { term: 'Binary', definition: 'Base 2. Uses digits 0 and 1; column weights are powers of 2.' },
      { term: 'Denary', definition: 'Base 10. Uses digits 0–9; the everyday number system.' },
      { term: 'Hexadecimal', definition: 'Base 16. Uses 0–9 and A–F; one hex digit maps exactly to four bits.' },
      { term: 'BCD', definition: 'Binary Coded Decimal stores each denary digit separately as a 4-bit code.' },
    ],
    example: { title: 'Same magnitude', lines: ['Denary 45', 'Binary 0010 1101', 'Hexadecimal 2D'], answer: 'All three represent the same integer.' },
    visual: 'bases', accent: 'indigo',
  },
  {
    id: 'ch1-conversions', section: '1.1 Data Representation', subtopicCode: '1.1', eyebrow: '1.1 · CONVERSION',
    title: 'Convert by understanding place value — not by guessing',
    lead: 'For binary → denary, add the weights of the 1 bits. For denary → binary, choose powers of two that sum to the target. Hexadecimal provides a compact bridge because each hex digit represents four bits.',
    example: {
      title: 'Convert 173₁₀ to binary and hexadecimal',
      lines: ['173 = 128 + 32 + 8 + 4 + 1', 'Binary = 1010 1101', 'Group as nibbles: 1010 1101', '1010 = A, 1101 = D'],
      answer: '173₁₀ = 10101101₂ = AD₁₆',
    },
    teacherPrompt: 'Invite a student to explain why grouping binary from the right in groups of four works for hexadecimal.',
    visual: 'bases', accent: 'cyan',
  },
  {
    id: 'ch1-arithmetic', section: '1.1 Data Representation', subtopicCode: '1.1', eyebrow: '1.1 · BINARY ARITHMETIC',
    title: 'Addition, subtraction and overflow',
    lead: 'Binary arithmetic follows the same place-value logic as denary, but each column only has two states.',
    bullets: [
      'Addition rules: 0+0=0, 0+1=1, 1+1=10, 1+1+1=11.',
      'Subtraction can be completed column by column with borrowing.',
      'Overflow occurs when the result needs more bits than the fixed storage width provides.',
      'An overflow bit is not “extra precision”; it means the allocated representation cannot hold the result.',
    ],
    example: { title: '8-bit overflow', lines: ['1111 0000', '+ 0011 0000', '= 1 0010 0000'], answer: 'Nine bits are required, so an 8-bit result overflows.' },
    visual: 'arithmetic', accent: 'rose',
  },
  {
    id: 'ch1-bcd-hex', section: '1.1 Data Representation', subtopicCode: '1.1', eyebrow: '1.1 · PRACTICAL REPRESENTATIONS',
    title: 'Why BCD and hexadecimal still matter',
    lead: 'The best representation depends on the job. BCD preserves individual decimal digits; hexadecimal gives humans a short, readable view of long binary patterns.',
    bullets: [
      'BCD is useful when exact decimal digits must be displayed or processed digit-by-digit, such as clocks and calculators.',
      'Hexadecimal is useful for memory addresses, machine-code debugging, MAC addresses and colour values.',
      'BCD is not the same as converting the whole denary number to binary: each decimal digit gets its own nibble.',
    ],
    example: { title: 'BCD example', lines: ['Denary: 59', '5 → 0101', '9 → 1001'], answer: 'BCD 59 = 0101 1001' },
    visual: 'bases', accent: 'amber',
  },
  {
    id: 'ch1-characters', section: '1.1 Data Representation', subtopicCode: '1.1', eyebrow: '1.1 · CHARACTER ENCODING',
    title: 'Text needs a character set',
    lead: 'A computer stores characters by mapping each symbol to a numeric code, which is then stored in binary.',
    bullets: [
      'ASCII provides a standard mapping for common Latin letters, digits, punctuation and control characters.',
      'Unicode is designed to represent characters from writing systems around the world and many additional symbols.',
      'The meaning of a bit pattern depends on the character encoding used to interpret it.',
      'A larger character repertoire can require more storage per character depending on the encoding.',
    ],
    teacherPrompt: 'Ask learners to predict why exchanging text between systems can fail when the encoding is assumed incorrectly.',
    visual: 'characters', accent: 'emerald',
  },
  {
    id: 'ch1-exam-11', section: '1.1 Data Representation', subtopicCode: '1.1', eyebrow: 'PAST PAPER · 1.1',
    title: 'Cambridge checkpoint: Data Representation',
    lead: 'These questions are loaded live from the approved 2021–2025 corpus for this subtopic. Use them immediately after explanation, while the reasoning is fresh.',
    examPractice: true, accent: 'indigo',
  },
  {
    id: 'ch1-bitmap', section: '1.2 Multimedia', subtopicCode: '1.2', eyebrow: '1.2 · BITMAP GRAPHICS',
    title: 'A bitmap is a grid of encoded pixels',
    lead: 'A bitmap image stores a colour value for every pixel in a rectangular grid, together with metadata that tells software how to interpret the data.',
    bullets: [
      'Resolution describes the number of pixels across and down the image.',
      'Colour depth is the number of bits used to encode the colour of one pixel.',
      'With n bits per pixel, up to 2ⁿ colour values can be represented.',
      'The file also needs metadata such as dimensions, colour format and other header information.',
    ],
    visual: 'pixels', accent: 'cyan',
  },
  {
    id: 'ch1-bitmap-size', section: '1.2 Multimedia', subtopicCode: '1.2', eyebrow: '1.2 · FILE SIZE',
    title: 'More pixels × more bits = a larger file',
    lead: 'Before compression and headers, bitmap size can be estimated directly from image dimensions and colour depth.',
    formula: 'size in bits = width × height × colour depth',
    example: { title: 'Worked example', lines: ['1920 × 1080 pixels', '24 bits per pixel', '1920 × 1080 × 24 = 49,766,400 bits', '÷ 8 = 6,220,800 bytes'], answer: '≈ 6.22 MB before compression and metadata (using decimal MB).' },
    bullets: ['Higher resolution improves spatial detail but increases size.', 'Higher colour depth allows more colours but increases size.', 'Reducing either can save storage at the cost of image fidelity.'],
    visual: 'pixels', accent: 'indigo',
  },
  {
    id: 'ch1-vector', section: '1.2 Multimedia', subtopicCode: '1.2', eyebrow: '1.2 · VECTOR GRAPHICS',
    title: 'Vectors store instructions, not a pixel for every point',
    lead: 'A vector graphic describes shapes mathematically — positions, lines, curves, fills and transformations — then renders them when needed.',
    bullets: [
      'Excellent for logos, diagrams, icons and drawings made from geometric objects.',
      'Can scale without pixelation because objects are recalculated at the new size.',
      'Individual objects are easy to edit.',
      'Bitmap is usually better for complex photographic detail; vector is usually better for clean geometry.',
    ],
    teacherPrompt: 'Show a logo and a photograph. Ask which representation is more appropriate for each and require a justification.',
    visual: 'vectors', accent: 'emerald',
  },
  {
    id: 'ch1-sound', section: '1.2 Multimedia', subtopicCode: '1.2', eyebrow: '1.2 · DIGITAL SOUND',
    title: 'Sampling turns an analogue wave into numbers',
    lead: 'An analogue sound wave is measured at regular intervals. Each measured amplitude is quantised and stored as a binary value.',
    keyTerms: [
      { term: 'Sampling rate', definition: 'How many samples are taken each second.' },
      { term: 'Sampling resolution', definition: 'How many bits are available to represent each sample amplitude.' },
      { term: 'ADC', definition: 'Converts an analogue signal to digital sample values.' },
      { term: 'DAC', definition: 'Converts stored digital values back to an analogue output signal.' },
    ],
    visual: 'sound', accent: 'rose',
  },
  {
    id: 'ch1-sound-tradeoff', section: '1.2 Multimedia', subtopicCode: '1.2', eyebrow: '1.2 · QUALITY VS SIZE',
    title: 'Sampling rate and resolution control fidelity',
    lead: 'More samples describe the shape of the wave more frequently; more bits per sample describe amplitude more precisely. Both increase file size.',
    formula: 'sound size ≈ sample rate × sample resolution × duration × channels',
    bullets: [
      'Increasing sample rate can capture faster changes in the signal.',
      'Increasing sample resolution reduces quantisation steps and improves amplitude precision.',
      'Doubling one factor approximately doubles the raw data size if all others stay constant.',
    ],
    visual: 'sound', accent: 'amber',
  },
  {
    id: 'ch1-exam-12', section: '1.2 Multimedia', subtopicCode: '1.2', eyebrow: 'PAST PAPER · 1.2',
    title: 'Cambridge checkpoint: Graphics & Sound',
    lead: 'Use these live corpus questions to connect the representation model to marks: explain the encoding, calculate file size, and justify design choices.',
    examPractice: true, accent: 'cyan',
  },
  {
    id: 'ch1-compression-why', section: '1.3 Compression', subtopicCode: '1.3', eyebrow: '1.3 · WHY COMPRESS?',
    title: 'Compression removes storage and transmission cost',
    lead: 'Large files take longer to transfer and consume more storage. Compression represents the same useful information with fewer bits.',
    bullets: [
      'Less storage space is required.',
      'Downloads and uploads can complete faster.',
      'Streaming needs less bandwidth.',
      'Backups and network transfers become more efficient.',
      'The acceptable method depends on whether any information may be discarded.',
    ],
    visual: 'compression', accent: 'indigo',
  },
  {
    id: 'ch1-lossy-lossless', section: '1.3 Compression', subtopicCode: '1.3', eyebrow: '1.3 · LOSSLESS VS LOSSY',
    title: 'Can the original be reconstructed exactly?',
    lead: 'That single question separates lossless from lossy compression.',
    keyTerms: [
      { term: 'Lossless', definition: 'No information is permanently removed; decompression can reconstruct the original exactly.' },
      { term: 'Lossy', definition: 'Some information is permanently discarded to achieve a greater reduction in size.' },
    ],
    bullets: [
      'Use lossless when every symbol or value matters: source code, text, structured data and archival originals.',
      'Lossy methods are suitable when controlled quality loss is acceptable: many photos, audio and video applications.',
      'A strong exam answer always links the method to the consequence of losing data in the stated scenario.',
    ],
    visual: 'compression', accent: 'rose',
  },
  {
    id: 'ch1-compression-methods', section: '1.3 Compression', subtopicCode: '1.3', eyebrow: '1.3 · HOW FILES SHRINK',
    title: 'Different media contain different kinds of redundancy',
    lead: 'Compression works by finding repetition, using shorter codes for common patterns, or removing detail that is less important to perception.',
    bullets: [
      'Text: repeated patterns or frequently occurring symbols can be encoded more compactly.',
      'Bitmap: runs of identical pixels can be represented by a count and value (run-length encoding).',
      'Vector graphic: repeated objects, coordinates or drawing instructions can be encoded efficiently.',
      'Sound: perceptual compression can discard components that are less noticeable to human hearing; lossless methods can also encode repeated/predictable patterns.',
    ],
    example: { title: 'Run-length encoding', lines: ['AAAAA BBBB CC', 'Store run count + symbol'], answer: '5A 4B 2C — useful only when long repeated runs exist.' },
    visual: 'compression', accent: 'emerald',
  },
  {
    id: 'ch1-exam-13', section: '1.3 Compression', subtopicCode: '1.3', eyebrow: 'PAST PAPER · 1.3',
    title: 'Cambridge checkpoint: Compression',
    lead: 'Finish the chapter by choosing compression methods and explaining the trade-offs in real contexts.',
    examPractice: true, accent: 'emerald',
  },
  {
    id: 'ch1-recap', section: 'Chapter recap', eyebrow: 'CHAPTER 01 · RECAP',
    title: 'From meaning → representation → efficient storage',
    lead: 'The chapter is one connected story: choose a representation, encode it as bits, understand what controls quality and size, then compress when the cost of those bits matters.',
    bullets: [
      'Numbers: bases, conversions, arithmetic, overflow, BCD and hexadecimal.',
      'Text: character sets map symbols to binary codes.',
      'Images: bitmap pixels vs vector instructions.',
      'Sound: sampling rate and resolution determine fidelity and size.',
      'Compression: justify lossless or lossy methods from the requirements of the data.',
    ],
    teacherPrompt: 'Exit question: “Which single change would you make to reduce a multimedia file, and what quality consequence would you expect?”',
    visual: 'recap', accent: 'indigo',
  },
];

const chapter13Slides: LessonSlide[] = [
  {
    id: 'ch13-opening', section: 'Chapter overview', eyebrow: 'CHAPTER 13 · A LEVEL',
    title: 'Data Representation',
    lead: 'At A Level, representation becomes a design problem: create meaningful data types, organise records for the access pattern you need, and store real numbers with finite precision.',
    bullets: ['13.1 User-defined data types', '13.2 File organisation and access', '13.3 Floating-point numbers'],
    teacherPrompt: 'Ask: “When does choosing the wrong data representation make a program slow, unsafe or inaccurate?”',
    visual: 'types', accent: 'indigo',
  },
  {
    id: 'ch13-why-types', section: '13.1 User-defined data types', subtopicCode: '13.1', eyebrow: '13.1 · DESIGNING TYPES',
    title: 'A type should model the problem — not fight it',
    lead: 'User-defined types let programmers name valid states and group related data so the program mirrors the real-world problem more clearly.',
    bullets: [
      'They improve readability by giving domain concepts explicit names.',
      'They restrict values to meaningful states and can prevent invalid data.',
      'They make complex structures easier to reuse and maintain.',
      'The correct type depends on whether one value, a reference, a collection or several fields must be represented.',
    ],
    visual: 'types', accent: 'cyan',
  },
  {
    id: 'ch13-non-composite', section: '13.1 User-defined data types', subtopicCode: '13.1', eyebrow: '13.1 · NON-COMPOSITE TYPES',
    title: 'One defined value or one reference',
    lead: 'A non-composite type does not combine a set of named fields from different types.',
    keyTerms: [
      { term: 'Enumerated type', definition: 'Defines an ordered list of all allowed symbolic values, such as (Red, Amber, Green).' },
      { term: 'Pointer type', definition: 'Stores a memory address/reference to a value of a specified type.' },
    ],
    example: { title: 'Pseudocode patterns', lines: ['TYPE TSignal = (RED, AMBER, GREEN)', 'TYPE TNodePointer = ^TNode'], answer: 'The type itself communicates valid states or what kind of object the pointer may reference.' },
    visual: 'types', accent: 'emerald',
  },
  {
    id: 'ch13-composite', section: '13.1 User-defined data types', subtopicCode: '13.1', eyebrow: '13.1 · COMPOSITE TYPES',
    title: 'Composite types build a larger value from other types',
    lead: 'Composite data types reference one or more other data types in their definition.',
    keyTerms: [
      { term: 'Record', definition: 'A fixed collection of named fields; different fields may use different data types.' },
      { term: 'Set', definition: 'A collection of distinct values drawn from a defined base type.' },
      { term: 'Class/Object', definition: 'A composite model that can combine state with operations in object-oriented contexts.' },
    ],
    example: { title: 'Record design', lines: ['TYPE TStudent', '  DECLARE Name : STRING', '  DECLARE CandidateNo : INTEGER', '  DECLARE Active : BOOLEAN', 'ENDTYPE'], answer: 'One value now represents a complete student record.' },
    visual: 'types', accent: 'indigo',
  },
  {
    id: 'ch13-type-choice', section: '13.1 User-defined data types', subtopicCode: '13.1', eyebrow: '13.1 · CHOOSING A TYPE',
    title: 'Choose the smallest structure that expresses the rules clearly',
    lead: 'Cambridge questions often describe a scenario and expect a justified data-type choice.',
    bullets: [
      'Finite named states → enumerated type.',
      'Need to reference a dynamically linked structure → pointer.',
      'Several related attributes describing one entity → record.',
      'Need a collection of distinct values with set operations → set.',
      'Justification should mention the structure of the data, not only repeat the type name.',
    ],
    teacherPrompt: 'Give four scenarios and ask teams to hold up “ENUM / POINTER / RECORD / SET”, then defend one choice.',
    visual: 'types', accent: 'amber',
  },
  {
    id: 'ch13-exam-131', section: '13.1 User-defined data types', subtopicCode: '13.1', eyebrow: 'PAST PAPER · 13.1',
    title: 'Cambridge checkpoint: User-defined data types',
    lead: 'Live questions from the corpus focus on definitions, pseudocode declarations and choosing a suitable type for a problem.',
    examPractice: true, accent: 'cyan',
  },
  {
    id: 'ch13-file-org', section: '13.2 File organisation & access', subtopicCode: '13.2', eyebrow: '13.2 · FILE ORGANISATION',
    title: 'Organisation describes how records are physically arranged',
    lead: 'The access pattern of the application should drive the organisation of the file.',
    keyTerms: [
      { term: 'Serial', definition: 'Records are stored in the order they arrive; new records are appended.' },
      { term: 'Sequential', definition: 'Records are stored in order of a key field.' },
      { term: 'Random', definition: 'Records are placed at locations calculated from a key, normally using hashing.' },
    ],
    bullets: [
      'Serial suits logs or temporary batches where arrival order matters.',
      'Sequential suits processing most/all records in key order, such as payroll batches.',
      'Random suits frequent retrieval of individual records when fast direct access is important.',
    ],
    visual: 'files', accent: 'indigo',
  },
  {
    id: 'ch13-file-access', section: '13.2 File organisation & access', subtopicCode: '13.2', eyebrow: '13.2 · ACCESS METHODS',
    title: 'Organisation and access are related — but not identical',
    lead: 'File organisation is how records are laid out; file access is how a program reaches the required record.',
    keyTerms: [
      { term: 'Sequential access', definition: 'Read records one after another from the start/current position until the target is reached.' },
      { term: 'Direct access', definition: 'Reach a target record without reading every preceding record, using a calculated address or index.' },
    ],
    bullets: [
      'Sequential access is simple and efficient when many records must be processed in order.',
      'Direct access is valuable when the system repeatedly needs one specific record quickly.',
      'A good design answer links organisation + access method to the workload in the scenario.',
    ],
    visual: 'files', accent: 'cyan',
  },
  {
    id: 'ch13-hashing', section: '13.2 File organisation & access', subtopicCode: '13.2', eyebrow: '13.2 · HASHING',
    title: 'A hashing algorithm turns a key into a storage location',
    lead: 'Hashing aims to calculate where a record should live so it can later be found without scanning the entire file.',
    formula: 'address = hash(key)',
    bullets: [
      'The same key must always produce the same home location.',
      'Different keys can produce the same address — this is a collision.',
      'Collision handling may use an overflow area (open hashing) or search for another free slot such as linear probing (closed hashing).',
      'A useful hash spreads records across the available address space rather than clustering them heavily.',
    ],
    example: { title: 'Simple illustration', lines: ['key = 48217', 'hash(key) = key MOD 1000', 'home address = 217'], answer: 'If another key also maps to 217, a collision strategy is required.' },
    visual: 'hashing', accent: 'rose',
  },
  {
    id: 'ch13-exam-132', section: '13.2 File organisation & access', subtopicCode: '13.2', eyebrow: 'PAST PAPER · 13.2',
    title: 'Cambridge checkpoint: File organisation & access',
    lead: 'Use these questions to practise selecting organisation/access methods and explaining hashing and collision handling.',
    examPractice: true, accent: 'emerald',
  },
  {
    id: 'ch13-floating-format', section: '13.3 Floating-point', subtopicCode: '13.3', eyebrow: '13.3 · FLOATING-POINT FORMAT',
    title: 'Mantissa controls precision; exponent controls range',
    lead: 'A binary floating-point value stores a signed mantissa and signed exponent, conceptually representing M × 2ᴱ.',
    keyTerms: [
      { term: 'Mantissa', definition: 'Carries the significant binary digits and therefore determines precision.' },
      { term: 'Exponent', definition: 'Moves the binary point and therefore determines the representable range.' },
      { term: 'Normalisation', definition: 'Shifts the representation so available mantissa bits carry as much significant information as possible.' },
    ],
    formula: 'value = mantissa × 2^exponent',
    visual: 'floating', accent: 'indigo',
  },
  {
    id: 'ch13-floating-convert', section: '13.3 Floating-point', subtopicCode: '13.3', eyebrow: '13.3 · CONVERSION',
    title: 'Interpret the mantissa first, then apply the exponent',
    lead: 'Conversion questions reward visible working: identify the signed exponent, reposition the binary point, then evaluate the resulting binary value.',
    example: {
      title: 'Positive example',
      lines: ['Mantissa represents 0.101101₂', 'Exponent = 3', '0.101101 × 2³ = 101.101₂', '101.101₂ = 5 + 0.5 + 0.125'],
      answer: '5.625₁₀',
    },
    bullets: ['For negative values, remember the mantissa is represented using two’s complement.', 'Keep the bit widths shown in the question; do not silently add precision.'],
    visual: 'floating', accent: 'cyan',
  },
  {
    id: 'ch13-normalise', section: '13.3 Floating-point', subtopicCode: '13.3', eyebrow: '13.3 · NORMALISATION',
    title: 'Normalisation uses the mantissa bits efficiently',
    lead: 'For two’s-complement mantissas, a normalised positive mantissa starts 01… and a normalised negative mantissa starts 10….',
    bullets: [
      'Repeated leading 00 (positive) or 11 (negative) wastes precision.',
      'Shift the mantissa and adjust the exponent by the same number of positions so the represented value does not change.',
      'Normalisation gives a consistent form and maximises significant bits for the allocated mantissa width.',
    ],
    teacherPrompt: 'Display three mantissas and ask learners to identify which are normalised before doing any arithmetic.',
    visual: 'floating', accent: 'emerald',
  },
  {
    id: 'ch13-precision-range', section: '13.3 Floating-point', subtopicCode: '13.3', eyebrow: '13.3 · FINITE BITS, REAL CONSEQUENCES',
    title: 'Precision and range compete for the same fixed number of bits',
    lead: 'If total storage is fixed, allocating more bits to one part means fewer bits for the other.',
    bullets: [
      'More mantissa bits → more significant digits → greater precision.',
      'More exponent bits → larger positive/negative exponent values → greater range.',
      'Not every denary fraction has a finite binary representation, so stored values can be approximations.',
      'Repeated calculations can accumulate rounding error.',
      'Overflow occurs when magnitude exceeds the representable range; underflow occurs when a non-zero magnitude is too close to zero to represent meaningfully.',
    ],
    visual: 'precision', accent: 'rose',
  },
  {
    id: 'ch13-rounding', section: '13.3 Floating-point', subtopicCode: '13.3', eyebrow: '13.3 · ROUNDING ERROR',
    title: 'A stored binary value can be close — but not exact',
    lead: 'Some fractions terminate in denary but repeat indefinitely in binary. With finite mantissa bits, the representation must be rounded or truncated.',
    example: { title: 'Conceptual example', lines: ['0.1₁₀ has no short exact binary expansion.', 'A fixed-width mantissa stores only a finite prefix.', 'The stored value is therefore an approximation.'], answer: 'Comparisons and repeated arithmetic can expose the small difference.' },
    teacherPrompt: 'Ask why financial software should avoid assuming that every decimal fraction can be stored exactly as binary floating-point.',
    visual: 'precision', accent: 'amber',
  },
  {
    id: 'ch13-exam-133', section: '13.3 Floating-point', subtopicCode: '13.3', eyebrow: 'PAST PAPER · 13.3',
    title: 'Cambridge checkpoint: Floating-point',
    lead: 'Finish with live conversion, normalisation, precision/range and rounding-error questions from the approved corpus.',
    examPractice: true, accent: 'indigo',
  },
  {
    id: 'ch13-recap', section: 'Chapter recap', eyebrow: 'CHAPTER 13 · RECAP',
    title: 'Good representation is a deliberate engineering choice',
    lead: 'The common idea across Chapter 13 is fitness for purpose: choose a type that models valid data, a file organisation that matches access behaviour, and a numeric format whose finite precision is understood.',
    bullets: [
      'User-defined types make constraints and structure explicit.',
      'Serial, sequential and random organisation serve different workloads.',
      'Hashing enables direct location but creates collision-handling problems.',
      'Mantissa bits buy precision; exponent bits buy range.',
      'Floating-point arithmetic can approximate and accumulate rounding error.',
    ],
    teacherPrompt: 'Exit challenge: design a representation for a real system and defend one choice from each section: type, file organisation and numeric precision.',
    visual: 'recap', accent: 'indigo',
  },
];

export const LESSON_CHAPTERS: LessonChapter[] = [
  {
    number: 1,
    level: 'AS Level',
    title: 'Information Representation',
    subtitle: 'Numbers, text, graphics, sound and compression — the foundations of digital data.',
    subtopics: ['1.1 Data Representation', '1.2 Multimedia – Graphics, Sound', '1.3 Compression'],
    sourceNote: 'Aligned to Cambridge 9618 (2026) Topic 1 and the Hodder coursebook Chapter 1 structure.',
    slides: chapter1Slides,
  },
  {
    number: 13,
    level: 'A Level',
    title: 'Data Representation',
    subtitle: 'User-defined types, file organisation, hashing and binary floating-point.',
    subtopics: ['13.1 User-defined data types', '13.2 File organisation and access', '13.3 Floating-point numbers'],
    sourceNote: 'Aligned to Cambridge 9618 (2026) Topic 13 and the Hodder coursebook Chapter 13 structure.',
    slides: chapter13Slides,
  },
];

export function lessonChapter(number: number) {
  return LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? LESSON_CHAPTERS[0]!;
}
