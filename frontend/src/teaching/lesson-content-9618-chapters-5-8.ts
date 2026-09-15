import { buildSourceBacked9618Chapter, type SourceBackedChapterSpec } from './lesson-content-9618-summary-builder';

const chapter5: SourceBackedChapterSpec = {
  number: 5,
  level: 'AS Level',
  title: 'System software',
  subtitle: 'Operating systems, utility software, program libraries, language translators and integrated development environments.',
  objectives: [
    'Explain why a computer system needs an operating system and describe the main management tasks it performs.',
    'Describe the purpose of common utility programs and program libraries.',
    'Explain the roles of assemblers, compilers and interpreters and compare compilation with interpretation.',
    'Explain partial compilation and interpretation and describe the facilities provided by an IDE.',
  ],
  topics: [
    {
      code: '5.1', title: 'Operating systems', points: [
        {
          code: '5.1.1', title: 'The need for an operating system', pages: [136, 139],
          lead: 'The operating system provides the environment in which applications run and hides much of the complexity of the hardware from the user.',
          bullets: [
            'Early computers required control software to be loaded at start-up; later systems stored start-up code in ROM or flash memory and the operating system on secondary storage.',
            'A command line interface requires accurately typed commands, while a graphical user interface presents visual controls such as windows, icons and menus.',
            'WIMP interfaces use a pointing device; post-WIMP interfaces use touch-screen actions such as tapping, pinching and rotating.',
          ],
          keyTerms: [
            { term: 'Operating system', definition: 'System software that provides an environment for applications and an interface between hardware and users.' },
            { term: 'CLI', definition: 'A human-computer interface in which commands are entered as text.' },
            { term: 'GUI', definition: 'A human-computer interface based on graphical controls and visual interaction.' },
          ],
          reviewPrompt: 'Give one reason an operating system is needed and one difference between a CLI and a GUI.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '5.1.2', title: 'Operating system tasks', pages: [140, 142],
          lead: 'Hodder groups operating-system work into memory, file, security, hardware and process management.',
          bullets: [
            'Memory management tracks allocated and free memory, organises allocation and protects one process from incorrectly using another process’s memory.',
            'File management organises files and directories and maintains information needed to store, find and protect them.',
            'Security management supports user accounts, access rights, system recovery and protection against unauthorised access.',
            'Hardware and process management coordinate devices, interrupts and the execution of programs so that resources are shared safely.',
          ],
          reviewPrompt: 'Match each scenario to memory, file, security, hardware or process management.',
          visual: 'types', accent: 'cyan',
        },
        {
          code: '5.1.3', title: 'Utility software', pages: [143, 146],
          lead: 'Utility programs perform specialised maintenance, protection, storage and recovery tasks that support the operating system.',
          bullets: [
            'A disk formatter prepares storage media with the structures needed to store files.',
            'Virus-checking and other security utilities detect or remove malicious software.',
            'Defragmentation reorganises fragmented file blocks on magnetic disks, while disk analysis and repair utilities diagnose storage problems.',
            'Compression and backup utilities reduce storage requirements or create recoverable copies of data.',
          ],
          reviewPrompt: 'Choose the most suitable utility for formatting a disk, checking malware, compressing files and making a recoverable copy.',
          visual: 'files', accent: 'emerald',
        },
        {
          code: '5.1.4', title: 'Program libraries', pages: [147, 148],
          lead: 'A program library stores reusable routines so that common functionality does not have to be rewritten for every program.',
          bullets: [
            'Library routines can be linked into programs when they are required.',
            'Dynamic link libraries can be shared by more than one program, reducing duplication of commonly used code.',
            'Using tested library code can reduce development effort, although a program still depends on the correct library being available.',
          ],
          reviewPrompt: 'Why might several applications use the same dynamic link library rather than each storing its own copy of the same routine?',
          visual: 'files', accent: 'amber',
        },
      ],
    },
    {
      code: '5.2', title: 'Language translators', points: [
        {
          code: '5.2.1', title: 'Translation and execution of programs', pages: [149, 150],
          lead: 'Source code must be translated into a form that the processor can execute.',
          bullets: [
            'An assembler translates assembly language into machine code.',
            'A compiler translates a complete high-level program before execution and reports translation errors found during compilation.',
            'An interpreter translates and executes high-level statements as the program runs rather than first producing a complete executable program.',
          ],
          keyTerms: [
            { term: 'Assembler', definition: 'Translator that converts assembly language into machine code.' },
            { term: 'Compiler', definition: 'Translator that converts a high-level program before it is executed.' },
            { term: 'Interpreter', definition: 'Translator that translates and executes high-level source statements during execution.' },
          ],
          reviewPrompt: 'State which translator is used for assembly language and distinguish a compiler from an interpreter.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '5.2.2', title: 'Pros and cons of compiling or interpreting a program', pages: [151, 151],
          lead: 'Compilation and interpretation make different trade-offs between development convenience, error handling and execution speed.',
          bullets: [
            'A compiled program can be distributed without the original source code and can execute repeatedly without retranslating every statement.',
            'An interpreter supports immediate execution and is useful while developing and testing a program.',
            'Interpretation requires the interpreter to be present and repeats translation work when statements are executed again.',
          ],
          reviewPrompt: 'Give one situation in which compilation is preferable and one in which interpretation is useful.',
          visual: 'recap', accent: 'cyan',
        },
        {
          code: '5.2.3', title: 'Partial compiling and interpreting', pages: [152, 152],
          lead: 'Some language systems combine compilation and interpretation instead of using only one translation model.',
          bullets: [
            'Source code can first be compiled into an intermediate representation rather than directly into native machine code.',
            'A virtual machine or runtime can then interpret or execute that intermediate representation on the target computer.',
            'Java is used in the chapter as an example of this combined approach.',
          ],
          reviewPrompt: 'Explain the two stages in a compile-to-intermediate-code then runtime-execution model.',
          visual: 'types', accent: 'emerald',
        },
        {
          code: '5.2.4', title: 'Integrated development environment (IDE)', pages: [153, 158],
          lead: 'An IDE combines tools that help a programmer enter, check, run, debug and manage source code.',
          bullets: [
            'Editing support can include context-sensitive prompts, automatic formatting and features for expanding or collapsing sections of code.',
            'Dynamic syntax checking can identify many syntax errors while code is being entered.',
            'Debugging tools can include single stepping, breakpoints and windows that show changing variable values.',
            'The chapter review connects these IDE facilities back to the translation and system-software concepts taught earlier.',
          ],
          reviewPrompt: 'Name two IDE features that help locate program faults and explain how each helps the programmer.',
          visual: 'recap', accent: 'rose',
        },
      ],
    },
  ],
};

