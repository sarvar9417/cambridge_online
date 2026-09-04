export const CHAPTER_7_SOURCE_TRANSCRIPT_CORRECTIONS_274_279 = [
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
Starting the loop at                   IF StudentMark[Counter] > MaximumMark
the second position in
the list.                                THEN
MaximumMark ← StudentMark[Counter]
ENDIF
IF StudentMark[Counter] < MinimumMark
THEN
MinimumMark ← StudentMark[Counter]
ENDIF
NEXT Counter

Calculating the average (mean) of all the values in a list is an extension of the
totalling method, for example, calculating the average mark for a class of students.

Total ← 0
FOR Counter ← 1 TO ClassSize
Total ← Total + StudentMark[Counter]                     Calculating the
NEXT Counter                                                average from the total
after the loop has
Average ← Total / ClassSize                                 been completed

7.4.4 Linear search
A search is used to check if a value is stored in a list, performed by
systematically working through the items in the list. There are several standard
search methods, but you only need to understand one method for IGCSE Computer
Science. This is called a linear search, which inspects each item in a list in turn
to see if the item matches the value searched for.
For example, searching for a name in a class list of student names, where all the
names stored are different:
Setting a variable,
OUTPUT "Please enter name to find "                         Found, as a flag, using
INPUT Name                                                  TRUE and FALSE to
indicate if the name
Found ← FALSE                                               has been found or not
Counter ← 1
REPEAT                                                      Checking if the name
input matches a name
IF Name = StudentName[Counter]                           in the list` },
  { printedPage: 275, sha256: 'a4a9a107c75d4d5c068bb275db3e87913aa5156a53b9672268a6585935e186e8', text: String.raw`7.4 Standard methods of solution

THEN
Found ← TRUE                                        Setting the flag to
TRUE when a match
ELSE                                                   is found
Counter ← Counter + 1
ENDIF
Stopping the search
UNTIL Found OR Counter > ClassSize                         when a match is
IF Found                                                   found or the whole
list has been searched
THEN
Outputting the
position in the list                   OUTPUT Name, " found at position ",
when a match is                    Counter, " in the list."
found                                 ELSE
OUTPUT Name, " not found."
ENDIF

In this example, the search checks how many people chose ice cream as their
favourite dessert, where several values in the list can be the same.

ChoiceCount ← 0
FOR Counter ← 1 TO Length
Checking ice cream
IF "ice cream" = Dessert[Counter]                           has been chosen
THEN
ChoiceCount ← ChoiceCount + 1
Checking every item
NEXT Counter                                                in the list
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
The IF..THEN                            IF Temperature[Index] > temperature[Index + 1]
condition checks
if temperatures                             THEN
are in ascending                              Temp ← Temperature[Index]
order and swaps
them if they are                              Temperature[Index] ← Temperature[Index + 1]
not, using the Temp                           Temperature[Index + 1] ← Temp
variable (short for
Swap ← TRUE
temporary)
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
the number of                               THEN
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
] as const;
