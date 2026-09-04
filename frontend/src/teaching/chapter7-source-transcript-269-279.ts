import type { Chapter7SourcePageTranscript } from './chapter7-source-transcript';

export const CHAPTER_7_SOURCE_TRANSCRIPT_269_279: Chapter7SourcePageTranscript[] = [
  { printedPage: 269, sha256: 'aa279fedd9c8925592aca7e27dfd1cd2c7af14043ebd5afc823ae48f238bba40', text: String.raw`7.2 Computer systems, sub-systems and decomposition

Pseudocode includes these three different types of loop structure:
A set number of repetitions                               FOR … TO … NEXT
A repetition, where the number of repeats is not          REPEAT … UNTIL
known, that is completed at least once:
A repetition, where the number of repeats is not          WHILE … DO …
known, that may never be completed:                       ENDWHILE

All types of loops can all perform the same task, for example displaying ten
stars:

FOR Counter ← 1 TO 10                                         A FOR … NEXT
loop
OUTPUT "*"
NEXT Counter

Counter ← 0                                                   A REPEAT …
REPEAT                                                        UNTIL loop

OUTPUT "*"
Counter ← Counter + 1
UNTIL Counter > 9

Counter ← 0                                                   A WHILE … DO …
WHILE Counter < 10 DO                                         ENDWHILE loop

OUTPUT "*"
Counter ← Counter + 1
ENDWHILE

As you can see, the FOR … TO … NEXT loop is the most efficient way for
a programmer to write this type of task as the loop counter is automatically
managed.
FOR … TO … NEXT loops
A variable is set up, with a start value and an end value, this variable is
Link                               incremented in steps of one until the end value is reached and the iteration
finishes. The variable can be used within the loop so long as its value is not
For more on arrays
changed. This type of loop is very useful for reading values into lists with a
see Chapter 8.
known length.
Counter starts at 1 and
FOR Counter ← 1 TO 10                                     finishes at 10
OUTPUT "Enter Name of Student "
INPUT StudentName[Counter]                           Array (see Chapter 8)
items StudentName[1]
NEXT                                                      to StudentName[10]
have data input` },
  { printedPage: 270, sha256: '514a1b596fe832525145d5d930bf9379681fb97f6bde6b935dbd304abf165ca4', text: String.raw`7 Algorithm design and problem solving

REPEAT … UNTIL loop
This loop structure is used when the number of repetitions/iterations is not
known and the actions are repeated UNTIL a given condition becomes true. The
actions in this loop are always completed at least once. This is a post-condition
loop as the test for exiting the loop is at the end of the loop.
Total ← 0                                                             Variables
Mark ← 0                                                              Total and
Mark are both
REPEAT                                                                initialised to
Total ← Total + Mark                                            zero.
OUTPUT "Enter value for mark, -1 to finish "
INPUT Mark                                                      At least one
UNTIL Mark = -1                                                       mark is entered.

WHILE … DO … ENDWHILE loop
This loop structure is used when the number of repetitions/iterations is not known
and the actions are only repeated WHILE a given condition is true. If the WHILE
condition is untrue then the actions in this loop are never performed. This is a
pre-condition loop as the test for exiting the loop is at the beginning of the loop.
Total ← 0                                                             Only the
OUTPUT "Enter value for mark, -1 to finish "                          variable Total
is initialised to
INPUT Mark                                                            zero
WHILE Mark <> -1 DO
Total ← Total + Mark                                            Condition
tested at start
OUTPUT "Enter value for mark, -1 to finish"
of loop
INPUT Mark
ENDWHILE

The pseudocode for input and output statements
INPUT and OUTPUT are used for the entry of data and display of information.
Sometimes READ can be used instead of INPUT but this is usually used for
reading from files – see Chapter 8. Also, PRINT can be used instead of OUTPUT
if a hard copy is required.
INPUT is used for data entry; it is usually followed by a variable where the data
input is stored, for example:
INPUT Name

INPUT StudentMark

OUTPUT is used to display information either on a screen or printed on paper;
it is usually followed by a single value that is a string or a variable, or a list of
values separated by commas, for example:
OUTPUT Name

OUTPUT "Your name is ", Name

OUTPUT Name1, "Ali", Name3` },
  { printedPage: 271, sha256: 'b2d97e8fba31c86e7861c8099ca509e610dcb985509d99bd30e23d618b4d6a41', text: String.raw`7.3 Explaining the purpose of an algorithm

7.3 Explaining the purpose of an algorithm
An algorithm sets out the steps to complete a given task. This is usually shown
as a flowchart or pseudocode, so that the purpose of the task and the processes
needed to complete it are clear to those who study it.
You will be able to practise this skill as you become more familiar with writing
and finding and correcting errors in algorithms.

Example 1: Output an alarm sound
The purpose of the following pseudocode is to output the alarm sound at the
appropriate time. The processes are: waiting 10 seconds, getting the current time,
checking the current time with the alarm time, and outputting the alarm sound when
the times match.

REPEAT                                                     Waits for 10
seconds
Wait (10)
Get (Time)                                            Get current time from
UNTIL Time = Alarm _ Time                                  the system clock

OUTPUT AlarmSound

Activity 7.6
Have a look at the flowchart and pseudocode below:
» identify the purpose of the algorithm that they both represent
» identify the processes included in the algorithm.
What would be output if the numbers 7 and 18 were input?

START

INPUT
Num1, Num2

INPUT Num1, Num2
IF Num1 > Num2
Num1 >             yes       PRINT Num1,                  THEN PRINT NUM1, " is largest"
Num2?                      " is largest"
ELSE PRINT NUM2, " is largest"
ENDIF
no

PRINT Num2,
" is largest"

STOP

▲ Figure 7.11 Flowchart and pseudocode` },
  { printedPage: 272, sha256: '29079052e7bf327a632b542c335244f14632947454509bb3e5cdd33e2f4ab888', text: String.raw`7 Algorithm design and problem solving

7.4 Standard methods of solution
The ability to repeat existing methods is very important in the design of
algorithms; when an algorithm is turned into a program the same methods may
be repeated many thousands of times.
You need to be able to use and understand these standard methods used in
algorithms:
» Totalling
» Counting
» Finding maximum, minimum, and average (mean) values
» Searching using a linear search
» Sorting using a bubble sort.

All the standard methods of solution are shown as pseudocode algorithms and
will be used to practise program writing in the next chapter.

7.4.1 Totalling
Totalling means keeping a total that values are added to. For example, keeping a
running total of the marks awarded to each student in a class.

Total ← 0                                                        Initialising
Total to zero
FOR Counter ← 1 TO ClassSize
Total ← Total + StudentMark[Counter]
Totalling the marks
NEXT Counter
in an array called
StudentMark

7.4.2 Counting
Keeping a count of the number of times an action is performed is another
standard method. For example, counting the number of students that were
awarded a pass mark:

PassCount ← 0
Initialising
FOR Counter ← 1 TO ClassSize                                     PassCount to
INPUT StudentMark                                           zero

IF StudentMark > 50

THEN
PassCount ← PassCount + 1                      Counting the
number of passes
NEXT Counter
Count ← Count + 1` },
  { printedPage: 273, sha256: '1e50318a1ae71415bb561bc3bcb667fbbcf31362c0513e6a3e4e7fb60a4a2676', text: String.raw`7.4 Standard methods of solution

Counting is also used to count down until a certain value is reached, for example,
checking the number of items in stock in a supermarket:

:
NumberInStock ← NumberInStock - 1                            Counting down
items in stock
IF NumberInStock < 20
THEN
CALL Reorder()
:

7.4.3 Maximum, minimum and average
Finding the largest and smallest values in a list are two standard methods that
are frequently found in algorithms, for example, finding the highest and lowest
mark awarded to a class of students.
Initialising
maximum to the                    MaximumMark ← 0
lowest mark                                                                                   Initialising
MinimumMark ← 100                                           minimum to the
possible
highest possible
FOR Counter ← 1 TO ClassSize
IF StudentMark[Counter] > MaximumMark
Calls data from an
array (see Chapter 8)                     THEN
called StudentMark)                         MaximumMark ← StudentMark[Counter]
Replacing the
ENDIF                                                   maximum mark
with a higher mark
IF StudentMark[Counter] < MinimumMark
THEN
MinimumMark ← StudentMark[Counter]
Replacing the
ENDIF                                                   minimum mark
with a lower mark
NEXT Counter` },
  { printedPage: 274, sha256: '34f11e4ee43ed75dd49d1aa9821c55834bfea0818d2eb9a229efc327c6354817', text: String.raw`7 Algorithm design and problem solving

If the largest and smallest values are not known, an alternative method is to set
the maximum and minimum values to the first item in the list.
For example, using this method to find the highest and lowest mark awarded to a
class of students.

MaximumMark ← StudentMark[1]
Initialising minimum
MinimumMark ← StudentMark[1]                                and maximum to the
first mark
FOR Counter ← 2 TO ClassSize
IF StudentMark[Counter] > MaximumMark
THEN
MaximumMark ← StudentMark[Counter]
ENDIF
IF StudentMark[Counter] < MinimumMark
THEN
MinimumMark ← StudentMark[Counter]
ENDIF
NEXT Counter

The average (mean) can also be found by using a running total and dividing the
total by the number of values at the end of the process. For example, finding the
average mark for a class of students.

Total ← 0
FOR Counter ← 1 TO ClassSize
Total ← Total + StudentMark[Counter]
NEXT Counter
Average ← Total / ClassSize

7.4.4 Linear search
A linear search looks at each item in a list in turn and compares it with the item being
searched for. It either stops when the item is found or when every item has been
checked. For example, searching a list of students’ names to find the position of a
student’s name in the list.

OUTPUT "Please enter name to find "
INPUT Name
Found ← FALSE
Counter ← 1
REPEAT
IF Name = StudentName[Counter]` },
  { printedPage: 275, sha256: 'a4a9a107c75d4d5c068bb275db3e87913aa5156a53b9672268a6585935e186e8', text: String.raw`7.4 Standard methods of solution

THEN
Found ← TRUE
ELSE
Counter ← Counter + 1
ENDIF
UNTIL Found OR Counter > ClassSize
IF Found
THEN
OUTPUT Name, " found at position ",
Counter, " in the list."
ELSE
OUTPUT Name, " not found."
ENDIF

In this example, the search checks how many people chose ice cream as their
favourite dessert, where several values in the list can be the same.

ChoiceCount ← 0
FOR Counter ← 1 TO Length
IF "ice cream" = Dessert[Counter]
THEN
ChoiceCount ← ChoiceCount + 1
NEXT Counter
OUTPUT ChoiceCount, " chose ice cream
as their favourite dessert."

7.4.5 Bubble sort
Lists can be more useful if the items are sorted in a meaningful order. For
example, names could be sorted in alphabetical order, or temperatures could
be sorted in ascending or descending order. There are several standard sorting
methods available, but you only need to understand one method for IGCSE
Computer Science.
This method of sorting is called a bubble sort. Each element is compared with
the next element and swapped if the elements are in the wrong order, starting
from the first element and finishing with next-to-last element. Once it reaches
the end of the list, we can be sure that the last element is now in the correct
place. However, other items in the list may still be out of order. Each element
in the list is compared again apart from the last one because we know the final
element is in the correct place. This continues to repeat until there is only one
element left to check or no swaps are made.` },
  { printedPage: 276, sha256: '127a4cbdbcfac526f50692d871183e6041aeae51ab3c73b83d7c4c816aca5ee9', text: String.raw`7 Algorithm design and problem solving

For example, the bubble sort algorithm can be used to sort a list of ten
temperatures stored in the array, Temperature[], into ascending order. It
could be written in pseudocode as:

First ← 1
Last ← 10
REPEAT
Swap ← FALSE
FOR Index ← First TO Last - 1
IF Temperature[Index] > temperature[Index + 1]
THEN
Temp ← Temperature[Index]
Temperature[Index] ← Temperature[Index + 1]
Temperature[Index + 1] ← Temp
Swap ← TRUE
ENDIF
NEXT Index
Last ← Last - 1
UNTIL (NOT Swap) OR Last = 1

7.5 Validation and verification
In order for computer systems to only accept data inputs that are reasonable and
accurate, every item of data needs to be examined before it is accepted by the
system.
Two different methods, with very similar sounding names, are used. For
data entry, validation ensures that only data that is reasonable is accepted.
Verification is used to check that the data does not change as it is being
entered.

7.5.1 Validation
Validation is the automated checking by a program that data is reasonable
before it is accepted into a computer system. When data is validated by a
computer system, if the data is rejected a message should be output explaining
why the data was rejected and another opportunity given to enter the data.
There are many different types of validation checks including:
» range checks
» length checks
» type checks
» presence checks
» format checks
» check digits.` },
  { printedPage: 277, sha256: '9683e53af57ec2447b42c5f5c5d9094571d7fd7df1655556d3efd966af67c2e4', text: String.raw`7.5 Validation and verification

Different types of check may be used on the same piece of data; for example, an
examination mark could be checked for reasonableness by using a range check, a
type check and a presence check.
Range check
A range check checks that the value of a number is between an upper value and
a lower value. For example, checking that percentage marks are between 0 and
100 inclusive:

OUTPUT "Please enter the student's mark "
REPEAT
INPUT StudentMark
IF StudentMark < 0 OR StudentMark > 100
THEN
OUTPUT "The student's mark should be in the range
0 to 100, please re-enter the mark "
ENDIF
UNTIL StudentMark >= 0 AND StudentMark <= 100

Length check
A length check checks either:
» that data contains an exact number of characters, for example that a password
must be exactly eight characters in length so that passwords with seven or
fewer characters or nine or more characters would be rejected, for instance:

Password has a                     OUTPUT "Please enter your password of eight
data type of string                characters "
and LENGTH is                      REPEAT
the pseudocode
operation that                          INPUT Password
returns a whole                         IF LENGTH(Password) <> 8
number showing
THE number of                               THEN
characters in the                            OUTPUT "Your password must be exactly eight
string                                                  characters, please re-enter "
ENDIF
UNTIL LENGTH(Password) = 8

» or that the data entered is a reasonable number of characters, for example,
a family name could be between two and thirty characters inclusive so that
names with one character or thirty-one or more characters would be rejected.` },
  { printedPage: 278, sha256: 'b4aef10c472a651a2e93ee0db5cf947a300bcae5399eda059b495430f22cae40', text: String.raw`7 Algorithm design and problem solving

OUTPUT "Please enter your family name "
FamilyName has a
data type of string                    REPEAT
and LENGTH is the                         INPUT FamilyName
pseudocode operation
that returns a whole                      IF LENGTH(FamilyName) > 30 OR LENGTH(FamilyName) < 2
number showing the                            THEN
number of characters
OUTPUT "Too short or too long,
in the string
please re-enter "
ENDIF
UNTIL LENGTH(FamilyName) <= 30 AND LENGTH(FamilyName) >= 2

Link
Type check
To understand some
A type check checks that the data entered is of a given data type, for example,
of the concepts and
that the number of brothers or sisters would be an integer (whole number).
commands in this
code, such as DIV,
OUTPUT "How many brothers do you have? "
see Chapter 8.
REPEAT
INPUT NumberOfBrothers
Find out more                IF NumberOfBrothers <> DIV(NumberOfBrothers, 1)

Programming is                         THEN
covered in Chapter 8.                    OUTPUT "This must be a whole number, please re-enter"
When you have started
your programming,                   ENDIF
find out how you
could test for a whole
UNTIL NumberOfBrothers = DIV(NumberOfBrothers, 1)
number and write and
test a program for this
validation rule.
Presence check
A presence check checks to ensure that some data has been entered and the
value has not been left blank, for example, an email address for an online
transaction must be completed.

OUTPUT "Please enter your email address "
REPEAT
INPUT EmailAddress
IF EmailAddress = ""
THEN
OUTPUT "*=Required "
ENDIF
UNTIL EmailAddress <> ""` },
  { printedPage: 279, sha256: '26a1e66211f93d9299df8c5e88b6a0edfa1f45b1040b463838aa977d3b410dc1', text: String.raw`7.5 Validation and verification

▲ Figure 7.12 Presence check error message

Format check and check digit
A format check checks that the characters entered conform to a pre-defined
pattern, for example, in Chapter 9 the cub number must be in the form CUB9999.
The pseudocode for this example will be given in the string handling section of
Chapter 9.
A check digit is the final digit included in a code; it is calculated from all the
other digits in the code. Check digits are used for barcodes, product codes,
Link                               International Standard Book Numbers (ISBN) and Vehicle Identification Numbers
ISBN and modulo-11                 (VIN).
check digit                        Check digits are used to identify errors in data entry caused by mis-typing or
calculations are                   mis-scanning a barcode. They can usually detect the following types of error:
covered in Chapter 2.
» an incorrect digit entered, for example, 5327 entered instead of 5307
» transposition errors where two numbers have changed order for example 5037
instead of 5307
» omitted or extra digits, for example, 537 instead of 5307 or 53107 instead of
5307
» phonetic errors, for example, 13, thirteen, instead of 30, thirty.

I S B N 97 8 -0 -34 0- 98 3 8 2 -9

9   780340 983829

▲ Figure 7.13 ISBN 13 code with check digit

Find out more

1 Find an ISBN, then show that its check digit is correct.
Working in pairs find two ISBNs each, copy one down with a transposition error and
the other one correctly.
Swap your ISBNs and see if you can find the one with the error.
Look at a correct ISBN, can you think of an error that this system will not identify
and explain with an example why this is the case?
2 Find out how limit checks and consistency checks are used.` },
];
