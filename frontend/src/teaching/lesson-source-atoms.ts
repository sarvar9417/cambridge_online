export type LessonSourceAtom = {
  id: string;
  chapter: 1 | 13;
  page: number;
  kind: 'prior' | 'concept' | 'example' | 'activity' | 'extension' | 'table' | 'figure' | 'review';
  sourceRef: string;
  targetSlideId: string;
  needles: string[];
};

const atom = (
  id: string,
  chapter: 1 | 13,
  page: number,
  kind: LessonSourceAtom['kind'],
  sourceRef: string,
  targetSlideId: string,
  needles: string[],
): LessonSourceAtom => ({ id, chapter, page, kind, sourceRef, targetSlideId, needles });

export const CHAPTER_1_SOURCE_ATOMS: LessonSourceAtom[] = [
  atom('ch1-p1-prior-binary',1,1,'prior','What you should already know · Q2','h1-prior',[
    '00110101 + 01001000','01001101 + 01101110','01011111 + 00011110','01000111 + 01101111','10000001 + 01110111','10101010 + 10101010',
  ]),
  atom('ch1-p1-prior-hex',1,1,'prior','What you should already know · Q4','h1-prior',[
    '107 + 257','208 + A17','AAA + 777','1FF + 7F7','149 + F0F','1251 + 2567','34AB + C00A','A001 + D77F','1009 + 9FF1','2777 + ACF1',
  ]),
  atom('ch1-p3-activity-1a',1,3,'activity','Activity 1A','h1-112-convert',[
    '00110011','01111111','10011001','01110100','11111111','00001111','10001111','01110000','11101110',
  ]),
  atom('ch1-p3-activity-1b',1,3,'activity','Activity 1B','h1-112-convert',['41','67','86','100','111','127','144','189','200','255']),
  atom('ch1-p4-activity-1c',1,4,'activity','Activity 1C','h1-112-signed',['+114','+61','+96','−14','−116']),
  atom('ch1-p4-extension-1a',1,4,'extension','Extension Activity 1A','h1-112-signed',['16-bit','column headings']),
  atom('ch1-p4-example-1-1',1,4,'example','Example 1.1','h1-112-arithmetic',['37 + 58','00100101','00111010','01011111','95']),
  atom('ch1-p5-example-1-2',1,5,'example','Example 1.2','h1-112-arithmetic',['82 + 69','01010010','01000101','10010111','151','+127','overflow']),
  atom('ch1-p5-example-1-3',1,5,'example','Example 1.3','h1-112-arithmetic',['95 − 68','10111100','00011011','27']),
  atom('ch1-p6-example-1-4',1,6,'example','Example 1.4','h1-112-arithmetic',['49 − 80','10110000','11100001','−31']),
  atom('ch1-p6-activity-1d',1,6,'activity','Activity 1D','h1-112-arithmetic',[
    '00111001 + 00101001','01001011 + 00100011','01011000 + 00101000','01110011 + 00111110','00001111 + 00011100',
    '01100011 − 00110000','01111111 − 01011010','00110100 − 01000100','00000011 − 01100100','11011111 − 11000011',
  ]),
  atom('ch1-p7-prefix-detail',1,7,'table','Tables 1.1–1.2','h1-memory-units',['1 PB','10¹⁵','1 PiB','2⁵⁰','64 GiB','68,719,476,736']),
  atom('ch1-p8-example-1-5-1-6',1,8,'example','Examples 1.5–1.6','h1-113-hex',['101111100001','BE1','10000111111101','21FD']),
  atom('ch1-p9-example-1-7-1-8',1,9,'example','Examples 1.7–1.8','h1-113-hex',['45A','010001011010','BF08','1011111100001000']),
  atom('ch1-p9-activity-1e',1,9,'activity','Activity 1E','h1-113-hex',[
    '11000011','11110111','1001111111','10011101110','000111100001','100010011110','0010011111110','0111010011100','1111111101111101','00110011110101110',
  ]),
  atom('ch1-p10-activity-1f',1,10,'activity','Activity 1F','h1-113-hex',['6C','59','AA','A00','40E','BA6','9CC','40AA','DA47','1AB0']),
  atom('ch1-p10-memory-dump',1,10,'table','Table 1.4','h1-hex-uses',['00990F60','00990F77','00990E8E','00990EA5','00990EBC','00990ED3','00990EEA']),
  atom('ch1-p10-activity-1g',1,10,'activity','Activity 1G','h1-114-bcd',['271','5006','7990','100100110111','0111011101100010']),
  atom('ch1-p10-bcd-packing',1,10,'concept','BCD storage methods','h1-114-bcd',['0000 0011','0000 0001','0000 0110','0000 0101','0011 0001','0110 0101']),
  atom('ch1-p11-12-bcd-addition',1,11,'example','BCD $0.37 + $0.94','h1-bcd-uses',['$0.37','$0.94','0111','0100','1011','0110','10001','0011','1001','1101','10011','1.31']),
  atom('ch1-p12-activity-1h',1,12,'activity','Activity 1H','h1-bcd-uses',['0.45 + 0.21','0.66 + 0.51','0.88 + 0.75']),
  atom('ch1-p13-ascii-case',1,13,'table','Table 1.5 case relationship','h1-115-ascii',['a = 01100001','A = 01000001','y = 01111001','Y = 01011001','sixth bit']),
  atom('ch1-p14-unicode-goals',1,14,'concept','Unicode consortium goals','h1-115-unicode',['universal standard','all languages','more efficient','16-bit or 32-bit','unambiguous','private use']),
  atom('ch1-p17-ppi',1,17,'example','401 ppi worked example','h1-bitmap-resolution',['1920 × 1080','5.5','2202.907','401 pixels per inch']),
  atom('ch1-p17-bitmap-size',1,17,'example','Bitmap file-size example','h1-bitmap-size',['1920 × 1080 × 24','49,766,400','6,220,800','6.222 MB','5.933 MiB']),
  atom('ch1-p18-header',1,18,'concept','Bitmap file header','h1-bitmap-size',['file type','file size','image resolution','bit depth','compression']),
  atom('ch1-p18-vector-list',1,18,'concept','Vector drawing list','h1-122-vector',['command','attributes','relative position','line thickness','line colour','fill colour']),
  atom('ch1-p19-sound-samples',1,19,'figure','Figures 1.5–1.6','h1-123-sound-wave',['time interval 1','amplitude 9','time interval 2','amplitude 4','1001','0 to 127']),
  atom('ch1-p20-sampling-pros-cons',1,20,'table','Table 1.9','h1-sampling-quality',['larger dynamic range','better sound quality','less sound distortion','larger file size','longer to transmit','greater processing power']),
  atom('ch1-p20-sound-editing',1,20,'concept','Sound editing feature list','h1-sound-editing',['start/stop times','extract','frequency','amplitude','fade in','fade out','mix','merge','noise','audio formats']),
  atom('ch1-p20-video',1,20,'extension','1.2.4 Video','h1-124-video',['beyond the syllabus','25MB per second','motion JPEG','frame rate']),
  atom('ch1-p21-mp3-example',1,21,'example','MP3 reduction example','h1-131-mp3-jpeg',['80 MB','8 MB','90%']),
  atom('ch1-p22-codecs',1,22,'concept','MP3/MP4/JPEG/vector compression','h1-131-mp3-jpeg',['80–320','200','MP4','JPEG','5–15','SVG','XML']),
  atom('ch1-p23-rle-simple',1,23,'example','RLE text example','h1-rle-text',['aaaaabbbbccddddd','05 97 04 98 02 99 05 100','16 bytes','8 bytes']),
  atom('ch1-p23-rle-flag',1,23,'example','RLE flag example','h1-rle-text',['aaaaaaaa bbbbbbbbbb cdcdcd eeeeeeee','255 08 97 255 10 98 99 100 99 100 99 100 255 08 101','32 bytes','15 bytes','53%']),
  atom('ch1-p23-figure-1-7',1,23,'figure','Figure 1.7','h1-rle-images',['11111111','10000001','10000011','9W 6B','64 bytes','30 values']),
  atom('ch1-p24-figure-1-8',1,24,'figure','Figure 1.8','h1-rle-images',['BBGGGGBB','BWWWWWWB','0,0,0','255,255,255','0,255,0','255,0,0','192','92','52%']),
  atom('ch1-p24-figure-1-9',1,24,'figure','Figure 1.9','h1-132-general',['reduce the sampling rate','reduce the sampling resolution','reduce the frame rate','crop the image','decrease the colour/bit depth','reduce the image resolution']),
  atom('ch1-p25-activity-1i',1,25,'activity','Activity 1I','h1-hodder-review',['lossless and lossy','digitised music file','run length encoding','bit-map images and vector graphics','add realism']),
  atom('ch1-p25-review-q1',1,25,'review','End-of-chapter Q1','h1-hodder-review',['01001111','10011010','−53','8-bit','798','BCD']),
  atom('ch1-p25-review-q2',1,25,'review','End-of-chapter Q2','h1-hodder-review',['sampling resolution','16-colour','16 384','512','256-colour','gibibytes','header','sound editing app']),
  atom('ch1-p26-review-q3',1,26,'review','End-of-chapter Q3','h1-hodder-review',['movie producer','sampling','email attachment','lossy or lossless','grey squares','85','white squares','255']),
  atom('ch1-p26-review-q4',1,26,'review','End-of-chapter Q4','h1-hodder-review',['60, 27 and −27','60 + 27','60 − 27','01011001','01100001']),
  atom('ch1-p26-review-q5',1,26,'review','End-of-chapter Q5','h1-hodder-review',['0.52 + 0.83','hexadecimal','0111111011110010']),
  atom('ch1-p26-review-q6',1,26,'review','End-of-chapter Q6','h1-hodder-review',['95','00100011 − 01000100','506']),
];

