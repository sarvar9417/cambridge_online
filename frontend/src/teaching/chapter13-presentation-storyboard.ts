import type { HodderLessonSlide } from './lesson-content-hodder-types';
import type { LessonPresentationBeat } from './lesson-experience-model';
import { authoredStaticScene, buildAuthoredStoryboard, type AuthoredSceneSpec } from './authored-presentation-storyboard';

const s=(spec:AuthoredSceneSpec)=>spec;

const OVERVIEW:AuthoredSceneSpec[]=[
  s({id:'h13p-overview-route',slideId:'h13-overview',role:'objective',eyebrow:'CHAPTER 13 · COMPLETE ROUTE',title:'Data representation: model data, organise files, represent real numbers',lead:true,block:{index:0}}),
];

const TOPIC_131:AuthoredSceneSpec[]=[
  s({id:'h13p-131-prior',slideId:'h13-prior-131',role:'hook',eyebrow:'13.1 · PRIOR KNOWLEDGE',lead:true,block:{index:0},sourcePages:[1]}),
  s({id:'h13p-131-why',slideId:'h13-udt-why',role:'concept',eyebrow:'13.1 · USER-DEFINED TYPES',lead:true,keyTerms:[0,3],block:{index:0},sourcePages:[2]}),
  s({id:'h13p-131-enum-code',slideId:'h13-enum',role:'visual',eyebrow:'13.1.1 · ENUMERATED TYPE',lead:true,block:{index:0},sourcePages:[2]}),
  s({id:'h13p-131-enum-rules',slideId:'h13-enum',role:'concept',eyebrow:'13.1.1 · ENUM RULES',title:'Values are identifiers with an implied order',block:{index:1},sourcePages:[2]}),
  s({id:'h13p-131-enum-task',slideId:'h13-enum',role:'challenge',eyebrow:'ACTIVITY 13A',title:'Design a days-of-week enumeration',activity:true,sourcePages:[2]}),
  s({id:'h13p-131-pointer-code',slideId:'h13-pointer',role:'visual',eyebrow:'13.1.1 · POINTER TYPE',lead:true,block:{index:0},sourcePages:[3]}),
  s({id:'h13p-131-pointer-process',slideId:'h13-pointer',role:'process',eyebrow:'13.1.1 · ADDRESS → DEREFERENCE',title:'Follow the address to the stored value',block:{index:1},sourcePages:[3]}),
  s({id:'h13p-131-pointer-task',slideId:'h13-pointer',role:'challenge',eyebrow:'ACTIVITY 13B',title:'Declare a pointer for the days-of-week type',activity:true,sourcePages:[3]}),
  s({id:'h13p-131-record',slideId:'h13-record',role:'visual',eyebrow:'13.1.2 · RECORDS',lead:true,block:{index:0},sourcePages:[3,4]}),
  s({id:'h13p-131-set-code',slideId:'h13-sets-classes',role:'visual',eyebrow:'13.1.2 · SET',lead:true,block:{index:0},sourcePages:[4]}),
  s({id:'h13p-131-set-class',slideId:'h13-sets-classes',role:'compare',eyebrow:'13.1.2 · SETS AND CLASSES',title:'Composite types can model collections or data + behaviour',keyTerms:[0,2],block:{index:1},sourcePages:[4]}),
  s({id:'h13p-131-choice',slideId:'h13-activity-13c',role:'challenge',eyebrow:'ACTIVITY 13C · CHOOSE + JUSTIFY',lead:true,block:{index:0},activity:true,sourcePages:[4]}),
];