const chapter6: SourceBackedChapterSpec = {
  number: 6,
  level: 'AS Level',
  title: 'Security, privacy and data integrity',
  subtitle: 'Protecting data from loss, unauthorised access and corruption while preserving correctness during entry and transfer.',
  objectives: [
    'Distinguish data security, data privacy and data integrity and explain why security is required.',
    'Describe methods for restricting access and protecting stored data, including authentication, firewalls, anti-malware and encryption.',
    'Explain threats such as viruses, spyware, hacking, phishing and pharming and describe suitable countermeasures.',
    'Explain how backup and recovery reduce the impact of data loss.',
    'Explain how validation and verification help preserve data integrity.',
  ],
  topics: [
    {
      code: '6.1', title: 'Data security', points: [
        {
          code: '6.1.1', title: 'Data privacy', pages: [159, 160],
          lead: 'Security, privacy and integrity are related but distinct: protection controls who can access data, privacy concerns appropriate access and use, and integrity concerns correctness.',
          bullets: [
            'Sensitive data should be available only to people who are authorised to use it.',
            'Security measures are needed because loss, disclosure or unauthorised alteration can harm individuals and organisations.',
            'Privacy requires organisations to control how personal information is accessed and used, not merely whether the file still exists.',
          ],
          reviewPrompt: 'Explain the difference between data privacy and data integrity in one sentence each.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '6.1.2', title: 'Preventing data loss and restricting data access', pages: [160, 163],
          lead: 'A layered security approach combines authentication, access control, network protection, malware protection and encryption.',
          bullets: [
            'User IDs, accounts and passwords identify users and restrict access to authorised areas.',
            'Digital signatures can help establish the origin and integrity of electronic messages or documents.',
            'Firewalls filter network communication according to security rules, while antivirus and antispyware software target malicious software.',
            'Encryption changes readable plaintext into ciphertext so intercepted or stolen data is not directly readable without the appropriate key.',
          ],
          reviewPrompt: 'For each of these controls — password, firewall, antivirus and encryption — state the risk it is intended to reduce.',
          visual: 'networking', accent: 'cyan',
        },
        {
          code: '6.1.3', title: 'Risks to the security of stored data', pages: [164, 166],
          lead: 'Stored data can be threatened by malicious software, unauthorised access and social-engineering attacks that redirect or deceive users.',
          bullets: [
            'A virus is malicious code that can reproduce or spread and damage or alter data and programs.',
            'Spyware secretly gathers information about a user or system.',
            'Hacking involves gaining unauthorised access to computer systems or data.',
            'Phishing deceives users into revealing information, while pharming redirects users to a fraudulent destination even when they believe they used a legitimate address.',
          ],
          reviewPrompt: 'Distinguish phishing from pharming, then name one protection that can reduce the risk from each attack.',
          visual: 'networking', accent: 'rose',
        },
        {
          code: '6.1.4', title: 'Data recovery', pages: [167, 168],
          lead: 'Recovery planning prepares for accidental deletion, hardware faults, software faults and incorrect operation before a loss occurs.',
          bullets: [
            'Backups should be made regularly and kept separately from the original data so that a local failure does not destroy both copies.',
            'Frequent saving, user restrictions and appropriate training can reduce accidental loss or incorrect operation.',
            'A UPS and, where appropriate, parallel systems can reduce the effect of hardware or power failure.',
            'A backup must itself be trustworthy: restoring an infected backup can restore malware as well as the data.',
          ],
          reviewPrompt: 'Design a recovery plan for a small office using backups, a UPS and user training. State the risk addressed by each measure.',
          visual: 'files', accent: 'amber',
        },
      ],
    },
    {
      code: '6.2', title: 'Data integrity', points: [
        {
          code: '6.2.1', title: 'Validation', pages: [169, 169],
          lead: 'Validation checks whether entered data satisfies rules for acceptable data; it does not prove that the value is factually correct.',
          bullets: [
            'Validation is carried out automatically by applying rules before data is accepted.',
            'Typical validation rules include checks on range, type, format, length and whether required data is present.',
            'A value can pass validation and still be wrong, so validation and verification solve different problems.',
          ],
          reviewPrompt: 'Why can a date pass validation but still be the wrong date for the person being recorded?',
          visual: 'recap', accent: 'emerald',
        },
        {
          code: '6.2.2', title: 'Verification', pages: [170, 177],
          lead: 'Verification checks that data has been copied or transferred accurately from its source.',
          bullets: [
            'Double entry compares two independently entered copies of the same source data.',
            'A visual or screen check compares entered data with the original source.',
            'Verification is particularly important when errors may be introduced during data entry or transfer.',
            'The end-of-chapter tasks require security, privacy, validation and verification to be applied to realistic situations rather than recalled as isolated definitions.',
          ],
          reviewPrompt: 'A school enters a pupil’s date of birth from a paper form. Give one validation check and one verification method, and explain the different purpose of each.',
          visual: 'recap', accent: 'cyan',
        },
      ],
    },
  ],
};

