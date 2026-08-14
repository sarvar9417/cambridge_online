/**
 * Pure-data transcript of Cambridge International AS & A Level Computer
 * Science 9618/11 Paper 1 Theory Fundamentals, May/June 2023, transcribed from
 * the published question paper and mark scheme (© UCLES 2023, used for
 * internal teaching).
 *
 * Everything is authored in LaTeX under the KaTeX contract (see
 * `backend/src/lib/latex.ts`): `$...$` segments are maths, everything outside
 * them is plain text. Binary/hex notation, table layouts and the logic
 * expression are maths segments so they render the way the exam printed them.
 *
 * The tree mirrors the paper: each numbered question is a context node, each
 * part carries its own stem and mark scheme. Subtopics are linked by syllabus
 * code (e.g. "1.2") resolved against the 2026 syllabus mapping used by the
 * whole bank.
 *
 * This file has no imports and no side effects so the transcript can be unit
 * tested without a database (see paper-9618-s23-11.test.ts).
 */

export type Scheme = 'all_required' | 'any_n_from_m' | 'levels_of_response' | 'exact_match';
export type Command =
  | 'State'
  | 'Give'
  | 'Name'
  | 'Identify'
  | 'Define'
  | 'Describe'
  | 'Explain'
  | 'Compare'
  | 'Calculate'
  | 'Complete'
  | 'Draw'
  | 'Write'
  | 'Evaluate'
  | 'Justify'
  | 'Suggest'
  | 'Show'
  | 'Other';
export type AnswerKind = 'text' | 'pseudocode' | 'code' | 'image' | 'table' | 'diagram';
export type Ao = 'AO1' | 'AO2' | 'AO3';

export interface SchemePoint {
  code: string;
  text: string;
  textLatex?: string;
  marks?: number;
  accept?: string[];
  reject?: string[];
  requires?: string[];
  isBod?: boolean;
  groupLabel?: string;
}

export interface SchemeGroup {
  label: string;
  nRequired: number;
  marksPerPoint: number;
  maxMarks: number;
}

export interface SeedScheme {
  type: Scheme;
  maxMarks: number;
  guidance?: string;
  groups?: SchemeGroup[];
  points: SchemePoint[];
}

export interface SeedLeaf {
  path: string;
  label: string;
  stemLatex: string;
  contextLatex?: string;
  command: Command;
  marks: number;
  ao?: Ao;
  answerKind?: AnswerKind;
  answerLines?: number;
  subtopics: string[];
  scheme: SeedScheme;
}

export interface SeedNode {
  path: string;
  label: string;
  displayRef: string;
  contextLatex?: string;
  subtopics?: string[];
  children: Array<SeedNode | SeedLeaf>;
}

const point = (code: string, text: string, extra: Partial<SchemePoint> = {}): SchemePoint => ({
  code,
  text,
  textLatex: text,
  ...extra,
});

const any = (code: string, text: string): SchemePoint => ({
  code,
  text,
  textLatex: text,
  marks: 1,
  groupLabel: 'Points',
});

/**
 * One "mark each to max N" line becomes an any-n-from-m group with a single
 * point of entry; Cambridge awards a mark for each correct item up to the cap.
 */
function maxFrom(texts: string[], cap: number): SeedScheme {
  return {
    type: 'any_n_from_m',
    maxMarks: cap,
    groups: [{ label: 'Points', nRequired: 1, marksPerPoint: 1, maxMarks: cap }],
    points: texts.map((text, index) => any(`MP${index + 1}`, text)),
  };
}

/** Exact required items, one point each, all needed. */
function allRequired(texts: string[], guidance?: string): SeedScheme {
  return {
    type: 'all_required',
    maxMarks: texts.length,
    guidance,
    points: texts.map((text, index) => point(`MP${index + 1}`, text)),
  };
}

