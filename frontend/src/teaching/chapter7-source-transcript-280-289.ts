import type { Chapter7SourcePageTranscript } from './chapter7-source-transcript';

export const CHAPTER_7_SOURCE_TRANSCRIPT_280_289: Chapter7SourcePageTranscript[] = [
  { printedPage: 280, sha256: 'b3ed244dbbc193375d9f9a27d4585b62c46f67137bcb5eed9cf3d4456f917cb2', text: String.raw`7 Algorithm design and problem solving

Activity 7.7
1 State, with reasons, which validation checks you could use for the following
inputs.
You may decide that more than one validation check is required.
– Entering a telephone number
– Entering a pupil’s name
– Entering a part number in the form XXX999, when X must be a letter and 9
must be a digit.
2 Write an algorithm using pseudocode to check the age and height of a child
who wants to go on a fairground ride. The age must be over 7 and under 12, the
height must be over 110 centimetres and under 150 centimetres.
3 Write an algorithm using pseudocode to check that the length of a password is
between 8 and 12 characters inclusive.

7.5.2 Verification
Verification is checking that data has been accurately copied from one source to
another – for instance, input into a computer or transferred from one part of a
computer system to another.
Verification methods for input data include:
» Double entry
» Screen/visual check.

For double entry the data is entered twice, sometimes by different operators.
The computer system compares both entries and if they are different outputs an
error message requesting that the data is entered again.

Link
Parity checks and
checksums are                      ▲ Figure 7.14 Double entry
used when data is
transferred from one               A screen/visual check is a manual check completed by the user who is entering
part of a computer                 the data. When the data entry is complete the data is displayed on the screen
system to another,
and the user is asked to confirm that it is correct before continuing. The user
or across a network,
and are discussed in
either checks the data on the screen against a paper document that is being
Chapter 2.                         used as an input form or, confirms whether it is correct from their own
knowledge.` },
  { printedPage: 281, sha256: '4c169792f919bdf52522dad4449a1fbad1885ce8306cd708c178b54c1176831e', text: String.raw`7.6 Test data

Activity 7.8
Explain why the following input data also needs to be verified:
» Entering a telephone number
» Entering a pupil’s name
» Entering a part number in the form XXX999, when X must be a letter and
9 must be a digit.

7.6 Test data
7.6.1 How to suggest and apply suitable test data
In order to determine whether a solution is working as it should, it needs to
be tested. Usually before a whole system is tested each sub-system is tested
separately.
Algorithms written in pseudocode or as flowcharts can be tested by a person
working through them using any data that is required and seeing what the result
is. Computer programs can be tested by running them on a computer using any
data that is required and seeing what result is output. However, in order to
test a solution thoroughly it may need to be worked through several times with
different sets of test data.
A set of test data is all the items of data required to work through a solution.
For instance, the set of test data used for Activity 7.6 was 7 and 18.
In order to prove that program or algorithm solutions do what they are supposed
to do, a set of test data should be used that the program would normally be
expected to work with, together with the result(s) that are expected from that
data. The type of test data used to do this is called normal data. Normal data
should be used to work through the solution to find the actual result(s) and see
if they are the same as the expected result(s).
For example, consider an algorithm that records the percentage marks, entered
in whole numbers, from ten end-of-term examinations for a pupil, and then finds
the average mark. A set of normal test data for this purpose could be:
Normal test data: 50, 50, 50, 50, 50, 50 50, 50, 50, 50
Expected result: 50

Activity 7.9
Provide a more realistic set of test data and its expected result.

Solutions also need to be tested to prove that they do not do what they are
supposed not to do. In order to do this, test data should be chosen that would
be rejected by the solution as not suitable, if the solution is working properly.
This type of test data is called abnormal test data. (It is also sometimes called
erroneous test data.)` },
  { printedPage: 282, sha256: 'db1c088bcbd570b3d89e832f7d33c8d106271b9a52a55e54ef621871e96d9724', text: String.raw`7 Algorithm design and problem solving

For example, erroneous/abnormal data for our algorithm to find the average
percentage marks from ten end of term examinations could be:
Erroneous/abnormal data: -12, eleven
Expected results: both of these values should be rejected

Activity 7.10
Provide some more erroneous/abnormal data and its expected results.

When testing algorithms with numerical values, sometimes only a given range
of values should be allowed. For example, percentage marks should only be in
the range 0 to 100. Our algorithm above should be tested with extreme data.
Extreme data are the largest and smallest values that normal data can take. In
this case:
Extreme data: 0, 100
Expected results: these values should be accepted
There is another type of test data called boundary data. This is used to establish
where the largest and smallest values occur. At each boundary two values are
required: one value is accepted and the other value is rejected. For example, for
percentage marks in the range 0 to 100, the algorithm should be tested with the
following boundary data:
Boundary data for 0 is: -1, 0
Expected results: -1 is rejected, 0 is accepted

Activity 7.11
1 Provide boundary data for the upper end of the range; assume that the
percentage marks are always whole numbers.
2 The end of term examinations are now marked out of twenty. Provide the
following:
– Two sets of normal data and their expected results
– Some erroneous/abnormal data and their expected results
– Two sets of boundary data and their expected results.

7.7 Trace tables to document dry runs of
algorithms
A thorough structured approach is required to find out the purpose of an
algorithm. This involves recording and studying the results from each step in the
algorithm and requires the use of test data.` },
  { printedPage: 283, sha256: '12ab3f9d815c5ca444de785455581b673c2d19234625097f63fe4dd1c239bec9', text: String.raw`7.7 Trace tables to document dry runs of algorithms

Worked example
Consider the algorithm represented by the following flowchart:
START

A ← 0
B ← 0
C ← 100

INPUT X

yes
X > B?                  B ← X

no

yes
X < C?                  C ← X

no

A ← A + 1

yes        A < 10?

no

OUTPUT B, C

STOP

▲ Figure 7.15 Flowchart to trace
A trace table can be used to record the results
from each step in an algorithm; it is used to record   ▼ Table 7.3 Trace table
the value of an item (variable) each time that it
changes. The manual exercise of working through          A    B     C     X      OUTPUT
an algorithm step by step is called a dry run.           0     0   100
A trace table is set up with a column for each
variable and a column for any output. For example:
Test data is then used to dry run the flowchart and record the results on the trace
table. During a dry run:
» every time the value of a variable is changed, the new value is entered in that
column of the trace table
» every time a value is output, the value is shown in the output column.
Test data: 9, 7, 3, 12, 6, 4, 15, 2, 8, 5` },
  { printedPage: 284, sha256: '79a5dec1d447b8256b497398e1eb83be7c8915fb2fc435aed8eabea3649529e7', text: String.raw`7 Algorithm design and problem solving

▼ Table 7.4 Completed trace table for flowchart

A            B             C            X          OUTPUT
0            0           100
1            9             9            9
2                          7            7
3                          3            3
4            12                         12
5                                       6
6                                       4
7            15                         15
8                          2            2
9                                       8                           The values 15
and 2 without
10                                       5
the comma
15   2

Activity 7.12
Use a trace table and the test data 400, 800, 190, 170, 300, 110, 600, 150, 130,
900 to record another dry run of the highest and lowest number flowchart from
Section 7.7.

It can be seen from the output that the algorithm selects the largest and the smallest
numbers from a list of ten positive numbers. The same trace table could have been
used if the algorithm had been shown using pseudocode:
Often questions will
A ← 0                                                          use variables with a
B ← 0                                                          single letter, instead of
a meaningful identifier,
C ← 100                                                        and could ask what
OUTPUT "Enter your ten values"                                 the purpose of the
algorithm is!
REPEAT
INPUT X
IF X > B
THEN
B ← X
This prompt needs
ENDIF                                                      to be shown as the first
output. No quotation
IF X < C
marks should be shown
THEN                                                    in the output column
C ← X
ENDIF
A ← A + 1
UNTIL A = 10
OUTPUT B, C` },
  { printedPage: 285, sha256: 'f4edbd6274507440f10aeb50f73baacb443afc43fd772ddb9b813d7b28c8fb1f', text: String.raw`7.8 Identifying errors in algorithms

Activity 7.13
Use the trace table below and the test data 4, 8, 19, 17, 3, 11, 6, 1, 13, 9 to record a
dry run of the pseudocode.
▼ Table 7.5 Trace table to complete for the pseudocode

A            B           C               X             OUTPUT
0            0          100                              10

Activity 7.14
Draw a trace table for the bubble sort algorithm on page 276 and use the test data
35, 31, 32, 36, 39, 37, 42, 38 to record a dry run of the pseudocode.

7.8 Identifying errors in algorithms
Trace tables and test data can be used to identify and correct errors.
Your completed trace table for Activity 7.14 should look like this:
▼ Table 7.6 Completed trace table for flowchart

A            B             C             X               OUTPUT
0            0            100
1           400                         400
2           800                         800
3                                       190
4                                       170
5                                       300
6                                       110
7                                       600
8                                       150
9                                       130
10           900                         900
900   100

There is an error as the smallest number, 110, has not been identified.` },
  { printedPage: 286, sha256: '1f1450ef2026bafb20026d36cd50361bce56b4e177edc17c3108b69e65296e06', text: String.raw`7 Algorithm design and problem solving

Activity 7.15
Use a trace table and some negative test data to record another dry run of the
pseudocode or flowchart. What error have you found?

As this algorithm only works for numbers between 0 and 100; a better algorithm
could look like this:

START

A ← 0
B ← -1000000
C ← 1000000

INPUT X

yes
X > B?                 B ← X

no

yes
X < C?                 C ← X

no

A < A + 1

yes        A < 10?

no

OUTPUT B, C

STOP

▲ Figure 7.16 A better algorithm

This algorithm is very similar and works for a much larger range of numbers, but
it still does not work for every set of numbers.

Activity 7.16
Identify two numbers where the algorithm will still fail.` },
  { printedPage: 287, sha256: '997b75cce4edeb932a0057f773d0f92d795c425095c27510455281ddabc0801f', text: String.raw`7.8 Identifying errors in algorithms

In order to work for any set of numbers, the algorithm needs to be re-written to
allow the largest and smallest numbers to be tested against numbers that appear
in any list provided. The provisional values set at the start of the algorithm need
to be chosen from the list. A standard method is to set both these provisional
values to the value of the first item input.

START

A ← 0

INPUT X
B and C set to the
first value input.

B ← X
C ← X

INPUT X

yes
X > B?                   B ← X

no

yes
X < C?                   C ← X

no

A ← A + 1        The counter A is
now tested for 9
instead of 10.

yes        A < 9?

no

OUTPUT B, C

STOP

▲ Figure 7.17 A much better algorithm` },
  { printedPage: 288, sha256: '9a7f64990e9a2959a62cdb9f298606ebe65776d8e4a01564c68919fac218b030', text: String.raw`7 Algorithm design and problem solving

Activity 7.17
Rewrite the pseudocode so it works for every set of numbers like the flowchart above.
Test your pseudocode algorithm with this set of test data:
-97, 12390, 0, 77, 359, -2, -89, 5000, 21, 67

7.9 Writing and amending algorithms
There are a number of stages when producing an algorithm for a given problem:
1 Make sure that the problem is clearly specified – the purpose of the algorithm
and the tasks to be completed by the algorithm.
2 Break the problem down in to sub-problems; if it is complex, you may want to
consider writing an algorithm for each sub-problem. Most problems, even the
simplest ones can be divided into:
– Set up processes
– Input
– Processing of data
– Permanent storage of data (if required)
– Output of results.
3 Decide on how any data is to be obtained and stored, what is going to happen
to the data and how any results are going to be displayed.
4 Design the structure of your algorithm using a structure diagram.
5 Decide on how you are going to construct your algorithm, either using a
flowchart or pseudocode. If you are told how to construct your algorithm,
then follow the guidance.
6 Construct your algorithm, making sure that it can be easily read and
understood by someone else. Precision is required when writing algorithms,
just as it is when writing program code. This involves setting it out clearly
and using meaningful names for any data stores. Take particular care with
conditions used for loops and selection, for example 'Counter >= 10' rather
than 'Counter ten or over'. The algorithms that you have looked at so far in
this chapter were not designed with readability in mind because you needed
to work out what the problem being solved was.
7 Use several sets of test data (Normal, Abnormal and Boundary) to dry run your
algorithm and show the results in trace tables, to enable you to find any errors.
8 If any errors are found, correct them and repeat the process until you think
that your algorithm works perfectly.
Have a look at this structure diagram and flowchart for the algorithm to select
the largest, Max, and smallest, Min, numbers from a list of ten numbers. This
time the flowchart is more easily readable than the structure chart:
Max and Min

Output Max
Enter values              Check all values
and Min

Check for Max              Check for Min

▲ Figure 7.18 Structure chart for Max and Min` },
  { printedPage: 289, sha256: '2dba68a23018cabd0cff9e9ffcd1a30f39b6b4d0d3892eebe1a3aa3365405527', text: String.raw`7.9 Writing and amending algorithms

START

Counter ← 0

INPUT Number

Highest ← Number
Lowest ← Number

INPUT Number

Number >        yes
Highest ← Number
Highest?

no

Number <        yes
Lowest ← Number
Lowest?

no

Counter ← Counter + 1

yes       Counter <
9?

no

Output Highest, Lowest

STOP

▲ Figure 7.19 A more easily understandable flowchart for Max and Min

Example 1: Writing algorithms in pseudocode
Tickets are sold for a concert at $20 each. If 10 tickets are bought then the discount is 10%,
if 20 tickets are bought the discount is 20%. No more than 25 tickets can be bought in a
single transaction.
a Use pseudocode to write the algorithm to calculate the cost of buying a given number
of tickets.` },
];