const chapter7: SourceBackedChapterSpec = {
  number: 7,
  level: 'AS Level',
  title: 'Ethics and ownership',
  subtitle: 'Professional ethics, copyright and software licensing, and the wider impact of artificial intelligence.',
  objectives: [
    'Explain why a computer-science professional needs ethical guidance and distinguish legal, moral, ethical and cultural considerations.',
    'Apply professional codes of conduct and explain the possible impact of ethical or unethical behaviour on the public.',
    'Explain copyright issues and distinguish common forms of software licensing.',
    'Discuss social, economic and environmental impacts of artificial intelligence.',
  ],
  topics: [
    {
      code: '7.1', title: 'Legal, moral, ethical and cultural issues', points: [
        {
          code: '7.1.1', title: 'Computer ethics', pages: [178, 180],
          lead: 'Computer ethics considers responsible behaviour when computing decisions can affect other people, organisations and society.',
          bullets: [
            'A professional decision can be legal while still raising moral or ethical concerns, so law alone is not a complete guide to responsible behaviour.',
            'Cultural expectations can influence how technology and information are viewed in different communities.',
            'Ethical reasoning requires considering consequences, responsibilities and the people affected by a computing decision.',
          ],
          reviewPrompt: 'Give an example of a computing action that could be legal but still ethically questionable, and explain why.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '7.1.2', title: 'Professional ethical bodies', pages: [180, 182],
          lead: 'Professional bodies publish codes of conduct that set expectations for competence, honesty, professional responsibility and respect for others.',
          bullets: [
            'A code of conduct helps professionals decide how to behave when technical choices affect clients, colleagues or the public.',
            'Professional duties include working within competence, giving appropriate credit and supporting colleagues’ professional development.',
            'The code is a framework for accountable professional behaviour rather than a replacement for legal obligations.',
          ],
          reviewPrompt: 'Why does a professional body need a code of conduct even when laws already exist?',
          visual: 'recap', accent: 'cyan',
        },
        {
          code: '7.1.3', title: 'Impact on the public', pages: [183, 185],
          lead: 'Unethical computing can affect privacy, safety, trust, access to services and the reputation of the profession.',
          bullets: [
            'Professionals should consider the likely consequences of systems and decisions for people who use or depend on them.',
            'Poor practice can expose information, cause unfair outcomes or reduce public confidence in computer systems.',
            'Ethical practice includes communicating limitations and avoiding actions that place the public at unnecessary risk.',
          ],
          reviewPrompt: 'Identify two groups affected by a failed information system and describe a different impact on each group.',
          visual: 'recap', accent: 'rose',
        },
      ],
    },
    {
      code: '7.2', title: 'Copyright issues', points: [
        {
          code: '7.2.1', title: 'Software copyright and privacy', pages: [186, 186],
          lead: 'Copyright protects software creators’ work and constrains copying, distribution and reuse without permission.',
          bullets: [
            'Software piracy is the unauthorised copying or distribution of software.',
            'Copyright protection affects both executable software and the underlying source code.',
            'Technical controls and licensing conditions can be used alongside copyright law to discourage unauthorised copying.',
          ],
          reviewPrompt: 'Explain why buying one software licence does not automatically give permission to distribute unlimited copies.',
          visual: 'files', accent: 'indigo',
        },
        {
          code: '7.2.2', title: 'The internet and the World Wide Web', pages: [187, 187],
          lead: 'Digital distribution makes copying and sharing easy, so copyright rules remain important when material is published or accessed online.',
          bullets: [
            'Internet access does not imply that every available file can legally be copied, republished or modified without permission.',
            'Services that stream or distribute content use technical and contractual controls to enforce permitted use.',
            'Users and developers must distinguish access to a work from ownership of its copyright.',
          ],
          reviewPrompt: 'Why is “I can download it” not the same as “I have the copyright to redistribute it”?',
          visual: 'internet', accent: 'cyan',
        },
        {
          code: '7.2.3', title: 'Software licensing', pages: [187, 189],
          lead: 'Different licences grant different permissions for use, modification, redistribution and access to source code.',
          bullets: [
            'Open-source software makes source code available under licence conditions that define how it may be used and redistributed.',
            'Freeware can be used without a purchase fee but can still remain copyrighted and restrict modification of its source code.',
            'Shareware allows trial use and normally requires payment to continue using the full product after the trial period.',
            'Commercial software is supplied under licence conditions that define the permitted users, devices or ways in which the software may be used.',
          ],
          reviewPrompt: 'Compare open-source software, freeware and shareware in terms of source-code access, cost and licence restrictions.',
          visual: 'files', accent: 'emerald',
        },
      ],
    },
    {
      code: '7.3', title: 'Artificial intelligence (AI)', points: [
        {
          code: '7.3.1', title: 'What is AI?', pages: [189, 189],
          lead: 'Artificial intelligence is concerned with computer systems performing tasks that normally require human-like decision making or problem solving.',
          bullets: [
            'The chapter introduces AI through familiar applications rather than treating it only as robotics.',
            'Examples include recognising faces, operating machinery and analysing data to predict future events.',
            'AI systems can automate tasks that involve choosing among alternatives from available information.',
          ],
          reviewPrompt: 'Give two examples of AI from the chapter and state the decision or prediction each system makes.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '7.3.2', title: 'The impact of AI', pages: [190, 190],
          lead: 'AI extends beyond science-fiction robots to autonomous transport, assistive technologies, hazardous work and precision tasks.',
          bullets: [
            'Autonomous vehicles use AI to make decisions about movement and the environment.',
            'AI can support artificial limbs, drones in dangerous locations, climate prediction and highly precise medical procedures.',
            'The value of an AI application must be considered together with the risks created when decisions are automated.',
          ],
          reviewPrompt: 'Choose one AI application and explain one benefit and one risk that should be considered before deployment.',
          visual: 'recap', accent: 'cyan',
        },
        {
          code: '7.3.3', title: 'Impacts on society, the economy and the environment', pages: [190, 195],
          lead: 'Increasing automation changes employment, services, resource use and patterns of decision making, so its effects need to be evaluated from several perspectives.',
          bullets: [
            'Social impacts include changes to the way people work, travel, receive services and interact with automated systems.',
            'Economic impacts include changes in labour requirements, productivity and the kinds of skills employers need.',
            'Environmental impacts can be positive or negative depending on how AI changes transport, energy use, manufacturing and resource consumption.',
            'The chapter treats these impacts as discussion questions: conclusions should be justified from the scenario rather than assumed to be universally positive or negative.',
          ],
          reviewPrompt: 'For one AI technology, give one social, one economic and one environmental consequence and justify each link.',
          visual: 'recap', accent: 'amber',
        },
      ],
    },
  ],
};