export const PAPER: SeedNode[] = [
  {
    path: '1',
    label: '1',
    displayRef: '9618/11/M/J/23 Q1',
    contextLatex:
      'Images are being created to advertise holidays. Some of the images are bitmap images and some are vector graphics.',
    children: [
      {
        path: '1.a',
        label: 'a',
        stemLatex:
          'Complete the table by defining the image terms.\n\n$\\begin{array}{|l|l|} \\hline \\text{Term} & \\text{Definition} \\\\ \\hline \\text{Drawing list} & \\\\[0.6em] \\hline \\text{Pixel} & \\\\[0.6em] \\hline \\text{Colour depth} & \\\\[0.6em] \\hline \\end{array}$',
        command: 'Complete',
        marks: 3,
        ao: 'AO1',
        answerKind: 'table',
        answerLines: 9,
        subtopics: ['1.2'],
        scheme: allRequired(
          [
            'Drawing list: all the drawing objects in an image // a list that stores the commands required to draw each object',
            'Pixel: the smallest part of the image // one square / dot of one colour',
            'Colour depth: the number of bits per pixel // determines the number of colours that can be represented in the image',
          ],
          '1 mark for each correct definition',
        ),
      },
      {
        path: '1.b',
        label: 'b',
        displayRef: '9618/11/M/J/23 Q1(b)',
        contextLatex: 'The bitmap images are photographs of the holiday locations.',
        children: [
          {
            path: '1.b.i',
            label: 'i',
            stemLatex:
              'Colour depth and image resolution are both included in the file header of a bitmap image. Identify two other items that could be included in the file header of each photograph.',
            command: 'Identify',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['1.2'],
            scheme: maxFrom(
              [
                'Confirmation that it is a bitmap // file type',
                'Compression type',
                'Location/offset of data within the file',
                'Dimensions e.g. 100 × 100 pixels',
              ],
              2,
            ),
          },
          {
            path: '1.b.ii',
            label: 'ii',
            stemLatex:
              'One of the photographs has a bit depth of 8 bytes and an image resolution of 1500 pixels wide and 3000 pixels high. Calculate the file size of the photograph in megabytes. Show your working.',
            command: 'Calculate',
            marks: 2,
            ao: 'AO2',
            answerLines: 6,
            subtopics: ['1.2'],
            scheme: allRequired(
              ['Working: (1500 * 3000 * 8) / 1000 / 1000', 'Answer: 36 MB'],
              '1 mark for working; 1 mark for answer',
            ),
          },
        ],
      },
      {
        path: '1.c',
        label: 'c',
        displayRef: '9618/11/M/J/23 Q1(c)',
        contextLatex:
          'The photographs are compressed before they are uploaded to a web server. Customers download the photographs from this web server.',
        children: [
          {
            path: '1.c.i',
            label: 'i',
            stemLatex: 'Explain the reasons why compressing the photographs will benefit the customers.',
            command: 'Explain',
            marks: 3,
            ao: 'AO1',
            answerLines: 6,
            subtopics: ['1.3'],
            scheme: maxFrom(
              [
                'The customers will be able to download the photographs in less time',
                '…and they will take less of the customer’s bandwidth',
                'The photographs will take up less space on the customer’s storage medium',
                '…therefore the customers can store more images',
                '…and will have more space for other files',
              ],
              3,
            ),
          },
          {
            path: '1.c.ii',
            label: 'ii',
            stemLatex:
              'An image can be compressed using run‑length encoding (RLE). Explain the reasons why RLE may not reduce the file size of a bitmap image. Give one example in your answer.',
            command: 'Explain',
            marks: 3,
            ao: 'AO2',
            answerLines: 6,
            subtopics: ['1.3'],
            scheme: maxFrom(
              [
                'RLE stores a colour and the number of times it occurs consecutively',
                'An image may not have many sequences of the same colour',
                'It would need to store each colour and then the count/number 1 which adds data',
                'Example: Red‑Green‑Blue would become Red 1 Green 1 Blue 1',
              ],
              3,
            ),
          },
        ],
      },
    ],
  },
  {
    path: '2',
    label: '2',
    displayRef: '9618/11/M/J/23 Q2',
    contextLatex:
      'An organisation uses a database to store data about the types of bird that people have seen.',
    children: [
      {
        path: '2.a',
        label: 'a',
        displayRef: '9618/11/M/J/23 Q2(a)',
        contextLatex: 'The database is managed using a Database Management System (DBMS).',
        children: [
          {
            path: '2.a.i',
            label: 'i',
            stemLatex:
              'State what is meant by a data dictionary and give one example of an item typically found in a data dictionary.',
            command: 'State',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['8.2'],
            scheme: allRequired(
              [
                'Definition: data about the data in the database // data about the structure of the database // metadata for a database',
                'Example: table names / data types / field names',
              ],
              '1 mark for definition; 1 mark for a suitable example',
            ),
          },
          {
            path: '2.a.ii',
            label: 'ii',
            stemLatex:
              'State what is meant by data integrity and give one example of how this is implemented in a database.',
            command: 'State',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['8.1'],
            scheme: allRequired(
              [
                'Definition: methods of making sure the data is consistent',
                'Example: enforcing referential integrity / cascading update/delete / validation or verification rules',
              ],
              '1 mark for definition; 1 mark for example',
            ),
          },
        ],
      },
      {
        path: '2.b',
        label: 'b',
        displayRef: '9618/11/M/J/23 Q2(b)',
        contextLatex:
          'The database, Birds, stores information about the types of bird and the people who have seen them. Data about each bird seen is stored with its location and data about the person who saw the bird.\n\nDatabase Birds has the following tables:\n\n$\\texttt{BIRD\\_TYPE(BirdID, Name, Size)}$\n\n$\\texttt{BIRD\\_SEEN(SeenID, BirdID, Date, Location, PersonID)}$\n\n$\\texttt{PERSON(PersonID, FirstName, LastName, EmailAddress)}$',
        children: [
          {
            path: '2.b.i',
            label: 'i',
            stemLatex:
              'Complete the table by identifying two foreign keys and the database table where each is found.\n\n$\\begin{array}{|l|l|} \\hline \\text{Foreign key} & \\text{Database table} \\\\[0.6em] \\hline & \\\\[0.6em] \\hline & \\\\[0.6em] \\hline \\end{array}$',
            command: 'Complete',
            marks: 2,
            ao: 'AO1',
            answerKind: 'table',
            answerLines: 4,
            subtopics: ['8.1'],
            scheme: allRequired(
              ['Foreign key: BirdID — table: BIRD_SEEN', 'Foreign key: PersonID — table: BIRD_SEEN'],
              '1 mark for each field name and table',
            ),
          },
          {
            path: '2.b.ii',
            label: 'ii',
            stemLatex:
              'The database Birds has been normalised. Draw one line from each Normal Form to the most appropriate definition.\n\n$\\begin{array}{|l|l|} \\hline \\text{Normal Form} & \\text{Definition} \\\\ \\hline \\text{First Normal Form (1NF)} & \\text{All fields are fully dependent on the primary key.} \\\\ \\text{Second Normal Form (2NF)} & \\text{There are no repeating groups of attributes.} \\\\ \\text{Third Normal Form (3NF)} & \\text{There are no partial dependencies.} \\\\ \\hline \\end{array}$',
            command: 'Complete',
            marks: 1,
            ao: 'AO1',
            answerKind: 'table',
            subtopics: ['8.1'],
            scheme: allRequired(
              [
                'All three lines correct: 1NF – no repeating groups of attributes; 2NF – no partial dependencies; 3NF – all fields fully dependent on the primary key',
              ],
              '1 mark for all 3 correct lines',
            ),
          },
          {
            path: '2.b.iii',
            label: 'iii',
            stemLatex:
              'Part of the database table BIRD_TYPE is shown:\n\n$\\begin{array}{|l|l|l|} \\hline \\text{BirdID} & \\text{Name} & \\text{Size} \\\\ \\hline \\text{0123} & \\text{Blackbird} & \\text{Medium} \\\\ \\text{0035} & \\text{Jay} & \\text{Large} \\\\ \\text{0004} & \\text{Raven} & \\text{Large} \\\\ \\text{0085} & \\text{Robin} & \\text{Small} \\\\ \\hline \\end{array}$\n\nThe database only supports these data types: character, varchar, Boolean, integer, real, date, time.\n\nWrite a Structured Query Language (SQL) script to define the table Bird_Type.',
            command: 'Write',
            marks: 4,
            ao: 'AO2',
            answerKind: 'code',
            answerLines: 8,
            subtopics: ['8.3'],
            scheme: allRequired(
              [
                'CREATE TABLE start and end bracket',
                'BirdID as CHAR/VARCHAR',
                'Name and size as VARCHAR/CHAR',
                'BirdID as primary key',
              ],
              '1 mark each. Example: CREATE TABLE BIRD_TYPE( BirdID CHAR(4) NOT NULL, Name VARCHAR(9), Size VARCHAR(6), PRIMARY KEY (BirdID) );',
            ),
          },
          {
            path: '2.b.iv',
            label: 'iv',
            stemLatex:
              'The database tables are repeated here for reference:\n\n$\\texttt{BIRD\\_TYPE(BirdID, Name, Size)}$\n\n$\\texttt{BIRD\\_SEEN(SeenID, BirdID, Date, Location, PersonID)}$\n\n$\\texttt{PERSON(PersonID, FirstName, LastName, EmailAddress)}$\n\nComplete the SQL script to return the number of birds of each size seen by the person with the ID of J_123.\n\n$\\texttt{SELECT BIRD\\_TYPE.Size, \\ldots\\ldots\\ldots\\ldots (BIRD\\_TYPE.BirdID)}$\n\n$\\texttt{\\phantom{SELECT }AS NumberOfBirds}$\n\n$\\texttt{FROM BIRD\\_TYPE, \\ldots\\ldots\\ldots\\ldots\\ldots\\ldots}$\n\n$\\texttt{WHERE \\ldots\\ldots\\ldots\\ldots\\ldots\\ldots = "J\\_123"}$\n\n$\\texttt{AND BIRD\\_TYPE.BirdID = \\ldots\\ldots\\ldots\\ldots\\ldots\\ldots}$\n\n$\\texttt{\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots BIRD\\_TYPE.Size;}$',
            command: 'Complete',
            marks: 5,
            ao: 'AO2',
            answerKind: 'code',
            answerLines: 8,
            subtopics: ['8.3'],
            scheme: allRequired(
              [
                'SELECT BIRD_TYPE.Size, COUNT(BIRD_TYPE.BirdID) AS NumberOfBirds',
                'FROM BIRD_TYPE, BIRD_SEEN',
                'WHERE BIRD_SEEN.PersonID = "J_123"',
                'AND BIRD_TYPE.BirdID = BIRD_SEEN.BirdID',
                'GROUP BY BIRD_TYPE.Size;',
              ],
              '1 mark for each correctly completed space',
            ),
          },
        ],
      },
    ],
  },
  {
    path: '3',
    label: '3',
    displayRef: '9618/11/M/J/23 Q3',
    contextLatex: 'A computer has an Operating System (OS).',
    children: [
      {
        path: '3.a',
        label: 'a',
        stemLatex:
          'Describe how the Operating System manages the peripheral hardware devices of the computer.',
        command: 'Describe',
        marks: 4,
        ao: 'AO1',
        answerLines: 8,
        subtopics: ['5.1'],
        scheme: maxFrom(
          [
            'Installs device drivers',
            '… to allow communication between peripherals and computer',
            'Sends data and receives data to and from peripherals',
            '… such as to an output device and from an input device / by example',
            'Handles buffers for transfer of data',
            '… to ensure smooth transfer between devices that transmit and receive at different speeds',
            'Manages interrupts / signals from the device',
          ],
          4,
        ),
      },
      {
        path: '3.b',
        label: 'b',
        stemLatex:
          'Hardware management is one key management task carried out by the Operating System. Identify two other key management tasks carried out by the Operating System.',
        command: 'Identify',
        marks: 2,
        ao: 'AO1',
        answerLines: 2,
        subtopics: ['5.1'],
        scheme: maxFrom(
          ['Memory management', 'File management', 'Security management', 'Process management', 'Error checking and recovery'],
          2,
        ),
      },
      {
        path: '3.c',
        label: 'c',
        stemLatex:
          'The Operating System has utility software including defragmentation software. Explain how defragmentation can improve the performance of the computer.',
        command: 'Explain',
        marks: 3,
        ao: 'AO1',
        answerLines: 6,
        subtopics: ['5.1'],
        scheme: maxFrom(
          [
            'Rearranges blocks of individual files (on the HDD) so they are contiguous // moves the free space together',
            'Accessing each file is faster',
            '…because there is no need to search for the next fragment / block of the file',
            '…so less head movement is needed',
          ],
          3,
        ),
      },
      {
        path: '3.d',
        label: 'd',
        displayRef: '9618/11/M/J/23 Q3(d)',
        contextLatex: 'The computer stores data in binary form.',
        children: [
          {
            path: '3.d.i',
            label: 'i',
            stemLatex: 'State the difference between a kibibyte and a kilobyte.',
            command: 'State',
            marks: 1,
            ao: 'AO1',
            answerLines: 2,
            subtopics: ['1.1'],
            scheme: maxFrom(
              ['Kibibyte is 1024 bytes and kilobyte is 1000 bytes', 'Kibibyte is binary prefix and kilobyte is denary prefix'],
              1,
            ),
          },
          {
            path: '3.d.ii',
            label: 'ii',
            stemLatex: 'Convert the denary number 964 into Binary Coded Decimal (BCD).',
            command: 'Calculate',
            marks: 1,
            ao: 'AO2',
            answerLines: 2,
            subtopics: ['1.1'],
            scheme: allRequired(['1001 0110 0100']),
          },
          {
            path: '3.d.iii',
            label: 'iii',
            stemLatex: 'Convert the positive binary integer 11110010 into hexadecimal.',
            command: 'Calculate',
            marks: 1,
            ao: 'AO2',
            answerLines: 2,
            subtopics: ['1.1'],
            scheme: allRequired(['F2']),
          },
          {
            path: '3.d.iv',
            label: 'iv',
            stemLatex:
              'Give the smallest and largest two’s complement binary number that can be represented using 8 bits.',
            command: 'Give',
            marks: 2,
            ao: 'AO2',
            answerLines: 2,
            subtopics: ['1.1'],
            scheme: allRequired(['Smallest: 10000000', 'Largest: 01111111']),
          },
          {
            path: '3.d.v',
            label: 'v',
            stemLatex:
              'Add the following two binary integers using binary addition. Show your working.\n\n$\\begin{array}{rr} & 1\\,0\\,1\\,1\\,0\\,0\\,0\\,0 \\\\ + & 0\\,0\\,0\\,1\\,1\\,0\\,1\\,1 \\\\ \\hline \\end{array}$',
            command: 'Calculate',
            marks: 2,
            ao: 'AO2',
            answerLines: 4,
            subtopics: ['1.1'],
            scheme: allRequired(['Working: 10110000 + 00011011', 'Answer: 11001011'], '1 mark for working; 1 mark for answer'),
          },
          {
            path: '3.d.vi',
            label: 'vi',
            stemLatex:
              'Show the result of a 3‑place right logical shift on the binary number:\n\n$\\texttt{11001100}$',
            command: 'Show',
            marks: 1,
            ao: 'AO2',
            answerLines: 2,
            subtopics: ['1.1'],
            scheme: allRequired(['00011001']),
          },
        ],
      },
    ],
  },
  {
    path: '4',
    label: '4',
    displayRef: '9618/11/M/J/23 Q4',
    contextLatex:
      'A networked closed‑circuit television (CCTV) system in a house uses sensors and cameras to detect the presence of a person. It then tracks the person and records a video of their movements. Data from the CCTV cameras is transmitted to a central computer.',
    children: [
      {
        path: '4.a',
        label: 'a',
        displayRef: '9618/11/M/J/23 Q4(a)',
        contextLatex: 'This computer has both Read Only Memory (ROM) and Random Access Memory (RAM).',
        children: [
          {
            path: '4.a.i',
            label: 'i',
            stemLatex: 'Describe the contents of the ROM in the central computer.',
            command: 'Describe',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['3.1'],
            scheme: maxFrom(
              [
                'Stores the bootstrap program // start-up instructions for the central computer // BIOS',
                'Stores the start-up instructions for the CCTV system/cameras // firmware for CCTV',
                'Stores the kernel of the Operating System // stores parts of the Operating System',
              ],
              2,
            ),
          },
          {
            path: '4.a.ii',
            label: 'ii',
            stemLatex:
              'The central computer has Dynamic RAM (DRAM). Identify two advantages of using DRAM instead of Static RAM (SRAM).',
            command: 'Identify',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['3.1'],
            scheme: maxFrom(['Costs less per unit', 'Higher storage density', 'Simple design – uses fewer transistors'], 2),
          },
        ],
      },
      {
        path: '4.b',
        label: 'b',
        stemLatex:
          'The central computer stores the video files on secondary storage. Describe two reasons why magnetic storage is more appropriate than solid state storage for this computer.',
        command: 'Describe',
        marks: 4,
        ao: 'AO1',
        answerLines: 8,
        subtopics: ['3.1'],
        scheme: {
          type: 'any_n_from_m',
          maxMarks: 4,
          groups: [{ label: 'Points', nRequired: 1, marksPerPoint: 2, maxMarks: 4 }],
          points: [
            any('MP1', 'The computer will have a large number of read/write operations because it is working all the time'),
            any('MP2', '… magnetic storage has more longevity'),
            any('MP3', 'Magnetic storage costs less per storage unit'),
            any('MP4', '… videos are large files and therefore very large storage capacity is required'),
          ],
        },
      },
      {
        path: '4.c',
        label: 'c',
        stemLatex:
          'The CCTV system uses Artificial Intelligence (AI) to identify the presence of a person in the house and to track their movements. Describe how AI is used in this system.',
        command: 'Describe',
        marks: 3,
        ao: 'AO1',
        answerLines: 6,
        subtopics: ['18.1'],
        scheme: maxFrom(
          [
            'Uses image recognition',
            'Monitors every image taken to identify matching images/shapes/features to a person',
            '… starts recording to secondary storage/permanently when a person is identified',
            'System identifies direction of movement of person and uses this to decide where/how to move the camera/record',
            'System identifies other cameras to start recording based on direction of movement',
          ],
          3,
        ),
      },
      {
        path: '4.d',
        label: 'd',
        displayRef: '9618/11/M/J/23 Q4(d)',
        contextLatex:
          'The CCTV cameras are connected to a network and transfer their data wirelessly to the central computer.',
        children: [
          {
            path: '4.d.i',
            label: 'i',
            stemLatex:
              'Each device on the network has an IP address. Complete the description of IP addresses.\n\nAn IPv4 address contains $\\ldots\\ldots\\ldots\\ldots\\ldots$ groups of digits. Each group is represented in $\\ldots\\ldots\\ldots\\ldots\\ldots$ bits and the groups are separated by full stops.\n\nAn IPv6 address contains $\\ldots\\ldots\\ldots\\ldots\\ldots$ groups of digits. Each group is represented in $\\ldots\\ldots\\ldots\\ldots\\ldots$ bits. Multiple groups that only contain zeros can be replaced with a $\\ldots\\ldots\\ldots\\ldots\\ldots$.',
            command: 'Complete',
            marks: 5,
            ao: 'AO1',
            answerLines: 6,
            subtopics: ['2.1'],
            scheme: allRequired(
              [
                'IPv4: 4 groups of digits',
                'Each group represented in 8 bits',
                'IPv6: 8 groups of digits',
                'Each group represented in 16 bits',
                'Multiple zero groups replaced with a :: / double colon',
              ],
              '1 mark for each term',
            ),
          },
          {
            path: '4.d.ii',
            label: 'ii',
            stemLatex: 'The network makes use of subnetting. Describe two benefits of subnetting a network.',
            command: 'Describe',
            marks: 4,
            ao: 'AO1',
            answerLines: 8,
            subtopics: ['2.1'],
            scheme: {
              type: 'any_n_from_m',
              maxMarks: 4,
              groups: [{ label: 'Points', nRequired: 1, marksPerPoint: 2, maxMarks: 4 }],
              points: [
                any('MP1', 'Reduce amount of traffic in a network // improve network speed'),
                any('MP2', 'Data stays in its subnet so it does not travel as far'),
                any('MP3', 'Improves network security'),
                any('MP4', '… so that not all devices can access all areas of the network'),
                any('MP5', 'Allows for easier maintenance'),
                any('MP6', '… because only one subnetwork may need taking down/changing while the rest of the network can continue'),
              ],
            },
          },
        ],
      },
    ],
  },
  {
    path: '5',
    label: '5',
    displayRef: '9618/11/M/J/23 Q5',
    children: [
      {
        path: '5.a',
        label: 'a',
        stemLatex:
          'Draw the logic circuit for this logic expression:\n\n$T = (\\overline{A} \\lor B) \\oplus (C \\land D)$\n\nInputs: $A$, $B$, $C$, $D$. Output: $T$.',
        command: 'Draw',
        marks: 2,
        ao: 'AO2',
        answerKind: 'diagram',
        answerLines: 8,
        subtopics: ['3.2'],
        scheme: allRequired(
          [
            '1 mark for 2 gates drawn correctly',
            '2 marks for all 4 gates drawn correctly',
          ],
          'Circuit: NOT, OR, NAND, XOR — 4 gates in total.',
        ),
      },
      {
        path: '5.b',
        label: 'b',
        stemLatex: 'Describe the function of the NAND and NOR logic gates.',
        command: 'Describe',
        marks: 2,
        ao: 'AO1',
        answerLines: 4,
        subtopics: ['3.2'],
        scheme: allRequired(
          [
            'NAND: 0 is only output when both inputs are 1 // 1 is only output when none, or (either) one of the inputs is 1',
            'NOR: 1 is only output when both inputs are 0 // 0 is only output when (either) one or both inputs are 1',
          ],
          '1 mark each',
        ),
      },
    ],
  },
  {
    path: '6',
    label: '6',
    displayRef: '9618/11/M/J/23 Q6',
    contextLatex: 'An interrupt is generated when a key is pressed on a computer keyboard.',
    children: [
      {
        path: '6.a',
        label: 'a',
        stemLatex: 'Explain how the computer handles this interrupt.',
        command: 'Explain',
        marks: 5,
        ao: 'AO1',
        answerLines: 10,
        subtopics: ['4.1'],
        scheme: maxFrom(
          [
            'An interrupt flag is raised in the (interrupt) register',
            'At the end of the current FE cycle // at the start of the next FE cycle',
            'The system checks the interrupt register for higher priority interrupts than current process',
            'If true, it stores the current contents of the registers on the stack',
            'The appropriate interrupt service routine (ISR) for the key press is called',
            'The input data from the keyboard is processed',
            'The contents of the registers are restored from the stack',
            '… and control is passed back to previous process',
          ],
          5,
        ),
      },
    ],
  },
];

/** Flatten a paper tree into a single list of every node (context and leaf). */
export function flattenPaper(nodes: SeedNode[]): Array<SeedNode | SeedLeaf> {
  const list: Array<SeedNode | SeedLeaf> = [];
  const push = (item: SeedNode | SeedLeaf) => {
    list.push(item);
    if ('children' in item) for (const child of item.children) push(child);
  };
  for (const node of nodes) push(node);
  return list;
}
