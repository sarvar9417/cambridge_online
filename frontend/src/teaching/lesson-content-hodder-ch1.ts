import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';
import { checkpoint, noDirectCheckpoint } from './lesson-content-hodder-types';

const slides: HodderLessonSlide[] = [
  {
    id:'h1-overview',section:'Chapter overview',eyebrow:'HODDER CHAPTER 01 · SOURCE-FAITHFUL',title:'Information representation and multimedia',
    lead:'A classroom reconstruction of the uploaded 26-page Hodder chapter. The lesson preserves the chapter route, teaching examples, activities, tables, figures and review tasks while presenting them in a board-readable format.',
    sourcePages:[1],sourceElements:['Chapter 1 learning objectives'],
    richBlocks:[
      {kind:'bullets',items:['Binary magnitudes; binary and decimal prefixes.','Binary, denary and hexadecimal systems; conversion and binary arithmetic.','Hexadecimal, BCD, ASCII and Unicode applications.','Bitmap encoding, file-size estimation, image resolution and colour depth.','Vector graphics; digitised sound; sampling rate and resolution.','Lossy/lossless compression and compression of text, image, vector, sound and video.']},
      {kind:'callout',tone:'info',title:'Teaching route',text:'Every conceptual part is followed by an exact historical-LO Cambridge checkpoint. If the 2021–2025 corpus has no exact approved question, the lesson says so rather than substituting a loosely related question.'},
    ],visual:'binary',accent:'indigo',
  },
  {
    id:'h1-prior',section:'Chapter overview',eyebrow:'WHAT YOU SHOULD ALREADY KNOW',title:'Retrieve the foundations before starting',
    lead:'Hodder opens with a diagnostic on column weights and arithmetic in binary and hexadecimal.',sourcePages:[1],sourceElements:['Chapter 1 What you should already know'],
    richBlocks:[
      {kind:'steps',title:'Four diagnostic groups',items:['State binary column weightings.','Complete six binary additions and convert the results to denary.','State hexadecimal column weightings.','Complete ten hexadecimal additions and convert the results to denary.']},
      {kind:'callout',tone:'activity',title:'Board diagnostic',text:'Use one binary addition and one hexadecimal addition from the source page before revealing the chapter route.'},
    ],visual:'bases',accent:'cyan',
  },
  {
    id:'h1-111-number-systems',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'1.1.1 · NUMBER SYSTEMS',title:'A digit has meaning because of its base and column weight',
    lead:'Denary is positional base 10; binary is positional base 2. Hodder connects binary directly to reliable two-state electronic switching.',sourcePages:[2],sourceElements:['1.1 Key terms','1.1.1 Number systems'],
    keyTerms:[
      {term:'Binary',definition:'Base-two representation using only 0 and 1.'},{term:'Bit',definition:'One binary digit.'},{term:'Hexadecimal',definition:'Base 16 using 0–9 and A–F.'},{term:'Memory dump',definition:'A readable output of memory contents, commonly shown in hexadecimal.'},
      {term:'BCD',definition:'Four binary bits used for each denary digit.'},{term:'Character set',definition:'An agreed mapping between characters and numeric codes.'},
    ],
    richBlocks:[
      {kind:'table',table:{caption:'Positional model',headers:['System','Base','Example weights'],rows:[['Denary','10','10000, 1000, 100, 10, 1'],['Binary','2','128, 64, 32, 16, 8, 4, 2, 1']]}},
      {kind:'paragraph',text:'Computer circuits contain huge numbers of devices that can be treated as ON/OFF states. Mapping these to 1/0 gives a simple and robust physical model for stored and processed data.'},
    ],visual:'bases',accent:'indigo',
  },
  checkpoint('h1-cp-number-purpose','1.1 Data representation','Past papers: number systems and why different bases are useful',['1.1-lo-03'],[2],'indigo'),
  {
    id:'h1-112-convert',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'1.1.2 · BINARY NUMBER SYSTEM',title:'Convert binary and denary in both directions',
    lead:'Hodder teaches two denary-to-binary routes: choosing weighted columns and repeated division by 2.',sourcePages:[2,3],sourceElements:['1.1.2 Binary number system','Activity 1A','Activity 1B'],
    richBlocks:[
      {kind:'steps',title:'Binary → denary',items:['Write the power-of-two column weights.','Add the weights where the bit is 1.','Ignore columns containing 0.']},
      {kind:'steps',title:'Denary → binary: method 1',items:['Choose the largest power of 2 not exceeding the value.','Subtract it and continue with smaller powers.','Place 1 in used columns and 0 elsewhere.']},
      {kind:'steps',title:'Denary → binary: method 2',items:['Divide by 2 repeatedly.','Record every remainder.','Read the remainders from bottom to top.']},
      {kind:'callout',tone:'activity',title:'Activities 1A and 1B',text:'The source supplies ten binary-to-denary values and ten denary-to-binary values so learners practise both directions before signed arithmetic.'},
    ],example:{title:'Hodder model value',lines:['11101110₂','128 + 64 + 32 + 8 + 4 + 2'],answer:'238₁₀'},visual:'binary',accent:'cyan',
  },
  checkpoint('h1-cp-base-convert','1.1 Data representation','Past papers: convert between binary, denary and hexadecimal',['1.1-lo-01'],[2,3],'cyan'),
  {
    id:'h1-112-signed',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'1.1.2 · SIGNED INTEGERS',title:'Compare sign-and-magnitude, one’s complement and two’s complement',
    lead:'The chapter introduces three signed representations, then uses two’s complement for the remaining arithmetic examples.',sourcePages:[3,4],sourceElements:['Signed binary representations','Activity 1C','Extension Activity 1A'],
    keyTerms:[
      {term:'Sign and magnitude',definition:'The left-most bit carries the sign and the remaining bits carry magnitude.'},
      {term:'One’s complement',definition:'Invert every bit to form the negative representation.'},
      {term:'Two’s complement',definition:'Invert every bit and add 1; this supports straightforward addition/subtraction.'},
    ],
    formula:'8-bit two’s-complement weights: −128, 64, 32, 16, 8, 4, 2, 1',
    richBlocks:[
      {kind:'steps',title:'Make a negative value in two’s complement',items:['Write the positive fixed-width binary value.','Invert every bit.','Add 1 in the least-significant position.']},
      {kind:'callout',tone:'activity',title:'Activity 1C',text:'Convert +114, +61, +96, −14 and −116 to 8-bit values, using two’s complement where needed.'},
      {kind:'callout',tone:'extension',title:'Extension Activity 1A',text:'Extend the signed column-heading pattern to a 16-bit representation.'},
    ],visual:'arithmetic',accent:'rose',
  },
  {
    id:'h1-112-arithmetic',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'1.1.2 · BINARY ARITHMETIC',title:'Addition, subtraction and overflow are one connected story',
    lead:'Hodder uses worked examples to show correct addition, an out-of-range result, and subtraction by adding a two’s-complement negative.',sourcePages:[4,5,6],sourceElements:['Example 1.1','Example 1.2','Example 1.3','Example 1.4','Activity 1D'],
    richBlocks:[
      {kind:'table',table:{caption:'Worked examples',headers:['Example','Operation','Teaching point'],rows:[['1.1','37 + 58','01011111₂ = 95'],['1.2','82 + 69','Result exceeds +127 in 8-bit signed representation → overflow'],['1.3','95 − 68','Convert 68 to −68 with two’s complement, then add → 27'],['1.4','49 − 80','Add −80 to 49 → −31']]}},
      {kind:'callout',tone:'activity',title:'Activity 1D',text:'Ten 8-bit additions/subtractions consolidate carry, signed interpretation and two’s-complement subtraction.'},
      {kind:'callout',tone:'warning',title:'Overflow',text:'A mathematically valid result can be impossible to represent in the allocated word size. For 8-bit two’s complement, +127 is the largest positive value.'},
    ],visual:'arithmetic',accent:'rose',
  },
  checkpoint('h1-cp-arithmetic','1.1 Data representation','Past papers: binary addition, subtraction and signed arithmetic',['1.1-lo-02'],[3,4,5,6],'rose'),
  {
    id:'h1-memory-units',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'MEMORY SIZE · DECIMAL VS BINARY PREFIXES',title:'kB is not KiB: distinguish SI and IEC quantities',
    lead:'The chapter separates decimal storage prefixes from binary IEC prefixes and links the distinction to actual computer memory capacities.',sourcePages:[6,7],sourceElements:['Table 1.1','Table 1.2','Measurement of computer memory sizes'],
    richBlocks:[
      {kind:'table',table:{caption:'SI decimal prefixes',headers:['Unit','Bytes'],rows:[['1 kB','1,000'],['1 MB','1,000,000'],['1 GB','1,000,000,000'],['1 TB','10¹²'],['1 PB','10¹⁵']]}},
      {kind:'table',table:{caption:'IEC binary prefixes',headers:['Unit','Power','Bytes'],rows:[['1 KiB','2¹⁰','1,024'],['1 MiB','2²⁰','1,048,576'],['1 GiB','2³⁰','1,073,741,824'],['1 TiB','2⁴⁰','1,099,511,627,776'],['1 PiB','2⁵⁰','1,125,899,906,842,624']]}},
    ],visual:'binary',accent:'amber',
  },
  {
    id:'h1-113-hex',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'1.1.3 · HEXADECIMAL',title:'One hexadecimal digit maps exactly to four binary bits',
    lead:'Hodder develops the binary–hex relationship with a complete nibble table and four conversion examples.',sourcePages:[7,8,9],sourceElements:['1.1.3 Hexadecimal number system','Table 1.3','Example 1.5','Example 1.6','Example 1.7','Example 1.8','Activity 1E','Activity 1F'],
    richBlocks:[
      {kind:'table',table:{caption:'Hex digits',headers:['Hex','Denary','Binary'],rows:[['0','0','0000'],['1','1','0001'],['2','2','0010'],['3','3','0011'],['4','4','0100'],['5','5','0101'],['6','6','0110'],['7','7','0111'],['8','8','1000'],['9','9','1001'],['A','10','1010'],['B','11','1011'],['C','12','1100'],['D','13','1101'],['E','14','1110'],['F','15','1111']]}},
      {kind:'steps',title:'Binary → hex',items:['Group from the right in blocks of four bits.','Pad the left-most group with leading zeroes if needed.','Replace each group with one hex digit.']},
      {kind:'steps',title:'Hex → binary',items:['Replace each hex digit with its 4-bit pattern.','Join the groups without changing their order.']},
      {kind:'callout',tone:'activity',title:'Activities 1E / 1F',text:'Practise binary→hex and hex→binary across short and long values.'},
    ],example:{title:'Examples 1.5–1.8',lines:['1011 1110 0001 → B E 1','0010 0001 1111 1101 → 2 1 F D','45A → 0100 0101 1010','BF08 → 1011 1111 0000 1000']},visual:'bases',accent:'indigo',
  },
  {
    id:'h1-hex-uses',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'HEXADECIMAL IN PRACTICE',title:'Hexadecimal shortens long machine-oriented bit patterns',
    lead:'The coursebook demonstrates memory dumps as a fault-tracing use: the left column identifies an address and the data is displayed compactly in hex.',sourcePages:[9,10],sourceElements:['Use of hexadecimal system','Memory dumps','Table 1.4'],
    richBlocks:[
      {kind:'bullets',items:['A long binary string is shorter and easier to inspect as hexadecimal.','Memory dumps show memory locations and stored bytes in hexadecimal.','Developers can use these addresses and values while tracing low-level faults.','Interpreting a dump requires knowledge of how the machine represents instructions and data.']},
      {kind:'code',title:'Memory-dump pattern',lines:['00990F60  54 68 69 73 20 69 73 20 ...','00990F77  61 20 6D 65 6D 6F 72 79 ...','address   hexadecimal byte values']},
    ],visual:'bases',accent:'cyan',
  },
  checkpoint('h1-cp-hex','1.1 Data representation','Past papers: hexadecimal conversion, purpose and applications',['1.1-lo-01','1.1-lo-03'],[7,8,9,10],'indigo'),
  {
    id:'h1-114-bcd',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'1.1.4 · BINARY-CODED DECIMAL',title:'BCD stores every denary digit as a separate 4-bit value',
    lead:'BCD is digit-oriented: 3165 becomes four independent digit codes rather than one ordinary binary integer.',sourcePages:[10],sourceElements:['1.1.4 Binary-coded decimal system','Activity 1G'],
    richBlocks:[
      {kind:'table',table:{caption:'Valid BCD digit codes',headers:['Digit','BCD'],rows:[['0','0000'],['1','0001'],['2','0010'],['3','0011'],['4','0100'],['5','0101'],['6','0110'],['7','0111'],['8','1000'],['9','1001']]}},
      {kind:'code',title:'3165 in BCD',lines:['3 → 0011','1 → 0001','6 → 0110','5 → 0101','0011 0001 0110 0101']},
      {kind:'callout',tone:'activity',title:'Activity 1G',text:'Convert denary values to BCD and BCD bit groups back to denary; note that 1010–1111 are not valid single BCD digits.'},
    ],visual:'bases',accent:'amber',
  },
  {
    id:'h1-bcd-uses',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'BCD USES AND ARITHMETIC',title:'Decimal displays and exact monetary digits motivate BCD',
    lead:'Hodder connects BCD to calculators/clocks and to fixed-point monetary values, then shows why invalid digit results need decimal correction.',sourcePages:[11,12],sourceElements:['Uses of BCD','Activity 1H','BCD addition worked example'],
    richBlocks:[
      {kind:'bullets',items:['A calculator or clock can map each displayed decimal digit directly to its BCD code.','For money, storing exact decimal digits avoids some binary representation issues.','If a 4-bit BCD digit sum is greater than 9, the code is invalid as a single decimal digit.','Adding 0110 corrects that digit and produces the appropriate carry.']},
      {kind:'steps',title:'Hodder $0.37 + $0.94 model',items:['Add the hundredths digit codes 7 and 4.','1011 is not a valid BCD digit, so add 0110 and carry 1.','Add the tenths codes 3 and 9 plus the carry.','Again correct the invalid BCD result by adding 0110.','The final stored fixed-point digits represent 1.31.']},
      {kind:'callout',tone:'activity',title:'Activity 1H',text:'Carry out BCD additions 0.45+0.21, 0.66+0.51 and 0.88+0.75.'},
    ],visual:'arithmetic',accent:'amber',
  },
  checkpoint('h1-cp-bcd','1.1 Data representation','Past papers: BCD and practical number-base use',['1.1-lo-03','1.1-lo-01'],[10,11,12],'amber'),
  {
    id:'h1-115-ascii',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'1.1.5 · ASCII',title:'ASCII gives characters ordered numeric codes',
    lead:'Standard ASCII uses 7-bit codes; printable ranges and control codes make text processing predictable.',sourcePages:[12,13],sourceElements:['1.1.5 ASCII codes and Unicodes','Table 1.5'],
    richBlocks:[
      {kind:'bullets',items:['Standard ASCII covers codes 0–127; codes 0–31 are control codes.','Uppercase letters, lowercase letters and digits occupy ordered ranges.','The ordered ranges make comparisons and case/range checks easier.','Extended ASCII uses codes 128–255, but it is not a universal solution for world writing systems.']},
      {kind:'table',table:{caption:'Selected standard ASCII examples',headers:['Character','Denary','Hex'],rows:[['SPACE','32','20'],['0','48','30'],['A','65','41'],['Z','90','5A'],['a','97','61'],['z','122','7A'],['DELETE','127','7F']]}},
    ],visual:'characters',accent:'emerald',
  },
  checkpoint('h1-cp-character-purpose','1.1 Data representation','Past papers: why character sets are required',['1.1-lo-04'],[12,13],'emerald'),
  {
    id:'h1-115-unicode',section:'1.1 Data representation',subtopicCode:'1.1',eyebrow:'1.1.5 · UNICODE',title:'Unicode extends character representation to global writing systems and symbols',
    lead:'The chapter contrasts ASCII’s limited repertoire with Unicode and shows examples from multiple scripts.',sourcePages:[14,15],sourceElements:['Table 1.6','Table 1.7','Unicode discussion'],
    richBlocks:[
      {kind:'bullets',items:['The first 128 Unicode characters overlap with standard ASCII.','Unicode is designed to cover languages and writing systems far beyond English.','The coursebook describes uniform, unambiguous coding and reserved private-use space as design goals.','Unicode storage can require more bytes per character than ASCII depending on the encoding used.']},
      {kind:'callout',tone:'info',title:'Tables 1.6 and 1.7',text:'The presentation preserves the purpose of the extended-ASCII and Unicode tables: learners compare limited 8-bit extensions with a much larger multilingual character repertoire.'},
    ],visual:'characters',accent:'emerald',
  },
  checkpoint('h1-cp-character-rep','1.1 Data representation','Past papers: ASCII, extended ASCII and Unicode representation',['1.1-lo-05'],[14,15],'emerald'),
  {
    id:'h1-121-bitmap-basics',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'1.2.1 · BIT-MAP IMAGES',title:'A bitmap is a 2D matrix of encoded pixels',
    lead:'The image data and its metadata together tell software what colour each pixel has and how the whole raster should be interpreted.',sourcePages:[15,16],sourceElements:['1.2 Key terms','1.2.1 Bit-map images'],
    keyTerms:[{term:'Pixel',definition:'Smallest picture element.'},{term:'Colour depth',definition:'Bits used to represent the colour of one pixel.'},{term:'Image resolution',definition:'Number of pixels making up an image.'},{term:'Screen resolution',definition:'Horizontal × vertical display pixels.'},{term:'Pixel density',definition:'Number of pixels per physical area.'}],
    richBlocks:[{kind:'bullets',items:['8 bits per pixel can encode 256 values.','24-bit true colour commonly uses three bytes per pixel for red, green and blue components.','Increasing bit/colour depth increases the possible colours and increases raw file size.','Image resolution and screen resolution are different quantities; software may crop or rescale an image to fit a display.']}],visual:'pixels',accent:'cyan',
  },
  {
    id:'h1-bitmap-resolution',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'BITMAP QUALITY · FIGURES 1.1–1.3',title:'Resolution, scaling and pixel density change what the learner sees',
    lead:'Hodder uses a camera photo, a cropped/rotated version and a scaled wheel sequence to make the quality trade-off visual.',sourcePages:[16,17],sourceElements:['Figure 1.1','Figure 1.2','Figure 1.3','Extension Activity 1B'],
    richBlocks:[
      {kind:'comparison',leftTitle:'High resolution / density',rightTitle:'Lower resolution / density',rows:[['More pixels describe detail','Fewer pixels describe detail'],['Larger raw file','Smaller raw file'],['More freedom to crop/zoom','Pixelation appears sooner when enlarged'],['Longer transfer/storage cost','Lower transfer/storage cost']]},
      {kind:'steps',title:'Pixel-density example',items:['Square the horizontal and vertical resolution values.','Add the squares.','Take the square root (screen diagonal in pixels).','Divide by physical diagonal size in inches to obtain pixels per inch.']},
      {kind:'callout',tone:'extension',title:'Extension Activity 1B',text:'Investigate how HTML/CSS controls displayed colour and how screen layout uses pixel-based design decisions.'},
    ],visual:'pixels',accent:'cyan',
  },
  {
    id:'h1-bitmap-size',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'BITMAP FILE SIZE',title:'Estimate raw bitmap storage from resolution and bit depth',
    lead:'The chapter calculates the data required by a full-screen image and reminds learners that a real file also contains a header.',sourcePages:[17,18],sourceElements:['Calculating bit-map image file sizes','Extension Activity 1C','Bitmap file header'],
    formula:'raw bits = width × height × bits per pixel',example:{title:'1920 × 1080 at 24-bit',lines:['1920 × 1080 × 24 = 49,766,400 bits','÷ 8 = 6,220,800 bytes'],answer:'Convert to the requested SI or IEC unit only after calculating bytes.'},
    richBlocks:[{kind:'bullets',items:['A bitmap header can store file type, file size, image dimensions/resolution, bit depth and compression information.','Cropping, reducing resolution or reducing colour depth reduces data volume but may reduce quality.']},{kind:'callout',tone:'extension',title:'Extension Activity 1C',text:'Calculate the storage needed for a UHD television screen image.'}],visual:'pixels',accent:'amber',
  },
  checkpoint('h1-cp-bitmap','1.2 Multimedia','Past papers: bitmap encoding and storage',['1.2-lo-01'],[15,16,17,18],'cyan'),
  {
    id:'h1-122-vector',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'1.2.2 · VECTOR GRAPHICS',title:'Vectors store objects, attributes and relative geometry instead of individual pixels',
    lead:'The drawing list describes shapes and their properties, so the image can be scaled without the pixelation of a raster.',sourcePages:[18],sourceElements:['1.2.2 Vector graphics','Figure 1.4'],
    richBlocks:[{kind:'bullets',items:['A drawing list records commands for objects.','Attributes describe line style, colour, fill, centres/radii and other geometry.','Relative positions between objects are stored.','Scaling recalculates geometry, so quality is preserved.','Many printers ultimately rasterise vector graphics before printing.']},{kind:'callout',tone:'info',title:'Figure 1.4',text:'The robot illustration demonstrates a picture built from a small collection of geometric objects rather than a dense pixel matrix.'}],visual:'vectors',accent:'emerald',
  },
  checkpoint('h1-cp-vector','1.2 Multimedia','Past papers: vector representation and storage',['1.2-lo-02'],[18],'emerald'),
  {
    id:'h1-bitmap-vector-choice',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'TABLE 1.8 · CHOOSING THE FORMAT',title:'Choose bitmap or vector according to the task',
    lead:'Hodder compares realism, editability, scaling, file size and typical formats, then asks learners to justify the better representation for a scenario.',sourcePages:[18,19],sourceElements:['Table 1.8','Bitmap/vector task-choice discussion'],
    richBlocks:[{kind:'table',table:{caption:'Vector vs bitmap',headers:['Decision factor','Vector','Bitmap'],rows:[['Structure','Geometric objects + attributes','Pixels'],['Scaling','No raster pixelation','Can become pixelated'],['Realism','Usually less photo-realistic','Well suited to photographs'],['Editing','Edit objects','Edit pixels'],['Typical files','.svg / .cgm / .odg','.jpeg / .bmp / .png']]}},{kind:'bullets',items:['Logo or scale drawing → vector is often the stronger choice.','Photograph editing → bitmap is usually the stronger choice.','Restrictions on destination file formats can override an otherwise ideal representation.']}],visual:'vectors',accent:'emerald',
  },
  checkpoint('h1-cp-format-choice','1.2 Multimedia','Past papers: choose bitmap or vector for a task',['1.2-lo-03'],[18,19],'emerald'),
  {
    id:'h1-123-sound-wave',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'1.2.3 · SOUND FILES',title:'An analogue sound wave must be sampled before a computer can store it',
    lead:'Hodder starts with frequency, wavelength and amplitude, then shows an analogue-to-digital converter sampling amplitude at fixed time intervals.',sourcePages:[19],sourceElements:['1.2.3 Sound files','Figure 1.5','Figure 1.6'],
    richBlocks:[{kind:'bullets',items:['Frequency relates to how rapidly the wave repeats; amplitude relates to loudness.','Sound is analogue and must be digitised for computer storage.','An ADC measures the wave at regular time intervals.','Each measured amplitude is approximated to one of the available numeric levels and encoded in binary.','Filtering may remove frequencies outside the useful human-hearing range before storage.']},{kind:'callout',tone:'info',title:'Figures 1.5 and 1.6',text:'The first visual contrasts high- and low-frequency waves; the second overlays sampled amplitude values on a time axis to make digitisation concrete.'}],visual:'sound',accent:'cyan',
  },
  checkpoint('h1-cp-sound-digitise','1.2 Multimedia','Past papers: analogue sound digitisation',['1.2-lo-04'],[19],'cyan'),
  {
    id:'h1-sampling-quality',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'SAMPLING RATE & RESOLUTION',title:'More samples and more amplitude bits improve fidelity but increase data volume',
    lead:'Sampling rate controls how often the wave is measured; sampling resolution/bit depth controls how many amplitude levels are available.',sourcePages:[20],sourceElements:['Table 1.9','Sampling-rate discussion','Sampling-resolution discussion'],
    richBlocks:[{kind:'comparison',leftTitle:'Increase sampling quality',rightTitle:'Cost',rows:[['More accurate wave shape','Larger file'],['Larger dynamic range / less distortion','Longer transfer/download'],['Better recorded sound','More processing/storage required']]},{kind:'steps',title:'Digitising a clip',items:['Measure amplitude at fixed time intervals.','Approximate each amplitude to an available level.','Encode the sequence of values as binary.']}],visual:'sound',accent:'cyan',
  },
  checkpoint('h1-cp-sampling','1.2 Multimedia','Past papers: sampling rate and sampling resolution',['1.2-lo-05'],[20],'cyan'),
  {
    id:'h1-sound-editing',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'SOUND EDITING',title:'Captured samples can then be edited and transformed',
    lead:'The chapter lists common editing operations after digitisation.',sourcePages:[20],sourceElements:['Sound editing feature list'],
    richBlocks:[{kind:'bullets',items:['Trim start/stop times or duration.','Extract, save or delete part of a sample.','Alter frequency and amplitude.','Fade in / fade out.','Mix or merge tracks and combine multiple sources.','Reduce noise or isolate a wanted signal.','Convert between audio file formats.']}],visual:'sound',accent:'emerald',
  },
  {
    id:'h1-124-video',section:'1.2 Multimedia',subtopicCode:'1.2',eyebrow:'1.2.4 · VIDEO · HODDER EXTENSION',title:'Video is stored as a timed sequence of captured frames',
    lead:'Hodder explicitly marks video as included for completeness beyond the syllabus. The section connects camera sensors, compressed frames and frame rate.',sourcePages:[20,21],sourceElements:['1.2.4 Video'],
    richBlocks:[{kind:'bullets',items:['Digital cameras/phones can form moving images from sequences of still frames.','Light-sensitive sensors convert the captured image to electronic data.','The digital-video data is stored in a compressed format.','Frame rate is the number of frames recorded per second.','Motion JPEG is described as one frame-based approach in the coursebook.']}],visual:'pixels',accent:'rose',
  },
  noDirectCheckpoint('h1-cp-video','1.2 Multimedia','Past papers: video extension','Hodder labels this video material as beyond the 9618 syllabus. There is no exact historical 2021–2025 learning objective to query, so CamPath intentionally does not substitute unrelated multimedia questions.',[20,21]),
  {
    id:'h1-13-need',section:'1.3 File compression',subtopicCode:'1.3',eyebrow:'1.3 · FILE COMPRESSION',title:'Compression trades representation size against recoverability or quality',
    lead:'The chapter starts from two practical pressures: save storage space and reduce transmission/streaming time.',sourcePages:[21],sourceElements:['1.3 Key terms','Need for compression'],
    keyTerms:[{term:'Lossless',definition:'Original data can be reconstructed after decompression.'},{term:'Lossy',definition:'Some original detail is discarded and cannot be perfectly reconstructed.'},{term:'Bit rate',definition:'Bits transmitted or encoded per second.'},{term:'RLE',definition:'A lossless run-count representation for repeated adjacent data.'}],
    richBlocks:[{kind:'comparison',leftTitle:'Lossless',rightTitle:'Lossy',rows:[['Preserves all original information','Discards selected information'],['Used when any loss is unacceptable','Used when perceptual loss is acceptable'],['Typically less aggressive reduction','Often achieves greater reduction']]}],visual:'compression',accent:'rose',
  },
  checkpoint('h1-cp-compression-need','1.3 File compression','Past papers: why compression is needed',['1.3-lo-01'],[21],'rose'),
  {
    id:'h1-131-mp3-jpeg',section:'1.3 File compression',subtopicCode:'1.3',eyebrow:'1.3.1 · COMPRESSION APPLICATIONS',title:'MP3/MP4 and JPEG remove information people are unlikely to notice',
    lead:'Hodder uses audio perceptual shaping and JPEG as examples of lossy compression, and notes that SVG text descriptions can also be compressed.',sourcePages:[21,22],sourceElements:['1.3.1 File compression applications','MP3/MP4 discussion','JPEG discussion','Vector compression discussion','Extension Activity 1D'],
    richBlocks:[{kind:'bullets',items:['MP3 can make audio files dramatically smaller by perceptual music shaping.','Sounds outside normal hearing and quieter simultaneous sounds may be removed.','Higher audio bit rate generally preserves more quality but increases file size.','MP4 is a multimedia container/format used for combinations such as video, audio, photographs and animation.','JPEG is a lossy format for photographic bitmap images.','SVG is text/XML based, so its description can also benefit from general compression.']},{kind:'callout',tone:'extension',title:'Extension Activity 1D',text:'Research how photograph compression reduces file size without an obvious quality loss, then compare the principle with RLE.'}],visual:'compression',accent:'rose',
  },
  checkpoint('h1-cp-lossy-lossless','1.3 File compression','Past papers: distinguish lossy and lossless compression',['1.3-lo-02'],[21,22],'rose'),
  checkpoint('h1-cp-compression-choice','1.3 File compression','Past papers: recommend a compression type and justify the choice',['1.3-lo-03'],[21,22],'amber'),
  {
    id:'h1-rle-text',section:'1.3 File compression',subtopicCode:'1.3',eyebrow:'RUN-LENGTH ENCODING · TEXT',title:'RLE stores a run as count + value',
    lead:'The method is effective only when adjacent repeated data are common. Hodder then introduces a flag scheme to avoid expanding data with many short runs.',sourcePages:[22,23],sourceElements:['RLE introduction','RLE text example','RLE flag mechanism'],
    richBlocks:[{kind:'steps',title:'Basic RLE',items:['Find a run of identical adjacent items.','Store the run length.','Store the item/code being repeated.','Repeat for the next run.']},{kind:'code',title:'Text example',lines:['aaaaabbbbccddddd','05 97   04 98   02 99   05 100','16 original bytes → 8 encoded values/bytes in the simplified model']},{kind:'callout',tone:'warning',title:'When runs are short',text:'Alternating text can expand under naive RLE. The source introduces a flag byte so only worthwhile repeated sequences are encoded as runs; ordinary bytes can otherwise be stored directly.'}],visual:'compression',accent:'emerald',
  },
  {
    id:'h1-rle-images',section:'1.3 File compression',subtopicCode:'1.3',eyebrow:'RUN-LENGTH ENCODING · IMAGES',title:'Scan rows of repeated colours and encode each run',
    lead:'Figures 1.7 and 1.8 apply RLE first to a black/white 8×8 image and then to a four-colour RGB image.',sourcePages:[23,24],sourceElements:['Figure 1.7','Figure 1.8','RLE black-and-white image example','RLE colour image example'],
    richBlocks:[{kind:'table',table:{caption:'Source comparison',headers:['Example','Uncompressed simplified size','RLE simplified size'],rows:[['8×8 black/white F','64 bytes','30 values/bytes'],['8×8 RGB image','192 bytes','92 values/bytes']]}},{kind:'paragraph',text:'Real compressed files also need metadata such as headers, so classroom percentage reductions are simplified demonstrations rather than complete file-format specifications.'}],visual:'compression',accent:'emerald',
  },
  checkpoint('h1-cp-rle','1.3 File compression','Past papers: run-length encoding for text, images or sound',['1.3-lo-04'],[22,23,24],'emerald'),
  {
    id:'h1-132-general',section:'1.3 File compression',subtopicCode:'1.3',eyebrow:'1.3.2 · GENERAL FILE-SIZE REDUCTION',title:'Some files can be made smaller by reducing the amount of source data',
    lead:'Figure 1.9 distinguishes general reductions from a named compression codec.',sourcePages:[24],sourceElements:['1.3.2 General methods of compressing files','Figure 1.9'],
    richBlocks:[{kind:'table',table:{caption:'General reduction strategies',headers:['Media','Possible reductions'],rows:[['Movie/sound','Lower sampling rate; lower sampling resolution; lower frame rate'],['Image','Crop; lower colour/bit depth; lower image resolution']]}},{kind:'callout',tone:'warning',title:'Quality consequence',text:'These choices reduce the information captured or retained. The smaller file is obtained by changing source quality/quantity, not by magically storing the identical raw data in fewer bits.'}],visual:'compression',accent:'amber',
  },
  {
    id:'h1-activity-1i',section:'Chapter review',eyebrow:'ACTIVITY 1I',title:'Use the chapter concepts together',lead:'The final Hodder activity asks learners to explain compression, digitised sound, RLE and bitmap/vector choices before the exam-style review.',sourcePages:[25],sourceElements:['Activity 1I'],
    richBlocks:[{kind:'bullets',items:['Define lossy and lossless compression and give examples.','Describe microphone sound digitisation and why music is compressed while keeping acceptable quality.','Explain RLE with an example.','Compare bitmap and vector images and justify a representation for realistic software images.']}],visual:'recap',accent:'indigo',
  },
  {
    id:'h1-hodder-review',section:'Chapter review',eyebrow:'HODDER END-OF-CHAPTER QUESTIONS',title:'The source closes with mixed exam-style retrieval and calculation',
    lead:'These source questions remain visible as a chapter-review map; current 2021–2025 questions are supplied separately by the live checkpoints throughout the lesson.',sourcePages:[25,26],sourceElements:['Chapter 1 end-of-chapter questions'],
    richBlocks:[{kind:'bullets',items:['Two’s-complement interpretation, creation, range and overflow.','BCD representation, arithmetic and applications.','Sampling resolution, bitmap resolution/file size, header metadata and sound-editing features.','Sampling + compression choice + RLE on an image.','Binary arithmetic, hexadecimal definition/use/conversion and base conversions.']},{kind:'callout',tone:'info',title:'Why this is not the live checkpoint',text:'The Hodder review includes older exam-style material. CamPath keeps it as coursebook coverage, while lesson checkpoints query only approved 2021–2025 corpus questions mapped to the part just taught.'}],visual:'recap',accent:'indigo',
  },
];

export const HODDER_CHAPTER_1: HodderLessonChapter = {
  number:1,level:'AS Level',title:'Information representation and multimedia',
  subtitle:'Complete Hodder Chapter 1 teaching route with granular Cambridge checkpoints.',
  subtopics:['1.1 Data representation','1.2 Multimedia','1.3 File compression'],
  sourceNote:'Uploaded Hodder Education Chapter 1 extract, 26 pages. Content is pedagogically reformatted rather than reproduced as page images.',
  coverage:'26/26 source pages · objectives · prior knowledge · key terms · Examples 1.1–1.8 · Activities 1A–1I · Extension Activities 1A–1D · Tables 1.1–1.9 · Figures 1.1–1.9 · end-of-chapter review',
  slides,
};
