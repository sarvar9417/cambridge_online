export const SOURCE_ATOM_LINE_OVERRIDES: Record<string, string[]> = {
  'ch1-p1-prior-binary': [
    'Carry out these binary additions and convert each answer to denary:',
    'a) 00110101 + 01001000','b) 01001101 + 01101110','c) 01011111 + 00011110',
    'd) 01000111 + 01101111','e) 10000001 + 01110111','f) 10101010 + 10101010',
  ],
  'ch1-p1-prior-hex': [
    'Carry out these hexadecimal additions and convert each answer to denary:',
    'a) 107 + 257','b) 208 + A17','c) AAA + 777','d) 1FF + 7F7','e) 149 + F0F',
    'f) 1251 + 2567','g) 34AB + C00A','h) A001 + D77F','i) 1009 + 9FF1','j) 2777 + ACF1',
  ],
  'ch1-p3-activity-1a': [
    'Activity 1A · Convert these binary numbers into denary:',
    'a) 00110011','b) 01111111','c) 10011001','d) 01110100','e) 11111111',
    'f) 00001111','g) 10001111','h) 00110011','i) 01110000','j) 11101110',
  ],
  'ch1-p3-activity-1b': [
    'Activity 1B · Convert these denary numbers into binary using either method:',
    'a) 41','b) 67','c) 86','d) 100','e) 111','f) 127','g) 144','h) 189','i) 200','j) 255',
  ],
  'ch1-p4-activity-1c': [
    'Activity 1C · Convert these denary numbers into 8-bit binary, using two’s complement where necessary:',
    'a) +114','b) +61','c) +96','d) −14','e) −116',
  ],
  'ch1-p4-extension-1a': ['Extension Activity 1A · Show the column headings for a system that uses 16 bits to represent a binary number.'],
  'ch1-p6-activity-1d': [
    'Activity 1D · Carry out these 8-bit binary additions and subtractions:',
    'a) 00111001 + 00101001','b) 01001011 + 00100011','c) 01011000 + 00101000','d) 01110011 + 00111110','e) 00001111 + 00011100',
    'f) 01100011 − 00110000','g) 01111111 − 01011010','h) 00110100 − 01000100','i) 00000011 − 01100100','j) 11011111 − 11000011',
  ],
  'ch1-p9-activity-1e': [
    'Activity 1E · Convert these binary numbers into hexadecimal:',
    'a) 11000011','b) 11110111','c) 1001111111','d) 10011101110','e) 000111100001',
    'f) 100010011110','g) 0010011111110','h) 0111010011100','i) 1111111101111101','j) 00110011110101110',
  ],
  'ch1-p10-activity-1f': [
    'Activity 1F · Convert these hexadecimal numbers into binary:',
    'a) 6C','b) 59','c) AA','d) A00','e) 40E','f) BA6','g) 9CC','h) 40AA','i) DA47','j) 1AB0',
  ],
  'ch1-p10-activity-1g': [
    'Activity 1G · 1) Convert these denary numbers into BCD:',
    'a) 271','b) 5006','c) 7990',
    '2) Convert these BCD numbers into denary:',
    'a) 1001 0011 0111','b) 0111 0111 0110 0010',
  ],
  'ch1-p12-activity-1h': [
    'Activity 1H · Carry out these BCD additions:',
    'a) 0.45 + 0.21','b) 0.66 + 0.51','c) 0.88 + 0.75',
  ],
  'ch1-p16-extension-1b': ['Extension Activity 1B · Find out how HTML is used to control the colour of each pixel on a screen and how HTML is used during web-page screen-layout design.'],
  'ch1-p17-extension-1c': ['Extension Activity 1C · Calculate the file size needed to store the screen image on a UHD television.'],
  'ch1-p22-extension-1d': ['Extension Activity 1D · Investigate photograph compression without noticeable quality loss and compare it with run-length encoding (RLE).'],
  'ch1-p25-activity-1i': [
    'Activity 1I · 1a) Define lossless and lossy file compression. 1b) Give one lossless and one lossy example.',
    '2a) Describe how microphone sound becomes a digitised music file. 2b) Explain why stored music is compressed and how quality is essentially retained.',
    '3a) Define run-length encoding. 3b) Describe how RLE compresses a file and include an example.',
    '4a) Describe bitmap/vector differences. 4b) For realistic software images, explain what affects the choice between bitmap and vector.',
  ],
  'ch1-p25-review-q1': [
    'End-of-chapter Q1 · Two’s complement and BCD:',
    'a-i) State the denary value of 01001111.','a-ii) State the denary value of 10011010.','a-iii) Write −53 in two’s-complement form.','a-iv) Give the maximum 8-bit two’s-complement range in denary.',
    'b-i) Write 798 in BCD.','b-ii) Convert the given BCD value to denary.','c) Give one use of BCD.',
  ],
  'ch1-p25-review-q2': [
    'End-of-chapter Q2 · Sound and bitmap:',
    'a-i) State what sampling resolution means.','a-ii) Describe how sampling resolution affects stored-sound accuracy.',
    'b-i) Explain image resolution.','b-ii) State the bits per pixel for a 16-colour bitmap.','b-iii) Calculate the size in GiB of a 16,384 × 512, 256-colour bitmap.',
    'b-iv) State two bitmap-header items.','b-v) Give three sound-editing features.',
  ],
  'ch1-p26-review-q3': [
    'End-of-chapter Q3 · Music sampling and compression:',
    'a) Describe how sampling records the music clips.','b) Choose lossy or lossless compression for emailing the clips and justify the choice.',
    'c-i) Explain RLE.','c-ii) Produce RLE data for the supplied image using grey=85 and white=255.',
  ],
  'ch1-p26-review-q4': [
    'End-of-chapter Q4 · 8-bit two’s complement:',
    'a) Write 60, 27 and −27 in 8-bit two’s-complement form.','b) Show 60 + 27 in 8-bit two’s complement.','c) Show 60 − 27 in 8-bit two’s complement.',
    'd) Add 01011001 + 01100001 and explain why the expected result is not obtained.',
  ],
  'ch1-p26-review-q5': [
    'End-of-chapter Q5 · BCD and hexadecimal:',
    'a) Carry out 0.52 + 0.83 using BCD and show all working.','b-i) Define hexadecimal.','b-ii) Give two uses of hexadecimal.','b-iii) Convert 0111111011110010 to hexadecimal.',
  ],
  'ch1-p26-review-q6': [
    'End-of-chapter Q6 · mixed representations:',
    'a) Convert 95 to BCD.','b) Using two’s complement, calculate 00100011 − 01000100 and convert the answer to denary.','c) Convert 506 denary to hexadecimal.',
  ],

  'ch13-p1-prior': [
    '13.1 What you should already know · 1) Select an appropriate data type for: a name; a student’s mark; a recorded temperature; a job start date; whether an item is sold.',
    '2) Define a record for a zoo animal containing Name, Species, Date of birth, Location, whether born in the zoo, and Notes.',
  ],
  'ch13-p2-activity-13a': ['Activity 13A · Declare an enumerated type for the days of the week; declare today and yesterday; assign Wednesday to today; write a suitable assignment for tomorrow.'],
  'ch13-p3-activity-13b': ['Activity 13B · Using the days-of-week enumerated type, declare a suitable pointer and set it to point at today; include both pointer type and pointer variable.'],
  'ch13-p4-extension-13a': ['Extension Activity 13A · Investigate how set operations are implemented in the programming language you use.'],
  'ch13-p4-activity-13c': [
    'Activity 13C · 1) Explain with examples the difference between composite and non-composite data types.',
    '2) Explain why programmers need user-defined data types, using examples.',
    '3) Choose and justify a type for: a fixed set of colours; data for each house an estate agent sells; addresses of INTEGER data in main memory.',
  ],
  'ch13-p5-prior-132': [
    '13.2 What you should already know · 1) Describe three file-opening modes.',
    '2) Write pseudocode to create a text file, write several lines, read them back, and append a line at the end.',
    '3) Write a program to test the pseudocode.',
  ],
  'ch13-p8-activity-13d': [
    'Activity 13D · File starts at address 500; each record takes five locations; capacity is 1000 records; key range 1–9999.',
    'Use key MOD 1000 plus start address and record size to calculate where key 9354 is stored.',
    'If that location is occupied and an open hash is used, state the next address to check.',
  ],
  'ch13-p8-extension-13b': [
    'Extension Activity 13B · Write a program that finds the ASCII value of each character in a name of up to 10 characters, adds the values, finds the remainder after division by 1000, multiplies by 20, adds 2000, and displays the result.',
    'Then identify the simulated file start address and record size.',
  ],
  'ch13-p8-activity-13e': [
    'Activity 13E · 1) Explain with examples the difference between serial and sequential files.',
    '2) Explain direct access to a record using a hashing algorithm.',
    '3) Choose and justify a suitable file type for: borrowing library books; annual employee tax statements; remote daily-rainfall readings collected monthly.',
  ],
  'ch13-p14-activity-13f': [
    'Activity 13F · Convert these 8-bit-mantissa / 8-bit-exponent floats to denary:',
    'a) 01001110 00000101','b) 00101001 00000111','c) 01110000 11111011','d) 00011110 11111100','e) 01110000 00000011',
    'f) 10011000 00000010','g) 11110100 00000100','h) 10110000 00000101','i) 10110000 11111101','j) 11100000 11111010',
  ],
  'ch13-p16-extension-13c': ['Extension Activity 13C · Show why 00010110 00000000 represents the same value as 01011000 11111110.'],
  'ch13-p17-activity-13g': [
    'Activity 13G · Convert the supplied M × 2^E values to 8-bit mantissa/exponent form, then convert these denary values to binary floating point:',
    'a) +3.5','b) 0.3125','c) 15.375','d) 41/64','e) 9.125','f) −15/32','g) −3.5','h) −10.25','i) −1.046875','j) −3 11/32',
  ],
  'ch13-p18-extension-13d': ['Extension Activity 13D · Using an 8-bit mantissa and exponent, show how 1.63, 8.13, 12.32, 5.90 and 7.40 are approximated.'],
  'ch13-p20-activity-13h': [
    'Activity 13H · Normalise these binary floating-point numbers:',
    'a) 0.0001101 00000110','b) 0.0011000 00001001','c) 0.0000111 00000110','d) 0.0010001 00000011','e) 0.0011100 00001000',
    'f) 1.1111000 00001000','g) 1.1100100 00001100','h) 1.1110110 00000011','i) 0.0001111 11111000','j) 1.1111000 11110100',
  ],
  'ch13-p21-extension-13e': [
    'Extension Activity 13E · Run and analyse this rounding-error experiment:',
    'number ← 0.0','FOR loop ← 0 TO 50','number ← number + 0.1','OUTPUT number','ENDFOR',
    'Explain outputs such as 0.399999 instead of 0.4, test the behaviour in a programming language, and discuss ways to overcome the error.',
  ],
  'ch13-p22-extension-13f': ['Extension Activity 13F · Find out how computer systems represent the value zero when using normalised binary floating-point numbers.'],
  'ch13-p22-activity-13i': [
    'Activity 13I · 1) Find the largest positive and smallest-magnitude values for a 10-bit mantissa and 6-bit exponent.',
    '2) A computer uses 32 bits for mantissa+exponent: discuss precision and range.',
    '3a) A calculation gives 1.21 × 10^100 but the computer maximum is 10^99: discuss the problem. 3b) Discuss the problem if y can be zero in x/y.',
    '4) With a 10-bit mantissa and 6-bit exponent, find approximate stored values for 2.88 and −5.38.',
  ],
  'ch13-p22-23-review-q1': [
    'End-of-chapter Q1 · 24-bit floating-point word:',
    'A = 1010000000000000 11111111','B = 0101000000000000 00000011','C = 0001010000000000 00000101',
    'State the three values; identify the non-normalised value; explain why floats are normally normalised; comment on accuracy/range; discuss representing zero.',
  ],
  'ch13-p23-review-q2': [
    'End-of-chapter Q2 · 12-bit mantissa + 6-bit exponent:',
    'a-i) Convert 011100100000 000111 to denary.','a-ii) Convert 101001110000 111100 to denary.','b-i) Convert +4.75 to binary floating point.','b-ii) Convert −8.375 to binary floating point.',
  ],
  'ch13-p23-review-q3': [
    'End-of-chapter Q3 · 8-bit mantissa + 8-bit exponent, both two’s complement:',
    'a) Calculate the floating-point representation of +3.5 and show working.','b) Calculate the floating-point representation of −3.5 and show working.',
  ],
  'ch13-p23-24-review-q4': [
    'End-of-chapter Q4 · User-defined types:',
    'TYPE Tseason = (Spring, Summer, Autumn, Winter)',
    'TJournalRecord fields: title STRING; author STRING; publisher STRING; noPages INTEGER; season Tseason.',
    'Identify an enumerated, composite, non-composite and user-defined type; then declare Journal and assign Spring Flowers / H Williams / XYZ Press / 40 / Spring.',
  ],
  'ch13-p24-review-q5': [
    'End-of-chapter Q5 · File organisation/access:',
    'Connect random, sequential and serial organisation to appropriate direct/sequential access methods.',
    'For an electricity company, choose three different organisation methods for: A) current-month account number + meter readings appended on submission; B) customer personal data used for monthly statements; C) usernames + encrypted passwords used at login. Justify each choice.',
  ],
};
