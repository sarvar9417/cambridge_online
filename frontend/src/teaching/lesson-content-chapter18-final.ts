import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';

const pageRange = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, index) => start + index);
const source = (start: number, end: number = start, elements: string[] = []) => ({
  sourcePages: pageRange(start, end),
  sourceLabel: `Hodder Chapter 18 · pp.${start}${end === start ? '' : `–${end}`}`,
  sourceElements: [`Hodder pp.${start}${end === start ? '' : `–${end}`}`, ...elements],
});

export const CHAPTER_18_DEEP_SLIDES: HodderLessonSlide[] = [
  {
    id: 'h18-overview', section: 'Chapter overview', eyebrow: 'CHAPTER 18 · ARTIFICIAL INTELLIGENCE (AI)',
    title: 'The chapter connects shortest-path search with systems that learn from data and refine predictions',
    lead: 'It begins with Dijkstra and A* graph search, then develops AI, machine learning, deep learning, neural networks, back propagation and regression.',
    bullets: [
      'Use Dijkstra’s and A* algorithms to find shortest routes in graphs and grids.',
      'Explain the relationship among AI, machine learning and deep learning.',
      'Distinguish labelled from unlabelled data and supervised, unsupervised, reinforcement and semi-supervised learning.',
      'Explain how artificial neural networks support deep learning.',
      'Compare machine learning with deep learning.',
      'Explain back propagation, error gradients and regression as training/prediction methods.',
    ],
    keyTerms: [
      { term: 'Dijkstra’s algorithm', definition: 'A method for finding a shortest path between vertices in a weighted graph.' },
      { term: 'A* algorithm', definition: 'A shortest-path algorithm that adds a heuristic estimate to guide the search.' },
      { term: 'Heuristic', definition: 'A practical estimate or informed approach used to guide problem solving.' },
    ],
    visual: 'recap', accent: 'indigo', ...source(425, 425, ['Chapter objectives', 'Prior knowledge', 'Shortest-path key terms']),
  },
  {
    id: 'h18-1811-dijkstra-steps', section: '18.1 Shortest path algorithms', subtopicCode: '18.1.1', eyebrow: '18.1.1 · DIJKSTRA’S ALGORITHM',
    title: 'Dijkstra’s algorithm grows final distances outward from the start vertex',
    lead: 'The source uses working values for tentative routes and final values once the smallest remaining tentative distance has been fixed.',
    richBlocks: [{ kind: 'steps', title: 'Source algorithm', items: [
      'Give the start vertex final value 0.',
      'Assign/update working values for adjacent vertices; replace an existing working value only when the new route is smaller.',
      'Choose the smallest working value among vertices without a final value and make it final.',
      'Repeat until the destination is reached and required final values are established.',
      'Trace backward from the destination to reconstruct the shortest route.',
    ] }],
    visual: 'recap', accent: 'cyan', ...source(425, 426, ['Dijkstra instructions', 'Figures 18.1–18.2']),
  },
  {
    id: 'h18-1811-dijkstra-worked', section: '18.1 Shortest path algorithms', subtopicCode: '18.1.1', eyebrow: 'FIGURES 18.1–18.8 · WORKED ROUTE A → G',
    title: 'The worked graph shows how tentative values are revised only when a shorter route is found',
    lead: 'The source labels vertices A–G step by step and finishes with the shortest path A → B → E → G with final distance 17.',
    bullets: [
      'A starts at 0; B and C receive initial working values.',
      'Each smallest working value becomes final before its neighbours are relaxed.',
      'A candidate value is retained when an alternative route would be longer.',
      'The backward-trace rule checks that an edge length equals the difference between the final values at its endpoints.',
    ],
    activity: { title: 'Activity 18A', prompt: 'Apply the same working/final-value method to the park graph and find the shortest route from A to I.' },
    visual: 'recap', accent: 'emerald', ...source(426, 429, ['Figures 18.1–18.8', 'Activity 18A', 'Shortest path A-B-E-G']),
  },
  {
    id: 'h18-1812-astar-heuristic', section: '18.1 Shortest path algorithms', subtopicCode: '18.1.2', eyebrow: '18.1.2 · A* · h, g, f, n',
    title: 'A* adds a heuristic estimate so the search is guided toward the destination',
    lead: 'In the source grid, each node has h for estimated remaining distance, g for movement cost, f = g + h and n for the previous node.',
    bullets: [
      'Dijkstra considers path cost without directional guidance; A* adds h as an informed estimate.',
      'The example uses Manhattan distance for h while ignoring blocked cells during heuristic calculation.',
      'Orthogonal and diagonal movement costs are represented with source g-values based on a 10–10–14 triangle.',
    ],
    visual: 'recap', accent: 'indigo', ...source(429, 430, ['Figures 18.9–18.11', 'Manhattan heuristic', 'h/g/f/n']),
  },
  {
    id: 'h18-1812-astar-f-values', section: '18.1 Shortest path algorithms', subtopicCode: '18.1.2', eyebrow: 'g-VALUE + h-VALUE = f-VALUE',
    title: 'A* compares candidate nodes using the combined movement cost and heuristic estimate',
    lead: 'Figures 18.12–18.16 demonstrate repeated f calculations and route comparison as the algorithm advances through the grid.',
    bullets: [
      'For adjacent nodes, compute the movement cost g and heuristic h.',
      'Calculate f(n) = g(n) + h(n).',
      'Prefer the candidate with the smallest f while keeping track of the previous node.',
      'When routes compete, accumulated route information is compared rather than choosing blindly by direction.',
    ],
    visual: 'recap', accent: 'amber', ...source(431, 432, ['Figures 18.12–18.16', 'f(n)=g(n)+h(n)']),
  },
  {
    id: 'h18-1812-astar-route-activities', section: '18.1 Shortest path algorithms', subtopicCode: '18.1.2', eyebrow: 'FIGURE 18.17 · ACTIVITY 18B',
    title: 'The finished grid route demonstrates why a heuristic can reduce unnecessary exploration',
    lead: 'The source shortest path runs from (1,1) to (8,6) through a sequence of diagonal and orthogonal steps; it then applies shortest-path methods to several graph and matrix problems.',
    bullets: [
      'Applications listed include GPS, Google Maps, modelling infectious-disease spread and IP routing.',
      'Activity 18B includes an A* graph with given h/g values, an A* matrix where learners calculate their own values and Dijkstra walking-time networks.',
      'The final road-network activity combines route distance with different speed limits.',
    ],
    activity: { title: 'Activity 18B', prompt: 'Solve one A* problem and one Dijkstra problem from pp.432–434, showing all intermediate values rather than only the final route.' },
    visual: 'recap', accent: 'rose', ...source(432, 434, ['Figure 18.17', 'Activity 18B', 'Shortest-path applications']),
  },
  {
    id: 'h18-1821-ai-hierarchy', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.1', eyebrow: '18.2.1 · AI ⊃ MACHINE LEARNING ⊃ DEEP LEARNING',
    title: 'Deep learning is a subset of machine learning, and machine learning is a subset of AI',
    lead: 'Figure 18.18 presents the hierarchy and the source classifies AI as narrow, general or strong according to its performance relative to humans.',
    richBlocks: [{ kind: 'table', table: { caption: 'AI categories in the source', headers: ['Category', 'Description'], rows: [
      ['Narrow AI', 'Superior human-relative performance at one specific task.'],
      ['General AI', 'Human-like performance across intellectual tasks.'],
      ['Strong AI', 'Superior human-relative performance across many tasks.'],
    ] } }],
    activity: { title: 'Extension Activity 18A', prompt: 'Research knowledge representation, automated reasoning, computer vision and robotics, keeping these as extensions beyond the chapter’s core descriptions.' },
    visual: 'recap', accent: 'indigo', ...source(435, 435, ['Figure 18.18', 'Narrow/general/strong AI', 'Extension Activity 18A']),
  },
  {
    id: 'h18-1822-machine-learning', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.2', eyebrow: '18.2.2 · MACHINE LEARNING · FIGURE 18.20',
    title: 'Machine learning trains algorithms from past examples so later predictions or decisions can improve with experience',
    lead: 'The search-engine example treats successful/unsuccessful result placement as experience from which future searches can be refined.',
    bullets: [
      'The chapter stresses the ability to analyse very large and complex data sets quickly.',
      'A system can learn from previous scenarios and use that experience when making future predictions or decisions.',
      'Figure 18.19 uses a smart voice assistant to illustrate repeated learning from human interaction and environment data.',
      'Figure 18.20 uses search behaviour to illustrate learning from success/failure.',
    ],
    visual: 'recap', accent: 'cyan', ...source(436, 436, ['Figures 18.19–18.20', 'Machine learning']),
  },
  {
    id: 'h18-1822-labelled-data', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.2', eyebrow: 'LABELLED VS UNLABELLED DATA',
    title: 'Labelled data has known target information; unlabelled data requires recognition or categorisation',
    lead: 'The source vehicle example distinguishes fully described stock from incoming vehicles known only by source and age, then uses bird recognition as a training example.',
    bullets: [
      'Labelled data is fully recognised and includes the target answer/attributes needed for training.',
      'Unlabelled data contains objects that are not yet identified and must be recognised by processing.',
      'Bird features such as beak shape, feather colour and body size can form labelled training data.',
    ],
    visual: 'types', accent: 'emerald', ...source(437, 438, ['Vehicle example', 'Figure 18.21 bird recognition', 'Labelled/unlabelled data']),
  },
  {
    id: 'h18-1822-supervised-unsupervised', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.2', eyebrow: 'SUPERVISED VS UNSUPERVISED',
    title: 'Supervised learning trains against known outputs; unsupervised learning searches unlabelled data for hidden structure',
    richBlocks: [{ kind: 'comparison', leftTitle: 'Supervised learning', rightTitle: 'Unsupervised learning', rows: [
      ['Input and correct output are supplied during training.', 'No “right answer” is supplied during training.'],
      ['Uses labelled data and compares results with expected output.', 'Uses unlabelled data and seeks hidden patterns, similarities or anomalies.'],
      ['Source example: classifying email as relevant or spam.', 'Source methods include density estimation and k-means clustering; marketing groups with similar buying behaviour are an example.'],
    ] }],
    visual: 'types', accent: 'indigo', ...source(438, 439, ['Supervised learning', 'Unsupervised learning', 'Regression/classification', 'k-means clustering']),
  },
  {
    id: 'h18-1822-reinforcement-active', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.2', eyebrow: 'REINFORCEMENT · SEMI-SUPERVISED (ACTIVE)',
    title: 'Reinforcement learns through reward/punishment; active learning mixes a small labelled set with much larger unlabelled data',
    richBlocks: [{ kind: 'comparison', leftTitle: 'Reinforcement learning', rightTitle: 'Semi-supervised / active learning', rows: [
      ['No direct training set of correct answers; trial and error seeks an optimal action.', 'Combines labelled and unlabelled data and can interactively query source data.'],
      ['Feedback rewards or penalises actions.', 'Uses mostly cheaper unlabelled data plus a small labelled sample.'],
      ['Examples: search engines, games, robotics.', 'Example: classifying large numbers of web pages using a web crawler.'],
    ] }],
    visual: 'types', accent: 'amber', ...source(439, 439, ['Reward and punishment', 'Reinforcement learning', 'Semi-supervised active learning', 'Web crawler']),
  },
  {
    id: 'h18-1823-neural-networks', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.3', eyebrow: '18.2.3 · DEEP LEARNING · ARTIFICIAL NEURAL NETWORK',
    title: 'Deep learning stacks input, hidden and output layers so complex features can be learned through a neural-network model',
    lead: 'The chapter relates artificial neural networks to interconnected neurons and uses face/object recognition to illustrate feature extraction.',
    bullets: [
      'Hidden layers transform input data into representations used by later layers and the output.',
      'Face recognition can compare distances and shapes such as eyes, nose, cheekbones, jaw line and eyebrows.',
      'Figure 18.23 shows two hidden layers between the input and output layers.',
      'Pixel values can provide data from which deep-learning algorithms identify image features.',
    ],
    visual: 'recap', accent: 'rose', ...source(439, 440, ['Figures 18.22–18.24', 'Artificial neural network', 'Face recognition']),
  },
  {
    id: 'h18-1823-deep-workflow', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.3', eyebrow: 'FIGURE 18.25 · TRAIN → TEST → REFINE',
    title: 'The source deep-learning workflow starts with large amounts of unlabelled data and tests the trained model against known labelled data',
    lead: 'If outputs are not accurate enough, the model is refined repeatedly; the chapter links this refinement to back propagation in Section 18.2.6.',
    bullets: [
      'Artificial neural networks identify objects or features from the input data.',
      'Known labelled data tests whether outputs are sufficiently reliable and consistent.',
      'Text mining combines digitisation/deep-learning categorisation with machine-learning analysis and tags.',
      'Computer-assisted translation uses growing terminology databases and translation memories.',
    ],
    visual: 'recap', accent: 'emerald', ...source(441, 441, ['Figures 18.25–18.26', 'Text mining', 'CAT', 'Terminology databases', 'Translation memories']),
  },
  {
    id: 'h18-1823-applications', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.3', eyebrow: 'DEEP LEARNING APPLICATIONS · PHOTOS + CHATBOTS',
    title: 'Image enhancement, colourisation and chatbots illustrate different ways learned models transform or respond to data',
    bullets: [
      'A smartphone/DSLR training pair can teach a model to improve smartphone photographs.',
      'A trained network can map monochrome image features to plausible colours rather than simply remapping grey values mechanically.',
      'Chatbots combine predefined scripts and machine learning to simulate conversational interaction through typed or spoken messages.',
    ],
    visual: 'recap', accent: 'cyan', ...source(442, 443, ['Figures 18.27–18.29', 'Photograph enhancement', 'Colourisation', 'Chatbots']),
  },
  {
    id: 'h18-1824-comparison', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.4', eyebrow: '18.2.4 · TABLE 18.1',
    title: 'Machine learning and deep learning differ in data volume, feature engineering, problem structure and explainability',
    richBlocks: [{ kind: 'comparison', leftTitle: 'Machine learning', rightTitle: 'Deep learning', rows: [
      ['Can train with smaller amounts of data.', 'Typically needs large amounts of training data.'],
      ['Features are commonly identified/coded in advance.', 'The network learns features from data.'],
      ['Uses a modular problem-solving approach.', 'Solves the problem end to end as one model.'],
      ['Rules/decision stages can be clearer.', 'Decision reasoning can be difficult to interpret — a “black box”.'],
    ] }],
    visual: 'types', accent: 'indigo', ...source(443, 443, ['Table 18.1']),
  },
  {
    id: 'h18-1825-future', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.5', eyebrow: '18.2.5 · TABLE 18.2 · FUTURE DEVELOPMENTS',
    title: 'The source presents possible future uses as examples rather than guaranteed predictions',
    bullets: [
      'AI: crime-pattern detection and humanoid machines performing human tasks.',
      'Machine learning: improved healthcare/diagnostics and marketing based on buying behaviour.',
      'Deep learning: personalised treatment and highly capable personal assistants.',
    ],
    activity: { title: 'Extension Activity 18B', prompt: 'Research present-day and future AI/ML/deep-learning developments, recognising that this extension deliberately needs updating over time.' },
    visual: 'recap', accent: 'amber', ...source(443, 444, ['Table 18.2', 'Extension Activity 18B']),
  },
  {
    id: 'h18-1826-backprop', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.6', eyebrow: '18.2.6 · BACK PROPAGATION · ERROR GRADIENT',
    title: 'Back propagation iteratively adjusts neural weights by feeding output error information backward through the network',
    lead: 'Random initial weightings are refined by comparing actual outputs with expected outputs and using error gradients to reduce the difference.',
    richBlocks: [{ kind: 'steps', title: 'Source training loop', items: [
      'Assign initial/random weights to neural connections.',
      'Run training inputs and compare actual output with expected output.',
      'Calculate the error/error gradient.',
      'Propagate error information backward and adjust weights.',
      'Repeat until the error is eliminated or falls within an acceptable limit.',
    ] }],
    bullets: ['The source distinguishes static back propagation from recurrent back propagation; recurrent activation continues until a fixed value is achieved and is harder to train.'],
    visual: 'recap', accent: 'rose', ...source(444, 445, ['Figures 18.30–18.31', 'Back propagation', 'Static', 'Recurrent']),
  },
  {
    id: 'h18-1826-regression', section: '18.2 Artificial intelligence, machine learning and deep learning', subtopicCode: '18.2.6', eyebrow: 'REGRESSION · PREDICTION FROM RELATIONSHIPS',
    title: 'Regression learns relationships between input and output variables to support prediction',
    lead: 'The source frames regression as a statistical tool for understanding how a dependent variable changes when independent variables change.',
    bullets: [
      'Regression can analyse data before it is fed into a system/model.',
      'It is used to predict outcomes from learned relationships and hidden parameters.',
      'Weather forecasting is given as a prediction example.',
    ],
    activity: { title: 'Activity 18C', prompt: 'Explain the AI categories, reward/punishment, artificial neural networks, four learning types, back propagation and uses of each learning type; then identify the ten described terms.' },
    visual: 'recap', accent: 'cyan', ...source(445, 445, ['Regression', 'Activity 18C']),
  },
  {
    id: 'h18-review-ai-learning', section: 'Chapter review', eyebrow: 'END-OF-CHAPTER QUESTIONS · AI/ML/DL',
    title: 'The first review block checks heuristics, learning types, applications and the back-propagation vocabulary',
    bullets: [
      'Multiple-choice questions distinguish AI and heuristic search.',
      'A matching task compares machine-learning and deep-learning characteristics.',
      'Written questions ask about reinforcement/supervised learning and why chatbots, search engines and photo enhancement count as AI.',
      'A cloze task tests random weights, actual/expected output, error gradients, back propagation, static/recurrent and regression.',
    ],
    visual: 'recap', accent: 'emerald', ...source(446, 447, ['End-of-chapter questions 1–3']),
  },
  {
    id: 'h18-review-pathfinding', section: 'Chapter review', eyebrow: 'END-OF-CHAPTER QUESTIONS · DIJKSTRA + A*',
    title: 'The final review returns to shortest paths with weighted networks, blocked routes and heuristic replanning',
    bullets: [
      'Compare A* with Dijkstra.',
      'Use Dijkstra to find hotel/campus shortest routes and reconstruct the path.',
      'Use A* on a matrix to find a shortest route.',
      'Explain how a GPS/A* system reacts when flooding closes edges on the original route.',
      'Evaluate proposed new cycle paths by recalculating the resulting shortest time.',
    ],
    activity: { title: 'Route audit', prompt: 'Solve one Dijkstra and one A* problem from pp.448–449, showing the data used to justify every route decision.' },
    visual: 'recap', accent: 'indigo', ...source(448, 449, ['End-of-chapter questions 4–7']),
  },
];

export const CHAPTER_18_FINAL: HodderLessonChapter = {
  number: 18,
  level: 'A Level',
  title: 'Artificial intelligence (AI)',
  subtitle: 'Dijkstra and A* · machine learning · deep learning · neural networks · back propagation · regression',
  subtopics: [
    '18.1 Shortest path algorithms',
    '18.2 Artificial intelligence, machine learning and deep learning',
  ],
  sourceNote: 'Deep source-backed teaching route from the uploaded Hodder 9618 Chapter 18, printed pp.425–449. Every printed chapter page is represented in slide provenance; Dijkstra/A* worked routes, learning-type examples, neural-network applications, ML/DL comparison, back propagation/regression and source review tasks follow the chapter as teaching paraphrase.',
  coverage: '25/25 printed chapter pages represented (pp.425–449): Dijkstra worked example and activities; A* heuristic, g/h/f/n values and route activities; AI hierarchy and categories; machine learning, labelled/unlabelled data, supervised/unsupervised/reinforcement/active learning; neural networks and deep-learning applications; ML versus DL, future examples, back propagation, static/recurrent forms, regression and end-of-chapter review.',
  slides: CHAPTER_18_DEEP_SLIDES,
};