const TOPIC_132:AuthoredSceneSpec[]=[
  s({id:'h13p-132-prior',slideId:'h13-prior-132',role:'hook',eyebrow:'13.2 · PRIOR KNOWLEDGE',lead:true,block:{index:0},sourcePages:[5]}),
  s({id:'h13p-132-terms-a',slideId:'h13-file-terms',role:'compare',eyebrow:'13.2.1 · ORGANISATION',title:'Serial, sequential and random describe physical arrangement',lead:true,keyTerms:[0,3],sourcePages:[5]}),
  s({id:'h13p-132-terms-b',slideId:'h13-file-terms',role:'compare',eyebrow:'13.2.1 · ACCESS',title:'Sequential and direct describe how a record is found',keyTerms:[3,5],sourcePages:[5]}),
  s({id:'h13p-132-serial',slideId:'h13-serial',role:'visual',eyebrow:'FIGURE 13.1 · SERIAL ORGANISATION',lead:true,block:{index:2},sourcePages:[5]}),
  s({id:'h13p-132-sequential-before',slideId:'h13-sequential',role:'visual',eyebrow:'FIGURES 13.2–13.3 · SEQUENTIAL',lead:true,block:{index:0},sourcePages:[6]}),
  s({id:'h13p-132-sequential-after',slideId:'h13-sequential',role:'process',eyebrow:'FIGURES 13.2–13.3 · INSERT IN KEY ORDER',title:'Insertion changes physical order',block:{index:1},sourcePages:[6]}),
  s({id:'h13p-132-sequential-figure',slideId:'h13-sequential',role:'visual',eyebrow:'FIGURES 13.2–13.3 · KEY ORDER',title:'The new record occupies its key position',block:{index:2},sourcePages:[6]}),
  s({id:'h13p-132-random',slideId:'h13-random',role:'visual',eyebrow:'FIGURE 13.4 · RANDOM ORGANISATION',lead:true,block:{index:2},sourcePages:[6]}),
  s({id:'h13p-132-seq-access-serial',slideId:'h13-seq-access',role:'process',eyebrow:'13.2.1 · SEQUENTIAL ACCESS',title:'Serial file: scan until match or end-of-file',lead:true,block:{index:0},sourcePages:[6,7]}),
  s({id:'h13p-132-seq-access-ordered',slideId:'h13-seq-access',role:'process',eyebrow:'FIGURE 13.5 · ORDERED SEARCH',title:'Stop when the current key passes the target',block:{index:1},sourcePages:[6,7]}),
  s({id:'h13p-132-seq-access-figure',slideId:'h13-seq-access',role:'visual',eyebrow:'FIGURE 13.5 · CUSTOMER 6',title:'Reaching Customer 7 proves Customer 6 is absent',block:{index:3},sourcePages:[6,7]}),
  s({id:'h13p-132-direct',slideId:'h13-direct-access',role:'concept',eyebrow:'13.2.1 · DIRECT ACCESS',lead:true,block:{index:0},sourcePages:[7]}),
  s({id:'h13p-132-choice-table',slideId:'h13-org-access-choice',role:'compare',eyebrow:'13.2.1 · SELECT THE METHOD',lead:true,block:{index:0},sourcePages:[7,8]}),
  s({id:'h13p-132-choice-task',slideId:'h13-org-access-choice',role:'challenge',eyebrow:'ACTIVITY 13E',title:'Choose organisation + access from the workload',activity:true,sourcePages:[7,8]}),
  s({id:'h13p-132-hash-formula',slideId:'h13-hash-address',role:'process',eyebrow:'13.2.2 · HASHING',lead:true,formula:true,block:{index:0},sourcePages:[7]}),
  s({id:'h13p-132-hash-collision',slideId:'h13-hash-collision',role:'compare',eyebrow:'TABLE 13.2 · COLLISION',lead:true,block:{index:0},sourcePages:[8]}),
  s({id:'h13p-132-hash-task',slideId:'h13-hash-collision',role:'challenge',eyebrow:'ACTIVITY 13D · HOME ADDRESS',title:'Calculate the home address, then resolve the collision',activity:true,sourcePages:[8]}),
];

