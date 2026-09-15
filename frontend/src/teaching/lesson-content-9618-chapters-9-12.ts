import { buildSourceBacked9618Chapter, type SourceBackedChapterSpec } from './lesson-content-9618-summary-builder';

const chapter9: SourceBackedChapterSpec = {
  number: 9,
  level: 'AS Level',
  title: 'Algorithm design and problem solving',
  subtitle: 'Computational thinking, algorithm representation and stepwise refinement.',
  objectives: [
    'Use abstraction and decomposition to make a problem manageable.',
    'Design algorithms that solve stated problems and communicate them using structured English, flowcharts and pseudocode.',
    'Use the prescribed pseudocode constructs consistently when expressing sequence, selection and iteration.',
    'Apply stepwise refinement so a complex task is progressively decomposed into implementable steps.',
  ],
  topics: [
    {
      code: '9.1', title: 'Computational thinking skills', points: [
        {
          code: '9.1.1', title: 'Using abstraction', pages: [217, 218],
          lead: 'Abstraction removes detail that is not needed for the current problem so that attention can be focused on the information and behaviour that matter.',
          bullets: [
            'A useful abstraction keeps the essential properties needed to solve the problem and deliberately ignores irrelevant detail.',
            'The level of abstraction depends on the task: information that is essential in one problem may be unnecessary in another.',
            'Abstraction supports clear models, variables and interfaces because only the required features are represented.',
          ],
          reviewPrompt: 'For a route-planning program, identify two details that must be retained and one real-world detail that can usually be abstracted away.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '9.1.2', title: 'Using decomposition', pages: [219, 219],
          lead: 'Decomposition breaks a large problem into smaller sub-problems that can be designed, tested and understood separately.',
          bullets: [
            'Each sub-problem should have a clear purpose and contribute to the overall solution.',
            'Smaller components are easier to reason about, test and reuse than one unstructured solution.',
            'Decomposition prepares the way for modules, procedures and stepwise refinement later in program design.',
          ],
          reviewPrompt: 'Decompose a simple school registration system into at least four meaningful sub-tasks.',
          visual: 'recap', accent: 'cyan',
        },
      ],
    },
    {
      code: '9.2', title: 'Algorithms', points: [
        {
          code: '9.2.1', title: 'Writing algorithms that provide solutions to problems', pages: [219, 220],
          lead: 'An algorithm is a finite, ordered method for turning the required inputs into the required outputs.',
          bullets: [
            'The solution must be derived from the problem requirements rather than from the syntax of one programming language.',
            'Inputs, processing, outputs and any required stored data should be identified before detailed coding begins.',
            'A good representation makes the control flow unambiguous enough for another person to follow and test.',
          ],
          reviewPrompt: 'For a program that calculates a pupil’s average mark, identify the inputs, processing and output before writing any pseudocode.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '9.2.2', title: 'Writing simple algorithms using pseudocode', pages: [221, 228],
          lead: 'Pseudocode expresses algorithm logic in a language-independent form using consistent keywords, indentation and assignment.',
          bullets: [
            'Sequence executes statements in order; selection chooses a path according to a condition; iteration repeats a block according to a loop rule.',
            'Identifiers should be meaningful and assignment must be distinguished from comparison.',
            'Input and output statements make the data entering and leaving the algorithm explicit.',
            'Count-controlled, pre-condition and post-condition loops are selected according to when and how the repetition should stop.',
          ],
          reviewPrompt: 'Choose the most suitable control structure for: a fixed 20 repetitions, validating input until acceptable, and choosing between three grade bands.',
          visual: 'types', accent: 'cyan',
        },
        {
          code: '9.2.3', title: 'Writing pseudocode from a structured English description', pages: [229, 230],
          lead: 'Structured English describes a solution in controlled, ordered statements that can be translated systematically into pseudocode.',
          bullets: [
            'Identify the actions, conditions and repetitions in the English description before selecting pseudocode constructs.',
            'Preserve the stated order of operations and make every decision condition explicit.',
            'Replace vague natural-language phrases with precise variables, operators and control structures.',
          ],
          reviewPrompt: 'Take a short structured-English description of a password check and label every part as sequence, selection or iteration before converting it.',
          visual: 'types', accent: 'emerald',
        },
        {
          code: '9.2.4', title: 'Writing pseudocode from a flowchart', pages: [231, 232],
          lead: 'A flowchart and pseudocode can represent the same algorithm; the conversion must preserve decisions, loop-back paths and statement order.',
          bullets: [
            'Process boxes become ordered statements and input/output symbols become explicit input or output operations.',
            'A decision diamond becomes a selection or loop condition with each branch represented clearly.',
            'Backward flow in a chart usually corresponds to iteration and must be given an explicit termination condition in pseudocode.',
          ],
          reviewPrompt: 'Explain how you recognise a loop in a flowchart and what information is needed to express that loop in pseudocode.',
          visual: 'recap', accent: 'amber',
        },
        {
          code: '9.2.5', title: 'Stepwise refinement', pages: [233, 237],
          lead: 'Stepwise refinement repeatedly decomposes a high-level task until each part can be represented by precise algorithmic steps.',
          bullets: [
            'Begin with the overall task and replace broad steps with more detailed sub-steps one level at a time.',
            'Keep interfaces between refined parts clear so that the complete sequence still solves the original problem.',
            'Stop refining when the remaining steps are sufficiently precise to translate directly into pseudocode or code.',
            'The chapter review applies abstraction, decomposition and refinement together rather than as isolated definitions.',
          ],
          reviewPrompt: 'Refine “process a customer order” through two levels, ending with steps precise enough to implement.',
          visual: 'recap', accent: 'rose',
        },
      ],
    },
  ],
};

