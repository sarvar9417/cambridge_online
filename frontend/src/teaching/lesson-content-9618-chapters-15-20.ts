import { buildSourceBacked9618Chapter, type SourceBackedChapterSpec } from './lesson-content-9618-summary-builder';

const chapter15: SourceBackedChapterSpec = {
  number: 15,
  level: 'A Level',
  title: 'Hardware',
  subtitle: 'Processor architectures, parallel processing, Boolean algebra, logic circuits, flip-flops and Karnaugh maps.',
  objectives: [
    'Compare RISC and CISC processors and explain the use of pipelining and registers in RISC design.',
    'Distinguish SISD, SIMD, MISD and MIMD architectures and explain massively parallel processing.',
    'Use Boolean algebra, De Morgan’s laws and truth tables to represent and simplify logic.',
    'Explain half adders, full adders, SR and JK flip-flops and their use in computer systems.',
    'Use Karnaugh maps to simplify Boolean expressions.',
  ],
  topics: [
    {
      code: '15.1', title: 'Processors and parallel processing', points: [
        {
          code: '15.1.1', title: 'RISC and CISC processors', pages: [346, 349],
          lead: 'RISC and CISC are contrasting processor design approaches that place complexity in different parts of the hardware–software system.',
          bullets: [
            'RISC uses a reduced set of simpler instructions, while CISC provides a larger instruction set with more complex instructions.',
            'RISC design supports efficient pipelining because instructions are designed for regular, predictable execution stages.',
            'Registers are used heavily so that operands and intermediate results can be accessed quickly.',
            'When an interrupt occurs during pipelining, the processor must preserve or correctly deal with the instructions already present in the pipeline.',
          ],
          reviewPrompt: 'Explain why a simpler, more regular instruction set can make pipelining easier to manage.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '15.1.2', title: 'Parallel processing', pages: [350, 353],
          lead: 'Parallel architectures are classified by the number of instruction streams and data streams processed at the same time.',
          bullets: [
            'SISD uses one instruction stream and one data stream and therefore does not provide parallel processing.',
            'SIMD applies the same instruction to multiple data items at once and is useful for tasks such as graphics processing.',
            'MISD uses multiple instruction streams on the same data, while MIMD allows multiple processors to execute different instructions on different data.',
            'Clusters and massively parallel systems combine large numbers of processors or computers so that a problem can be divided into concurrently executed parts.',
          ],
          reviewPrompt: 'Classify a graphics operation that applies the same brightness calculation to thousands of pixels as SISD, SIMD, MISD or MIMD and justify the choice.',
          visual: 'types', accent: 'cyan',
        },
      ],
    },
    {
      code: '15.2', title: 'Boolean algebra and logic circuits', points: [
        {
          code: '15.2.1', title: 'Boolean algebra', pages: [354, 355],
          lead: 'Boolean algebra provides symbolic rules for representing and simplifying logic expressions produced by gates and truth tables.',
          bullets: [
            'Boolean variables represent two logical states and are combined using operations equivalent to NOT, AND and OR.',
            'Algebraic laws allow an expression to be transformed without changing its truth table.',
            'De Morgan’s laws provide systematic transformations between negated AND and OR expressions.',
            'Simplification can reduce the number of terms and therefore the number of gates required by a circuit.',
          ],
          reviewPrompt: 'Explain why two different Boolean expressions can be considered equivalent even when they look different.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '15.2.2', title: 'Half-adder and full-adder circuits', pages: [356, 357],
          lead: 'Adder circuits combine logic gates to perform binary addition and produce both a sum and a carry.',
          bullets: [
            'A half adder adds two input bits and produces a sum bit and a carry bit.',
            'A full adder includes a carry-in input as well as the two data bits and produces sum and carry-out outputs.',
            'Multiple full adders can be connected so that the carry from one bit position becomes the carry input for the next position.',
          ],
          reviewPrompt: 'Why can a half adder alone not correctly add an arbitrary bit position inside a multi-bit binary addition?',
          visual: 'arithmetic', accent: 'cyan',
        },
        {
          code: '15.2.3', title: 'Flip-flop circuits', pages: [358, 360],
          lead: 'Flip-flops are sequential circuits whose outputs depend on previous state as well as current inputs.',
          bullets: [
            'Cross-coupled gates and positive feedback allow a circuit to retain one of two stable states.',
            'An SR flip-flop provides set and reset behaviour but has an input combination that must be treated carefully.',
            'A clocked JK flip-flop avoids the illegal SR state and can hold, set, reset or toggle its output according to J and K.',
          ],
          reviewPrompt: 'State the four behaviours of a JK flip-flop for J,K = 00, 10, 01 and 11.',
          visual: 'recap', accent: 'emerald',
        },
        {
          code: '15.2.4', title: 'Boolean algebra and logic circuits', pages: [361, 362],
          lead: 'Logic circuits can be translated into Boolean expressions and truth tables, and a truth table can in turn be converted into a sum-of-products expression.',
          bullets: [
            'Follow a circuit stage by stage to form the Boolean expression represented by each gate output.',
            'To form a sum-of-products expression from a truth table, use the rows for which the final output is 1.',
            'Apply Boolean laws to simplify the resulting expression while preserving the same output for every input combination.',
            'Equivalent truth tables provide a direct check that the simplified circuit still implements the original function.',
          ],
          reviewPrompt: 'Describe how to build a sum-of-products expression from a truth table.',
          visual: 'recap', accent: 'amber',
        },
        {
          code: '15.2.5', title: 'Karnaugh maps (K-maps)', pages: [363, 371],
          lead: 'Karnaugh maps arrange truth-table outputs in Gray-code order so adjacent groups can expose terms that remain constant and therefore simplify the expression.',
          bullets: [
            'Only cells representing output 1 are grouped for the sum-of-products method used in the chapter.',
            'Groups are formed as large as possible from adjacent cells and can wrap around or overlap when the K-map rules allow it.',
            'Gray-code ordering ensures neighbouring cells differ in only one input value.',
            'The simplified expression contains only the variables that stay constant within each selected group.',
          ],
          reviewPrompt: 'Why does Gray-code ordering matter when adjacent cells in a Karnaugh map are grouped?',
          visual: 'recap', accent: 'rose',
        },
      ],
    },
  ],
};