const TOPIC_133:AuthoredSceneSpec[]=[
  s({id:'h13p-133-prior',slideId:'h13-prior-133',role:'hook',eyebrow:'13.3 · PRIOR KNOWLEDGE',lead:true,block:{index:0},sourcePages:[9]}),
  s({id:'h13p-133-format-core',slideId:'h13-float-format',role:'concept',eyebrow:'13.3.1 · BINARY FLOATING POINT',lead:true,keyTerms:[0,5],formula:true,block:{index:0},sourcePages:[10]}),
  s({id:'h13p-133-format-fields',slideId:'h13-float-format',role:'visual',eyebrow:'FIGURES 13.6–13.7 · MANTISSA + EXPONENT',title:'Interpret the two signed fields separately',block:{index:1},sourcePages:[10]}),

  s({id:'h13p-133-float-denary-method1',slideId:'h13-float-to-denary',role:'process',eyebrow:'13.3.2 · FLOAT → DENARY · METHOD 1',lead:true,block:{index:0},sourcePages:[11,12,13,14]}),
  s({id:'h13p-133-float-denary-method2',slideId:'h13-float-to-denary',role:'process',eyebrow:'13.3.2 · FLOAT → DENARY · METHOD 2',title:'Move the binary point after interpreting the signed fields',block:{index:1},sourcePages:[11,12,13,14]}),
  s({id:'h13p-133-float-denary-results-a',slideId:'h13-float-to-denary',role:'visual',eyebrow:'EXAMPLES 13.1–13.2',title:'Positive mantissa worked results',block:{index:2,range:[0,2]},sourcePages:[11,12]}),
  s({id:'h13p-133-float-denary-results-b',slideId:'h13-float-to-denary',role:'visual',eyebrow:'EXAMPLES 13.3–13.4',title:'Negative mantissa worked results',block:{index:2,range:[2,4]},sourcePages:[13,14]}),

  s({id:'h13p-133-denary-float-results',slideId:'h13-denary-to-float',role:'visual',eyebrow:'EXAMPLES 13.5–13.7 · DENARY → FLOAT',lead:true,block:{index:0},sourcePages:[14,15,16,17]}),
  s({id:'h13p-133-denary-float-route',slideId:'h13-denary-to-float',role:'process',eyebrow:'13.3.2 · GENERAL CONVERSION ROUTE',title:'Convert → sign → shift → exponent → pad',block:{index:1},sourcePages:[14,15,16,17]}),
  s({id:'h13p-133-equivalent-patterns',slideId:'h13-denary-to-float',role:'challenge',eyebrow:'EXTENSION 13C',title:'Different patterns can represent the same value',activity:true,sourcePages:[17]}),

  s({id:'h13p-133-approx-process',slideId:'h13-approximation',role:'process',eyebrow:'13.3.4 · APPROXIMATION',lead:true,block:{index:0},sourcePages:[17,18]}),
  s({id:'h13p-133-approx-588',slideId:'h13-approximation',role:'visual',eyebrow:'5.88 WORKED DEMONSTRATION',title:'Finite mantissa → approximate stored value',block:{index:1},sourcePages:[17,18]}),
  s({id:'h13p-133-approx-task',slideId:'h13-approximation',role:'challenge',eyebrow:'EXTENSION 13D',title:'Approximate five source values',activity:true,sourcePages:[18]}),

  s({id:'h13p-133-normalise-positive',slideId:'h13-normalisation',role:'process',eyebrow:'13.3.3 · NORMALISE POSITIVE',lead:true,block:{index:0},sourcePages:[18,19,20]}),
  s({id:'h13p-133-normalise-negative',slideId:'h13-normalisation',role:'process',eyebrow:'13.3.3 · NORMALISE NEGATIVE',title:'Negative normalised mantissa begins 1.0',block:{index:1},sourcePages:[18,19,20]}),
  s({id:'h13p-133-normalise-results',slideId:'h13-normalisation',role:'visual',eyebrow:'EXAMPLES 13.8–13.9',title:'Compensate every mantissa shift in the exponent',block:{index:2},sourcePages:[19,20]}),
  s({id:'h13p-133-normalise-figure',slideId:'h13-normalisation',role:'visual',eyebrow:'FIGURES 13.8–13.9 · BIT FIELDS',title:'Before and after normalisation',block:{index:3},sourcePages:[18,19,20]}),

  s({id:'h13p-133-extremes',slideId:'h13-precision-range',role:'concept',eyebrow:'13.3.3 · REPRESENTABLE EXTREMES',lead:true,block:{index:0},sourcePages:[20,21]}),
  s({id:'h13p-133-precision-range',slideId:'h13-precision-range',role:'compare',eyebrow:'FIGURES 13.14–13.16 · PRECISION VS RANGE',title:'Allocate the same 16 bits differently',block:{index:1},sourcePages:[20,21]}),

  s({id:'h13p-133-rounding-code',slideId:'h13-rounding-program',role:'visual',eyebrow:'13.3.5 · REPEATED +0.1',lead:true,block:{index:0},sourcePages:[21]}),
  s({id:'h13p-133-rounding-reason',slideId:'h13-rounding-program',role:'concept',eyebrow:'13.3.5 · WHY THE ERROR APPEARS',title:'Finite binary precision cannot exactly store every denary fraction',block:{index:1},sourcePages:[21]}),
  s({id:'h13p-133-rounding-task',slideId:'h13-rounding-program',role:'challenge',eyebrow:'EXTENSION 13E',title:'Run the program and explain 0.399999…',activity:true,sourcePages:[21]}),

  s({id:'h13p-133-over-under',slideId:'h13-over-under-zero',role:'compare',eyebrow:'13.3.4 · OVERFLOW VS UNDERFLOW',lead:true,block:{index:0},sourcePages:[22]}),
  s({id:'h13p-133-zero',slideId:'h13-over-under-zero',role:'concept',eyebrow:'13.3.4 · ZERO',title:'The normalised leading patterns need a special zero representation',block:{index:1},sourcePages:[22]}),
  s({id:'h13p-133-edge-task',slideId:'h13-over-under-zero',role:'challenge',eyebrow:'ACTIVITY 13I · LIMITS',title:'Reason about extremes, overflow, division by zero and approximation',activity:true,sourcePages:[22]}),

  s({id:'h13p-133-review-theory',slideId:'h13-hodder-review-1',role:'exam',eyebrow:'HODDER REVIEW · FLOATING POINT',lead:true,block:{index:0},example:true,sourcePages:[22,23]}),
  s({id:'h13p-133-review-types-files',slideId:'h13-hodder-review-2',role:'exam',eyebrow:'HODDER REVIEW · TYPES + FILES',lead:true,block:{index:0},sourcePages:[23,24]}),
];