const chapter10: SourceBackedChapterSpec = {
  number: 10,
  level: 'AS Level',
  title: 'Data types and structures',
  subtitle: 'Primitive data, records, arrays, files and abstract data types including stacks, queues and linked lists.',
  objectives: [
    'Select and use appropriate data types and construct records from related fields.',
    'Declare and use one-dimensional and two-dimensional arrays and apply linear search and bubble sort to array data.',
    'Use files to store data beyond one execution of a program.',
    'Explain and implement the behaviour of stacks, queues and linked lists as abstract data types.',
  ],
  topics: [
    {
      code: '10.1', title: 'Data types and records', points: [
        {
          code: '10.1.1', title: 'Data types', pages: [238, 239],
          lead: 'A data type defines the kind of value that can be stored and therefore which operations are meaningful for that value.',
          bullets: [
            'Programs use types such as integer, real, character, string and Boolean according to the nature of the data.',
            'Choosing the correct type helps prevent invalid operations and makes storage and processing intentions clear.',
            'Identifiers should be declared with suitable types before they are used in an algorithm.',
          ],
          reviewPrompt: 'Choose an appropriate data type for a pupil’s age, average mark, single initial, full name and whether attendance is confirmed.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '10.1.2', title: 'Records', pages: [240, 240],
          lead: 'A record groups several named fields, possibly of different data types, to describe one logical entity.',
          bullets: [
            'Each record field has its own identifier and data type.',
            'The record type defines the structure once so that many records can share the same field layout.',
            'Records are suitable when several related values belong together but are not all the same type.',
          ],
          reviewPrompt: 'Design a record type for a book using at least four fields with at least three different data types.',
          visual: 'types', accent: 'cyan',
        },
      ],
    },
    {
      code: '10.2', title: 'Arrays', points: [
        {
          code: '10.2.1', title: 'One-dimensional arrays', pages: [241, 241],
          lead: 'A one-dimensional array stores multiple values of the same type under one identifier, with an index used to select an element.',
          bullets: [
            'The array declaration fixes the element type and an index range.',
            'A loop can process each indexed element systematically.',
            'Array bounds must be respected when reading or writing an element.',
          ],
          reviewPrompt: 'Explain why an array is preferable to 30 separately named variables for storing 30 test scores.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '10.2.2', title: 'Two-dimensional arrays', pages: [242, 242],
          lead: 'A two-dimensional array organises same-type values using two indices, making it suitable for row-and-column data.',
          bullets: [
            'The first and second indices identify an element’s position in the two-dimensional structure.',
            'Nested loops are normally used to visit every element.',
            'The same idea can be extended to more dimensions when the problem requires additional indexed coordinates.',
          ],
          reviewPrompt: 'Describe how nested loops can visit every element in a table containing 5 rows and 8 columns.',
          visual: 'types', accent: 'cyan',
        },
        {
          code: '10.2.3', title: 'Using a linear search', pages: [243, 244],
          lead: 'A linear search checks array elements in order until the target is found or the searchable range is exhausted.',
          bullets: [
            'Start at the lower bound and compare each element with the target value.',
            'Stop early when a match is found, or conclude that the target is absent after the upper bound is reached.',
            'The method works without requiring the array to be sorted first.',
          ],
          reviewPrompt: 'Trace a linear search for 27 through [14, 31, 27, 8, 40] and state how many comparisons are needed.',
          visual: 'recap', accent: 'emerald',
        },
        {
          code: '10.2.4', title: 'Using a bubble sort', pages: [245, 248],
          lead: 'Bubble sort repeatedly compares adjacent elements and swaps those that are in the wrong order.',
          bullets: [
            'A pass moves out-of-order adjacent values toward their correct end of the array.',
            'Further passes are required until the data is ordered; an implementation can detect whether any swap occurred.',
            'The comparison direction determines whether the final ordering is ascending or descending.',
          ],
          reviewPrompt: 'Perform one complete ascending bubble-sort pass on [7, 3, 9, 2] and show every swap.',
          visual: 'recap', accent: 'amber',
        },
      ],
    },
    {
      code: '10.3', title: 'Files', points: [
        {
          code: '10.3', title: 'Using files for persistent data', pages: [249, 249],
          lead: 'A file allows data to remain available after a program finishes and to be read or updated during a later execution.',
          bullets: [
            'A program opens a file in a mode appropriate to the required operation before reading or writing data.',
            'Data is processed in a defined sequence and the file is closed when the operation is complete.',
            'Programs must distinguish data held temporarily in variables from data stored persistently in a file.',
          ],
          reviewPrompt: 'Describe the open–process–close sequence for a program that reads names from a text file and writes selected names to a new file.',
          visual: 'files', accent: 'indigo',
        },
      ],
    },
    {
      code: '10.4', title: 'Abstract data types (ADTs)', points: [
        {
          code: '10.4.1', title: 'Stack operations', pages: [250, 252],
          lead: 'A stack is a last-in, first-out structure controlled through operations on the top of the stack.',
          bullets: [
            'PUSH adds a new item at the top and POP removes the current top item.',
            'A top pointer identifies the current top position when the stack is implemented using an array.',
            'Implementations must detect underflow when removing from an empty stack and overflow when adding to a full fixed-size stack.',
          ],
          reviewPrompt: 'Starting with an empty stack, PUSH A, PUSH B, PUSH C, POP once. State the item returned and the remaining order.',
          visual: 'types', accent: 'cyan',
        },
        {
          code: '10.4.2', title: 'Queue operations', pages: [253, 254],
          lead: 'A queue is a first-in, first-out structure: items are added at the rear and removed from the front.',
          bullets: [
            'ENQUEUE changes the rear position; DEQUEUE changes the front position.',
            'A fixed-size array implementation must detect full and empty conditions.',
            'Treating the array as circular avoids shifting every stored item when an item is removed from the front.',
          ],
          reviewPrompt: 'Explain why a circular queue is more efficient than shifting every remaining item after each dequeue.',
          visual: 'types', accent: 'emerald',
        },
        {
          code: '10.4.3', title: 'Linked list operations', pages: [255, 263],
          lead: 'A linked list stores each item with a pointer to the next node, allowing logical order to differ from physical array order.',
          bullets: [
            'A start pointer identifies the first node and the final node contains a null pointer.',
            'When arrays are used to implement the list, unused locations can themselves be managed as an empty list or heap.',
            'Insertion and deletion are performed by changing pointers so that the required logical links are preserved.',
            'The end-of-chapter tasks combine arrays and ADT operations so that pointer changes must be traced carefully.',
          ],
          reviewPrompt: 'Why can a linked list insert an item between two existing logical items without moving every later data item?',
          visual: 'types', accent: 'rose',
        },
      ],
    },
  ],
};

