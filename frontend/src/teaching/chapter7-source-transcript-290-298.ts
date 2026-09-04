import type { Chapter7SourcePageTranscript } from './chapter7-source-transcript';

export const CHAPTER_7_SOURCE_TRANSCRIPT_290_298: Chapter7SourcePageTranscript[] = [
  { printedPage: 290, sha256: '823624fe1b2795812980275b020a293740184cd91666fcfd3f7e5525a7feda35', text: String.raw`7 Algorithm design and problem solving

b Explain how you would test your algorithm.
a
REPEAT
OUTPUT "How many tickets would you like to buy? "
INPUT NumberOfTickets
UNTIL NumberOfTickets > 0 AND NumberOfTickets < 26
IF NumberOfTickets < 10
THEN
Discount ← 0
ELSE
IF NumberOfTickets < 20
THEN
Discount ← 0.1
ELSE
Discount ← 0.2
ENDIF
ENDIF
Cost ← NumberOfTickets * 20 * (1 – Discount)
PRINT "Your tickets cost ", Cost

b I would use test data with values of:
0, 26, 		         Expected results rejected
1, 25, 		         Expected results 20, 400
9, 10, 		         Expected results 180, 180
19, 20,		         Expected results 342, 320

Activity 7.18
For the test data given in Example 1, identify the type of test data used and
suggest some more test data and dry run the algorithm.

Example 2: Writing algorithms in pseudocode
A school with 600 students wants to produce some information from the results of the
four standard tests in Maths, Science, English and IT. Each test is out of 100 marks.
The information output should be the highest, lowest and average mark for each test
and the highest, lowest and average mark overall. All the marks need to be input.
a Use pseudocode to write the algorithm to complete this task.
b Explain how you would test your algorithm.
a
Comments are used to                       // initialisation of overall counters
make the algorithm                        OverallHighest ← 0
more understandable
OverallLowest ← 100
OverallTotal ← 0
FOR Test ← 1 TO 4          // outer loop for the tests` },
  { printedPage: 291, sha256: '57bc7df1590bc75efd4eaf8de901236068e251af4b88cba1dedde72a30f49a38', text: String.raw`7.9 Writing and amending algorithms

// initialisation of subject counters
SubjectHighest ← 0
SubjectLowest ← 100
SubjectTotal ← 0
CASE OF Test
1 : SubjectName ← "Maths"
2 : SubjectName ← "Science"
3 : SubjectName ← "English"
4 : SubjectName ← "IT"
ENDCASE
FOR StudentNumber ← 1 TO 600             // inner loop for the
students
REPEAT
OUTPUT "Enter Student", StudentNumber, "'s mark for
", SubjectName
INPUT Mark
UNTIL Mark < 101 AND Mark > -1
IF Mark < OverallLowest THEN OverallLowest ← Mark
IF Mark < SubjectLowest THEN SubjectLowest ← Mark
IF Mark > OverallHighest THEN OverallHighest ← Mark
IF Mark > SubjectHighest THEN SubjectHighest ← Mark
OverallTotal ← OverallTotal + Mark
SubjectTotal ← SubjectTotal + Mark
NEXT StudentNumber
SubjectAverage ← SubjectTotal / 600
OUTPUT SubjectName
OUTPUT "Average mark is ", SubjectAverage
OUTPUT "Highest Mark is ", SubjectHighest
Find out more                      OUTPUT "Lowest Mark is ", SubjectLowest

Programming is                         NEXT Test
covered in Chapter 8.                  OverallAverage ← OverallTotal / 2400
When you have started
your programming,                      OUTPUT "Overall Average is ", OverallAverage
write and test
programs for                           OUTPUT "Overall Highest Mark is ", OverallHighest
Examples 1 and 2.                      OUTPUT "Overall Lowest Mark is ", OverallLowest
More practice on
writing algorithms will            b For the algorithm to be tested by dry running, I would reduce the number of
be given in Chapter 8.               students to 5 and the number of subjects to 2.` },
  { printedPage: 292, sha256: 'fb152111bba78e277a8f637a2958e0f26eb62a32382dbeb09142f42e1a554710', text: String.raw`7 Algorithm design and problem solving

Activity 7.19
1 Identify the changes you would need to make to the algorithm in Example 2 to
reduce the number of students to 5 and the number of subjects to 2.
Identify the test data needed to test Example 2 with the reduced number of
students and subjects.
2 With the set of test data you have chosen set up, complete a trace table so that
you can compare your expected results with the actual results when you dry
run the algorithm.

Activity 7.20
1 Write pseudocode to input ten positive numbers and find the total and the
average.
2 Write pseudocode to input any number of positive numbers and find the total
and the average. The user should enter ‘-1’ when they have finished entering
their list of positive numbers.
3 Explain why you chose the loop structure for each task.

Extension
For those students interested in studying computer science at A Level, the
following section is an introduction to the use of Abstract Data Types (ADTs) to
store data in stacks and queues.
An ADT is a collection of data and a set of operations on that data. For example, a
stack includes the items held on the stack and the operations to add an item to the
stack (push) or remove an item from the stack (pop):
» stack – a list containing several items operating on the Last In First Out (LIFO)
principle. Items can be added to the stack (push) and removed from the stack
(pop). The first item added to a stack is the last item to be removed from the
stack.
» queue – a list containing several items operating on the First In First Out (FIFO)
principle. Items can be added to the queue (enqueue) and removed from the
queue (dequeue). The first item added to a queue is the first item to be removed
from the queue.

7                            1    27     ← Front Pointer
6                            2    34
5                            3    82
4    79     ← Top Pointer    4    79     ← End Pointer
3    82                      5
2    34                      6
1    27     ← Base Pointer   7
Stack                        Queue

▲ Figure 7.20  In both of these examples 27 was the first item added and 79 the last
item added` },
  { printedPage: 293, sha256: '7372c3289d9644d9eed6501145245b45897e95fda32827b81175f3c4303270ea', text: String.raw`7.9 Writing and amending algorithms

7                              7                            7
6                              6                            6
5                              5                            5
4     79     ← Top Pointer     4                            4    31   ← Top Pointer
3     82                       3   82   ← Top Pointer       3    82
2     34                       2   34                       2    34
1     27     ← Base Pointer    1   27   ← Base Pointer      1    27   ← Base Pointer
Stack                        Stack                         Stack
after pop                    after push
(79 removed)                  (31 added)

▲ Figure 7.21 Stack operations
The value of the Base Pointer always remains the same during stack
operations.

1    27     ← Front Pointer 1                                1
2    34                       2    34   ← Front Pointer      2   34   ← Front Pointer
3    82                       3    82                        3   82
4    79     ← End Pointer     4    79   ← End Pointer        4   79
5                             5                              5   31   ← End Pointer
6                             6                              6
7                             7                              7
Queue                        Queue                        Queue
after dequeue                after enqueue
(27 removed)                   (31 added)

▲ Figure 7.22 Queue operations

The values of both the Front Pointer and the End Pointer change during
queue operations.
Extension activity
Show a stack and pointers after a pop operation. Show a queue and pointers after
a dequeue operation.

In this chapter, you have learnt about:
✔ the program development life cycle
✔ decomposition of systems and problems in sub-systems and sub-problems
✔ design and construction of algorithms to solve problems using structure
diagrams, flowcharts, and pseudocode
✔ explaining the purpose of an algorithm
✔ standard methods of solution
✔ the need and purpose of validation and verification checks on input data
✔ suggesting and applying suitable test data
✔ trace tables and dry runs
✔ writing, amending and identifying errors in algorithms.` },
  { printedPage: 294, sha256: 'eb6fac8004c34a0373de99d96ffd8eb6fdde0b454abb68ca65e73b796dedc0c8', text: String.raw`7 Algorithm design and problem solving

Key terms used throughout this chapter                           pseudocode – a simple method of showing an
analysis – part of the program development life cycle; a         algorithm; it describes what the algorithm does by using
process of investigation, leading to the specification of what   English key words that are very similar to those used in a
a program is required to do                                      high-level programming language but without the strict
syntax rules
design – part of the program development life cycle; uses
the program specification from the analysis stage to show        linear search – an algorithm that inspects each item in a
to how the program should be developed                           list in turn to see if the item matches the value searched for

coding – part of the program development life cycle; the         bubble sort – an algorithm that makes multiple passes
writing of the program or suite of programs                      through a list comparing each element with the next
element and swapping them. This continues until there is a
testing – part of the program development life cycle;            pass where no more swaps are made
systematic checks done on a program to make sure that it
works under all conditions                                       validation – automated checks carried out by a program
that data is reasonable before it is accepted into a computer
abstraction – a method used in the analysis stage of             system
the program development life cycle; the key elements
required for the solution to the problem are kept and any        verification – checking that data has been accurately
unnecessary details and information that are not required        copied from another source and input into a computer
are discarded                                                    or transferred from one part of a computer system to
another
decomposition – a method used in the analysis stage of
the program development life cycle; a complex problem            set of test data – all the items of data required to work
is broken down into smaller parts, which can then be             through a solution
sub divided into even smaller parts that can be solved           normal data – data that is accepted by a program
more easily
abnormal data – data that is rejected by a program
top-down design – the breaking down of a computer
system into a set of sub-systems, then breaking each sub-        extreme data – the largest/smallest data value that is
system down into a set of smaller sub-systems, until each        accepted by a program
sub-system just performs a single action                         boundary data – the largest/smallest data value that is
inputs – the data used by the system that needs to be            accepted by a program and the corresponding smallest/
entered while the system is active                               largest rejected data value

processes – the tasks that need to be performed by a             range check – a check that the value of a number is
program using the input data and any other previously            between an upper value and a lower value
stored data                                                      length check – a method used to check that the data
output – information that needs to be displayed or printed       entered is a specific number of characters long or that the
for the users of the system                                      number of characters is between an upper value and a
lower value
storage – data that needs to be stored in files on an
appropriate media for use in the future                          type check – a check that the data entered is of a specific
type
structure diagram – a diagram that shows the design of
a computer system in a hierarchical way, with each level         presence check – a check that a data item has been
giving a more detailed breakdown of the system into sub-         entered
systems                                                          format check – a check that the characters entered
flowchart – a diagram that shows the steps required for a        conform to a pre-defined pattern
task (sub-system) and the order in which the steps are to be     check digit – an additional digit appended to a number to
performed                                                        check if the entered number is error-free; check digit is a
algorithm – an ordered set of steps to solve a problem           data entry check and not a data transmission check` },
  { printedPage: 295, sha256: '9ce4fbdaec42bd791ea323d510f16943c5c8e5ed860d7fb3591df951e11a7b24', text: String.raw`Exam-style questions

Exam-style questions
1 A solution to a problem is decomposed into its component parts.
Name and describe the component parts.                                       [8]
2 A computer system is to be developed to provide a modulo 11 check
digit for numbers from 4 to 20 digits in length. Provide a structure
diagram for this computer system.                                            [6]
3 A phone app is being developed to split the cost of a restaurant bill
between a given number of people. It is being designed to work for
up to 12 diners and for bills from $10 to $500.
a What validation checks should be used for the number of diners
and the size of the bill?                                                 [2]
b Provide two sets of normal data and their expected results.               [4]
c Provide some abnormal/erroneous data.                                     [1]
d Identify the boundary data required and the expected results.             [4]
4 Explain what is meant by validation and verification.                        [4]
5 The following data is to be entered onto an online form:
– Name
– Date of birth
– Password
– Phone number.
For each item state, with reasons, the validation and verification
checks that should be used on the input data.                               [8]` },
  { printedPage: 296, sha256: 'fb381ec83a3fa7d76289303ba1c009dcb453bbee73d5466e2ac5fb4bb50f4654', text: String.raw`7 Algorithm design and problem solving

6 The following algorithm, shown as a flowchart, checks the size of a consignment
of ten parcels. The dimensions of each parcel are input in centimetres.
START

Counter ¨ 0
Accept ¨ 0
Reject ¨ 0

INPUT
Length,
Breadth

Length >          yes
30?

no

Breadth >         yes
30?

no

Size ¨
Length * Breadth

Size >           yes
600?

no

Accept ¨                Reject ¨
Accept +1               Reject +1

Counter ¨
Counter +1

no         Counter
>= 10?

yes

OUTPUT
Accept,
Reject

STOP` },
  { printedPage: 297, sha256: '148a6678a3d76bc987ca9d95175cc66c1145235794c190b941887204092f2807', text: String.raw`Exam-style questions

a Use this data and the following trace table to dry run the algorithm:
15, 10, 20, 17, 32, 10, 30, 35, 30, 15, 30, 28, 25, 25, 20, 15, 40, 20, 12, 10
Counter      Length      Breadth       Volume           OUTPUT

[5]
b State the processes included in this algorithm. [3]
c Identify the rules required to accept a parcel. [3]
7 The following algorithm written in pseudocode adds up 10 positive
numbers and outputs the total. It contains several errors.

Counter ← 1
FOR Counter ← 1 TO 10
REPEAT
OUTPUT "Enter a positive whole number "
INPUT Number
UNTIL Number < 0
Total ← Total + Counter
Counter ← Counter + 1
OUTPUT Total
NEXT Number

a Identify all the errors in the algorithm.                        [5]
b Rewrite the algorithm so that it is effective and error free.    [4]
c Set up a trace table and some test data to dry run your rewritten
algorithm.[4]
d Identify which items of your test data are normal, erroneous
and extreme.                                                     [3]
8 This pseudocode algorithm inputs two non-zero numbers and a sign,
and then performs the calculation shown by the sign. An input of
zero for the first number terminates the process.` },
  { printedPage: 298, sha256: '8058c07f833119725b1843561bbd6f2b1817d094140780225b9d45ad83817e61', text: String.raw`7 Algorithm design and problem solving

INPUT Number1, Number2, Sign
WHILE Number <> 0
IF Sign = '+' THEN Answer ← Number1 + Number2 ENDIF
IF Sign = '-' THEN Answer ← Number1 - Number2 ENDIF
IF Sign = '*' THEN Answer ← Number1 * Number2 ENDIF
IF Sign = '/' THEN Answer ← Number1 / Number2 ENDIF
IF Sign <> '/' AND Sign <> '*' AND Sign <> '-' AND Sign <>
'+'
THEN Answer ← 0
ENDIF
IF Answer <> 0 THEN OUTPUT Answer ENDIF
INPUT Number1, Number2, Sign
ENDWHILE

a Complete the trace table for the input data:
5, 7, +, 6, 2, -, 4, 3, *, 7, 8, ?, 0, 0, /
Number1       Number2            Sign            Answer            OUTPUT

[3]
b Show how you could improve the algorithm written in pseudocode
by writing an alternative type of conditional statement in
pseudocode.[3]
Cambridge IGCSE Computer Science (0478) Paper 22 Q3, June 2018
9 A programmer has written a routine to store the name, email address and
password of a contributor to a website’s discussion group.
a The programmer has chosen to verify the name, email address and
password.
Explain why verification was chosen and describe how the
programmer would verify this data.                                             [4]
b The programmer has also decided to validate the email address
and the password.
Describe validation checks that could be used.                                 [2]
Cambridge IGCSE Computer Science (0478) Paper 22 Q4, June 2018` },
];