const chapter16: SourceBackedChapterSpec = {
  number: 16,
  level: 'A Level',
  title: 'System software and virtual machines',
  subtitle: 'Advanced operating-system management, virtual machines, compiler stages, formal grammar and Reverse Polish notation.',
  objectives: [
    'Explain how an operating system manages processor, memory and I/O resources while hiding hardware complexity from users.',
    'Explain process states, low-level scheduling, interrupts and common scheduling algorithms.',
    'Compare paging and segmentation and explain virtual memory, page faults, replacement strategies and disk thrashing.',
    'Explain the features, benefits and limitations of virtual machines.',
    'Explain interpretation and the stages of compilation: lexical analysis, syntax analysis, code generation and optimisation.',
    'Use syntax diagrams and BNF to describe language grammar and use RPN to represent and evaluate expressions.',
  ],
  topics: [
    {
      code: '16.1', title: 'Purposes of an operating system (OS)', points: [
        {
          code: '16.1.1', title: 'How an operating system can maximise the use of computer resources', pages: [372, 375],
          lead: 'The OS coordinates CPU, memory and I/O resources and presents simpler abstractions instead of exposing users directly to hardware details.',
          bullets: [
            'Bootstrapping loads the operating system into working memory so that resource management can begin.',
            'CPU, memory and I/O resources must be allocated so that competing programs can make progress without corrupting one another.',
            'Interfaces, device drivers and background services hide low-level hardware operations from ordinary users.',
          ],
          reviewPrompt: 'Give one example each of CPU, memory and I/O resource management performed by an operating system.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '16.1.2', title: 'Process management', pages: [376, 376],
          lead: 'Multitasking gives the appearance that several processes run at the same time by sharing CPU time and other hardware resources.',
          bullets: [
            'A process is a program that has started execution and requires resources while it runs.',
            'The kernel and scheduler coordinate CPU allocation so processes do not clash over shared resources.',
            'Low-level scheduling selects which ready process receives CPU time next while aiming for acceptable throughput, response and stability.',
          ],
          reviewPrompt: 'Why does multitasking require a scheduler even on a computer with only one CPU core available to the processes?',
          visual: 'types', accent: 'cyan',
        },
        {
          code: '16.1.3', title: 'Process states and scheduling', pages: [377, 381],
          lead: 'Processes move among ready, running and blocked states, and scheduling algorithms decide the order in which ready processes receive CPU time.',
          bullets: [
            'A running process returns to ready after its time slice, becomes blocked when it must wait for I/O, and can return to ready after the awaited event completes.',
            'A process control block stores information needed to suspend and later restore a process during context switching.',
            'The chapter compares first-come first-served, shortest-job-first, shortest-remaining-time-first and round-robin scheduling.',
            'Round robin gives each process a time quantum, while SRTF can pre-empt a running process when a shorter remaining job becomes available.',
          ],
          reviewPrompt: 'Explain how round robin differs from SRTF in deciding when a running process gives up the CPU.',
          visual: 'recap', accent: 'emerald',
        },
        {
          code: '16.1.4', title: 'Memory management', pages: [382, 384],
          lead: 'Memory management allocates and deallocates memory and maps the logical memory used by processes onto physical memory.',
          bullets: [
            'Paging divides logical memory into fixed-size pages and physical memory into equal-size frames; a page table maps one to the other.',
            'Segmentation divides logical memory into variable-size segments and uses a segment map table containing segment information and physical locations.',
            'Paging can produce internal fragmentation, while variable-sized segmentation reduces that risk but can create external fragmentation.',
            'Interrupt handling is coordinated by the kernel, which identifies the interrupt, preserves process state and invokes the appropriate service routine.',
          ],
          reviewPrompt: 'Compare paging and segmentation in terms of block size, mapping tables and fragmentation.',
          visual: 'types', accent: 'amber',
        },
        {
          code: '16.1.5', title: 'Virtual memory', pages: [385, 387],
          lead: 'Virtual memory maps part of a process’s address space to secondary storage so programs can use an address space larger than the available RAM.',
          bullets: [
            'Pages that are not currently required can be held on disk or SSD while active pages remain in physical memory.',
            'The mapping makes a larger logical address space available to the process without requiring all of it to be resident in RAM at once.',
            'Frequent swapping is much slower than RAM access; excessive page movement can lead to disk thrashing and poor performance.',
          ],
          reviewPrompt: 'Explain why virtual memory can allow a program larger than RAM to run, and why this does not make secondary storage as fast as RAM.',
          visual: 'files', accent: 'indigo',
        },
        {
          code: '16.1.6', title: 'Page replacement', pages: [388, 388],
          lead: 'A page fault occurs when a required virtual-memory page is not currently loaded into physical memory, so the OS must choose a page to replace.',
          bullets: [
            'A page fault is a hardware-raised interrupt and is not itself an error condition.',
            'FIFO removes the page that has been in memory the longest, regardless of how heavily it is being used.',
            'Other replacement strategies aim to reduce page faults by considering future or recent use; the ideal optimal strategy requires knowledge that is not generally available in advance.',
            'A modified or dirty page must be written back before its frame is reused.',
          ],
          reviewPrompt: 'Why can FIFO replace a frequently used page, and what extra work is required if the selected page is dirty?',
          visual: 'files', accent: 'rose',
        },
        {
          code: '16.1.7', title: 'Processor management versus memory management', pages: [389, 391],
          lead: 'Processor management decides which process should execute and when; memory management decides where program code and data are stored and mapped.',
          bullets: [
            'Processor management uses process states, scheduling, context switching and interrupts to share CPU and device resources.',
            'Memory management uses allocation, paging, segmentation and virtual-memory mechanisms to organise address spaces and physical memory.',
            'The two subsystems are different but interact continuously because a process must have both CPU time and valid memory mappings to run.',
          ],
          reviewPrompt: 'Classify each task as processor or memory management: choosing the next ready process, mapping a page to a frame, servicing a device interrupt, replacing a page.',
          visual: 'recap', accent: 'cyan',
        },
      ],
    },
    {
      code: '16.2', title: 'Virtual machines (VMs)', points: [
        {
          code: '16.2.1', title: 'Features of a virtual machine', pages: [392, 393],
          lead: 'A virtual machine presents emulated hardware on which a guest operating system runs under the control of software on a physical host.',
          bullets: [
            'The host operating system controls the actual hardware, while each guest OS controls the virtual hardware presented to that VM.',
            'A hypervisor or virtual-machine layer separates guest systems and manages access to the host resources.',
            'Applications inside one guest are isolated from other virtual machines and from much of the host system.',
          ],
          reviewPrompt: 'Distinguish the host OS from a guest OS and state the role of the hypervisor.',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '16.2.2', title: 'Benefits and limitations of virtual machines', pages: [393, 393],
          lead: 'VMs provide isolation and compatibility but introduce performance, cost and management overheads.',
          bullets: [
            'A guest system can run software that is incompatible with the host OS or preserve legacy software on newer hardware.',
            'Testing an operating system or application inside a VM reduces the risk that a failure will crash the host computer.',
            'Virtualised execution is normally slower than running directly on the original hardware and large deployments can be costly and complex to manage.',
          ],
          reviewPrompt: 'Give one compatibility benefit, one testing benefit and one limitation of virtual machines.',
          visual: 'types', accent: 'cyan',
        },
      ],
    },
    {
      code: '16.3', title: 'Translation software', points: [
        {
          code: '16.3.1', title: 'How an interpreter differs from a compiler', pages: [394, 394],
          lead: 'A compiler produces translated object code for the program, whereas an interpreter checks and executes source statements during each run.',
          bullets: [
            'An interpreter reports statement errors during execution and does not produce a complete object program for later runs.',
            'A compiler translates the source into object code and reports compilation errors before the resulting program is executed.',
            'Both translation approaches use information about identifiers, including a symbol table.',
          ],
          reviewPrompt: 'Why must an interpreted program be processed by the interpreter again on a later execution?',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '16.3.2', title: 'Stages in the compilation of a program', pages: [395, 397],
          lead: 'Compilation is divided into lexical analysis, syntax analysis, code generation and optimisation.',
          bullets: [
            'Lexical analysis removes unnecessary material and converts source components into tokens while building or using identifier information.',
            'Syntax analysis checks token sequences against the grammatical rules of the language.',
            'Code generation produces object-code instructions from the validated program structure.',
            'Optimisation attempts to reduce resources such as execution time, storage, memory or CPU use without changing the program’s required result.',
          ],
          reviewPrompt: 'Put lexical analysis, syntax analysis, code generation and optimisation in order and state the main purpose of each.',
          visual: 'types', accent: 'emerald',
        },
        {
          code: '16.3.3', title: 'Syntax diagrams and Backus-Naur form', pages: [398, 399],
          lead: 'Programming-language grammar can be specified graphically with syntax diagrams or formally with BNF replacement rules.',
          bullets: [
            'A syntax diagram shows permitted sequences, alternatives and repetitions along paths through the diagram.',
            'BNF names language elements and defines them using replacement rules and alternatives.',
            'Formal grammar lets both programmers and compiler designers state exactly which source structures are valid.',
            'BNF definitions can be recursive when a grammatical element may contain another occurrence of itself.',
          ],
          reviewPrompt: 'Explain how an “alternative” and a “repetition” can be represented in a syntax definition.',
          visual: 'recap', accent: 'amber',
        },
        {
          code: '16.3.4', title: 'Reverse Polish notation (RPN)', pages: [400, 409],
          lead: 'RPN uses postfix notation, placing each operator after its operands so an expression can be evaluated without brackets.',
          bullets: [
            'An infix expression such as A + B becomes A B + in RPN.',
            'A stack provides a natural evaluation mechanism: operands are pushed and an operator pops the required operands, applies the operation and pushes the result.',
            'Operator precedence is encoded by the order of tokens rather than by brackets.',
            'The chapter review combines OS management, virtual machines, compiler theory, grammar and RPN as the complete system-software route.',
          ],
          reviewPrompt: 'Convert a simple bracketed arithmetic expression to postfix form and explain how a stack evaluates it.',
          visual: 'types', accent: 'rose',
        },
      ],
    },
  ],
};