const chapter11: SourceBackedChapterSpec = {
  number: 11,
  level: 'AS Level',
  title: 'Programming',
  subtitle: 'Programming basics, selection and iteration, and structured programs built from procedures and functions.',
  objectives: [
    'Declare and use constants and variables and apply standard library routines where appropriate.',
    'Use selection constructs including IF and CASE correctly.',
    'Choose between count-controlled, pre-condition and post-condition loops.',
    'Build structured programs using procedures, parameters and functions.',
  ],
  topics: [
    {
      code: '11.1', title: 'Programming basics', points: [
        {
          code: '11.1.1', title: 'Constants and variables', pages: [264, 270],
          lead: 'Constants and variables give meaningful identifiers to data used by a program; variables may change while constants represent fixed values.',
          bullets: [
            'Identifiers should be declared before use in languages that require declarations and should be given suitable data types.',
            'Constants are assigned values that do not change during program execution.',
            'Variables should be initialised appropriately so that later calculations do not depend on an unknown starting value.',
            'The section also develops common input, output, arithmetic and string-processing operations used in small programs.',
          ],
          reviewPrompt: 'For a circle-area program, identify which values should be constants and which should be variables, and justify each choice.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '11.1.2', title: 'Library routines', pages: [271, 271],
          lead: 'Programming environments provide tested library routines for common operations so that developers can reuse existing functionality.',
          bullets: [
            'Standard libraries include functions and procedures for frequently required tasks such as input, output and string processing.',
            'A programmer calls a library routine through its documented interface rather than rewriting the internal algorithm.',
            'An IDE can make these libraries available together with editing, interpretation or compilation tools.',
          ],
          reviewPrompt: 'Give one benefit of using a standard library routine rather than writing a new version of the same operation.',
          visual: 'types', accent: 'cyan',
        },
      ],
    },
    {
      code: '11.2', title: 'Programming constructs', points: [
        {
          code: '11.2.1', title: 'CASE and IF', pages: [271, 273],
          lead: 'Selection chooses which statements execute according to one or more conditions.',
          bullets: [
            'IF is suitable for Boolean conditions and for two-way or nested decisions.',
            'CASE is useful when one expression is compared with a set of discrete alternatives.',
            'The chosen construct should make all required alternatives and any default or rejected case explicit.',
          ],
          reviewPrompt: 'Choose IF or CASE for checking a numeric range, and for selecting an operation from +, −, × and ÷. Explain your choices.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '11.2.2', title: 'Loops', pages: [274, 274],
          lead: 'Loops repeat code using one of three control patterns: count-controlled, pre-condition or post-condition repetition.',
          bullets: [
            'FOR … NEXT is appropriate when the number of repetitions is known.',
            'WHILE … DO tests before the loop body, so the body may execute zero times.',
            'REPEAT … UNTIL tests after the loop body, so the body executes at least once and is useful for repeated input validation.',
          ],
          reviewPrompt: 'Which loop is best for processing exactly 50 records, and which is best for asking again until an entered value is valid?',
          visual: 'recap', accent: 'emerald',
        },
      ],
    },
    {
      code: '11.3', title: 'Structured programming', points: [
        {
          code: '11.3.1', title: 'Procedures', pages: [275, 277],
          lead: 'A procedure packages a named sequence of statements so that a program can be decomposed into reusable modules.',
          bullets: [
            'A procedure header gives its name and any parameters required by the module.',
            'Arguments supply values when the procedure is called.',
            'Parameters passed by value cannot be used by the procedure to alter the caller’s variable, while a by-reference parameter allows the procedure to change that variable where the language supports it.',
            'Procedures support decomposition by isolating one task behind a clear interface.',
          ],
          reviewPrompt: 'Explain the difference between passing a parameter by value and by reference using a temperature-conversion procedure.',
          visual: 'types', accent: 'cyan',
        },
        {
          code: '11.3.2', title: 'Functions', pages: [278, 282],
          lead: 'A function is a named module that returns a value, making repeated calculations or transformations reusable within expressions.',
          bullets: [
            'The function header identifies the function, its parameters and the type of value returned.',
            'A function can accept arguments, perform a calculation and return one result to the calling statement.',
            'Choosing between a procedure and a function depends on whether the required module is primarily performing actions or producing a value for use by the caller.',
            'The chapter review combines modular programming with earlier selection, loop and data-handling constructs.',
          ],
          reviewPrompt: 'When would a Celsius-to-Fahrenheit conversion be naturally written as a function rather than a procedure?',
          visual: 'types', accent: 'rose',
        },
      ],
    },
  ],
};

