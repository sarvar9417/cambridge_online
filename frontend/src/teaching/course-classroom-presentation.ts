import type { LessonPresentationBeat } from './lesson-experience-model';

export type CourseLessonFrame = {
  title: string;
  boundary?: string;
  pages: number[];
  objectives: string[];
  starter: string;
  recap: string[];
};

export type CourseTopicFrame = {
  chapter: number;
  topicCode: string;
  label: string;
  lessons: readonly CourseLessonFrame[];
};

const TOPIC_FRAMES: readonly CourseTopicFrame[] = [
  {
    chapter:5, topicCode:'5.1', label:'CHAPTER 5.1 OPERATING SYSTEMS',
    lessons:[
      {
        title:'Why does a computer need an operating system?', pages:[137,138,139,140,141],
        objectives:[
          'Explain why an operating system is needed between users, applications and hardware.',
          'Compare command-line and graphical user interfaces.',
          'Explain core OS tasks including memory, process, security and device management.',
          'Explain memory protection and the purpose of a memory fence.',
        ],
        starter:'A new computer has hardware but no operating system. Which everyday tasks become difficult or impossible for the user?',
        recap:['Explain the role of the operating system.','Compare CLI and GUI with one suitable use for each.','Explain two memory-management responsibilities.','State why process and security management matter.'],
      },
      {
        boundary:'h5-512-process-hardware-file', title:'How does the OS manage processes, hardware and files?', pages:[142],
        objectives:[
          'Explain process management and scheduling responsibilities.',
          'Explain hardware/peripheral management through drivers and buffering.',
          'Explain file management and access responsibilities.',
          'Explain printer management as an OS service.',
        ],
        starter:'Several programs want CPU time while a printer is still processing an earlier job. What must the operating system coordinate?',
        recap:['State two process-management tasks.','Explain why a device driver is needed.','Explain one purpose of buffering.','Describe one file-management responsibility.'],
      },
      {
        boundary:'h5-513-formatter', title:'What do utility programs do?', pages:[143,144,145,146],
        objectives:[
          'Explain disk formatting and why a file system is needed.',
          'Explain antivirus/anti-malware scanning and limitations.',
          'Explain defragmentation and when it is useful.',
          'Explain analysis, compression and backup utilities.',
        ],
        starter:'A storage device is full, fragmented and contains an infected file. Which utilities would you use, and in what order?',
        recap:['Explain formatting.','Explain how antivirus software detects or handles threats.','Explain why defragmentation is relevant to magnetic disks.','Distinguish compression from backup.'],
      },
      {
        boundary:'h5-514-library-model', title:'How do program libraries support software?', pages:[147,148],
        objectives:[
          'Explain the purpose of program libraries.',
          'Distinguish static and dynamic linking.',
          'Explain advantages of reusing tested library routines.',
          'Relate shared libraries to memory/storage efficiency and deployment.',
        ],
        starter:'Two applications need the same tested routine. Why might using a library be better than copying the routine into both programs?',
        recap:['Define a program library.','Compare static and dynamic linking.','Give one benefit of shared libraries.','State one deployment issue associated with dynamic libraries.'],
      },
    ],
  },
  {
    chapter:5, topicCode:'5.2', label:'CHAPTER 5.2 LANGUAGE TRANSLATORS',
    lessons:[
      {
        title:'How is source code translated?', pages:[149,150,151],
        objectives:[
          'Explain why high-level and assembly programs require translation.',
          'Explain the role of an assembler.',
          'Compare compiler and interpreter translation.',
          'Relate source code, object code and executable code.',
        ],
        starter:'A CPU cannot directly execute Python or assembly mnemonics. What translation stages are needed before instructions can run?',
        recap:['Explain the purpose of an assembler.','Compare a compiler and an interpreter.','Define source and object code.','State one situation where interpretation is useful.'],
      },
      {
        boundary:'h5-522-compiler-interpreter-tradeoffs', title:'Which translator should a developer choose?', pages:[152,153],
        objectives:[
          'Evaluate compiler and interpreter trade-offs.',
          'Explain the role of bytecode and a virtual machine.',
          'Relate translation choice to execution speed, portability and debugging.',
          'Explain why one language can use more than one translation stage.',
        ],
        starter:'A program must run on many platforms but should not expose its original source code to every user. Which translation approach could help?',
        recap:['Give one compiler advantage and one interpreter advantage.','Explain bytecode.','Explain why virtual-machine execution can improve portability.','State how translation choice affects debugging.'],
      },
      {
        boundary:'h5-524-ide-overview', title:'How does an IDE support program development?', pages:[154,155,156,157,158],
        objectives:[
          'Explain the purpose of an integrated development environment.',
          'Explain editor features that support coding.',
          'Explain debugger features such as breakpoints, stepping and variable inspection.',
          'Explain documentation and other development support tools.',
        ],
        starter:'A program produces the wrong answer only after the tenth loop iteration. Which IDE features would help you find the fault?',
        recap:['Define IDE.','Name two useful editor features.','Explain breakpoint and single-step debugging.','State one benefit of integrated documentation/tools.'],
      },
    ],
  },
  {
    chapter:6, topicCode:'6.1', label:'CHAPTER 6.1 DATA SECURITY',
    lessons:[
      {
        title:'How can access to data be protected?', pages:[160,161,162,163],
        objectives:[
          'Explain privacy and the need to protect data from unauthorised access.',
          'Explain user accounts, passwords and authentication controls.',
          'Explain the roles of digital signatures and firewalls at AS Level.',
          'Explain anti-malware, encryption and biometric authentication.',
        ],
        starter:'A school stores student records online. What layers of protection are needed before, during and after a user logs in?',
        recap:['Distinguish identification from authentication.','State good password/account controls.','Explain a firewall.','Explain why encryption protects data even if it is intercepted.'],
      },
      {
        boundary:'h6-613-biometric-hacking-malware', title:'How do attackers obtain or redirect data?', pages:[164,165,166],
        objectives:[
          'Explain common hacking and malware risks.',
          'Explain phishing and social-engineering approaches.',
          'Explain pharming and redirection attacks.',
          'Select suitable protective measures for a stated threat.',
        ],
        starter:'A user types the correct bank address but is sent to a fake site. Which type of attack could explain this?',
        recap:['Distinguish malware from hacking.','Explain phishing.','Explain pharming.','Match one defence to each of two attack types.'],
      },
      {
        boundary:'h6-614-recovery', title:'How should an organisation recover after a security incident?', pages:[167,168],
        objectives:[
          'Explain backup and recovery planning.',
          'Explain why multiple recovery copies/locations reduce risk.',
          'Apply security controls to a practical scenario.',
          'Evaluate prevention and recovery as complementary strategies.',
        ],
        starter:'A ransomware attack encrypts the live server. What must already exist for the organisation to recover safely?',
        recap:['Explain why a backup is not useful if it is compromised with the live system.','State two recovery-planning decisions.','Choose controls for a security scenario.','Explain why prevention alone is insufficient.'],
      },
    ],
  },
  {
    chapter:6, topicCode:'6.2', label:'CHAPTER 6.2 DATA INTEGRITY',
    lessons:[
      {
        title:'How can input data be checked before processing?', pages:[169,170,171,172],
        objectives:[
          'Distinguish data integrity from data security.',
          'Explain validation and apply common validation checks.',
          'Explain entry verification such as double entry/proof reading.',
          'Explain check digits/checksums including the source Modulo 11 example.',
        ],
        starter:'A form contains a date that is correctly typed but impossible. Is the problem validation, verification, or both?',
        recap:['Define data integrity.','Distinguish validation and verification.','Give three validation checks.','Explain the purpose of a check digit.'],
      },
      {
        boundary:'h6-622-parity', title:'How are transmission errors detected?', pages:[173,174,175,176],
        objectives:[
          'Explain even/odd parity and parity-bit checking.',
          'Explain how a parity block can locate a single-bit error.',
          'Explain automatic repeat request (ARQ).',
          'Select an error-detection method for a communication scenario.',
        ],
        starter:'A transmitted byte arrives with the wrong parity. What can the receiver conclude, and what can it not conclude?',
        recap:['Calculate a parity bit for one byte.','Explain a parity block.','Explain ARQ.','State one limitation of parity checking.'],
      },
    ],
  },
  {
    chapter:7, topicCode:'7.1', label:'CHAPTER 7.1 LEGAL, MORAL, ETHICAL AND CULTURAL IMPLICATIONS',
    lessons:[
      {
        title:'What makes a computing decision ethical?', pages:[179,180,181,182],
        objectives:[
          'Distinguish legal, moral, ethical and cultural considerations.',
          'Explain computer ethics and professional responsibility.',
          'Use professional codes such as BCS/IEEE-style principles in a scenario.',
          'Apply ethical reasoning to software and data decisions.',
        ],
        starter:'A technically legal system harms a vulnerable group. Is “legal” enough to decide whether it should be deployed?',
        recap:['Distinguish legal and ethical.','Define computer ethics.','State two professional-code responsibilities.','Apply one ethical principle to a software scenario.'],
      },
      {
        boundary:'h7-713-public-impact', title:'How does computing affect society and public life?', pages:[183,184,185],
        objectives:[
          'Evaluate benefits and harms of computer systems for individuals and society.',
          'Consider access, inclusion and cultural effects.',
          'Analyse public-impact trade-offs rather than giving one-sided claims.',
          'Structure an evidence-based internet/technology debate.',
        ],
        starter:'A public service moves entirely online. Who benefits, who may be excluded, and what responsibilities follow?',
        recap:['Give one positive and one negative social impact.','Explain one cultural/access issue.','State one stakeholder conflict.','Build a balanced argument for an internet-impact question.'],
      },
    ],
  },
  {
    chapter:7, topicCode:'7.2', label:'CHAPTER 7.2 COPYRIGHT ISSUES',
    lessons:[
      {
        title:'How is software ownership protected?', pages:[186,187,188],
        objectives:[
          'Explain copyright in the context of software.',
          'Explain software piracy and its consequences.',
          'Explain digital-rights-management controls.',
          'Distinguish commercial, free/open-source, freeware and shareware models used in the source.',
        ],
        starter:'A user can download a program for free. Does that automatically mean the source code is open and the program can be redistributed?',
        recap:['Explain software copyright.','Explain DRM.','Distinguish freeware and open-source software.','State one issue created by software piracy.'],
      },
    ],
  },
  {
    chapter:7, topicCode:'7.3', label:'CHAPTER 7.3 ARTIFICIAL INTELLIGENCE',
    lessons:[
      {
        title:'What does the coursebook mean by artificial intelligence?', pages:[189,190],
        objectives:[
          'Explain the source definition and examples of AI.',
          'Explain how AI systems can affect decisions and services.',
          'Identify benefits, limitations and ethical concerns.',
          'Avoid treating every automated program as intelligent.',
        ],
        starter:'A program follows a fixed set of rules and never adapts. What evidence would you need before calling it AI?',
        recap:['Define AI using the coursebook framing.','Give two AI applications.','State one benefit and one concern.','Explain why automation and AI are not always identical.'],
      },
      {
        boundary:'h7-733-jobs-economy', title:'How can AI change jobs, environment, transport and data use?', pages:[191,192,193],
        objectives:[
          'Evaluate AI effects on employment and the economy.',
          'Evaluate environmental costs and benefits.',
          'Analyse transport/justice implications.',
          'Explain concerns around advertising, personal data and profiling.',
        ],
        starter:'An AI system makes a service cheaper but removes jobs and uses large amounts of energy. How should those effects be weighed?',
        recap:['Explain one employment effect.','Explain one environmental effect.','Give one transport/justice concern.','Explain one personal-data concern.'],
      },
    ],
  },
  {
    chapter:8, topicCode:'8.1', label:'CHAPTER 8.1 DATABASE CONCEPTS',
    lessons:[
      {
        title:'Why move from separate files to a relational database?', pages:[197,198,199,200,201,202],
        objectives:[
          'Explain limitations of a file-based approach.',
          'Explain the database approach and shared data model.',
          'Define entity, attribute and tuple/record.',
          'Explain primary/foreign keys and one-to-one, one-to-many and many-to-many relationships.',
        ],
        starter:'Two departments keep separate customer files and disagree about a customer address. What database problem does this illustrate?',
        recap:['Give two file-based limitations.','Define entity, attribute and tuple.','Explain primary and foreign keys.','Identify the relationship cardinality in a scenario.'],
      },
      {
        boundary:'h8-815-normalisation-rules', title:'How does normalisation improve database design?', pages:[203,204,205,206,207,208],
        objectives:[
          'Explain the purpose of normalisation.',
          'Transform data through first, second and third normal form.',
          'Identify repeating groups, partial dependencies and transitive dependencies.',
          'Produce a final relational design with suitable keys and links.',
        ],
        starter:'A table repeats customer details on every order line. Which anomalies or dependencies could this create?',
        recap:['State the goal of normalisation.','Explain 1NF.','Explain the dependency removed by 2NF.','Explain the dependency removed by 3NF.'],
      },
    ],
  },
  {
    chapter:8, topicCode:'8.2', label:'CHAPTER 8.2 DATABASE MANAGEMENT SYSTEMS',
    lessons:[
      {
        title:'What does a DBMS add beyond stored tables?', pages:[208,209,210],
        objectives:[
          'Explain DBMS responsibilities and limitations.',
          'Explain the data dictionary.',
          'Explain security/access-control responsibilities.',
          'Explain the role of the query processor.',
        ],
        starter:'A database contains correct tables but no controlled way to query, secure or describe them. What software layer is missing?',
        recap:['Define DBMS.','Explain the data dictionary.','State two DBMS security responsibilities.','Explain the query processor.'],
      },
    ],
  },
  {
    chapter:8, topicCode:'8.3', label:'CHAPTER 8.3 DDL AND DML',
    lessons:[
      {
        title:'How are database structures defined and data manipulated?', pages:[211,212,213,214],
        objectives:[
          'Distinguish data definition language from data manipulation language.',
          'Use/interpret DDL statements that define tables and constraints.',
          'Use/interpret query DML.',
          'Use/interpret maintenance DML that inserts, updates or deletes records.',
        ],
        starter:'Creating a table and retrieving rows both use database languages, but do they change the same thing?',
        recap:['Distinguish DDL and DML.','State one DDL operation.','State one query DML operation.','State one maintenance DML operation.'],
      },
    ],
  },
  {
    chapter:9, topicCode:'9.1', label:'CHAPTER 9.1 COMPUTATIONAL THINKING SKILLS',
    lessons:[
      {
        title:'How do abstraction and decomposition make problems manageable?', pages:[217,218,219],
        objectives:[
          'Explain abstraction as removing irrelevant detail.',
          'Explain decomposition as breaking a problem into manageable parts.',
          'Apply both techniques to a computing problem.',
          'Explain why the chosen representation should retain only necessary detail.',
        ],
        starter:'You are designing a route planner. Which real-world details matter to the algorithm, and which can be ignored?',
        recap:['Define abstraction.','Define decomposition.','Apply abstraction to one scenario.','Break one problem into meaningful sub-problems.'],
      },
    ],
  },
  {
    chapter:9, topicCode:'9.2', label:'CHAPTER 9.2 ALGORITHMS',
    lessons:[
      {
        title:'How can an algorithm be represented?', pages:[220,221,222],
        objectives:[
          'Compare structured English, pseudocode and flowcharts.',
          'Trace an average-calculation flowchart.',
          'Use identifiers, input/output and assignment correctly.',
          'Choose a suitable representation for an algorithm.',
        ],
        starter:'Would you explain an algorithm to a programmer, a client and a computer in exactly the same notation?',
        recap:['Name three algorithm representations.','Explain assignment.','Distinguish input and output.','Trace one simple flowchart.'],
      },
      {
        boundary:'h9-922-selection', title:'How do selection and iteration control program flow?', pages:[223,224,225,226,227,228],
        objectives:[
          'Use IF/ELSE-style selection.',
          'Use count-controlled and condition-controlled iteration.',
          'Translate control structures across the source language examples.',
          'Combine loops, validation and calculations.',
        ],
        starter:'A program repeats until valid input is entered, then chooses one of two actions. Which control structures are required?',
        recap:['Write one selection condition.','Choose a suitable loop for a fixed number of repetitions.','Choose a suitable loop for input validation.','Explain one nested control-flow example.'],
      },
      {
        boundary:'h9-923-password-and-structured-english', title:'How is a larger algorithm designed step by step?', pages:[229,230,231],
        objectives:[
          'Use structured English to plan a solution.',
          'Choose meaningful identifiers.',
          'Decompose a larger problem into ordered processing stages.',
          'Develop and trace the source marathon/password examples.',
        ],
        starter:'Before writing pseudocode for a race-results system, which data items, identifiers and sub-problems must be identified?',
        recap:['Write structured-English steps for a small problem.','Choose meaningful identifiers.','State the stages of the marathon-style process.','Explain why planning before coding reduces errors.'],
      },
      {
        boundary:'h9-924-flowchart-symbols', title:'How is an algorithm refined to a detailed solution?', pages:[232,233,234,235],
        objectives:[
          'Use standard flowchart symbols accurately.',
          'Refine nested-selection logic.',
          'Develop repetition-based algorithms.',
          'Apply stepwise/detailed refinement to a complete problem.',
        ],
        starter:'A high-level box says “process grades”. What questions must be answered before it becomes executable pseudocode?',
        recap:['Identify common flowchart symbols.','Explain nested selection.','Refine one high-level step into detailed pseudocode.','Trace the final refined algorithm.'],
      },
    ],
  },
  {
    chapter:10, topicCode:'10.1', label:'CHAPTER 10.1 DATA TYPES AND RECORDS',
    lessons:[
      {
        title:'How are related values represented with data types and records?', pages:[238,239,240],
        objectives:['Review basic data types.','Explain a record as a composite structure.','Define fields and record types.','Choose suitable types for a data model.'],
        starter:'A student has a name, date of birth and exam score. Why is a record useful compared with three unrelated variables?',
        recap:['Name common basic types.','Define record.','Define field.','Design a small record type.'],
      },
    ],
  },
  {
    chapter:10, topicCode:'10.2', label:'CHAPTER 10.2 ARRAYS',
    lessons:[
      {
        title:'How do one- and two-dimensional arrays organise repeated data?', pages:[241,242],
        objectives:['Explain 1D arrays.','Explain 2D arrays.','Use indexes correctly.','Select an appropriate array shape for a problem.'],
        starter:'Scores for one class fit a list; scores for many classes across many tests form what kind of array?',
        recap:['Define 1D array.','Define 2D array.','Access one indexed element.','Choose an array structure for a scenario.'],
      },
      {
        boundary:'h10-1023-linear-search-core', title:'How does linear search find an item?', pages:[243,244],
        objectives:['Trace linear search.','Explain the stopping condition.','Use a trace table to follow comparisons.','State when linear search is suitable.'],
        starter:'If an array is unsorted, can you safely ignore half of it after one comparison?',
        recap:['Write the linear-search steps.','Trace a search.','State worst-case behaviour qualitatively.','Explain why order is not required.'],
      },
      {
        boundary:'h10-1024-bubble-algorithm', title:'How does bubble sort order an array?', pages:[245,246,247,248],
        objectives:['Explain compare-and-swap.','Trace multiple bubble-sort passes.','Explain the role of the swap/no-swap condition.','Recognise when the array is fully sorted.'],
        starter:'Why can a bubble-sort pass stop early if no swap occurs?',
        recap:['Trace one pass.','Explain what moves toward the end of the list after a pass.','State the purpose of a swapped flag.','Complete a short bubble-sort trace.'],
      },
    ],
  },
  {
    chapter:10, topicCode:'10.3', label:'CHAPTER 10.3 FILES',
    lessons:[
      {
        title:'How does a program read and write persistent data?', pages:[249,250],
        objectives:['Explain why files are used for persistent data.','Explain open/read/write/close operations.','Relate file routines to program data structures.','Distinguish in-memory data from stored file data.'],
        starter:'What happens to a program variable after the program ends, and how can a file change that?',
        recap:['Explain persistence.','State a safe file-operation sequence.','Distinguish read and write.','Explain why a file should be closed.'],
      },
    ],
  },
  {
    chapter:10, topicCode:'10.4', label:'CHAPTER 10.4 ABSTRACT DATA TYPES',
    lessons:[
      {
        title:'How do pointers and stacks represent dynamic structures?', pages:[250,251,252],
        objectives:['Explain pointers/references at the course level.','Explain stack LIFO behaviour.','Use push and pop operations.','Relate stack state to top-of-stack.'],
        starter:'A browser Back history removes the most recently visited page first. Which ADT matches that behaviour?',
        recap:['Define pointer/reference.','Define LIFO.','Trace push/pop.','State one stack application.'],
      },
      {
        boundary:'h10-1042-queue-circular', title:'How does a circular queue work?', pages:[253,254],
        objectives:['Explain FIFO behaviour.','Explain front/rear pointers.','Explain circular reuse of array space.','Trace enqueue and dequeue pseudocode.'],
        starter:'Why can a fixed array appear “full” at the rear even though earlier positions are empty after dequeues?',
        recap:['Define FIFO.','Trace enqueue.','Trace dequeue.','Explain circular wrap-around.'],
      },
      {
        boundary:'h10-1043-linked-list-start', title:'How does a linked list grow and change?', pages:[255,256,257,258],
        objectives:['Explain nodes and pointers in a linked list.','Insert nodes while preserving links.','Trace the source list-building examples.','Choose identifiers and operations for linked-list manipulation.'],
        starter:'How can a data structure insert a new item without shifting every later item in an array?',
        recap:['Define linked-list node.','Explain next-pointer use.','Trace one insertion.','Compare one linked-list property with an array.'],
      },
    ],
  },
  {
    chapter:11, topicCode:'11.1', label:'CHAPTER 11.1 PROGRAMMING BASICS',
    lessons:[
      {
        title:'How are values, input and calculations expressed in code?', pages:[264,265,266,267,268],
        objectives:['Use constants and variables.','Translate a simple algorithm into program statements.','Use input/output correctly.','Perform calculations with appropriate types.'],
        starter:'A program calculates a sphere value from user input. Which values should be variables and which should be constants?',
        recap:['Distinguish constant and variable.','Choose suitable types.','Write input/output steps.','Trace a simple calculation.'],
      },
      {
        boundary:'h11-111-java-builtins', title:'How do built-in and library routines extend a program?', pages:[269,270,271],
        objectives:['Use common built-in functions.','Explain string/password function examples.','Explain the role of library routines.','Select a suitable routine for a task.'],
        starter:'Why rewrite a tested string-length or random-number routine if the language already provides one?',
        recap:['Give two built-in routine examples.','Explain one string routine.','Define library routine.','State one reuse benefit.'],
      },
    ],
  },
  {
    chapter:11, topicCode:'11.2', label:'CHAPTER 11.2 PROGRAMMING CONSTRUCTS',
    lessons:[
      {
        title:'How do selection and loops appear in real programs?', pages:[271,272,273,274],
        objectives:['Use case/multi-way selection.','Translate selection across source language examples.','Use loops correctly.','Choose constructs based on the problem.'],
        starter:'A menu has six numbered choices. Is a long chain of binary IF statements always the clearest representation?',
        recap:['Explain case selection.','Write one loop.','Choose selection for a menu.','Choose a loop for repeated processing.'],
      },
    ],
  },
  {
    chapter:11, topicCode:'11.3', label:'CHAPTER 11.3 STRUCTURED PROGRAMMING',
    lessons:[
      {
        title:'How do procedures and parameters structure a program?', pages:[275,276,277,278],
        objectives:['Explain procedures/subroutines.','Explain calls and parameters.','Distinguish value and reference parameter passing.','Explain scope/side effects at the level used in the source examples.'],
        starter:'Two parts of a program need the same calculation. How can a subroutine avoid duplication?',
        recap:['Define procedure.','Explain parameter.','Compare by-value and by-reference.','Trace one procedure call.'],
      },
      {
        boundary:'h11-1132-functions', title:'When should a program use a function?', pages:[279,280],
        objectives:['Explain functions and return values.','Distinguish function and procedure.','Use language function examples.','Select a function when an expression needs a returned result.'],
        starter:'A subroutine calculates a maximum value that must be used inside a larger expression. Should it return a value?',
        recap:['Define function.','Distinguish function/procedure.','Trace a return value.','Give one suitable function use.'],
      },
    ],
  },
  {
    chapter:12, topicCode:'12.1', label:'CHAPTER 12.1 PROGRAM DEVELOPMENT LIFECYCLE',
    lessons:[
      {
        title:'Why use a development lifecycle?', pages:[283,284,285],
        objectives:['Explain the purpose of a development lifecycle.','Identify major development stages.','Explain the waterfall model.','Evaluate a sequential lifecycle for a stable project.'],
        starter:'If requirements change after coding begins, what problem might a rigid one-pass development process face?',
        recap:['Name lifecycle stages.','Explain waterfall.','Give one waterfall advantage.','Give one waterfall limitation.'],
      },
      {
        boundary:'h12-121-iterative-rad-intro', title:'How do iterative and RAD approaches respond to change?', pages:[286,287],
        objectives:['Explain iterative development.','Explain rapid application development.','Compare iterative/RAD with waterfall.','Choose a lifecycle approach for a scenario.'],
        starter:'A client is unsure what interface they want and needs frequent prototypes. Which lifecycle characteristics would help?',
        recap:['Define iterative development.','Define RAD.','Compare with waterfall.','Choose and justify a model.'],
      },
    ],
  },
  {
    chapter:12, topicCode:'12.2', label:'CHAPTER 12.2 PROGRAM DESIGN',
    lessons:[
      {
        title:'How do structure charts decompose a program?', pages:[288,289,290,291],
        objectives:['Interpret structure-chart notation.','Represent sequence and repetition in modules.','Decompose a calculation into modules.','Relate the complete structure chart to the intended program.'],
        starter:'A “calculate sphere properties” program contains several calculations. How could modules make the design easier to understand and test?',
        recap:['Explain a structure chart.','Identify a module.','Show repetition/sequence.','Decompose one problem.'],
      },
      {
        boundary:'h12-1222-fsm-table', title:'How do finite-state machines model behaviour?', pages:[292,293],
        objectives:['Explain state, event/input and transition.','Interpret a state-transition table.','Model a simple door/TV-style system.','Use an FSM when behaviour depends on current state.'],
        starter:'Why does the same button press produce a different result depending on whether a device is currently ON or OFF?',
        recap:['Define state.','Define transition.','Read one transition table row.','Design a small FSM.'],
      },
    ],
  },
  {
    chapter:12, topicCode:'12.3', label:'CHAPTER 12.3 PROGRAM TESTING AND MAINTENANCE',
    lessons:[
      {
        title:'How are program faults found systematically?', pages:[294,295,296],
        objectives:['Distinguish syntax, logic and runtime errors.','Explain testing strategy.','Choose normal, abnormal and boundary test data.','Relate expected and actual results to fault finding.'],
        starter:'A program runs without crashing but calculates the wrong answer. Which error category is most likely?',
        recap:['Distinguish three error types.','Choose test data categories.','Explain expected result.','State one testing strategy.'],
      },
      {
        boundary:'h12-1233-dry-run', title:'How do dry runs, walkthroughs and maintenance complete testing?', pages:[297,298,299],
        objectives:['Perform a dry run/trace.','Explain walkthroughs.','Explain levels/stages of testing.','Explain why maintenance follows deployment.'],
        starter:'Before executing code, how can a team detect a logic error using only the algorithm and a table of values?',
        recap:['Explain dry run.','Explain walkthrough.','State one testing level.','Explain one reason for program maintenance.'],
      },
    ],
  },
];

