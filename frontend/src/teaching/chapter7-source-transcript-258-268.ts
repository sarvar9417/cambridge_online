import type { Chapter7SourcePageTranscript } from './chapter7-source-transcript';

export const CHAPTER_7_SOURCE_TRANSCRIPT_258_268: Chapter7SourcePageTranscript[] = [
  { printedPage: 258, sha256: 'ee148ad9c1d85154cd634a8ad2fc2e5ec7b2cd00f3169a5458f2a47d3deea029', text: String.raw`7                         Algorithm design and
problem solving
In this chapter, you will learn about:
★ the stages in the program development cycle:
– analysis
– design
– coding
– testing
★ computer systems and sub-systems
★ problem decomposition into component parts
★ methods used to design and construct solutions to problems
★ the purpose of an algorithm and the processes involved in it
★ standard methods of solution:
– linear search
– bubble sort
– totalling
– counting
– finding average, maximum, minimum
★ validation checks when data is input
★ verification checks when data is input
★ use of different types of test data including:
– documentation of a dry run using a trace table
★ writing, amending, identifying, and correcting errors in:
– flowcharts
– programs
– pseudocode.

7.1 The program development life cycle
The program development life cycle is divided into five stages: analysis, design,
coding, testing and maintenance. This chapter and Chapter 8 will discuss the four
stages listed below:
» analysis
» design
» coding
» testing

7.1.1 Analysis
Before any problem can be solved, it needs to be clearly defined and set out so
anyone working on the solution understands what is needed. This is called the
‘requirements specification’ for the program. The analysis stage uses abstraction
and decomposition tools to identify exactly what is required from the program.
Abstraction keeps the key elements required for the solution to the problem
and discards any unnecessary details and information that is not required. For
example, a map only shows what is required for travelling from one place to
another. Different methods of transport will require different types of map.` },
  { printedPage: 259, sha256: '0337f232769345ea19b291c8b97507fa5a3525c9b29aa855c658d50328ec2871', text: String.raw`7.1 The program development life cycle

Ely

Hardwick                                                     Harston Addenbrooke’s
Cambourne              Parkway
Waterbeach
Bourn                 Eddington
Airfield                                Cambridge
North                          Cambridge
Mainline

Shepreth Dullingham
Cambridge Cherry
City    Hinton

Brinkley                           Shelford
Fulbourn Balsham
Newmarket
Great   Six Mile       Foxton                            Granta Park
Wilbraham Parkway                                                                     Sawston             Haverhill
Linton

Great Chesterford
Meldreth

Whittlesford
Audley End                                                      Parkway
Royston

Hinxton Hall

▲ Figure 7.1  Road map and rail map

Decomposition breaks down a complex problem into smaller parts, which can
then be subdivided into even smaller parts, that can be solved easily. Any daily
Find out more               task can be divided into its constituent parts.
Decompose getting                  For example, getting dressed:
dressed further, it can
get quite complicated              » Select items to wear
to show all the details            » Remove any clothes being worn
required.                          » Put selected items on in order.

7.1.2 Design
The program specification from the analysis stage is used to show to how
the program should be developed. When the design stage is complete, the
programmer should know what is to be done, i.e. all the tasks that need to be
completed, how each task is to be performed and how the tasks work together.
This can be formally documented using structure charts, flowcharts and
pseudocode – see Section 7.2.

7.1.3 Coding and iterative testing
The program or set of programs is developed. Each module of the program is
written using a suitable programming language and then tested to see if it
works. Iterative testing means that modular tests are conducted, code amended,
and tests repeated until the module performs as required.

7.1.4 Testing
The completed program or set of programs is run many times with different sets
of test data. This ensures that all the tasks completed work together as specified
in the program design.` },
  { printedPage: 260, sha256: '0c3b5b7ec5de116de5fc4912cdf134b1c44fdf3f47c50f534b5074363ce636c0', text: String.raw`7 Algorithm design and problem solving

7.2 Computer systems, sub-systems and
decomposition
A computer system is made up of software, data, hardware, communications
and people; each computer system can be divided up into a set of sub-systems.
Each sub-system can be further divided into sub-systems and so on until each
sub-system just performs a single action.
Computer systems can be very large, very small or any size in between; most
people interact with many different computer systems during their daily life
Find out more               without realising it.
Find at least five                 For example, when you wake up in the morning, you might use an app on your
computer systems you               smartphone for your alarm, then you might check the weather forecast on your
frequently use in your             computer before driving to work.
daily life; see if you can
decide the size of each            The alarm program is a very small computer system but when you check the
system.                            weather forecast, you obtain the information you need from one of the largest
computer systems in the world.

7.2.1 The computer system and its sub-systems
In order to understand how a computer system is built up and how it works it is
often divided up into sub-systems. This division can be shown using top-down
design to produce structure diagrams that demonstrate the modular construction of
the system. Each sub-system can be developed by a programmer as a sub-routine.
How each sub-routine works can be shown by using flowcharts or pseudocode.
Top-down design is the decomposition of a computer system into a set of sub-
systems, then breaking each sub-system down into a set of smaller sub-systems,
until each sub-system just performs a single action. This is an effective way
of designing a computer system to provide a solution to a problem, since each
part of the problem is broken down into smaller more manageable problems. The
process of breaking down into smaller sub-systems is called stepwise refinement.
This structured approach works for the development of both large and small
computer systems. When larger computer systems are being developed this means
that several programmers can work independently to develop and test different
sub-systems for the same system at the same time. This reduces the development
and testing time.

7.2.2 Decomposing a problem
Any problem that uses a computer system for its solution needs to be
decomposed into its component parts. The component parts of any computer
system are:
» inputs – the data used by the system that needs to be entered while the
system is active
» processes – the tasks that need to be performed using the input data and any
other previously stored data
» outputs – information that needs to be displayed or printed for the users of
the system
» storage – data that needs to be stored in files on an appropriate medium for
use in the future.` },
  { printedPage: 261, sha256: 'e5505cb6dbddbd73bcb200f31a30f1a96f4fd923f9feee246fa84f0563840425', text: String.raw`7.2 Computer systems, sub-systems and decomposition

Example 1: An alarm app
For example, the alarm app can be decomposed into:
» inputs – time to set the alarm, remove a previously set alarm time, switch an
alarm off, press snooze button
» processes – continuously check if the current time matches an alarm time that has
been set, storage and removal of alarm times, management of snooze
» outputs – continuous sound/tune (at alarm time or after snooze time expired)
» storage – time(s) for alarms set.

Activity 7.1
Using one of the computer systems that you identified, decompose it into its
component parts of inputs, processes, outputs and storage.

7.2.3 Methods used to design and construct a solution
to a problem
Solutions to problems need to be designed and developed rigorously. The use of
formal methods enables the process to be clearly shown for others to understand
the proposed solution. The following methods need to be used by IGCSE
Computer Science students:
» structure diagrams
» flowcharts
» pseudocode.

Structure diagrams
Structure diagrams can be used to show top-down design in a diagrammatic
form. Structure diagrams are hierarchical, showing how a computer system
solution can be divided into sub-systems with each level giving a more detailed
breakdown. If necessary, each sub-system can be further divided.

System

Sub-system 1           Sub-system 2           Sub-system 3

Sub-system 1.1         Sub-system 1.2

▲ Figure 7.2 Basic structure diagram` },
  { printedPage: 262, sha256: 'a8e73085b51d9f47dee09e790d4b1a447177495ee3ce6b57f91b24c1919f53c7', text: String.raw`7 Algorithm design and problem solving

Example 2: Alarm app for a smart phone
Consider the alarm app computer system for a smart phone; this could be divided
into three sub-systems, setting the alarm, checking for the alarm time, sounding the
alarm. These sub-systems could then be further sub-divided; a structure diagram
makes the process clearer.

Alarm app

Find out more

Draw a structure                                   Set alarm                       Check time                    Sound alarm
diagram for cleaning
your teeth. If you are
brave enough ask
Play sound for two
another student to try                 Set time          Turn alarm on/off
minutes
Check off/snooze   Reset/clear alarm
out the system to see if
it works.                          ▲ Figure 7.3 Structure diagram for alarm app

Activity 7.2
Break down the ‘Check time’ sub-system from the smart phone alarm app into
further sub-systems.

Flowcharts
A flowchart shows diagrammatically the steps required to complete a task and
the order that they are to be performed. These steps, together with the order, are
called an algorithm. Flowcharts are an effective way to communicate how the
algorithm that makes up a system or sub-system works.

Example 3: Checking for the alarm time
Have a look at a flowchart showing how the checking for the alarm time sub-system
works.

START

Get Time

Time =               No        Wait 30
Alarm
seconds
Time?

Yes

Sound Alarm

Figure 7.4 Flowchart for check
▲

STOP
time sub-system` },
  { printedPage: 263, sha256: '24b7378ab90cd136fa4f7a5bdb2d396dc89e562ec6a479c21f637ffc29b4273d', text: String.raw`7.2 Computer systems, sub-systems and decomposition

Flowcharts are drawn using standard flowchart symbols.
Begin/End
Terminator flowchart symbols are used at the beginning and end of each
flowchart.

START

STOP

▲ Figure 7.5 Terminator symbols

Process
Process flowchart symbols are used to show actions, for example, when values
are assigned to variables. If a process has been defined elsewhere then the name
of that process is shown.

Process details
A ← 0
included in this            Sort list
B ← 0
flowchart symbol

This symbol means
this process is
defined elsewhere

▲ Figure 7.6 Process symbols

Input and output
The same flowchart symbol is used to show the input of data and output of
information.

INPUT X                        OUTPUT
"Error"

▲ Figure 7.7 Symbol used to show input and symbol used to show output

Decision
Decision flowchart symbols are used to decide which action is to be taken next;
these can be used for selection and repetition/iteration. There are always two
outputs from a decision flowchart symbol.

yes
x > B?                   B ← x
Both flow lines out of
a decision box should               no
be clearly labelled.

▲ Figure 7.8 Decision symbol` },
  { printedPage: 264, sha256: '47dd001d866e86de2bfd74c8bd074ba6ffad03a681be5f7666f34c1748190914', text: String.raw`7 Algorithm design and problem solving

Flow lines
▲ Figure 7.9 Flow line              Flowchart flow lines use arrows to show the direction of flow, which is usually,
but not always, top to bottom and left to right.

Example 4: Concert ticket sales
Tickets are sold for a concert at $20 each, if 10 tickets are bought then the discount
is 10%, if 20 tickets are bought the discount is 20%. No more than 25 tickets can be
bought in a single transaction.
This is flowchart showing an algorithm to calculate the cost of buying a given number
of tickets:
START

OUTPUT "How many tickets
would you like to buy?"

INPUT N

Variable name for number
no           N >= 1 AND             of tickets is N and discount
N < 26?              is D so that the text can fit
in the flowchart boxes.

yes

N < 10?         yes
D ← 0

no

N < 20?         yes
D ← 0.1

no

D ← 0.2

Cost ← N * (1 – D)

OUTPUT "Your tickets
cost ", Cost

STOP

▲ Figure 7.10 Flowchart for ticket cost calculator` },
  { printedPage: 265, sha256: 'dcc702b84f4df3b0e36d4b3c18a61af3266e48b11872e76ad52bce9eaa55e1a8', text: String.raw`7.2 Computer systems, sub-systems and decomposition

Pseudocode
Pseudocode is a simple method of showing an algorithm. It describes what the
algorithm does by using English key words that are very similar to those used in
a high-level programming language. Data items to be processed by the algorithm
are given meaningful names in the same way that variables and constants are in
a high-level programming language. However, pseudocode is not bound by the
strict syntax rules of a programming language. It does what its name says, it
pretends to be programming code!
To ensure that pseudocode is easily understandable by others it is useful to be
consistent in the way that it is written.
The pseudocode in this book is written in the following way to match the
pseudocode given in the IGCSE Computer Science syllabus and to help you
understand the algorithms more easily:
» a non-proportional font is used throughout
» all keywords (words used to describe a specific action e.g. INPUT) are written
in capital letters
» all names given to data items and subroutines start with a capital letter
» where conditional and loop statements are used, repeated or selected
statements are indented by two spaces.

The pseudocode for an assignment statement
A value is assigned to an item/variable using the ¨ operator. The variable on the
left of the ¨ is assigned the value of the expression on the right. The expression
on the right can be a single value or several values combined with any of the
following mathematical operators.
▼ Table 7.1 Mathematical operators

Operator             Action
+                    Add
−                    Subtract
*                    Multiply
/                    Divide
^                    Raise to the power
(   )                Group

Examples of pseudocode assignment statements:
Cost ¨ 10                                         Cost has the value 10

Price ¨ Cost * 2                                  Price has the value 20

Tax ¨ Price * 0.12                                Tax has the value 2.4

SellingPrice ¨ Price + Tax                        SellingPrice has the value 22.4

Gender ¨ "M"                                      Gender has the value M

Chosen ¨ False                                    Chosen has the value False` },
  { printedPage: 266, sha256: '0eaa5392dd0b651356807a2c2720e0b0f1d4bdfd5de3bb06a13e1cbf29469056', text: String.raw`7 Algorithm design and problem solving

Activity 7.3
What values will the following variables have after the assignments have been
completed?

Amount ← 100
TotalPrice ← Amount * 3.5
Discount ← 0.2
FinalPrice ← TotalPrice – TotalPrice * Discount
Name ← "Nikki"
Message ← "Hello " + Name

The pseudocode for conditional statements
When different actions are performed by an algorithm according to the values of
the variables, conditional statements can be used to decide which action should
be taken.
There are two types of conditional statement:
1 a condition that can be true or false such as: IF … THEN … ELSE … ENDIF
IF Age < 18
THEN
OUTPUT "Child"
ELSE
OUTPUT "Adult"
ENDIF

2 a choice between several different values, such as: CASE OF …
OTHERWISE … ENDCASE
CASE OF Grade
"A" : OUTPUT "Excellent"
"B" : OUTPUT "Good"
"C" : OUTPUT "Average"
OTHERWISE OUTPUT "Improvement is needed"
ENDCASE

IF … THEN … ELSE … ENDIF
For an IF condition the THEN path is followed if the condition is true and the
ELSE path is followed if the condition is false. There may or may not be an
ELSE path. The end of the statement is shown by ENDIF.` },
  { printedPage: 267, sha256: 'b24d4c7388c7a8343091347e50a2955628332e6a6a934c730d7f7d235537d7fa', text: String.raw`7.2 Computer systems, sub-systems and decomposition

There are different ways that an IF condition can be set up:
» use of a Boolean variable that can have the value TRUE or FALSE (see
Chapter 8 for details of Boolean variables). For example:

IF Found
THEN
OUTPUT "Your search was successful"
ELSE
OUTPUT "Your search was unsuccessful"
ENDIF

» comparisons made by using comparison operators, where comparisons are
made from left to right, for example: A > B means ‘A is greater than B’
Comparisons can be simple or more complicated, for example:

IF ((Height > 1) OR (Weight > 20)) AND (Age < 70) AND
(Age > 5)
THEN
OUTPUT "You can ride"
ELSE
OUTPUT "Too small, too young or too old"
ENDIF

▼ Table 7.2 Comparison operators

Operator             Comparison
>                    Greater than
<                    Less than
=                    Equal
>=                   Greater than or equal
<=                   Less than or equal
<>                   Not equal
AND                  Both
OR                   Either
NOT                  Not` },
  { printedPage: 268, sha256: 'cf1e2729abecce196b07f21371f566c17f1fdd729dd7a9d3d61f8ac69095708c', text: String.raw`7 Algorithm design and problem solving

Have a look at the algorithm below that checks if a percentage mark is valid and
whether it is a pass or a fail. This makes use of two IF statements; the second
IF statement is part of the first ELSE path. This is called a nested IF.

Find out more                OUTPUT "Please enter a mark "
INPUT PercentageMark
Programming is                                                                                      A rejected
covered in Chapter 8.               IF PercentageMark < 0 OR PercentageMark > 100                   percentage mark
When you have started                  THEN                                                         must be either
your programming,                                                                                   less than zero or
write and test a                         OUTPUT "Invalid Mark"                                      greater than 100
program for this                       ELSE
algorithm.
IF PercentageMark > 49
This is a nested IF
THEN                                                  statement, shown
OUTPUT "Pass"                                       clearly by the use
of a second level
ELSE                                                  of indentation. The
OUTPUT "Fail"                                       percentage mark
is only tested if it
ENDIF
is in the correct
ENDIF                                                           range

Activity 7.4
Re-write the algorithm to check for a mark between 0 and 20 and a pass mark of 10.

CASE OF … OTHERWISE … ENDCASE
For a CASE statement the value of the variable decides the path to be taken.
Several values are usually specified. OTHERWISE is the path taken for all other
values. The end of the statement is shown by ENDCASE.
Have a look at the algorithm below that specifies what happens if the value of
Choice is 1, 2, 3 or 4.

CASE OF Choice
1 : Answer ← Num1 + Num2
2 : Answer ← Num1 - Num2
3 : Answer ← Num1 * Num2
4 : Answer ← Num1 / Num2
OTHERWISE OUTPUT "Please enter a valid choice"
ENDCASE

Activity 7.5
Use a CASE statement to display the day of the week if the variable DAY has a
whole number value between 1 and 7 inclusive and an error message otherwise.

The pseudocode for iteration
When some actions performed as part of an algorithm need repeating this is
called iteration. Loop structures are used to perform the iteration.` },
];
