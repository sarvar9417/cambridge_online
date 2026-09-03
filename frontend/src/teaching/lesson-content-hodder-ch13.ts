import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';
import { checkpoint } from './lesson-content-hodder-types';

const slides: HodderLessonSlide[] = [
  {
    id:'h13-overview',section:'Chapter overview',eyebrow:'HODDER CHAPTER 13 · SOURCE-FAITHFUL',title:'Data representation',
    lead:'The uploaded 24-page chapter is rebuilt as a classroom sequence covering user-defined types, file organisation/access, hashing and binary floating-point representation.',
    sourcePages:[1],sourceElements:['Chapter 13 learning objectives'],
    richBlocks:[
      {kind:'bullets',items:['Define and use non-composite and composite user-defined data types.','Choose/design a suitable type for a problem.','Compare serial, sequential and random file organisation.','Compare sequential and direct file access; use hashing algorithms.','Represent, convert and normalise binary floating-point values.','Reason about approximation, rounding, overflow and underflow.']},
    ],visual:'floating',accent:'emerald',
  },
  {
    id:'h13-prior-131',section:'13.1 User-defined data types',subtopicCode:'13.1',eyebrow:'13.1 · WHAT YOU SHOULD ALREADY KNOW',title:'Start from primitive types and record structures',
    lead:'Hodder begins by checking whether learners can select primitive types and define a record for a real-world entity.',sourcePages:[1],sourceElements:['13.1 What you should already know'],
    richBlocks:[
      {kind:'bullets',items:['Choose suitable types for a name, mark, temperature, date and Boolean state.','Design a zoo-animal record containing identity, species, date of birth, location, origin flag and notes.']},
      {kind:'callout',tone:'activity',title:'Diagnostic',text:'Ask learners to justify every field type, not merely name it.'},
    ],visual:'types',accent:'cyan',
  },
  {
    id:'h13-udt-why',section:'13.1 User-defined data types',subtopicCode:'13.1',eyebrow:'USER-DEFINED TYPES',title:'Programmers create types that match the domain of the problem',
    lead:'The chapter distinguishes programmer-defined types from primitive types supplied by a language and divides them into non-composite and composite forms.',sourcePages:[2],sourceElements:['13.1 Key terms','User-defined data type introduction'],
    keyTerms:[{term:'User-defined type',definition:'A programmer-defined type based on existing or previously defined types.'},{term:'Non-composite',definition:'Can be defined without referencing another type.'},{term:'Composite',definition:'Its definition contains/references other data types.'}],
    richBlocks:[
      {kind:'bullets',items:['A well-designed type constrains data to the values/structure that make sense for the application.','The distinction between composite and non-composite depends on the type definition, not on whether the value looks simple to a user.']},
    ],visual:'types',accent:'emerald',
  },
  checkpoint('h13-cp-udt-need','13.1 User-defined data types','Past papers: why user-defined data types are necessary',['13.1-lo-01'],[1,2],'emerald'),

  {
    id:'h13-enum',section:'13.1 User-defined data types',subtopicCode:'13.1',eyebrow:'13.1.1 · ENUMERATED TYPE',title:'An enumeration lists every permitted value and gives them an implied order',
    lead:'Hodder uses months to show declaration, variable creation and advancing to the next enumerated value.',sourcePages:[2],sourceElements:['13.1.1 Non-composite data types','Enumerated data type','Activity 13A'],
    richBlocks:[
      {kind:'code',title:'Hodder-style pseudocode pattern',lines:['TYPE Tmonth = (January, February, March, ... , December)','DECLARE thisMonth : Tmonth','DECLARE nextMonth : Tmonth','thisMonth ← January','nextMonth ← thisMonth + 1']},
      {kind:'bullets',items:['Enumeration values are identifiers, not quoted strings.','A type name convention such as a leading T helps distinguish the type from variables.','The listed order can be used for controlled progression/comparison.']},
      {kind:'callout',tone:'activity',title:'Activity 13A',text:'Declare an enumeration for days of the week, create variables for today/yesterday and derive the following day from Wednesday.'},
    ],visual:'types',accent:'cyan',
  },
  {
    id:'h13-pointer',section:'13.1 User-defined data types',subtopicCode:'13.1',eyebrow:'13.1.1 · POINTER TYPE',title:'A pointer stores the address of data whose type is known',
    lead:'Hodder makes both addressing and dereferencing explicit.',sourcePages:[3],sourceElements:['Pointer data type','Activity 13B'],
    richBlocks:[
      {kind:'code',title:'Pointer declaration and use',lines:['TYPE TmonthPointer = ^Tmonth','DECLARE monthPointer : TmonthPointer','monthPointer ← ^thisMonth','DECLARE myMonth : Tmonth','myMonth ← monthPointer^']},
      {kind:'steps',title:'Reasoning model',items:['The pointer variable stores a memory address.','The pointer type says what data type is expected at that address.','Taking an address creates a reference to a location.','Dereferencing follows the address and retrieves the stored value.']},
      {kind:'callout',tone:'activity',title:'Activity 13B',text:'Declare a pointer suitable for the days-of-week enumeration and point it at the variable representing today.'},
    ],visual:'types',accent:'cyan',
  },
  checkpoint('h13-cp-noncomposite','13.1 User-defined data types','Past papers: enumerated types, pointers and other non-composite types',['13.1-lo-02'],[2,3],'cyan'),

  {
    id:'h13-record',section:'13.1 User-defined data types',subtopicCode:'13.1',eyebrow:'13.1.2 · RECORDS',title:'A record combines named fields whose types can be different',
    lead:'The coursebook reuses the record concept as the clearest composite type: its definition references the types of its member fields.',sourcePages:[3,4],sourceElements:['13.1.2 Composite data types','TbookRecord example'],
    richBlocks:[
      {kind:'code',title:'Record structure',lines:['TYPE TbookRecord','  DECLARE title : STRING','  DECLARE author : STRING','  DECLARE publisher : STRING','  DECLARE noPages : INTEGER','  DECLARE fiction : BOOLEAN','ENDTYPE']},
      {kind:'paragraph',text:'A record models one structured entity; each field has its own identifier and type, and the record becomes a reusable type for variables.'},
    ],visual:'types',accent:'emerald',
  },
  {
    id:'h13-sets-classes',section:'13.1 User-defined data types',subtopicCode:'13.1',eyebrow:'OTHER COMPOSITE TYPES',title:'Sets group unordered elements; classes combine data and behaviour',
    lead:'Hodder includes sets and classes to broaden the composite-type idea beyond records.',sourcePages:[4],sourceElements:['Sets','Classes','Extension Activity 13A'],
    richBlocks:[
      {kind:'code',title:'Set pattern',lines:['TYPE Sletter = SET OF CHAR',"DEFINE vowel ('a', 'e', 'i', 'o', 'u') : Sletter"]},
      {kind:'bullets',items:['A set contains unordered elements of a base type and supports operations such as union/intersection.','A class contains variables/attributes plus methods.','Objects are instances created from a class; several objects can share the same class definition.']},
      {kind:'callout',tone:'extension',title:'Extension Activity 13A',text:'Investigate how the programming language used in class implements set operations.'},
    ],visual:'types',accent:'emerald',
  },
  checkpoint('h13-cp-composite','13.1 User-defined data types','Past papers: records, sets, classes and composite types',['13.1-lo-03'],[3,4],'emerald'),
  {
    id:'h13-activity-13c',section:'13.1 User-defined data types',subtopicCode:'13.1',eyebrow:'ACTIVITY 13C',title:'Choose the type by modelling the problem, not by memorising syntax',
    lead:'The section ends by requiring explanation and selection across the type families.',sourcePages:[4],sourceElements:['Activity 13C'],
    richBlocks:[
      {kind:'bullets',items:['Explain the difference between composite and non-composite types using examples.','Explain why user-defined data types are needed.','Choose and justify suitable types for a fixed colour set, a property record and addresses of integer data in memory.']},
    ],visual:'types',accent:'amber',
  },
  checkpoint('h13-cp-type-choice','13.1 User-defined data types','Past papers: choose and design an appropriate user-defined type',['13.1-lo-04'],[4],'amber'),

  {
    id:'h13-prior-132',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'13.2 · WHAT YOU SHOULD ALREADY KNOW',title:'Reconnect file operations before physical organisation',
    lead:'Hodder checks file modes and text-file pseudocode before moving to organisation and access.',sourcePages:[5],sourceElements:['13.2 What you should already know'],
    richBlocks:[
      {kind:'bullets',items:['Describe three file-open modes.','Write pseudocode to create a text file, write lines, read them and append another line.','Implement/test the pseudocode in a program.']},
    ],visual:'files',accent:'cyan',
  },
  {
    id:'h13-file-terms',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'13.2.1 · FILE ORGANISATION & ACCESS',title:'Organisation describes physical arrangement; access describes how a record is found',
    lead:'The distinction is foundational: one file organisation may support more than one access strategy.',sourcePages:[5],sourceElements:['13.2 Key terms','13.2.1 File organisation and file access'],
    keyTerms:[{term:'Serial organisation',definition:'Records stored one after another in arrival order.'},{term:'Sequential organisation',definition:'Records stored in a defined order, commonly key order.'},{term:'Random organisation',definition:'Records stored in available positions, with a hash locating the home position.'},{term:'Sequential access',definition:'Read records one after another from the physical start.'},{term:'Direct access',definition:'Find a selected record without physically reading all earlier records.'}],
    visual:'files',accent:'indigo',
  },
  {
    id:'h13-serial',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'SERIAL FILE ORGANISATION · FIGURE 13.1',title:'Serial files preserve the order in which records arrive',
    lead:'New records are appended to the end, making the method useful for temporary transaction streams.',sourcePages:[5],sourceElements:['Serial file organisation','Figure 13.1'],
    richBlocks:[
      {kind:'code',title:'Physical sequence',lines:['Start → record 1 → record 2 → record 3 → … → newest record']},
      {kind:'paragraph',text:'Hodder uses meter readings as an example: readings can be captured chronologically before being processed into a more permanent structure.'},
    ],visual:'files',accent:'cyan',
  },
  {
    id:'h13-sequential',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'SEQUENTIAL FILE ORGANISATION · FIGURES 13.2–13.3',title:'Sequential files physically maintain a chosen key order',
    lead:'The key order speeds ordered processing but new records must be inserted into the correct physical place.',sourcePages:[6],sourceElements:['Sequential file organisation','Figure 13.2','Figure 13.3'],
    richBlocks:[
      {kind:'code',title:'Before insertion',lines:['Customer 1 → 2 → 3 → 4 → 7 → 8']},
      {kind:'code',title:'After inserting Customer 5',lines:['Customer 1 → 2 → 3 → 4 → 5 → 7 → 8']},
    ],visual:'files',accent:'cyan',
  },
  {
    id:'h13-random',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'RANDOM FILE ORGANISATION · FIGURE 13.4',title:'Random organisation uses available positions and a hash to locate records',
    lead:'Physical record order does not need to match key order; the hashing rule determines where the record should be stored or searched.',sourcePages:[6],sourceElements:['Random file organisation','Figure 13.4'],
    richBlocks:[
      {kind:'code',title:'Possible physical order',lines:['Customer 8 → 2 → 4 → 7 → 3 → 1 → …']},
      {kind:'paragraph',text:'Because physical positions are not sorted by key, an address-producing lookup mechanism is essential.'},
    ],visual:'hashing',accent:'emerald',
  },
  checkpoint('h13-cp-file-org','13.2 File organisation and access','Past papers: serial, sequential and random file organisation',['13.2-lo-01'],[5,6],'cyan'),

  {
    id:'h13-seq-access',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'SEQUENTIAL ACCESS · FIGURE 13.5',title:'Read from the start until the target is found—or until ordered data proves it is absent',
    lead:'Serial files may require a complete scan; sequentially ordered files can stop once the current key passes the requested key.',sourcePages:[6,7],sourceElements:['Sequential access','Figure 13.5'],
    richBlocks:[
      {kind:'steps',title:'Serial search',items:['Start at the first record.','Compare the current key with the target.','Continue until matched or end-of-file.']},
      {kind:'steps',title:'Ordered sequential search',items:['Start at the first record.','Continue while current key is below the target.','If the current key becomes greater than the target, the target is not present.']},
      {kind:'callout',tone:'info',title:'High hit rate',text:'Sequential processing is efficient when nearly every record is required, such as monthly billing or payroll.'},
    ],visual:'files',accent:'cyan',
  },
  {
    id:'h13-direct-access',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'DIRECT ACCESS',title:'Direct access targets one record without scanning every earlier record',
    lead:'Hodder links direct access to lower hit-rate tasks where a specific record must be updated or retrieved.',sourcePages:[7],sourceElements:['Direct access'],
    richBlocks:[
      {kind:'bullets',items:['A sequentially organised file can use an index mapping key values to physical addresses.','A randomly organised file can calculate an address from the key using a hashing algorithm.','Direct access is useful when only a small fraction of records will be processed.']},
      {kind:'callout',tone:'info',title:'Low hit rate example',text:'Updating one customer phone number is a low-hit-rate task: reading every customer record would be wasteful.'},
    ],visual:'files',accent:'indigo',
  },
  checkpoint('h13-cp-file-access','13.2 File organisation and access','Past papers: sequential and direct file access',['13.2-lo-02'],[6,7],'indigo'),
  {
    id:'h13-org-access-choice',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'SELECT THE METHOD',title:'Choose organisation and access together from the workload',
    lead:'A correct choice depends on arrival/order requirements, hit rate, update pattern and how quickly individual keys must be found.',sourcePages:[7,8],sourceElements:['Activity 13E'],
    richBlocks:[
      {kind:'table',table:{caption:'Decision prompts',headers:['Workload','Likely reasoning'],rows:[['Append transactions in arrival order','Serial organisation'],['Process nearly all records in key order','Sequential organisation + sequential access'],['Retrieve/update one keyed record quickly','Direct access with index/hash'],['Records stored in hash-selected slots','Random organisation + direct access']]}},
      {kind:'callout',tone:'activity',title:'Activity 13E',text:'Explain serial vs sequential, explain direct access via hashing, then choose methods for library borrowing, annual tax statements and remote rainfall readings.'},
    ],visual:'files',accent:'amber',
  },
  checkpoint('h13-cp-org-access-choice','13.2 File organisation and access','Past papers: select organisation and access for a scenario',['13.2-lo-03'],[7,8],'amber'),

  {
    id:'h13-hash-address',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'13.2.2 · HASHING ALGORITHMS',title:'A hashing formula maps the key field to a physical record address',
    lead:'The source builds the address from a remainder, file start and record size.',sourcePages:[7],sourceElements:['13.2.2 Hashing algorithms','Table 13.1'],
    formula:'slot = key MOD capacity   ·   address = start + slot × recordSize',
    richBlocks:[
      {kind:'steps',title:'Hodder simplified case',items:['Capacity = 2000 records.','Key 3024 gives remainder 1024 when divided by 2000.','With start address 0 and one location per record, address = 1024.']},
      {kind:'callout',tone:'info',title:'Always verify the key',text:'The calculated address is a home location. The key stored there must still be compared with the requested key because collisions can relocate records.'},
    ],visual:'hashing',accent:'emerald',
  },
  {
    id:'h13-hash-collision',section:'13.2 File organisation and access',subtopicCode:'13.2',eyebrow:'COLLISION · TABLE 13.2',title:'Different keys can calculate the same home address',
    lead:'Keys 3024 and 5024 have the same remainder in the Hodder example, so a collision-resolution rule is required.',sourcePages:[8],sourceElements:['Table 13.2','Open hashing','Closed hashing','Activity 13D','Extension Activity 13B'],
    richBlocks:[
      {kind:'comparison',leftTitle:'Open hash (Hodder)',rightTitle:'Closed hash (Hodder)',rows:[['Store collided record in the next free file location','Store collided record in a separate overflow area'],['During lookup, continue through following records if the key does not match','During lookup, search the overflow area if the home key does not match']]},
      {kind:'callout',tone:'activity',title:'Activity 13D',text:'Given file start 500, five locations per record, 1000-record capacity and key 9354, calculate the home address and the next location checked under open hashing.'},
      {kind:'callout',tone:'extension',title:'Extension Activity 13B',text:'Build a name-based hash by summing character ASCII values, taking a remainder, scaling by record size and adding the file start.'},
    ],visual:'hashing',accent:'rose',
  },
  checkpoint('h13-cp-hashing','13.2 File organisation and access','Past papers: hashing, physical addresses and collision handling',['13.2-lo-04'],[7,8],'emerald'),

  {
    id:'h13-prior-133',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'13.3 · WHAT YOU SHOULD ALREADY KNOW',title:'Retrieve signed binary and scientific-notation skills first',
    lead:'The six Hodder diagnostic groups intentionally revisit Chapter 1 before floating point.',sourcePages:[9],sourceElements:['13.3 What you should already know'],
    richBlocks:[
      {kind:'bullets',items:['Convert positive/negative denary integers to binary.','Convert signed binary values to denary.','Use two’s complement to form negatives.','Carry out binary additions.','Write large/small denary values in standard form.','Rewrite improper denary and binary fractions in a proper-fraction/scientific form.']},
    ],visual:'floating',accent:'cyan',
  },
  {
    id:'h13-float-format',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'13.3.1 · FLOATING-POINT FORMAT',title:'Store a real number as mantissa × 2^exponent',
    lead:'Hodder contrasts fixed point with floating point, then uses an 8-bit mantissa and 8-bit exponent with a binary point immediately after the sign bit.',sourcePages:[10],sourceElements:['13.3 Key terms','13.3.1 Floating-point number representation','Figure 13.6','Figure 13.7'],
    formula:'value = M × 2^E',
    keyTerms:[{term:'Mantissa',definition:'Signed fractional component carrying significant binary digits.'},{term:'Exponent',definition:'Signed power of two that scales the mantissa.'},{term:'Normalisation',definition:'Shift the mantissa to a canonical leading pattern and compensate in the exponent.'},{term:'Overflow',definition:'Result too large for the representation.'},{term:'Underflow',definition:'Non-zero result too small in magnitude for the representation.'}],
    richBlocks:[
      {kind:'bullets',items:['More mantissa bits generally increase precision.','More exponent bits generally increase range.','Both fields are interpreted in two’s complement in the chapter examples.']},
    ],visual:'floating',accent:'indigo',
  },
  checkpoint('h13-cp-float-format','13.3 Floating-point numbers','Past papers: describe binary floating-point format',['13.3-lo-01'],[10],'indigo'),

  {
    id:'h13-float-to-denary',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'BINARY FLOAT → DENARY',title:'Interpret mantissa and exponent separately, then combine them',
    lead:'Examples 13.1–13.4 cover positive/negative mantissas and positive/negative exponents using two equivalent solution methods.',sourcePages:[11,12,13,14],sourceElements:['Example 13.1','Example 13.2','Example 13.3','Example 13.4','Activity 13F'],
    richBlocks:[
      {kind:'steps',title:'Method 1',items:['Evaluate the signed mantissa from its binary fractional weights.','Evaluate the signed exponent.','Calculate M × 2^E.']},
      {kind:'steps',title:'Method 2',items:['Write the mantissa with its assumed binary point.','If the mantissa is negative, reason with two’s complement.','Move the binary point right for positive exponent or left for negative exponent.','Read the resulting binary whole/fractional value.']},
      {kind:'table',table:{caption:'Hodder worked results',headers:['Example','Theme','Denary result'],rows:[['13.1','positive M, +E','11.25'],['13.2','positive M, +E','2.5'],['13.3','negative M, +E','−1664'],['13.4','negative M, −E','−0.025390625']]}},
      {kind:'callout',tone:'activity',title:'Activity 13F',text:'Convert ten 8-bit-mantissa/8-bit-exponent floating-point values into denary.'},
    ],visual:'floating',accent:'cyan',
  },
  checkpoint('h13-cp-float-to-denary','13.3 Floating-point numbers','Past papers: convert binary floating-point values to denary',['13.3-lo-02'],[11,12,13,14],'cyan'),

  {
    id:'h13-denary-to-float',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'DENARY → BINARY FLOAT',title:'Build the binary fraction, shift the point and encode the shift as the exponent',
    lead:'Examples 13.5–13.7 cover positive integer/fraction combinations, values below one and a negative value.',sourcePages:[14,15,16,17],sourceElements:['Example 13.5','Example 13.6','Example 13.7','Activity 13G','Extension Activity 13C'],
    richBlocks:[
      {kind:'table',table:{caption:'Worked examples',headers:['Example','Input','Stored 8+8 pattern'],rows:[['13.5','+4.5','01001000 00000011'],['13.6','+0.171875','00010110 00000000 (or equivalent before normalisation)'],['13.7','−10.375','10101101 00000100']]}},
      {kind:'steps',title:'General route',items:['Convert whole and fractional parts to binary.','For negative numbers, form the signed mantissa with two’s complement.','Move the binary point until the desired mantissa form is reached.','The number of shifts becomes the signed exponent.','Pad the fields to the allocated bit widths.']},
      {kind:'callout',tone:'extension',title:'Extension Activity 13C',text:'Show that two apparently different floating patterns represent the same value by compensating a mantissa shift with the exponent.'},
      {kind:'callout',tone:'activity',title:'Activity 13G',text:'Encode ten given M×2^E values and ten denary values using an 8-bit mantissa and 8-bit exponent.'},
    ],visual:'floating',accent:'cyan',
  },
  checkpoint('h13-cp-denary-to-float','13.3 Floating-point numbers','Past papers: convert denary values to binary floating point',['13.3-lo-02'],[14,15,16,17],'cyan'),

  {
    id:'h13-approximation',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'POTENTIAL ROUNDING ERRORS & APPROXIMATION',title:'Some denary fractions have no exact finite binary representation',
    lead:'Hodder uses 5.88 to show how a limited mantissa truncates/approximates the value and how a longer mantissa can reduce the error.',sourcePages:[17,18],sourceElements:['Potential rounding errors and approximations','Extension Activity 13D'],
    richBlocks:[
      {kind:'steps',title:'Fractional conversion by repeated ×2',items:['Multiply the remaining fraction by 2.','Record the whole-number bit produced.','Repeat with the new fractional remainder.','Stop when the mantissa has no more available bits.']},
      {kind:'callout',tone:'warning',title:'5.88 example',text:'With the limited mantissa used in the chapter, the stored value becomes an approximation (5.75 in the worked demonstration), illustrating representational error rather than arithmetic failure.'},
      {kind:'callout',tone:'extension',title:'Extension Activity 13D',text:'Approximate 1.63, 8.13, 12.32, 5.90 and 7.40 using the stated 8-bit mantissa/exponent model.'},
    ],visual:'precision',accent:'amber',
  },
  checkpoint('h13-cp-approximation','13.3 Floating-point numbers','Past papers: consequences of approximate binary real-number representation',['13.3-lo-04'],[17,18],'amber'),

  {
    id:'h13-normalisation',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'NORMALISATION · FIGURES 13.8–13.9',title:'Use one canonical mantissa pattern to maximise useful significant bits',
    lead:'Positive normalised mantissas begin 0.1; negative normalised mantissas begin 1.0. Every shift of the mantissa is compensated by an exponent change.',sourcePages:[18,19,20],sourceElements:['Figure 13.8','Figure 13.9','Example 13.8','Example 13.9','Activity 13H'],
    richBlocks:[
      {kind:'steps',title:'Positive number',items:['Shift mantissa bits left until the first two bits are 0.1.','For each left shift, reduce the exponent by 1.']},
      {kind:'steps',title:'Negative number',items:['Shift until the mantissa begins 1.0.','Adjust the exponent by the opposite amount so the numerical value is unchanged.']},
      {kind:'table',table:{caption:'Worked examples',headers:['Example','Before','After'],rows:[['13.8','0.0011100 00000101','0.1110000 00000011'],['13.9','1.1101100 00001010','1.0110000 00001000']]}},
      {kind:'callout',tone:'activity',title:'Activity 13H',text:'Normalise ten positive/negative examples, including negative exponents.'},
    ],visual:'floating',accent:'emerald',
  },
  checkpoint('h13-cp-normalise','13.3 Floating-point numbers','Past papers: normalise floating-point numbers',['13.3-lo-03'],[18,19,20],'emerald'),

  {
    id:'h13-precision-range',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'PRECISION VERSUS RANGE · FIGURES 13.10–13.16',title:'Mantissa bits buy precision; exponent bits buy range',
    lead:'The source first identifies extreme values for an 8+8 format, then compares 12+4, 8+8 and 4+12 splits within the same total word size.',sourcePages:[20,21],sourceElements:['Figure 13.10','Figure 13.11','Figure 13.12','Figure 13.13','Figure 13.14','Figure 13.15','Figure 13.16'],
    richBlocks:[
      {kind:'bullets',items:['Largest positive: largest positive normalised mantissa × largest positive exponent.','Smallest positive non-zero magnitude: smallest positive normalised mantissa × most negative exponent.','Analogous extreme patterns exist for negative values.']},
      {kind:'table',table:{caption:'Fixed 16-bit trade-off',headers:['Mantissa','Exponent','Effect'],rows:[['12 bits','4 bits','High precision, small range'],['8 bits','8 bits','Balanced precision/range'],['4 bits','12 bits','Low precision, extremely large range']]}},
    ],visual:'precision',accent:'amber',
  },
  checkpoint('h13-cp-precision-range','13.3 Floating-point numbers','Past papers: normalisation, precision and representable range',['13.3-lo-03'],[20,21],'amber'),

  {
    id:'h13-rounding-program',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'FLOATING-POINT PROBLEMS',title:'Repeated arithmetic can expose small representation errors',
    lead:'Hodder links limited binary precision to familiar outputs such as 0.399999… instead of the expected 0.4 and discusses higher-precision formats.',sourcePages:[21],sourceElements:['Floating-point problems','Extension Activity 13E'],
    richBlocks:[
      {kind:'code',title:'Source pseudocode idea',lines:['number ← 0.0','FOR loop ← 0 TO 50','  number ← number + 0.1','  OUTPUT number','ENDFOR']},
      {kind:'bullets',items:['0.1 is not represented exactly in ordinary finite binary floating point.','Small errors can become visible after repeated operations.','Double/quadruple precision increases mantissa capacity and can reduce—but not universally eliminate—representation error.']},
      {kind:'callout',tone:'extension',title:'Extension Activity 13E',text:'Run the repeated +0.1 program, explain results such as 0.399999…, and discuss ways to reduce/manage the error.'},
    ],visual:'precision',accent:'rose',
  },
  checkpoint('h13-cp-rounding','13.3 Floating-point numbers','Past papers: rounding errors caused by binary representation',['13.3-lo-05'],[21],'rose'),

  {
    id:'h13-over-under-zero',section:'13.3 Floating-point numbers',subtopicCode:'13.3',eyebrow:'OVERFLOW · UNDERFLOW · ZERO',title:'Finite floating-point formats have hard limits at both ends of the scale',
    lead:'The chapter closes the theory with three edge cases: too large, too small and the special problem of representing zero under the stated normalisation rule.',sourcePages:[22],sourceElements:['Overflow discussion','Underflow discussion','Normalised zero issue','Activity 13I','Extension Activity 13F'],
    richBlocks:[
      {kind:'comparison',leftTitle:'Overflow',rightTitle:'Underflow',rows:[['Magnitude exceeds the maximum representable value','Non-zero magnitude falls below the minimum representable value'],['Can arise from very large results or division by a tiny number','Can arise after division by a very large number']]},
      {kind:'callout',tone:'warning',title:'Zero',text:'The chapter’s normalised leading patterns 0.1 and 1.0 cannot directly encode zero, so real computer formats need a special zero representation.'},
      {kind:'callout',tone:'activity',title:'Activity 13I',text:'Reason about extreme values for a 10-bit mantissa/6-bit exponent, a 32-bit split, overflow from 1.21×10^100 when max is 10^99, division by zero risk, and approximate storage of 2.88 / −5.38.'},
      {kind:'callout',tone:'extension',title:'Extension Activity 13F',text:'Research how real computer floating-point systems encode zero.'},
    ],visual:'precision',accent:'rose',
  },
  checkpoint('h13-cp-approx-final','13.3 Floating-point numbers','Past papers: approximation and representational consequences',['13.3-lo-04'],[22],'rose'),

  {
    id:'h13-hodder-review-1',section:'Chapter review',eyebrow:'HODDER END-OF-CHAPTER QUESTIONS',title:'Review floating-point format, normalisation, accuracy and range',
    lead:'The source finishes with exam-style material. CamPath preserves the coverage while using current 2021–2025 questions in the live checkpoints above.',sourcePages:[22,23],sourceElements:['Chapter 13 end-of-chapter questions: floating point'],
    richBlocks:[
      {kind:'bullets',items:['Interpret three 24-bit floating patterns.','Identify the non-normalised value and explain why normalisation is used.','Discuss accuracy/range and the zero problem.','Convert 12+6 binary floating values to denary and denary values to binary.','Encode +3.5 and −3.5 in an 8+8 two’s-complement format.']},
    ],visual:'recap',accent:'indigo',
  },
  {
    id:'h13-hodder-review-2',section:'Chapter review',eyebrow:'HODDER END-OF-CHAPTER QUESTIONS',title:'Review user-defined types and file organisation',
    lead:'The remaining source questions connect type recognition/declaration to practical organisation/access choices.',sourcePages:[23,24],sourceElements:['Chapter 13 end-of-chapter questions: user-defined types','Chapter 13 end-of-chapter questions: file organisation'],
    richBlocks:[
      {kind:'bullets',items:['Identify enumerated, composite, non-composite and user-defined types from declarations.','Declare a record variable and assign field values.','Connect random/sequential/serial organisation to appropriate sequential/direct access methods.','Choose three different organisation methods for transaction, statement-generation and login files and justify each choice.']},
      {kind:'callout',tone:'info',title:'Source chronology',text:'Some printed Hodder review items cite older 9608 papers. They remain part of the coursebook review map; CamPath’s granular checkpoints use the approved 2021–2025 9618 corpus instead.'},
    ],visual:'recap',accent:'indigo',
  },
];

export const HODDER_CHAPTER_13: HodderLessonChapter = {
  number:13,
  level:'A Level',
  title:'Data representation',
  subtitle:'Complete Hodder Chapter 13 route with exact-LO Cambridge checkpoints after each logical part.',
  subtopics:['13.1 User-defined data types','13.2 File organisation and access','13.3 Floating-point numbers'],
  sourceNote:'Uploaded Hodder Education Chapter 13 extract, 24 pages. Content is pedagogically reformatted rather than reproduced as page images.',
  coverage:'24/24 source pages · objectives · three prior-knowledge sets · key terms · Examples 13.1–13.9 · Activities 13A–13I · Extension Activities 13A–13F · Figures 13.1–13.16 · Tables 13.1–13.2 · end-of-chapter review',
  slides,
};