const key=(chapter:number,topicCode:string)=>`${chapter}:${topicCode}`;
const FRAME_MAP=new Map(TOPIC_FRAMES.map(frame=>[key(frame.chapter,frame.topicCode),frame] as const));

function idFor(frame:CourseTopicFrame,lessonIndex:number,suffix:'cover'|'objectives'|'starter'|'recap'){
  return `hcf-${frame.topicCode.replace('.','-')}-l${lessonIndex+1}-${suffix}`;
}

function beatFor(frame:CourseTopicFrame,lessonIndex:number,suffix:'cover'|'objectives'|'starter'|'recap'):LessonPresentationBeat{
  const lesson=frame.lessons[lessonIndex]!;
  const common={
    id:idFor(frame,lessonIndex,suffix),
    slideId:idFor(frame,lessonIndex,suffix),
    eyebrow:`LESSON ${lessonIndex+1} OF ${frame.lessons.length} · ${frame.label}`,
    sourcePages:lesson.pages,
    showSource:false,
    visual:'types' as const,
  };
  if(suffix==='cover')return {...common,kind:'concept',sceneRole:'hook',title:lesson.title,lead:lesson.starter};
  if(suffix==='objectives')return {...common,kind:'key-idea',sceneRole:'objective',title:'Learning objectives',bullets:lesson.objectives};
  if(suffix==='starter')return {...common,kind:'check',sceneRole:'challenge',title:'Starter: think, pair, share',prompt:lesson.starter};
  return {...common,kind:'check',sceneRole:'recap',title:`Lesson ${lessonIndex+1} retrieval check`,bullets:lesson.recap};
}