const chapter12: SourceBackedChapterSpec = {
  number: 12,
  level: 'AS Level',
  title: 'Software development',
  subtitle: 'Program development lifecycles, design models, testing and maintenance.',
  objectives: [
    'Explain the purpose and stages of a program development lifecycle and compare different lifecycle models.',
    'Use structure charts and state-transition diagrams to document program designs.',
    'Distinguish syntax, logic and run-time errors and use systematic techniques to expose and correct faults.',
    'Plan and apply suitable program testing, including white-box, black-box, integration, alpha, beta and acceptance testing.',
    'Distinguish corrective, perfective and adaptive maintenance.',
  ],
  topics: [
    {
      code: '12.1', title: 'Program development lifecycle', points: [
        {
          code: '12.1.1', title: 'The purpose of a program development lifecycle', pages: [283, 284],
          lead: 'A development lifecycle gives software work an ordered, documented structure that can be followed by developers throughout the life of the program.',
          bullets: [
            'The lifecycle makes the development process understandable and repeatable rather than an unstructured jump directly into coding.',
            'Documentation allows other developers to understand decisions and continue work later.',
            'The lifecycle continues after release because a program may require changes or error correction while it remains in use.',
          ],
          reviewPrompt: 'Why is the term “lifecycle” appropriate even after the first working version has been released?',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '12.1.2', title: 'Stages in the program development lifecycle', pages: [284, 284],
          lead: 'The chapter organises development into analysis, design, coding, testing and maintenance.',
          bullets: [
            'Analysis establishes what the program is required to do.',
            'Design plans the solution before implementation; coding translates that design into a chosen programming language.',
            'Testing checks the program against its intended behaviour, and maintenance deals with changes and faults during use.',
          ],
          reviewPrompt: 'Put analysis, design, coding, testing and maintenance in a sensible sequence and give the main purpose of each stage.',
          visual: 'recap', accent: 'cyan',
        },
        {
          code: '12.1.3', title: 'Different development lifecycles', pages: [285, 286],
          lead: 'Different projects can organise the same core lifecycle stages in different ways; the chapter compares waterfall, iterative development and rapid application development (RAD).',
          bullets: [
            'The waterfall model is sequential: one stage is completed and approved before the next begins.',
            'An iterative model revisits development through repeated cycles so that the program can be refined as understanding grows.',
            'RAD emphasises rapid construction and frequent user involvement to produce and refine working parts quickly.',
            'The suitable model depends on factors such as stability of requirements, project size and the need for feedback during development.',
          ],
          reviewPrompt: 'Choose waterfall, iterative or RAD for a project with frequently changing user requirements and justify your choice from the model’s behaviour.',
          visual: 'recap', accent: 'emerald',
        },
      ],
    },
    {
      code: '12.2', title: 'Program design', points: [
        {
          code: '12.2.1', title: 'Purpose and use of structure charts', pages: [287, 291],
          lead: 'A structure chart decomposes a program into a hierarchy of modules and shows how modules interact and pass information.',
          bullets: [
            'Each box represents a module and each lower level refines a task from the level above.',
            'Arrows can show parameters passed between modules.',
            'The notation can represent selection and repetition as part of the modular design.',
            'The chart is a design tool: detailed algorithmic logic is then written for the individual modules.',
          ],
          reviewPrompt: 'Sketch the module hierarchy for a program that inputs two sides, calculates a rectangle’s area and outputs the result.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '12.2.2', title: 'Purpose and use of state-transition diagrams', pages: [292, 292],
          lead: 'A state-transition diagram models a finite state machine by showing states and the events or conditions that cause transitions between them.',
          bullets: [
            'States are represented as nodes and transitions as directed arrows.',
            'Events label transitions; conditions can qualify when a transition is allowed.',
            'The diagram identifies an initial state and can identify a stopped or final state.',
            'Actions or outputs can be associated with transitions so that behaviour is documented, not only the state names.',
          ],
          reviewPrompt: 'Describe the states and transitions for a simple locked/unlocked door controlled by a correct or incorrect code.',
          visual: 'recap', accent: 'cyan',
        },
      ],
    },
    {
      code: '12.3', title: 'Program testing and maintenance', points: [
        {
          code: '12.3.1', title: 'Ways of avoiding and exposing faults in programs', pages: [293, 294],
          lead: 'Fault prevention and early detection use clear design, dry runs, trace tables, test strategies and systematic examination of program paths.',
          bullets: [
            'A dry run manually follows the algorithm, while a trace table records changing variable values and outputs.',
            'A test strategy describes the overall testing required; a test plan lists the individual tests and expected outcomes.',
            'Testing should be planned from the program requirements rather than performed only after coding is complete.',
          ],
          reviewPrompt: 'Explain how a trace table can expose a logic error before the finished program is released.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '12.3.2', title: 'Location, identification and correction of errors', pages: [295, 295],
          lead: 'Syntax, logic and run-time errors appear at different stages and require different evidence to locate and correct them.',
          bullets: [
            'A syntax error breaks the grammar of the programming language and is normally detected during translation.',
            'A logic error allows the program to run but produces incorrect behaviour or results.',
            'A run-time error occurs during execution and may halt the program or cause uncontrolled behaviour such as an infinite loop.',
            'IDEs and carefully chosen tests help narrow a fault to the statement or condition that caused it.',
          ],
          reviewPrompt: 'Classify a misspelled keyword, a wrong formula and division by zero as syntax, logic or run-time errors.',
          visual: 'recap', accent: 'rose',
        },
        {
          code: '12.3.3', title: 'Program testing', pages: [296, 298],
          lead: 'Testing progresses from detailed module behaviour to combinations of modules and finally to complete-system evaluation by developers, users and customers.',
          bullets: [
            'White-box testing examines the internal structure and paths of a module; black-box testing checks behaviour from inputs and outputs.',
            'Integration testing checks that separately developed modules work together, with stubs standing in for modules that are not yet available.',
            'Alpha testing is carried out in-house, beta testing uses a limited group of external users, and acceptance testing demonstrates that the completed program meets the customer’s requirements in its intended environment.',
            'Test data and expected outcomes should be recorded so that results can be compared objectively.',
          ],
          reviewPrompt: 'Place integration, alpha, beta and acceptance testing into the development story and state who or what each stage is intended to check.',
          visual: 'recap', accent: 'emerald',
        },
        {
          code: '12.3.4', title: 'Program maintenance', pages: [299, 303],
          lead: 'Programs do not physically wear out, but faults, performance needs and new requirements still create maintenance work during their operational life.',
          bullets: [
            'Corrective maintenance fixes errors that appear during use, including faults that testing did not expose.',
            'Perfective maintenance improves performance or usability without being driven by a newly discovered error.',
            'Adaptive maintenance changes the program so it can meet new requirements or operate in a changed environment.',
            'Patches can distribute targeted corrections or extra functionality to programs already in use.',
          ],
          reviewPrompt: 'Classify these changes as corrective, perfective or adaptive: fix a crash, speed up a slow search, add voice input.',
          visual: 'recap', accent: 'amber',
        },
      ],
    },
  ],
};

export const CHAPTER_9_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter9);
export const CHAPTER_10_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter10);
export const CHAPTER_11_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter11);
export const CHAPTER_12_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter12);