const chapter8: SourceBackedChapterSpec = {
  number: 8,
  level: 'AS Level',
  title: 'Databases',
  subtitle: 'Relational database design, normalisation, DBMS facilities, and SQL data definition and manipulation.',
  objectives: [
    'Explain the limitations of a file-based approach and the benefits of a relational database.',
    'Use relational database terminology and construct entity-relationship models.',
    'Normalise data to third normal form and use the result to design a relational database.',
    'Explain the features and tools provided by a DBMS.',
    'Distinguish DDL from DML and understand and write SQL commands and scripts.',
  ],
  topics: [
    {
      code: '8.1', title: 'Database concepts', points: [
        {
          code: '8.1.1', title: 'The limitations of a file-based approach', pages: [196, 198],
          lead: 'Separate application files can duplicate the same data and create inconsistency and dependency between program logic and file structure.',
          bullets: [
            'Duplicating data wastes storage space and creates redundant copies of the same fact.',
            'If one application changes a duplicated value but another does not, the stored data becomes inconsistent.',
            'Queries can become dependent on the physical structure of the file and the application that created it.',
          ],
          reviewPrompt: 'Explain how storing a staff number independently in payroll and sales files can create inconsistency.',
          visual: 'files', accent: 'indigo',
        },
        {
          code: '8.1.2', title: 'Advantages of a relational database over a file-based approach', pages: [198, 198],
          lead: 'A shared relational database reduces unnecessary duplication and makes consistent data available to multiple applications.',
          bullets: [
            'Most data items can be stored once and shared, reducing redundant data.',
            'A change made through one authorised application becomes visible to other applications using the same stored value.',
            'Data is more independent of an individual application, making a wider range of queries possible.',
          ],
          reviewPrompt: 'For redundancy, consistency and data independence, state how the database approach improves on separate application files.',
          visual: 'files', accent: 'cyan',
        },
        {
          code: '8.1.3', title: 'Relational database model terminology', pages: [199, 201],
          lead: 'A relational database is described precisely using entities, attributes, tables, tuples, keys, relationships and referential integrity.',
          bullets: [
            'A table stores instances of an entity in rows and attributes in columns; a row is a record or tuple and a column is a field.',
            'A candidate key can uniquely identify a tuple; one candidate key is chosen as the primary key and alternatives can be secondary keys.',
            'A foreign key refers to a primary key in another table and creates a relationship between the tables.',
            'Referential integrity requires foreign-key values to correspond to valid referenced records where the relationship demands it.',
          ],
          keyTerms: [
            { term: 'Primary key', definition: 'A selected candidate key that uniquely identifies each record in a table.' },
            { term: 'Foreign key', definition: 'Attribute or attributes in one table that refer to the primary key of another table.' },
            { term: 'Referential integrity', definition: 'Rules that keep references between related tables valid.' },
          ],
          reviewPrompt: 'In a Student table linked to a Class table, identify a suitable primary key and foreign key and explain the relationship.',
          visual: 'files', accent: 'emerald',
        },
        {
          code: '8.1.4', title: 'Entity-relationship (E-R) diagrams', pages: [202, 202],
          lead: 'An E-R diagram documents entities and relationships visually, including relationship cardinality and whether participation is optional or mandatory.',
          bullets: [
            'Entities are shown with the attributes that describe them.',
            'Relationship notation distinguishes one-to-one, one-to-many and many-to-many patterns.',
            'Minimum participation distinguishes optional relationships from mandatory ones.',
            'The diagram is a design model that should agree with the primary- and foreign-key structure used in the database.',
          ],
          reviewPrompt: 'Draw or describe the cardinality for one class having many students while each student belongs to one class.',
          visual: 'files', accent: 'amber',
        },
        {
          code: '8.1.5', title: 'The normalisation process', pages: [203, 207],
          lead: 'Normalisation organises data into related tables to reduce redundancy and avoid update problems while preserving the required relationships.',
          bullets: [
            'First normal form removes repeating groups so each field contains an appropriate single value.',
            'Second normal form requires 1NF and makes non-key attributes depend on the whole primary key.',
            'Third normal form requires 2NF and removes dependencies between non-key attributes.',
            'The result is a set of linked tables whose primary and foreign keys preserve the required relationships.',
          ],
          reviewPrompt: 'Explain the progression from 1NF to 2NF to 3NF without using the phrase “make it more normal”.',
          visual: 'files', accent: 'rose',
        },
      ],
    },
    {
      code: '8.2', title: 'Database management systems', points: [
        {
          code: '8.2.1', title: 'How a DBMS addresses file-based limitations', pages: [208, 209],
          lead: 'A DBMS manages shared relational data so that redundancy, inconsistency and application dependency are reduced.',
          bullets: [
            'Linked tables reduce duplication while foreign keys preserve necessary references between tables.',
            'Storing most facts once means an update is seen consistently by the applications that use that fact.',
            'The DBMS separates applications from many details of the stored structure, improving data independence.',
            'Security facilities can restrict users, actions and views and can support backups, encryption and audit trails.',
          ],
          reviewPrompt: 'Explain how a DBMS addresses the three file-based problems of redundancy, inconsistency and dependency.',
          visual: 'files', accent: 'indigo',
        },
        {
          code: '8.2.2', title: 'DBMS software tools', pages: [210, 210],
          lead: 'A DBMS provides interfaces and processors that let developers define, query and maintain the database while the system manages the underlying storage.',
          bullets: [
            'A developer interface allows SQL commands to be entered and used to build more complex database operations.',
            'A query processor handles SQL and includes facilities for DDL interpretation, DML compilation and query evaluation.',
            'A data dictionary stores metadata describing the database structure.',
            'Data modelling tools such as E-R diagrams and logical schemas help document the intended structure independently of a particular application.',
          ],
          reviewPrompt: 'What is the difference between the developer interface, query processor and data dictionary?',
          visual: 'files', accent: 'cyan',
        },
      ],
    },
    {
      code: '8.3', title: 'Data definition language (DDL) and data manipulation language (DML)', points: [
        {
          code: '8.3.1', title: 'Industry-standard methods for building and modifying a database', pages: [211, 211],
          lead: 'DDL changes database structures; DML works with the data stored in those structures, and SQL is commonly used for both.',
          bullets: [
            'DDL is used to create, modify and remove relational database structures.',
            'DML is used to add, change, delete and retrieve stored data.',
            'SQL scripts can store a sequence of commands for reuse as a repeatable task.',
          ],
          reviewPrompt: 'Classify each action as DDL or DML: create a table, add a row, change a column definition, retrieve selected rows.',
          visual: 'files', accent: 'indigo',
        },
        {
          code: '8.3.2', title: 'SQL DDL commands and scripts', pages: [211, 212],
          lead: 'DDL statements express database structure using commands for creating and changing tables and their definitions.',
          bullets: [
            'A DDL script defines tables, columns, data types and key constraints needed by the relational design.',
            'ALTER operations change an existing structure, while DROP removes a structure that is no longer required.',
            'The database structure created by the DDL must match the relationships and constraints established during design and normalisation.',
          ],
          reviewPrompt: 'Describe what information must appear in a DDL definition for a table with a primary key and a foreign key.',
          visual: 'files', accent: 'emerald',
        },
        {
          code: '8.3.3', title: 'SQL DML commands and scripts', pages: [213, 216],
          lead: 'DML statements retrieve and maintain data using selection, ordering, grouping, joins, aggregate functions and row-changing commands.',
          bullets: [
            'SELECT and FROM define the requested data source; WHERE filters rows and ORDER BY sorts the result.',
            'GROUP BY forms groups, while aggregate functions such as SUM, COUNT and AVG calculate values over rows.',
            'INNER JOIN combines rows from related tables when the join condition is satisfied.',
            'INSERT INTO adds rows, DELETE FROM removes rows and UPDATE changes existing rows.',
          ],
          reviewPrompt: 'Write the logical sequence of clauses needed to list selected columns for one class in alphabetical order, then name the command used to change existing rows.',
          visual: 'files', accent: 'rose',
        },
      ],
    },
  ],
};

export const CHAPTER_5_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter5);
export const CHAPTER_6_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter6);
export const CHAPTER_7_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter7);
export const CHAPTER_8_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter8);