function opening(frame:CourseTopicFrame,index:number){
  return [beatFor(frame,index,'cover'),beatFor(frame,index,'objectives'),beatFor(frame,index,'starter')];
}

export function frameConfiguredCoursePresentation(chapter:number,topicCode:string,teaching:LessonPresentationBeat[]){
  const frame=FRAME_MAP.get(key(chapter,topicCode));
  if(!frame||!frame.lessons.length)return null;
  const result:LessonPresentationBeat[]=[...opening(frame,0)];
  let active=0;
  const inserted=new Set<number>([0]);
  for(const beat of teaching){
    const next=frame.lessons.findIndex((lesson,index)=>index>0&&lesson.boundary===beat.slideId);
    if(next>active&&!inserted.has(next)){
      result.push(beatFor(frame,active,'recap'),...opening(frame,next));
      inserted.add(next);
      active=next;
    }
    result.push(beat);
  }
  result.push(beatFor(frame,active,'recap'));
  return result;
}

export function coursePresentationFrameInfo(beat:LessonPresentationBeat){
  const match=beat.id.match(/^hcf-(\d+)-(\d+)-l(\d+)-(cover|objectives|starter|recap)$/);
  if(!match)return null;
  const topicCode=`${match[1]}.${match[2]}`;
  const frame=FRAME_MAP.get(key(Number(match[1]),topicCode));
  if(!frame)return null;
  const lessonIndex=Number(match[3])-1;
  const lesson=frame.lessons[lessonIndex];
  if(!lesson)return null;
  return {frame,lesson,lessonIndex,stage:match[4] as 'cover'|'objectives'|'starter'|'recap'};
}

export const CONFIGURED_COURSE_TOPIC_FRAMES=TOPIC_FRAMES;