function opening(topicCode:'13.1'|'13.2'|'13.3'):LessonPresentationBeat[] {
  if(topicCode==='13.1')return [
    authoredStaticScene('h13p-131-objectives','h13-overview','objective','13.1 · LESSON GOALS','By the end of 13.1 you should be able to…',[1,4],{
      bullets:['Define and use non-composite and composite user-defined types.','Use enumerated and pointer types with correct declaration/dereference logic.','Model data with records, sets and classes.','Choose and justify a suitable user-defined type from the problem constraints.'],
    }),
  ];
  if(topicCode==='13.2')return [
    authoredStaticScene('h13p-132-objectives','h13-overview','objective','13.2 · LESSON GOALS','By the end of 13.2 you should be able to…',[5,8],{
      bullets:['Distinguish serial, sequential and random file organisation.','Distinguish sequential and direct file access and relate each to hit rate/workload.','Calculate a hash home address and verify the key stored there.','Explain and apply the Hodder open-hash and closed-hash collision rules.'],
    }),
  ];
  return [
    authoredStaticScene('h13p-133-objectives','h13-overview','objective','13.3 · LESSON GOALS','By the end of 13.3 you should be able to…',[9,24],{
      bullets:['Interpret mantissa and exponent as signed two’s-complement fields.','Convert binary floating point ↔ denary and normalise values.','Explain the precision/range trade-off and approximation/rounding errors.','Reason about representable extremes, overflow, underflow and zero.'],
    }),
  ];
}

function sourceCorrectionScenes():LessonPresentationBeat[] {
  return [
    authoredStaticScene('h13p-131-record-source-note','h13-record','compare','13.1.2 · PRINTED SOURCE VS TYPE MEANING','Do not silently rewrite the printed TbookRecord example',[4],{
      richBlock:{kind:'comparison',leftTitle:'Printed Hodder example',rightTitle:'Teaching type choice from field meaning',rows:[
        ['noPages : STRING','noPages : INTEGER'],
        ['fiction : STRING','fiction : BOOLEAN'],
      ]},
      lead:'The source-fidelity layer records this editorial distinction explicitly: the printed example uses STRING for both fields; the classroom form uses INTEGER and BOOLEAN because those types match the meanings.',
    }),
    authoredStaticScene('h13p-131-set-source-note','h13-sets-classes','compare','13.1.2 · PRINTED SET IDENTIFIER','Keep the source wording distinct from the current teaching form',[4],{
      richBlock:{kind:'comparison',leftTitle:'Printed Hodder line',rightTitle:'Teaching form',rows:[
        ["DEFINE vowel ('a','e','i','o','u') : letters","DEFINE vowel ('a','e','i','o','u') : Sletter"],
      ]},
      lead:'The printed source declares TYPE Sletter but later prints the identifier letters. The teaching form uses the declared Sletter identifier and labels the correction rather than attributing it silently to Hodder.',
    }),
  ];
}