export const CHAPTER_13_SOURCE_ATOMS: LessonSourceAtom[] = [
  atom('ch13-p1-prior',13,1,'prior','13.1 What you should already know','h13-prior-131',['A name','student’s mark','recorded temperature','start date','sold or not','animal in a zoo','Species','Date of birth','Location','Notes']),
  atom('ch13-p2-activity-13a',13,2,'activity','Activity 13A','h13-enum',['days of the week','today','yesterday','Wednesday','tomorrow']),
  atom('ch13-p2-enum-example',13,2,'example','Tmonth enumerated example','h13-enum',['TYPE Tmonth','January','December','DECLARE thisMonth','DECLARE nextMonth','thisMonth ← January','nextMonth ← thisMonth + 1']),
  atom('ch13-p3-pointer',13,3,'example','Pointer example','h13-pointer',['TYPE TmonthPointer = ^Tmonth','DECLARE monthPointer : TmonthPointer','monthPointer ← ^thisMonth','myMonth ← monthPointer^']),
  atom('ch13-p3-activity-13b',13,3,'activity','Activity 13B','h13-pointer',['pointer to use','point at today','pointer data type','pointer variable']),
  atom('ch13-p4-record-source',13,4,'example','TbookRecord printed source','h13-record',['noPages : STRING','fiction : STRING']),
  atom('ch13-p4-extension-13a',13,4,'extension','Extension Activity 13A','h13-sets-classes',['set operations','programming language']),
  atom('ch13-p4-activity-13c',13,4,'activity','Activity 13C','h13-activity-13c',['composite and non-composite','why programmers need','fixed number of colours','estate agent','addresses of integer data']),
  atom('ch13-p5-prior-132',13,5,'prior','13.2 What you should already know','h13-prior-132',['three different modes','Create a text file','Write several lines','Read the text','Append a line','Write a program']),
  atom('ch13-p5-serial',13,5,'figure','Figure 13.1','h13-serial',['First record','Second record','Sixth record','append','meter readings','chronological']),
  atom('ch13-p6-sequential',13,6,'figure','Figures 13.2–13.3','h13-sequential',['Customer 1','Customer 4','Customer 5','Customer 7','Customer 8','correct place']),
  atom('ch13-p6-random',13,6,'figure','Figure 13.4','h13-random',['Customer 8','Customer 2','Customer 4','Customer 7','Customer 3','Customer 1']),
  atom('ch13-p7-seq-search',13,7,'figure','Figure 13.5','h13-seq-access',['Customer 6','Customer 7','not found','high hit rate','monthly billing','payroll']),
  atom('ch13-p7-direct',13,7,'concept','Direct access','h13-direct-access',['low hit rate','index','key fields','hashing algorithm']),
  atom('ch13-p7-hash-table-13-1',13,7,'table','Table 13.1','h13-hashing',['2000','3024','1024','0 + 1 × 1024']),
  atom('ch13-p8-hash-table-13-2',13,8,'table','Table 13.2','h13-hash-collision',['5024','1024','collision','open hash','closed hash','overflow area']),
  atom('ch13-p8-activity-13d',13,8,'activity','Activity 13D','h13-hash-collision',['address 500','five locations','1000 records','9354','remainder','open hash','next location']),
  atom('ch13-p8-extension-13b',13,8,'extension','Extension Activity 13B','h13-hash-collision',['ASCII value','up to 10 characters','divide by 1000','multiply this value by 20','add it to 2000']),
  atom('ch13-p8-activity-13e',13,8,'activity','Activity 13E','h13-org-access-choice',['Borrowing books','annual tax statement','daily rainfall','remote weather station']),
  atom('ch13-p9-prior-133',13,9,'prior','13.3 What you should already know','h13-prior-133',['+48','+122','−100','−55','−2','00110011','01111110','10110011','11110010','11111111','00110100','00011101','01001100','00111111','123000000','2505000000000000','0.000000002341','−0.0000124005']),
  atom('ch13-p10-float-anatomy',13,10,'figure','Figures 13.6–13.7','h13-float-format',['M × 2','8 bits','mantissa','8 bits','exponent','binary point']),
  atom('ch13-p11-example-13-1',13,11,'example','Example 13.1','h13-float-to-denary',['01011010 00000100','45/64','11.25','01011.010']),
  atom('ch13-p11-12-example-13-2',13,11,'example','Example 13.2','h13-float-to-denary',['00101000 00000011','5/16','2.5','0010.1000']),
  atom('ch13-p12-13-example-13-3',13,12,'example','Example 13.3','h13-float-to-denary',['11001100 00001100','−13/32','12','−1664']),
  atom('ch13-p13-example-13-4',13,13,'example','Example 13.4','h13-float-to-denary',['11001100 11111100','−4','−0.025390625']),
  atom('ch13-p14-activity-13f',13,14,'activity','Activity 13F','h13-float-to-denary',['01001110 00000101','00101001 00000111','01110000 11111011','00011110 11111100','01110000 00000011','10011000 00000010','11110100 00000100','10110000 00000101','10110000 11111101','11100000 11111010']),
  atom('ch13-p14-15-example-13-5',13,14,'example','Example 13.5','h13-denary-to-float',['+4.5','9/16','0.1001','01001000 00000011']),
  atom('ch13-p15-example-13-6',13,15,'example','Example 13.6','h13-denary-to-float',['+0.171875','11/64','0.001011','01011000 11111110']),
  atom('ch13-p16-example-13-7',13,16,'example','Example 13.7','h13-denary-to-float',['−10.375','−83/128','1.0101101','10101101 00000100']),
  atom('ch13-p16-extension-13c',13,16,'extension','Extension Activity 13C','h13-denary-to-float',['00010110 00000000','01011000 11111110','11111101 + 1 = 11111110']),
  atom('ch13-p17-activity-13g',13,17,'activity','Activity 13G','h13-denary-to-float',['+3.5','0.3125','15.375','9.125','−3.5','−10.25','−1.046875']),
  atom('ch13-p17-18-approx',13,17,'example','5.88 approximation','h13-approximation',['5.88','5.875','5.75','0.1011100 00000011']),
  atom('ch13-p18-extension-13d',13,18,'extension','Extension Activity 13D','h13-approximation',['1.63','8.13','12.32','5.90','7.40']),
  atom('ch13-p18-figure-13-8',13,18,'figure','Figure 13.8','h13-normalisation',['0.1000000 00000010','0.0100000 00000011','0.0010000 00000100','0.0001000 00000101']),
  atom('ch13-p19-figure-13-9',13,19,'figure','Figure 13.9','h13-normalisation',['0.0000000 00001001 = 2']),
  atom('ch13-p19-example-13-8-13-9',13,19,'example','Examples 13.8–13.9','h13-normalisation',['0.0011100 00000101','0.1110000 00000011','1.1101100 00001010','1.0110000 00001000']),
  atom('ch13-p20-activity-13h',13,20,'activity','Activity 13H','h13-normalisation',['0.0001101 00000110','0.0011000 00001001','0.0000111 00000110','0.0010001 00000011','0.0011100 00001000','1.1111000 00001000','1.1100100 00001100','1.1110110 00000011','0.0001111 11111000','1.1111000 11110100']),
  atom('ch13-p20-extremes',13,20,'figure','Figures 13.10–13.13','h13-precision-range',['01111111 01111111','01000000 10000000','10111111 10000000','10000000 01111111']),
  atom('ch13-p21-allocations',13,21,'figure','Figures 13.14–13.16','h13-precision-range',['011111111111 0111','12 bits','4 bits','01111111 01111111','8 bits','0111 011111111111','high accuracy','extremely high range']),
  atom('ch13-p21-extension-13e',13,21,'extension','Extension Activity 13E','h13-rounding-program',['number ← 0.0','FOR loop ← 0 TO 50','number ← number + 0.1','0.399999']),
  atom('ch13-p22-problems',13,22,'concept','Overflow / underflow / zero','h13-over-under-zero',['divide by a very small number','divide by a very large number','0.1','1.0','zero']),
  atom('ch13-p22-extension-13f',13,22,'extension','Extension Activity 13F','h13-over-under-zero',['deal with the value 0','normalised binary floating-point']),
  atom('ch13-p22-activity-13i',13,22,'activity','Activity 13I','h13-over-under-zero',['10-bit mantissa','6-bit exponent','32 bits','1.21 × 10','10⁹⁹','2.88','−5.38']),
  atom('ch13-p22-23-review-q1',13,22,'review','End-of-chapter Q1','h13-hodder-review-1',['1010000000000000 11111111','0101000000000000 00000011','0001010000000000 00000101','not normalised','accuracy and range','zero']),
  atom('ch13-p23-review-q2',13,23,'review','End-of-chapter Q2','h13-hodder-review-1',['12 bits','6 bits','011100100000 000111','101001110000 111100','+4.75','−8.375']),
  atom('ch13-p23-review-q3',13,23,'review','End-of-chapter Q3','h13-hodder-review-1',['8 bits for the mantissa','8 bits for the exponent','+3.5','−3.5']),
  atom('ch13-p23-24-review-q4',13,23,'review','End-of-chapter Q4','h13-hodder-review-2',['TYPE Tseason','Spring, Summer, Autumn, Winter','TJournalRecord','noPages : INTEGER','season : Tseason','Spring Flowers','H Williams','XYZ Press','40']),
  atom('ch13-p24-review-q5',13,24,'review','End-of-chapter Q5','h13-hodder-review-3',['random','sequential','serial','direct','Account number and meter readings','personal data','Usernames and encrypted passwords','All three file organisation methods must be different']),
];

export const SOURCE_ATOMS = [...CHAPTER_1_SOURCE_ATOMS, ...CHAPTER_13_SOURCE_ATOMS];

export const sourceAtomsForChapter = (chapter: 1 | 13) => SOURCE_ATOMS.filter((item) => item.chapter === chapter);
export const sourceAtomsForSlide = (slideId: string) => SOURCE_ATOMS.filter((item) => item.targetSlideId === slideId);