const chapter17: SourceBackedChapterSpec = {
  number: 17,
  level: 'A Level',
  title: 'Security',
  subtitle: 'Encryption, quantum cryptography, SSL/TLS, digital signatures and digital certificates.',
  objectives: [
    'Explain plaintext, ciphertext and keys and compare symmetric and asymmetric encryption.',
    'Explain how encrypted communication can provide confidentiality and how authenticity and integrity are verified.',
    'Explain the purpose of quantum cryptography and quantum key distribution.',
    'Explain how SSL and TLS establish secure client/server communication.',
    'Explain how digital signatures and digital certificates are created and used.',
  ],
  topics: [
    {
      code: '17.1', title: 'Encryption', points: [
        {
          code: '17.1.1', title: 'Encryption keys, plaintext and ciphertext', pages: [410, 411],
          lead: 'Encryption transforms readable plaintext into ciphertext using an algorithm and key so that the data is not directly intelligible to an unauthorised reader.',
          bullets: [
            'Plaintext is the original readable data; ciphertext is the encrypted output.',
            'A key controls the transformation performed by the encryption algorithm and the corresponding decryption process.',
            'Secure communication must consider confidentiality together with authenticity, integrity and non-repudiation.',
          ],
          reviewPrompt: 'Distinguish plaintext, ciphertext and an encryption key in a secure message exchange.',
          visual: 'networking', accent: 'indigo',
        },
        {
          code: '17.1.2', title: 'Symmetric encryption', pages: [411, 412],
          lead: 'Symmetric encryption uses the same secret key for encryption and decryption, so communicating parties must share that key securely.',
          bullets: [
            'The shared key must remain secret because anyone who obtains it can decrypt data protected with that key.',
            'Symmetric algorithms are suitable for encrypting substantial amounts of data once the communicating parties share a secure key.',
            'The key-distribution problem is a central weakness: the key itself must be transferred without being exposed.',
          ],
          reviewPrompt: 'Why is distributing the key the central security problem in symmetric encryption?',
          visual: 'networking', accent: 'cyan',
        },
        {
          code: '17.1.3', title: 'Asymmetric encryption', pages: [413, 413],
          lead: 'Asymmetric encryption uses a mathematically linked public/private key pair so one key can be shared while the other remains secret.',
          bullets: [
            'A public key can be distributed widely; its matching private key is kept by its owner.',
            'Data encrypted with a recipient’s public key can be decrypted with the matching private key, supporting confidential delivery.',
            'The existence of two keys also supports later mechanisms for verifying who signed a message, although identity still needs trustworthy certification.',
          ],
          reviewPrompt: 'Explain which key Tom should use to send confidential data to Meera and which key Meera uses to decrypt it.',
          visual: 'networking', accent: 'emerald',
        },
      ],
    },
    {
      code: '17.2', title: 'Quantum cryptography', points: [
        {
          code: '17.2', title: 'Quantum cryptography and QKD', pages: [414, 415],
          lead: 'Quantum cryptography applies quantum properties to the secure distribution of encryption keys over optical communication systems.',
          bullets: [
            'Quantum key distribution (QKD) uses quantum mechanics to exchange key material rather than transmitting an ordinary secret key in the same way as classical systems.',
            'The qubit is the basic unit of quantum information used by the protocol model described in the chapter.',
            'Measurement changes quantum states, so interception can disturb the transmitted information and reveal that eavesdropping has occurred.',
          ],
          reviewPrompt: 'What security advantage does QKD gain from the fact that observing a quantum state can alter it?',
          visual: 'networking', accent: 'indigo',
        },
      ],
    },
    {
      code: '17.3', title: 'Protocols', points: [
        {
          code: '17.3.1', title: 'Secure Sockets Layer (SSL)', pages: [416, 416],
          lead: 'SSL is a security protocol for establishing encrypted and authenticated communication between a client and server.',
          bullets: [
            'A handshake initiates the secure session and agrees the information needed for protected communication.',
            'SSL is used in client/server applications where transmitted data needs confidentiality and server authentication.',
            'The chapter places SSL and TLS at the transport layer and connects them with earlier networking concepts.',
          ],
          reviewPrompt: 'What is the purpose of the handshake when a client starts a secure session with a server?',
          visual: 'networking', accent: 'cyan',
        },
        {
          code: '17.3.2', title: 'Transport Layer Security (TLS)', pages: [417, 417],
          lead: 'TLS is the more modern successor to SSL and provides encryption, authentication and integrity for data exchanged over a network.',
          bullets: [
            'TLS prevents third-party eavesdropping once the secure client/server session is established.',
            'Its record protocol carries transmitted data, while the handshake protocol establishes authentication and the cryptographic session.',
            'Secure uses include online banking, commerce, email, cloud services, VPNs, messaging and other internet applications.',
          ],
          reviewPrompt: 'Name the two TLS layers described in the chapter and state the main role of each.',
          visual: 'networking', accent: 'emerald',
        },
      ],
    },
    {
      code: '17.4', title: 'Digital signatures and digital certificates', points: [
        {
          code: '17.4.1', title: 'Digital signatures', pages: [418, 419],
          lead: 'A digital signature validates the sender and lets the recipient detect whether a digital document has been altered after signing.',
          bullets: [
            'The chapter links digital signatures with authentication, non-repudiation and data integrity.',
            'A hashing algorithm produces a digest of the message, and asymmetric cryptography protects the signature information associated with that digest.',
            'The recipient recomputes the digest and compares it with the signed value; a mismatch indicates that the document or signature data has changed.',
          ],
          reviewPrompt: 'Why is a hash digest useful in a digital-signature process instead of encrypting the entire document only to identify the sender?',
          visual: 'networking', accent: 'indigo',
        },
        {
          code: '17.4.2', title: 'Digital certificates', pages: [420, 424],
          lead: 'A digital certificate binds a public key to an identified website or individual through an independent certificate authority.',
          bullets: [
            'A certificate contains identifying information, its public key, issuer details, validity information and other certificate metadata.',
            'A certificate authority validates the certificate owner before issuing the certificate.',
            'Certificates support public-key infrastructure by giving users a trusted way to obtain and verify another party’s public key.',
            'The end-of-chapter questions combine certificates, signatures, TLS and encryption rather than treating them as unrelated security mechanisms.',
          ],
          reviewPrompt: 'Why is receiving a public key directly from an unknown sender less trustworthy than receiving it inside a valid certificate issued by a trusted CA?',
          visual: 'networking', accent: 'rose',
        },
      ],
    },
  ],
};

