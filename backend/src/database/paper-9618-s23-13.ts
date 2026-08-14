/**
 * Pure-data transcript of Cambridge International AS & A Level Computer
 * Science 9618/13 Paper 1 Theory Fundamentals, May/June 2023, transcribed from
 * the published question paper and mark scheme (© UCLES 2023, used for
 * internal teaching).
 *
 * Same LaTeX/KaTeX contract as `paper-9618-s23-11.ts` (see
 * `backend/src/lib/latex.ts`): `$...$` segments are maths, everything outside
 * them is plain text. Subtopics are linked by 2026 syllabus code.
 *
 * This file has no side effects so the transcript can be unit tested without
 * a database.
 */

import type { SeedNode, SeedLeaf, SeedScheme, Command, AnswerKind, Ao } from './paper-9618-s23-11.js';

const point = (code: string, text: string, extra: Partial<SeedScheme['points'][number]> = {}): SeedScheme['points'][number] => ({
  code,
  text,
  textLatex: text,
  ...extra,
});

const any = (code: string, text: string): SeedScheme['points'][number] => ({
  code,
  text,
  textLatex: text,
  marks: 1,
  groupLabel: 'Points',
});

/** "1 mark each to max N" → any-n-from-m with a single point of entry. */
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
    displayRef: '9618/13/M/J/23 Q1',
    children: [
      {
        path: '1.a',
        label: 'a',
        stemLatex:
          'Write the logic expression for this truth table:\n\n$\\begin{array}{|c|c|c|c|} \\hline A & B & C & X \\\\ \\hline 0 & 0 & 0 & 1 \\\\ 0 & 0 & 1 & 1 \\\\ 0 & 1 & 0 & 0 \\\\ 0 & 1 & 1 & 0 \\\\ 1 & 0 & 0 & 1 \\\\ 1 & 0 & 1 & 1 \\\\ 1 & 1 & 0 & 0 \\\\ 1 & 1 & 1 & 0 \\\\ \\hline \\end{array}$',
        command: 'Write',
        marks: 1,
        ao: 'AO2',
        answerLines: 2,
        subtopics: ['3.2'],
        scheme: allRequired(['$X = \\overline{B}$']),
      },
      {
        path: '1.b',
        label: 'b',
        stemLatex:
          'Complete the truth table for this logic circuit:\n\n$\\begin{array}{|c|c|c|c|} \\hline A & B & C & X \\\\ \\hline 0 & 0 & 0 & \\\\ 0 & 0 & 1 & \\\\ 0 & 1 & 0 & \\\\ 0 & 1 & 1 & \\\\ 1 & 0 & 0 & \\\\ 1 & 0 & 1 & \\\\ 1 & 1 & 0 & \\\\ 1 & 1 & 1 & \\\\ \\hline \\end{array}$',
        command: 'Complete',
        marks: 2,
        ao: 'AO2',
        answerKind: 'table',
        subtopics: ['3.2'],
        scheme: allRequired(
          [
            'First 4 rows correct: 1, 0, 1, 0',
            'Second 4 rows correct: 1, 0, 0, 1',
          ],
          '1 mark for first 4 rows correct; 1 mark for second 4 rows correct',
        ),
      },
    ],
  },
  {
    path: '2',
    label: '2',
    displayRef: '9618/13/M/J/23 Q2',
    contextLatex:
      'A university has two sites. Each site has several computer rooms. The computers are all connected as a WAN (wide area network).',
    children: [
      {
        path: '2.a',
        label: 'a',
        stemLatex: 'Identify two differences between a WAN and a LAN (local area network).',
        command: 'Identify',
        marks: 2,
        ao: 'AO1',
        answerLines: 4,
        subtopics: ['2.1'],
        scheme: maxFrom(
          [
            'WAN covers a large geographical area and LAN covers a small geographical area',
            'LAN connections between devices are usually physical, whereas the WAN connections are often virtual',
            'A LAN has a high data transfer rate, whereas a WAN has a low data transfer rate',
            'The ownership of a LAN is private; the ownership of a WAN can be private or public',
            'LAN is usually more secure than a WAN because protection is easier to implement',
          ],
          2,
        ),
      },
      {
        path: '2.b',
        label: 'b',
        displayRef: '9618/13/M/J/23 Q2(b)',
        contextLatex:
          'The network uses different topologies in different areas of the sites. In one building there are five computers connected in a mesh topology.',
        children: [
          {
            path: '2.b.i',
            label: 'i',
            stemLatex: 'Describe what is meant by a mesh topology.',
            command: 'Describe',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['2.1'],
            scheme: maxFrom(
              [
                'All computers are connected to at least one other device',
                'There are multiple routes between devices',
                'The computers can act as relays, passing packets on towards the final destination',
              ],
              2,
            ),
          },
          {
            path: '2.b.ii',
            label: 'ii',
            stemLatex: 'Give two advantages of using a mesh topology instead of a bus topology.',
            command: 'Give',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['2.1'],
            scheme: maxFrom(
              [
                'If one line goes down there are more routes available',
                'Improved security as not using one main line',
                'No/fewer collisions',
                'New nodes can be added without interruption or interfering with other nodes',
                'More secure because data is sent over a dedicated connection',
              ],
              2,
            ),
          },
        ],
      },
      {
        path: '2.c',
        label: 'c',
        stemLatex:
          'The computers in one room are set up as thin-clients in a client-server model. Describe the role of the different computers in this model.',
        command: 'Describe',
        marks: 2,
        ao: 'AO1',
        answerLines: 4,
        subtopics: ['2.1'],
        scheme: maxFrom(
          [
            'Server performs all processes required by the task and/or data storage',
            'Clients only send requests to the server and display the returned results',
          ],
          2,
        ),
      },
      {
        path: '2.d',
        label: 'd',
        stemLatex:
          'Students can connect their devices to the university network using cables or a wireless connection. Explain the benefits to the students of allowing them to use both wired and wireless connections.',
        command: 'Explain',
        marks: 4,
        ao: 'AO1',
        answerLines: 8,
        subtopics: ['2.1'],
        scheme: maxFrom(
          [
            'Some students might only have one sort of connection on their device',
            'Wired provides better performance for the student’s device',
            '… for example, enabling faster access to university databases',
            'There will be less interference if students connect via a cable',
            'Students can transmit private/confidential data/work securely',
            '… for example, their final dissertation',
            'Wireless connection means that the students can use their devices in different rooms/sites/outside/anywhere more freely // student devices can be portable',
            'Wireless connection enables the students to bring multiple devices // bring their own devices // change devices',
          ],
          4,
        ),
      },
      {
        path: '2.e',
        label: 'e',
        stemLatex:
          'One site has split the network into several subnetworks. An IP address in a subnetwork is divided into two parts. Identify and describe the two parts of an IP address in a subnetwork.',
        command: 'Identify',
        marks: 3,
        ao: 'AO1',
        answerLines: 5,
        subtopics: ['2.1'],
        scheme: allRequired(
          [
            'IP address is made up of a network ID and a host ID (1 mark for identification)',
            'Each device in a subnetwork has the same network ID // each subnetwork has a different network ID',
            'Every device in each subnetwork has a different host ID but the same network ID // the host ID uniquely identifies the device within the subnetwork',
          ],
          '1 mark for identification; 1 mark each to max 2 for description',
        ),
      },
    ],
  },
  {
    path: '3',
    label: '3',
    displayRef: '9618/13/M/J/23 Q3',
    contextLatex: 'A mobile telephone is used to record a video.',
    children: [
      {
        path: '3.a',
        label: 'a',
        stemLatex:
          'The mobile telephone has a touchscreen. There are different types of touchscreen. Complete the description of the principal operation of touchscreens.\n\nA $\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots$ touchscreen has two layers. When the user touches the screen, the layers touch and a $\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots$ is completed.\n\nA $\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots$ touchscreen has several layers. When the top layer is touched, there is a $\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots$ in the electric current.\n\nA microprocessor identifies the $\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots$ of the touch.',
        command: 'Complete',
        marks: 5,
        ao: 'AO1',
        answerLines: 5,
        subtopics: ['3.1'],
        scheme: allRequired(
          ['Resistive', 'Circuit', 'Capacitive', 'Change', 'Coordinates'],
          '1 mark for each term',
        ),
      },
      {
        path: '3.b',
        label: 'b',
        stemLatex:
          'The mobile telephone uses a built-in digital camera to record the video. The digital camera automatically focuses on the faces of people. Explain how Artificial Intelligence (AI) is used by the camera to automatically focus on the faces of people.',
        command: 'Explain',
        marks: 3,
        ao: 'AO1',
        answerLines: 8,
        subtopics: ['18.1'],
        scheme: maxFrom(
          [
            'Scans the scene in real time',
            'Identifies if there are faces in the image',
            'Uses facial recognition // uses image recognition',
            '… takes each frame individually',
            '… analyses the pixels',
            '… stores pattern for a face',
            '… looks for patterns that match/come close to the pattern for a face',
            'Camera focuses on the pattern identified',
          ],
          3,
        ),
      },
      {
        path: '3.c',
        label: 'c',
        displayRef: '9618/13/M/J/23 Q3(c)',
        contextLatex: 'The video includes a sound recording.',
        children: [
          {
            path: '3.c.i',
            label: 'i',
            stemLatex: 'Describe how sound is represented in a computer.',
            command: 'Describe',
            marks: 3,
            ao: 'AO1',
            answerLines: 6,
            subtopics: ['1.2'],
            scheme: allRequired(
              [
                'The amplitude is recorded a set number of times a second',
                'Each (instance of an) amplitude is given a corresponding binary number',
                'The binary number (of each amplitude) is saved in sequence',
              ],
              '1 mark each',
            ),
          },
          {
            path: '3.c.ii',
            label: 'ii',
            stemLatex:
              'A second video is recorded. The sound in the second video needs to be more precise. Explain the reasons why increasing the sampling rate and the sampling resolution will improve the precision of the second recording.',
            command: 'Explain',
            marks: 4,
            ao: 'AO2',
            answerLines: 8,
            subtopics: ['1.2'],
            scheme: maxFrom(
              [
                'Sampling rate: there are smaller “gaps” in the sound wave // sound is recorded more often',
                'Sampling rate: digital waveform is closer to the analogue waveform',
                'Sampling rate: the quantisation errors are smaller',
                'Sampling resolution: there are more bits per sample // a wider range of amplitudes can be stored',
                'Sampling resolution: each binary amplitude/note (in the digital recording) is closer to the analogue amplitude/note',
                'Sampling resolution: digital waveform is closer to the analogue waveform',
                'Sampling resolution: the quantisation errors are smaller',
              ],
              4,
            ),
          },
        ],
      },
    ],
  },
  {
    path: '4',
    label: '4',
    displayRef: '9618/13/M/J/23 Q4',
    contextLatex:
      'A shop rents cars to customers. The shop uses a relational database to store information about the rentals.',
    children: [
      {
        path: '4.a',
        label: 'a',
        stemLatex:
          'Describe two ways in which a relational database addresses the limitations of a file-based approach.',
        command: 'Describe',
        marks: 4,
        ao: 'AO1',
        answerLines: 8,
        subtopics: ['8.1'],
        scheme: {
          type: 'any_n_from_m',
          maxMarks: 4,
          groups: [{ label: 'Points', nRequired: 1, marksPerPoint: 2, maxMarks: 4 }],
          points: [
            any('MP1', 'Reduces data redundancy'),
            any('MP2', '… because linked tables mean that each data item is stored only once'),
            any('MP3', 'Reduces program-data dependency'),
            any('MP4', '… because the data is separate from the software so changes to the data do not require programs to be re-written'),
            any('MP5', 'Reduces data inconsistency // improves data integrity'),
            any('MP6', '… because by only storing data once it only needs to be updated once // changes in one table will automatically update in another // linked data cannot be entered differently in two tables'),
            any('MP7', 'Complex queries are easier to run'),
            any('MP8', 'Can provide different views'),
            any('MP9', '… so users can only see specific aspects of the database'),
          ],
        },
      },
      {
        path: '4.b',
        label: 'b',
        stemLatex:
          'Complete the table by writing the missing term or description for each database feature.\n\n$\\begin{array}{|l|l|} \\hline \\text{Term} & \\text{Description} \\\\ \\hline & \\text{An object that data is stored about.} \\\\[0.6em] \\hline \\text{Tuple} & \\\\[0.6em] \\hline \\text{Secondary key} & \\\\[0.6em] \\hline & \\text{A field in one table that is linked to a primary key in another table.} \\\\[0.6em] \\hline \\end{array}$',
        command: 'Complete',
        marks: 4,
        ao: 'AO1',
        answerKind: 'table',
        answerLines: 12,
        subtopics: ['8.1'],
        scheme: allRequired(
          [
            'Entity: an object that data is stored about',
            'Tuple: a row of data in a table about one instance of an object',
            'Secondary key: an additional/alternative key used as well as the primary key to locate specific data // a candidate key that has not been chosen as a primary key',
            'Foreign key: a field in one table that is linked to a primary key in another table',
          ],
          '1 mark each',
        ),
      },
      {
        path: '4.c',
        label: 'c',
        stemLatex:
          'The car rental database is not normalised. The current database design is:\n\n$\\texttt{BOOKING(CarRegistration, StartDate, EndDate, CarModel, CarColour, CustomerFirstName)}$\n\n$\\texttt{CUSTOMER(CustomerFirstName, CustomerLastName, EmailAddress, TelephoneNumber)}$\n\nWrite a normalised database design for this database. All tables must be in Third Normal Form (3NF). Use the field names given and underline the primary key fields.',
        command: 'Write',
        marks: 4,
        ao: 'AO2',
        answerKind: 'table',
        answerLines: 10,
        subtopics: ['8.1'],
        scheme: allRequired(
          [
            'Only 3 tables with appropriate identifiers (one table for customer, one for booking and one for car)',
            'Appropriate primary key in each table',
            'Booking table includes primary key from car and primary key from customer as foreign keys',
            'All original fields are in correct tables',
          ],
          '1 mark each. Example: BOOKING(BookingID, CarRegistration, CustomerID, StartDate, EndDate); CAR(CarRegistration, CarModel, CarColour); CUSTOMER(CustomerID, CustomerFirstName, CustomerLastName, EmailAddress, TelephoneNumber)',
        ),
      },
      {
        path: '4.d',
        label: 'd',
        displayRef: '9618/13/M/J/23 Q4(d)',
        contextLatex: 'The data is validated and verified when it is entered into the database.',
        children: [
          {
            path: '4.d.i',
            label: 'i',
            stemLatex:
              'The car registration number must be: 1 letter, followed by 3 numbers, followed by 2 letters. For example, A123AA is valid but A12AA is invalid. One way that a registration number can be validated is by using a presence check to make sure the registration number has been entered. Describe two other ways that the car registration number can be validated.',
            command: 'Describe',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['6.2'],
            scheme: maxFrom(
              [
                'Length check: the registration number must be 6 characters long',
                'Format check: the registration number must be in the format letter-digit-digit-digit-letter-letter',
                'Type check: the registration number must be alphanumeric',
              ],
              2,
            ),
          },
          {
            path: '4.d.ii',
            label: 'ii',
            stemLatex:
              'Describe two ways that the car registration number can be verified when it is entered into the database.',
            command: 'Describe',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['6.2'],
            scheme: allRequired(
              [
                'Visual check: manually compare the registration number entered with the source document',
                'Double entry: enter the registration number twice and the computer compares to check they are the same',
              ],
              '1 mark each',
            ),
          },
          {
            path: '4.d.iii',
            label: 'iii',
            stemLatex:
              'State why the car registration number might be incorrect even after it has been validated and verified.',
            command: 'State',
            marks: 1,
            ao: 'AO1',
            answerLines: 2,
            subtopics: ['6.2'],
            scheme: allRequired([
              'The registration number on the original document might be in the correct format but may be the incorrect registration number for that car',
            ]),
          },
        ],
      },
    ],
  },
  {
    path: '5',
    label: '5',
    displayRef: '9618/13/M/J/23 Q5',
    contextLatex:
      'A programmer is developing a computer game in a high-level language to sell to the public.',
    children: [
      {
        path: '5.a',
        label: 'a',
        displayRef: '9618/13/M/J/23 Q5(a)',
        contextLatex:
          'The programmer uses both an interpreter and a compiler at different stages of the development of the program.',
        children: [
          {
            path: '5.a.i',
            label: 'i',
            stemLatex:
              'Explain the reasons why the programmer uses an interpreter while writing the program code.',
            command: 'Explain',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['5.2'],
            scheme: maxFrom(
              [
                'Programmer can test sections of the code without every part working / being written',
                'Programmer can debug in real time',
                '… so that errors can be fixed and the program continued from that point',
                'The effect of any changes made by the programmer can be seen immediately',
                'To avoid dependent errors',
              ],
              2,
            ),
          },
          {
            path: '5.a.ii',
            label: 'ii',
            stemLatex:
              'Explain the reasons why the programmer uses a compiler when the program has been written.',
            command: 'Explain',
            marks: 3,
            ao: 'AO1',
            answerLines: 6,
            subtopics: ['5.2'],
            scheme: maxFrom(
              [
                'The compiler produces an executable file',
                '… so the user cannot access / edit / sell the code',
                '… and users do not need the translator to run the game',
                'The game can be compiled for different hardware specifications',
                '… and then used to generate more income for the programmer',
                'The program can be tested multiple times without having to retranslate each time',
              ],
              3,
            ),
          },
        ],
      },
      {
        path: '5.b',
        label: 'b',
        stemLatex:
          'The programmer needs to publish the game under a software licence so that it can be sold to the public. Identify the most appropriate type of software licence for the game and justify your choice.',
        command: 'Justify',
        marks: 4,
        ao: 'AO1',
        answerLines: 7,
        subtopics: ['7.1'],
        scheme: maxFrom(
          [
            'Commercial software licence',
            'User has to pay for the product so the programmer can gain an income',
            'Enables the program to be copyrighted',
            '… so the user cannot legally edit the program // the programmer retains control over product',
            '… and can take legal action against people who attempt to illegally copy it / sell it on',
            'Shareware licence: enables the program to be copyrighted',
            'Shareware licence: user can try the program for free and then pay for the full game which allows the programmer to gain an income',
            'Shareware licence: so more people can experience it and therefore be more likely to buy it',
          ],
          4,
        ),
      },
    ],
  },
  {
    path: '6',
    label: '6',
    displayRef: '9618/13/M/J/23 Q6',
    contextLatex: 'Data needs to be kept secure when stored on a computer and during transmission over a network.',
    children: [
      {
        path: '6.a',
        label: 'a',
        stemLatex:
          'Explain how a digital signature is used to authenticate a digital document during transmission over a network.',
        command: 'Explain',
        marks: 5,
        ao: 'AO1',
        answerLines: 10,
        subtopics: ['17.1'],
        scheme: maxFrom(
          [
            'The sender hashes the document',
            '… to produce a digest',
            'The sender encrypts the digest to create the digital signature',
            'The message and the signature are sent to the receiver',
            'The receiver decrypts the signature to reproduce the digest',
            'The receiver uses the same hashing algorithm on the document received to produce a second digest',
            'The receiver compares this digest with the one from the digital signature',
            'If both of the receiver’s digests are the same the document is authentic',
          ],
          5,
        ),
      },
      {
        path: '6.b',
        label: 'b',
        stemLatex:
          'Complete the table by identifying and describing two types of software that can be installed on a computer to prevent threats over a network.\n\n$\\begin{array}{|l|l|} \\hline \\text{Type of software} & \\text{Description} \\\\[0.8em] \\hline & \\\\[0.8em] \\hline & \\\\[0.8em] \\hline \\end{array}$',
        command: 'Complete',
        marks: 2,
        ao: 'AO1',
        answerKind: 'table',
        answerLines: 6,
        subtopics: ['6.1'],
        scheme: maxFrom(
          [
            'Antivirus: scans the computer for viruses and checks against a stored database of viruses, that needs to be updated regularly and then deletes / quarantines them',
            'Antivirus: compares downloaded files to a database of known viruses and prevents the download continuing',
            'Antispyware: scans the computer for spyware and checks against a stored database, that needs to be updated regularly and then deletes / quarantines them',
            'Firewall: monitors incoming and outgoing traffic and compares it to criteria that are set by the user such as through a whitelist/blacklist/identifying allowed / blocked IP addresses',
            'Firewall: compares incoming and outgoing traffic to criteria and blocks those that do not match criteria',
            'Antimalware: scans the computer for malware and checks against a stored database, that needs to be updated regularly and then deletes / quarantines them',
          ],
          2,
        ),
      },
    ],
  },
  {
    path: '7',
    label: '7',
    displayRef: '9618/13/M/J/23 Q7',
    contextLatex: 'A computer stores data in binary form.',
    children: [
      {
        path: '7.a',
        label: 'a',
        stemLatex:
          'Draw one line from each description to its matching denary value.\n\n$\\begin{array}{|l|l|} \\hline \\text{Description} & \\text{Denary value} \\\\ \\hline \\text{The smallest integer that can be represented in 8-bit two’s complement.} & 127 \\\\ \\text{The largest integer that can be represented in 8-bit two’s complement.} & -255 \\\\ \\text{The largest unsigned integer that can be represented in 8 bits.} & -128 \\\\ & -256 \\\\ & 256 \\\\ & 128 \\\\ & 255 \\\\ & -127 \\\\ \\hline \\end{array}$',
        command: 'Complete',
        marks: 3,
        ao: 'AO2',
        answerKind: 'table',
        subtopics: ['1.1'],
        scheme: allRequired(
          [
            'Smallest integer in 8-bit two’s complement → -128',
            'Largest integer in 8-bit two’s complement → 127',
            'Largest unsigned integer in 8 bits → 255',
          ],
          '1 mark for each correct line',
        ),
      },
      {
        path: '7.b',
        label: 'b',
        stemLatex:
          'The computer has a Control Unit (CU), system clock and control bus. Explain how the CU, system clock and control bus operate to transfer data between the components of the computer system.',
        command: 'Explain',
        marks: 4,
        ao: 'AO1',
        answerLines: 8,
        subtopics: ['4.1'],
        scheme: maxFrom(
          [
            'The system clock gives out timing signals',
            '… which are sent on the control bus',
            '… to synchronise the other system components',
            'The Control Unit initiates data transfer',
            '… by generating signals that are sent on the control bus to other components',
          ],
          4,
        ),
      },
      {
        path: '7.c',
        label: 'c',
        stemLatex:
          'Complete the table by writing the register transfer notation for each stage of the Fetch-Execute (F-E) cycle given in the table.\n\n$\\begin{array}{|l|l|} \\hline \\text{Stage description} & \\text{Register transfer notation} \\\\ \\hline \\text{The Program Counter (PC) is incremented} & \\\\[0.6em] \\hline \\text{The data in the address stored in the Memory Address Register (MAR) is copied to the Memory Data Register (MDR)} & \\\\[0.6em] \\hline \\end{array}$',
        command: 'Complete',
        marks: 2,
        ao: 'AO2',
        answerKind: 'table',
        subtopics: ['4.1'],
        scheme: allRequired(
          ['PC ← [PC] + 1', 'MDR ← [[MAR]]'],
          '1 mark for each register transfer notation',
        ),
      },
    ],
  },
];

export { flattenPaper } from './paper-9618-s23-11.js';
export type { SeedNode, SeedLeaf, Command, AnswerKind, Ao };
