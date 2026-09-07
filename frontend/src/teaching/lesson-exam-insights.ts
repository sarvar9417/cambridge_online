type Insight={title:string;items:string[];source:string};

const byKey:Record<string,Insight>={
  '1.1-lo-01':{
    title:'Represent and convert values accurately',
    items:['Show the working for binary/denary/hexadecimal conversions, not only the final value.','Keep fixed-width signed representations and ordinary unsigned conversions conceptually separate.','Distinguish decimal prefixes from binary prefixes when the unit is part of the question.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.1-lo-02':{
    title:'Binary arithmetic is assessed together with representation limits',
    items:['Carry bits carefully and interpret the final bit pattern using the representation stated in the question.','For subtraction, two’s complement is a method: form the negative operand and add.','Overflow is about the result not fitting the allocated bits, not simply about producing a carry.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.1-lo-03':{
    title:'Know why alternative representations are useful',
    items:['Hexadecimal is compact and maps one digit to four bits, which makes machine-oriented values easier to inspect.','BCD stores each denary digit separately; do not treat a BCD pattern as one ordinary binary integer.','When asked for a use, link the representation to the property that makes it suitable.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.1-lo-04':{
    title:'Character sets need an agreed code for each character',
    items:['Explain that computers store numeric/binary codes rather than the visual character itself.','A shared character set lets sender, receiver, hardware and software interpret the same code consistently.'],
    source:'Drive AS topical notes + reviewed 9618 mark schemes',
  },
  '1.1-lo-05':{
    title:'Compare character encodings through repertoire and storage',
    items:['Standard ASCII has a limited character repertoire; Unicode supports far more writing systems and symbols.','The first ASCII range is retained for compatibility in Unicode encodings.','A wider code space can require more storage per character; use this as a comparison point only when the question asks for it.'],
    source:'Drive AS topical notes + reviewed 9618 mark schemes',
  },
  '1.2-lo-01':{
    title:'Explain a bitmap as ordered pixel data plus metadata',
    items:['Each pixel has a colour represented by a binary code; pixel codes are stored in a defined sequence.','Resolution controls the number of pixels; colour/bit depth controls the bits available per pixel.','For raw file-size estimates, multiply pixel count by bits per pixel before converting bits to bytes/units.'],
    source:'Drive AS topical notes + reviewed 9618 mark schemes',
  },
  '1.2-lo-02':{
    title:'Describe vectors as a drawing list, not as pixels',
    items:['Store objects/shapes, their geometric instructions and properties such as line/fill attributes.','Scaling recalculates geometry, so a vector can enlarge without raster pixelation.','Use the representation mechanism itself when explaining why a vector is suitable.'],
    source:'Drive AS topical notes + reviewed 9618 mark schemes',
  },
  '1.2-lo-03':{
    title:'Format-choice questions require a property tied to the scenario',
    items:['Photographic detail generally favours bitmap representation.','Logos, diagrams and artwork that must scale cleanly often favour vectors.','A recommendation without a scenario-linked reason is weaker than a justified choice.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.2-lo-04':{
    title:'Digitising sound is a sampling process',
    items:['An ADC measures analogue amplitude at regular time intervals and encodes the measurements digitally.','Keep sampling rate (samples per second) separate from sampling resolution/bit depth (bits per sample).'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.2-lo-05':{
    title:'Quality and file size move together',
    items:['A higher sampling rate captures the waveform more frequently.','A higher sampling resolution provides more amplitude levels.','Both can improve fidelity but increase the amount of data that must be stored or transmitted.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.3-lo-01':{
    title:'Compression answers a storage or transmission problem',
    items:['State what is reduced: the number of bits needed to store/transmit the file.','Tie the benefit to the situation: storage capacity, download time, streaming bandwidth or transfer time.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.3-lo-02':{
    title:'Lossless and lossy differ in recoverability',
    items:['Lossless compression permits reconstruction of the original data.','Lossy compression permanently discards selected information to achieve greater reduction.','Choose terminology precisely: reduced quality is a possible consequence of lossy compression, not its definition.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.3-lo-03':{
    title:'Justify the compression method from the file’s purpose',
    items:['Text, source code and other data where every symbol matters normally require lossless recovery.','Media can tolerate controlled perceptual loss when reduced size is more important than perfect reconstruction.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '1.3-lo-04':{
    title:'RLE is useful only when repeated adjacent values are common',
    items:['Encode a run using a count plus the repeated value/code.','Long runs compress well; rapidly changing data can make naive RLE ineffective or larger.','When calculating a result, keep the encoding convention stated in the question.'],
    source:'Drive AS topical notes + 9618 question corpus',
  },
  '13.1-lo-01':{
    title:'Explain why the program benefits from a domain-specific type',
    items:['A user-defined type models the permitted values or structure of the problem more directly than unrelated primitive values.','Good type design improves clarity and can prevent invalid states or inconsistent data.'],
    source:'Drive A Level topical notes + 9618 question corpus',
  },
  '13.1-lo-02':{
    title:'Non-composite types are assessed through meaning and pseudocode',
    items:['An enumeration explicitly lists permitted ordered values; those values are identifiers, not ordinary quoted strings.','A pointer stores an address and has a target type; dereferencing accesses the value at that address.','Distinguish the pointer value (address) from the data stored at the pointed-to location.'],
    source:'Drive A Level topical notes + 9618 question corpus',
  },
  '13.1-lo-03':{
    title:'Composite types are built from other types',
    items:['Records group named fields that may use different data types.','Sets model unordered elements and support set operations.','Classes combine data with methods; an object is an instance of a class.'],
    source:'Drive A Level topical notes + 9618 question corpus',
  },
  '13.1-lo-04':{
    title:'Choose a type by the constraints of the data',
    items:['Use an enumeration for a fixed list of permitted named values.','Use a record when one entity needs several related fields.','Use a pointer when the program must refer to a typed location in memory.'],
    source:'Drive A Level topical notes + reviewed 9618 mark schemes',
  },
  '13.2-lo-01':{
    title:'Organisation is the physical order of records',
    items:['Serial: arrival order; sequential: a defined key order; random: available positions located through a hash.','When comparing methods, mention the effect on insertion, search or batch processing rather than only restating definitions.'],
    source:'Drive A Level topical notes + source-backed 9618 corpus',
  },
  '13.2-lo-02':{
    title:'Access is how the required record is physically found',
    items:['Sequential access reads records from the physical start until the target/stop condition.','Direct access reaches a selected record without reading every earlier record, using an index or calculated location.','Hit rate is a useful reason when choosing between batch sequential processing and individual direct access.'],
    source:'Drive A Level topical notes + source-backed 9618 corpus',
  },
  '13.2-lo-03':{
    title:'Scenario questions reward a reasoned organisation/access pair',
    items:['Ask whether records arrive chronologically, must remain in key order, or need fast individual retrieval.','Then connect the workload to a suitable organisation and access method.'],
    source:'Hodder source scenarios + 9618 question corpus',
  },
  '13.2-lo-04':{
    title:'Hashing questions combine arithmetic with collision handling',
    items:['Calculate the home slot from the key, then combine it with the file start and record size exactly as specified.','A collision means two keys map to the same home location.','After a collision, retrieval must still verify the stored key before accepting a record.'],
    source:'Hodder hashing examples + 9618 question corpus',
  },
  '13.3-lo-01':{
    title:'Separate the two signed fields before reasoning about the value',
    items:['The mantissa carries significant binary digits; the exponent controls the power-of-two scale.','The assumed binary point position and field widths are part of the representation contract.'],
    source:'Drive A Level topical notes + reviewed 9618 mark schemes',
  },
  '13.3-lo-02':{
    title:'Floating-point conversion is a mantissa/exponent workflow',
    items:['Interpret or build the mantissa first, including two’s-complement negatives.','Interpret the exponent as a signed power of two.','Move the binary point in the direction implied by the exponent and preserve the allocated field widths.'],
    source:'Hodder worked examples + reviewed 9618 mark schemes',
  },
  '13.3-lo-03':{
    title:'Normalisation maximises useful precision',
    items:['Positive mantissas begin 0.1; negative mantissas begin 1.0 in the course representation.','Every mantissa shift must be compensated by the opposite change in exponent so the represented value stays unchanged.','More mantissa bits improve precision; more exponent bits increase range.'],
    source:'Drive A Level topical notes + 9618 question corpus',
  },
  '13.3-lo-04':{
    title:'Approximation follows from finite mantissa precision',
    items:['Some denary fractions cannot be represented exactly by a finite binary fraction.','When the available mantissa bits end, the stored value is an approximation of the intended value.','Increasing mantissa width can reduce the representation error.'],
    source:'Hodder approximation examples + 9618 question corpus',
  },
  '13.3-lo-05':{
    title:'Explain the consequence, not only the error name',
    items:['Repeated calculations on approximate values can expose rounding differences such as values just below the expected decimal result.','Overflow occurs when magnitude exceeds the largest representable value; underflow occurs when a non-zero magnitude is too small to represent.'],
    source:'Drive A Level topical notes + reviewed 9618 mark schemes',
  },
  '7.1':{
    title:'Program-development questions test the purpose of each stage',
    items:['Analysis establishes requirements and identifies what the solution must do.','Design specifies how the solution will work before implementation.','Coding translates the design into a program; iterative testing checks parts while they are developed.','Final testing checks the completed program with planned data and expected outcomes.'],
    source:'0478 approved QP/MS corpus · 2023–2026',
  },
  '7.2':{
    title:'Decomposition must remain hierarchical and purposeful',
    items:['Break a system into sub-systems until each part performs a manageable action.','For a proposed system, identify inputs, processes, outputs and storage explicitly.','Structure diagrams show the hierarchy; flowcharts/pseudocode show the ordered algorithm inside a component.'],
    source:'0478 approved QP/MS corpus · 2015–2026',
  },
  '7.3':{
    title:'Explain what an algorithm achieves before describing individual lines',
    items:['State the overall purpose in terms of the input, processing and resulting output.','Then identify the important processes that make that purpose happen.','Use the actual variables/conditions in the supplied algorithm as evidence.'],
    source:'0478 approved QP/MS corpus · 2015–2026',
  },
  '7.4':{
    title:'Recognise standard algorithm patterns and initialise them correctly',
    items:['Totals and counters need suitable initial values before repetition.','Maximum/minimum algorithms compare each item with the current stored extreme.','Linear search checks items in sequence; bubble sort repeatedly compares adjacent values and swaps those in the wrong order.'],
    source:'0478 approved QP/MS corpus · 2015–2026',
  },
  '7.5':{
    title:'Validation and verification are different exam concepts',
    items:['Validation automatically checks whether input is reasonable according to rules such as range, length, type, presence or format.','Verification checks that data has been copied accurately, for example by double entry or visual checking.','When changing an algorithm/flowchart, show both the test and the route used when input is rejected.'],
    source:'0478 approved QP/MS corpus · 2015–2026',
  },
  '7.6':{
    title:'Test data is selected to prove different behaviours',
    items:['Normal data should be accepted and produce a known expected result.','Abnormal data should be rejected.','Extreme data is the largest/smallest valid value; boundary testing uses values immediately on and outside a boundary.'],
    source:'0478 approved QP/MS corpus · 2015–2026',
  },
  '7.7':{
    title:'A trace table records every value change and every output',
    items:['Initial values belong in the table before the first iteration when the algorithm assigns them.','Record a variable again only when its value changes.','Follow conditions and loop order exactly; a correct final answer with an incorrect trace does not demonstrate the dry run.'],
    source:'0478 approved QP/MS corpus · 2015–2026',
  },
  '7.8':{
    title:'Error-correction questions require both diagnosis and repair',
    items:['Identify the exact line, symbol, branch or condition that is wrong.','State or show the corrected version, not only that an error exists.','Retest mentally after the fix so one correction does not create a second logic error.'],
    source:'0478 approved QP/MS corpus · 2015–2026',
  },
  '7.9':{
    title:'Writing algorithms is assessed through correct logic and Cambridge pseudocode conventions',
    items:['Choose sequence, selection and iteration structures that match the required behaviour.','Keep conditions, initialisation, loop termination and output placement logically consistent.','When a question gives exact strings or identifiers, preserve them as requested.'],
    source:'0478 approved QP/MS corpus · 2015–2026',
  },
};

function checkpointKey(contract:Element){
  const value=contract.querySelector('strong')?.textContent?.trim()??'';
  const ch7=value.match(/^7\.[1-9]\b/)?.[0];
  if(ch7)return ch7;
  const lo=value.match(/\b(?:1\.[123]|13\.[123])-lo-\d+\b/)?.[0];
  return lo??'';
}

function enhance(contract:Element){
  const host=contract.parentElement;
  if(!host||host.querySelector('.lesson-exam-insight'))return;
  const key=checkpointKey(contract);
  const insight=byKey[key];
  if(!insight)return;

  const panel=document.createElement('section');
  panel.className='lesson-exam-insight';
  const header=document.createElement('header');
  const eyebrow=document.createElement('span');
  eyebrow.textContent='CAMBRIDGE EXAM LENS';
  const title=document.createElement('strong');
  title.textContent=insight.title;
  header.append(eyebrow,title);
  const list=document.createElement('ul');
  insight.items.forEach(value=>{const item=document.createElement('li');item.textContent=value;list.append(item)});
  const source=document.createElement('small');
  source.textContent=`Enrichment source: ${insight.source}. This is lesson guidance, not a replacement for the question’s own mark scheme.`;
  panel.append(header,list,source);
  contract.insertAdjacentElement('afterend',panel);
}

function scan(){document.querySelectorAll('.lesson-checkpoint-contract').forEach(enhance)}
let scheduled=false;
let consumers=0;
let teardown:(()=>void)|null=null;

function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{
    scheduled=false;
    if(teardown)scan();
  });
}

function setup(){
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  teardown=()=>{
    observer.disconnect();
    scheduled=false;
    teardown=null;
  };
}

/**
 * Install the progressive exam-lens enrichment only while Lesson Studio owns
 * the surface. Importing this module is intentionally side-effect free.
 */
export function installLessonExamInsights(){
  if(typeof document==='undefined')return()=>{};
  consumers+=1;
  if(!teardown)setup();
  let released=false;
  return()=>{
    if(released)return;
    released=true;
    consumers=Math.max(0,consumers-1);
    if(consumers===0)teardown?.();
  };
}