const chapter18: SourceBackedChapterSpec = {
  number: 18,
  level: 'A Level',
  title: 'Artificial intelligence (AI)',
  subtitle: 'Shortest-path algorithms, machine learning, deep learning, artificial neural networks, back propagation and regression.',
  objectives: [
    'Use Dijkstra’s and A* algorithms to find shortest paths in graphs.',
    'Explain how artificial neural networks support machine learning and deep learning.',
    'Distinguish supervised, unsupervised, reinforcement and semi-supervised/active learning approaches.',
    'Compare machine learning with deep learning and explain how AI systems learn from data.',
    'Explain back propagation and the use of regression for prediction.',
  ],
  topics: [
    {
      code: '18.1', title: 'Shortest path algorithms', points: [
        {
          code: '18.1.1', title: 'Dijkstra’s algorithm', pages: [425, 428],
          lead: 'Dijkstra’s algorithm finds a shortest path through a weighted graph by repeatedly fixing the smallest currently known distance and updating neighbouring nodes.',
          bullets: [
            'Give the starting node a distance of zero and other unvisited nodes an initially unknown or effectively infinite distance.',
            'From the current node, calculate candidate distances to connected nodes and keep the smallest value discovered for each.',
            'Once the next smallest unvisited value is selected, continue until the destination is fixed, then work backward through the distances to identify the route.',
          ],
          reviewPrompt: 'Explain why Dijkstra’s algorithm can spend time examining nodes that are not in the general direction of the destination.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '18.1.2', title: 'A* algorithm', pages: [429, 433],
          lead: 'A* adds a heuristic estimate of the remaining distance to the cost already travelled so that the search is guided toward a promising route.',
          bullets: [
            'The cost-so-far records the known path length from the start to a node.',
            'A heuristic estimates the remaining cost to the goal using a practical measure appropriate to the problem.',
            'Combining the two values helps A* avoid exploring as many irrelevant directions as uninformed Dijkstra search on suitable problems.',
            'The heuristic must be chosen carefully so that the method remains useful for finding the desired shortest route.',
          ],
          reviewPrompt: 'State the two quantities combined by A* and explain what the heuristic contributes.',
          visual: 'recap', accent: 'cyan',
        },
      ],
    },
    {
      code: '18.2', title: 'Artificial intelligence, machine learning and deep learning', points: [
        {
          code: '18.2.1', title: 'Artificial intelligence', pages: [434, 435],
          lead: 'AI describes systems with capabilities such as problem solving and learning that can be compared with human reasoning, speech or sight.',
          bullets: [
            'Machine learning is presented as a subset of AI and deep learning as a subset of machine learning.',
            'AI applications include systems that recognise or interpret input, make decisions and improve responses from experience.',
            'Artificial neural networks model interconnected processing nodes inspired by the way biological neurons are connected.',
          ],
          reviewPrompt: 'Describe the subset relationship among AI, machine learning and deep learning.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '18.2.2', title: 'Machine learning', pages: [436, 438],
          lead: 'Machine-learning algorithms are trained from data and examples so they can make predictions or decisions without every decision rule being explicitly programmed.',
          bullets: [
            'Supervised learning trains from labelled examples where the desired class or output is known.',
            'Unsupervised learning analyses unlabelled data to discover patterns, structures, clusters or anomalies.',
            'Reinforcement learning improves behaviour through trial and error using reward and punishment signals.',
            'Semi-supervised or active learning combines a smaller amount of labelled data with larger quantities of unlabelled data.',
          ],
          reviewPrompt: 'Classify a labelled image classifier, customer clustering system and game-playing agent as supervised, unsupervised or reinforcement learning.',
          visual: 'types', accent: 'cyan',
        },
        {
          code: '18.2.3', title: 'Deep learning', pages: [439, 442],
          lead: 'Deep learning uses multilayer artificial neural networks to learn representations from large volumes of data.',
          bullets: [
            'Neural networks contain interconnected nodes whose weighted connections contribute to the produced output.',
            'Multiple hidden layers allow progressively more complex features to be learned from the training data.',
            'Deep-learning systems can discover useful features rather than requiring every feature to be manually specified in advance.',
            'Large data sets and substantial processing power are important because the network contains many adjustable parameters.',
          ],
          reviewPrompt: 'Why can deep learning reduce the need for a programmer to hand-code all of the features used by a classifier?',
          visual: 'types', accent: 'emerald',
        },
        {
          code: '18.2.4', title: 'Machine learning versus deep learning', pages: [443, 443],
          lead: 'The chapter compares the data requirements, feature engineering, structure, testing and explainability of conventional machine learning with deep learning.',
          bullets: [
            'Conventional machine learning can work with less training data and often requires features to be identified in advance.',
            'Deep learning generally needs larger data sets and learns many features directly from the data using neural networks.',
            'Machine-learning models can be easier to explain, while deep-learning decisions can be difficult to interpret and are often described as a black box.',
          ],
          reviewPrompt: 'Give two differences between machine learning and deep learning from the comparison table.',
          visual: 'recap', accent: 'amber',
        },
        {
          code: '18.2.5', title: 'Future developments', pages: [443, 443],
          lead: 'AI technology changes rapidly, so the source explicitly treats current and future developments as an area requiring continued research rather than a fixed list of predictions.',
          bullets: [
            'Capabilities, applications and social effects change as models, data and hardware improve.',
            'Current examples should be evaluated critically and updated rather than assumed to remain representative indefinitely.',
            'Predictions about future AI should distinguish evidence from speculation.',
          ],
          reviewPrompt: 'Choose one recent AI development and separate what is already demonstrated from what is still a prediction about future capability.',
          visual: 'recap', accent: 'cyan',
        },
        {
          code: '18.2.6', title: 'Back propagation and regression methods', pages: [444, 449],
          lead: 'Training a neural network repeatedly compares actual output with expected output and uses the error to adjust connection weights; regression models relationships in data for prediction.',
          bullets: [
            'Initial neural-network weights are adjusted during iterative training rather than assumed to be correct at the start.',
            'Back propagation calculates how the output error relates to network weights and sends that error information backward so the weights can be updated.',
            'Training repeats until the model reaches an acceptable error level or another stopping condition.',
            'Regression identifies relationships between variables so that values or trends can be predicted from data.',
          ],
          reviewPrompt: 'Describe one complete training cycle from input data to output comparison and weight adjustment.',
          visual: 'recap', accent: 'rose',
        },
      ],
    },
  ],
};