export function chapter13PresentationStoryboard(topicCode:string,slides:readonly HodderLessonSlide[]):LessonPresentationBeat[]|null {
  if(topicCode==='overview')return buildAuthoredStoryboard(slides,OVERVIEW);
  if(topicCode==='13.1'){
    const result=[...opening('13.1'),...buildAuthoredStoryboard(slides,TOPIC_131)];
    const recordIndex=result.findIndex(scene=>scene.id==='h13p-131-record');
    if(recordIndex>=0)result.splice(recordIndex+1,0,sourceCorrectionScenes()[0]!);
    const setIndex=result.findIndex(scene=>scene.id==='h13p-131-set-code');
    if(setIndex>=0)result.splice(setIndex+1,0,sourceCorrectionScenes()[1]!);
    result.push(authoredStaticScene('h13p-131-recap','h13-activity-13c','recap','13.1 · RETRIEVAL','Choose a type from the constraints, then justify it',[1,4],{
      bullets:['Enumeration: permitted ordered identifiers.','Pointer: typed address plus dereference operation.','Record: named fields; set: unordered elements; class: data plus methods.','Composite/non-composite depends on the type definition, not on how simple the value looks.'],
    }));
    return result;
  }
  if(topicCode==='13.2')return [
    ...opening('13.2'),
    ...buildAuthoredStoryboard(slides,TOPIC_132),
    authoredStaticScene('h13p-132-exam','h13-hash-collision','exam','13.2 · EXAM CHECK','Calculate before you explain the collision route',[7,8],{
      activity:{title:'Hash + collision',prompt:'Use the Hodder Activity 13D values: file start 500, five locations per record, capacity 1000, key 9354. Calculate the home address and state the next location checked under open hashing.',reveal:'9354 MOD 1000 = 354. Home address = 500 + 354 × 5 = 2270. Under Hodder open hashing, if the home location contains a different key, continue to the next free/file location according to the open-hash route, so the next record location is 2275.'},
    }),
    authoredStaticScene('h13p-132-recap','h13-org-access-choice','recap','13.2 · RETRIEVAL','Separate physical organisation, access method and collision handling',[5,8],{
      bullets:['Serial = arrival order; sequential = defined key order; random = hash-selected positions.','Sequential access reads from the start; direct access targets a chosen record via index/hash.','Hashing gives a home address, but the stored key must still be checked.','Hodder open hash continues in the file; closed hash uses a separate overflow area.'],
    }),
  ];
  if(topicCode==='13.3')return [
    ...opening('13.3'),
    ...buildAuthoredStoryboard(slides,TOPIC_133),
    authoredStaticScene('h13p-133-exam-convert','h13-hodder-review-1','exam','13.3 · EXAM CHECK','Show the mantissa and exponent reasoning, not only the final pattern',[22,23],{
      activity:{title:'Two-way conversion',prompt:'Convert one supplied binary floating-point pattern to denary, then convert one supplied denary value to the chapter’s binary floating-point format. Show mantissa sign, exponent and binary-point movement.',reveal:'Use the coursebook route: interpret/build the signed mantissa first, interpret/encode the signed exponent, compensate for binary-point movement, then check whether the final mantissa is normalised when the question requires it.'},
    }),
    authoredStaticScene('h13p-133-recap','h13-over-under-zero','recap','13.3 · RETRIEVAL','Reconstruct the floating-point model from first principles',[9,24],{
      bullets:['Value = M × 2^E; in the chapter model both M and E are signed two’s-complement fields.','Normalise to 0.1… for positive or 1.0… for negative and compensate every shift in E.','More mantissa bits improve precision; more exponent bits increase range.','Finite representation causes approximation/rounding; overflow is too large, underflow is non-zero but too small, and zero needs special representation.'],
    }),
  ];
  return null;
}