const chapter19: SourceBackedChapterSpec = {
  number: 19,
  level: 'A Level',
  title: 'Computational thinking and problem solving',
  subtitle: 'Search and sort algorithms, abstract data types, complexity and recursion.',
  objectives: [
    'Implement and compare linear and binary searching and insertion and bubble sorting.',
    'Understand and use stacks, queues, linked lists, binary trees, graphs and dictionaries as abstract data types.',
    'Implement one abstract data type from another and compare algorithms using Big O time and space complexity.',
    'Explain recursion, write recursive solutions and explain how a compiler uses a stack to implement recursive calls.',
  ],
  topics: [
    {
      code: '19.1', title: 'Algorithms', points: [
        {
          code: '19.1.1', title: 'Linear and binary searching methods', pages: [450, 457],
          lead: 'Linear search inspects values in sequence; binary search repeatedly halves an ordered search interval by comparing with its middle value.',
          bullets: [
            'Linear search works on unordered data but may need to inspect every element in the worst case.',
            'Binary search requires ordered data and can discard half of the remaining search space after each comparison.',
            'Correct boundary updates and termination conditions are essential so binary search does not skip or repeat candidate positions.',
            'Performance is compared later using Big O notation rather than only by counting one worked example.',
          ],
          reviewPrompt: 'Explain why binary search cannot safely be applied to an unsorted array without first imposing an order.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '19.1.2', title: 'Insertion and bubble sorting methods', pages: [458, 463],
          lead: 'Bubble sort exchanges adjacent out-of-order values; insertion sort grows a sorted section by inserting each new item into its correct position.',
          bullets: [
            'Bubble sort performs repeated passes and swaps adjacent items that are in the wrong order.',
            'Insertion sort takes the next unsorted item, shifts larger sorted items and inserts the new value at the correct position.',
            'Both algorithms require carefully controlled indices and temporary storage when moving values.',
            'The chapter asks learners to compare their behaviour and efficiency rather than memorise code without tracing it.',
          ],
          reviewPrompt: 'Explain one structural difference between bubble sort and insertion sort during a pass through the data.',
          visual: 'recap', accent: 'cyan',
        },
        {
          code: '19.1.3', title: 'Understanding and using abstract data types (ADTs)', pages: [464, 487],
          lead: 'An ADT is defined by its data and permitted operations; the chapter develops implementations for stacks, queues, linked lists, binary trees and graphs.',
          bullets: [
            'Stack and queue implementations manage fixed storage with pointers and must handle full and empty conditions correctly.',
            'Linked lists store logical links as pointers so search, insertion and deletion are performed by following and changing those links.',
            'A binary tree stores nodes with left and right child pointers and supports ordered search and traversal operations.',
            'Graphs represent nodes and edges and require operations that reflect their non-linear connectivity.',
          ],
          reviewPrompt: 'Choose a stack, queue, linked list or binary tree for four different data-handling scenarios and justify each choice from the operations required.',
          visual: 'types', accent: 'emerald',
        },
        {
          code: '19.1.4', title: 'Implementing one ADT from another ADT', pages: [488, 488],
          lead: 'An ADT definition can itself use other data types, allowing more complex structures to be built from existing structures and operations.',
          bullets: [
            'The chapter revisits linked-list definitions as building blocks for larger abstractions.',
            'A dictionary stores key–value pairs, requires unique keys and retrieves a value by specifying its key.',
            'The same value can occur under different keys, so a dictionary is not the same abstraction as a set.',
          ],
          reviewPrompt: 'Explain how a dictionary differs from a set and why a key must be unique.',
          visual: 'types', accent: 'amber',
        },
        {
          code: '19.1.5', title: 'Comparing algorithms using Big O notation', pages: [489, 490],
          lead: 'Big O notation describes how an algorithm’s worst-case time or space requirements grow as the amount of input data increases.',
          bullets: [
            'O(1) describes work or storage that remains constant as input size grows.',
            'O(N) grows linearly with the number of data items, as in a worst-case linear search.',
            'O(N²) growth is associated in the chapter with simple quadratic sorting methods such as bubble and insertion sort.',
            'Space complexity applies the same growth idea to memory requirements; for example an array whose size follows N requires O(N) space.',
          ],
          reviewPrompt: 'Compare the worst-case growth of a linear search with a binary search and explain why Big O is more useful than timing one small data set.',
          visual: 'recap', accent: 'rose',
        },
      ],
    },
    {
      code: '19.2', title: 'Recursion', points: [
        {
          code: '19.2.1', title: 'Understanding recursion', pages: [491, 493],
          lead: 'A recursive procedure or function calls itself and must contain a base case that stops further calls and a general case that reduces the problem toward that base case.',
          bullets: [
            'The base case provides a terminating non-recursive result.',
            'The general case makes a recursive call using a smaller or simpler version of the problem.',
            'Winding occurs while calls are created before the base case; unwinding occurs as saved calls return their results.',
            'Trace tables help show the values and return sequence in examples such as factorials.',
          ],
          reviewPrompt: 'Identify the base case and general case in a recursive factorial function and describe winding and unwinding.',
          visual: 'recap', accent: 'indigo',
        },
        {
          code: '19.2.2', title: 'How a compiler implements recursion', pages: [494, 497],
          lead: 'Recursive calls require a stack so each unfinished call can preserve the information needed to resume after the deeper call returns.',
          bullets: [
            'During winding, generated code pushes return addresses and local values for successive recursive calls onto the stack.',
            'During unwinding, those saved values and return addresses are popped in reverse order.',
            'The stack therefore preserves a separate execution context for each active call to the same procedure or function.',
            'The chapter review combines recursive reasoning with search, sort and ADT implementation tasks.',
          ],
          reviewPrompt: 'Why would one shared set of local variables be insufficient when the same recursive function is active at several call depths?',
          visual: 'types', accent: 'cyan',
        },
      ],
    },
  ],
};

const chapter20: SourceBackedChapterSpec = {
  number: 20,
  level: 'A Level',
  title: 'Further programming',
  subtitle: 'Programming paradigms, object-oriented programming, advanced file processing and exception handling.',
  objectives: [
    'Compare low-level, imperative, object-oriented and declarative programming paradigms.',
    'Use object-oriented concepts including classes, objects, encapsulation, inheritance, polymorphism, overloading, containment, constructors, getters, setters and destructors.',
    'Process records using serial, sequential and random files and use random-access operations to locate records efficiently.',
    'Use exception handling so programs respond to unexpected events without uncontrolled termination.',
  ],
  topics: [
    {
      code: '20.1', title: 'Programming paradigms', points: [
        {
          code: '20.1.1', title: 'Low-level programming', pages: [498, 499],
          lead: 'Low-level programming works close to the processor instruction set and memory model, giving direct control over machine operations.',
          bullets: [
            'Instructions operate explicitly on registers, memory addresses and processor operations.',
            'Addressing modes determine how an instruction locates its operand.',
            'The programmer gains hardware control but must manage details that high-level languages normally abstract away.',
          ],
          reviewPrompt: 'Why can low-level code offer precise hardware control while also being harder to write and maintain?',
          visual: 'types', accent: 'indigo',
        },
        {
          code: '20.1.2', title: 'Imperative programming', pages: [500, 500],
          lead: 'Imperative programming states the sequence of operations that change program state; structured procedural programming organises those operations into modules.',
          bullets: [
            'Statements are written in the order in which the required actions should be performed.',
            'Procedures, functions and local variables improve the structure of larger imperative programs.',
            'The paradigm is direct and effective for many smaller problems because the programmer controls the explicit algorithmic steps.',
          ],
          reviewPrompt: 'Explain how structured procedural programming improves on one long imperative sequence using only global variables.',
          visual: 'types', accent: 'cyan',
        },
        {
          code: '20.1.3', title: 'Object-oriented programming (OOP)', pages: [501, 520],
          lead: 'OOP models a program as interacting objects whose data and methods are defined by classes.',
          bullets: [
            'A class is a template; an object is an instance. Attributes store object data and methods implement object behaviour.',
            'Encapsulation keeps data and related methods together and uses controlled interfaces such as getters and setters to protect private attributes.',
            'Inheritance derives a new class from an existing class; polymorphism lets an inherited method be redefined for a derived class, while overloading provides multiple definitions for different parameter situations.',
            'Containment models a has-a relationship between objects, while constructors initialise new objects and destructors run when objects are destroyed.',
          ],
          reviewPrompt: 'For a Shape superclass with Circle and Rectangle subclasses, identify an example of inheritance, polymorphism and encapsulation.',
          visual: 'types', accent: 'emerald',
        },
        {
          code: '20.1.4', title: 'Declarative programming', pages: [521, 524],
          lead: 'Declarative programming states facts, rules and goals rather than prescribing every step of an execution sequence.',
          bullets: [
            'Facts represent things known to be true and rules describe relationships between facts.',
            'A query states the goal; the language system determines how to use the stored facts and rules to produce an answer.',
            'SQL is discussed as a declarative-style example because a query states the required result rather than the detailed record-by-record procedure used to obtain it.',
          ],
          reviewPrompt: 'Explain the difference between telling a system what result is required and specifying exactly how to compute it.',
          visual: 'types', accent: 'amber',
        },
      ],
    },
    {
      code: '20.2', title: 'File processing and exception handling', points: [
        {
          code: '20.2.1', title: 'File processing operations', pages: [525, 534],
          lead: 'Programs can store complete records in serial, sequential or random-access files and use file operations suited to the organisation of the data.',
          bullets: [
            'Serial files store records in arrival order; sequential files store them according to an ordered key.',
            'Record-oriented file operations read and write complete records rather than only lines of text.',
            'Random access allows a program to seek directly to a record location instead of reading every preceding record.',
            'A hashing function can map a record key to an address, after which seek and record-read operations access the target location.',
          ],
          reviewPrompt: 'Why is random access preferable to sequential reading when a program must repeatedly find individual records by key in a large file?',
          visual: 'files', accent: 'indigo',
        },
        {
          code: '20.2.2', title: 'Exception handling', pages: [535, 540],
          lead: 'An exception is an unexpected event that disrupts normal execution; exception handling traps the event so the program can respond in a controlled way.',
          bullets: [
            'An exception handler can output an appropriate message, recover where possible or shut down the program in an orderly way.',
            'Handling predictable exceptional conditions makes a program more robust than allowing an uncontrolled run-time failure.',
            'The protected code and handler must be organised so normal execution continues appropriately when no exception occurs and the specified response occurs when one is raised.',
            'The end-of-chapter questions connect exceptions with file operations and the wider programming paradigms covered in the chapter.',
          ],
          reviewPrompt: 'Give an example of a file-processing exception and describe a controlled handler response that is better than simply crashing.',
          visual: 'files', accent: 'rose',
        },
      ],
    },
  ],
};

export const CHAPTER_15_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter15);
export const CHAPTER_16_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter16);
export const CHAPTER_17_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter17);
export const CHAPTER_18_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter18);
export const CHAPTER_19_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter19);
export const CHAPTER_20_COMPLETE_9618 = buildSourceBacked9618Chapter(chapter20);
