-- Source-backed normalization for explicit Cambridge row/table rubrics.
-- Only transforms unused one-point/no-group manual wrappers.
-- Rows whose award depends on lost shading/underlining/spatial layout are excluded.

create temp table tmp_atomic_0058_target(year int,series text,component int,variant int,path text,expected_marks int,scheme_kind text,family text) on commit drop;
insert into tmp_atomic_0058_target values
(2021,'MJ',1,2,'6.a',2,'all_required','ascii2'),(2021,'MJ',1,3,'8',3,'all_required','gates3'),
(2021,'ON',1,1,'5.c.ii',2,'all_required','sqlinsert2'),(2021,'ON',1,3,'5.c.ii',2,'all_required','sqlinsert2'),
(2021,'ON',1,2,'8.b.i',4,'all_required','bitwise4'),(2022,'MJ',1,3,'1.b',5,'all_required','values5'),
(2022,'ON',1,2,'7.c',3,'all_required','fde3'),(2022,'ON',1,3,'2.a',3,'all_required','db3'),(2022,'ON',1,3,'7.a',3,'all_required','cloud3'),(2023,'ON',1,3,'9.b',4,'all_required','fde4'),
(2022,'MJ',2,3,'4',4,'any_n_from_m','test6max4'),(2022,'ON',2,1,'1.c',4,'all_required','error4'),(2022,'ON',2,2,'1.c',3,'all_required','eval3a'),(2022,'ON',2,2,'2.b',4,'all_required','state4'),(2022,'ON',2,2,'6.b',4,'all_required','invalid4'),(2022,'ON',2,3,'1.a',4,'all_required','dtype4a'),
(2023,'ON',2,1,'1.a',4,'all_required','answer4'),(2023,'ON',2,2,'1.a',4,'all_required','vars4'),(2023,'ON',2,2,'1.b',4,'all_required','eval4a'),
(2024,'MJ',2,1,'1.a',4,'all_required','dtype4b'),(2024,'MJ',2,1,'1.b',4,'all_required','eval4b'),(2024,'MJ',2,2,'1.a',4,'all_required','construct4a'),(2024,'MJ',2,3,'1.b',4,'all_required','eval4c'),
(2024,'ON',2,1,'1.c',2,'all_required','dtype2'),(2024,'ON',2,1,'5.a',5,'all_required','life5'),(2024,'ON',2,1,'5.b.i',4,'any_n_from_m','test8max4'),(2024,'ON',2,2,'1.d',3,'all_required','vars3'),(2024,'ON',2,3,'1.a',4,'all_required','construct4b'),(2024,'ON',2,3,'1.b',3,'all_required','dtype3'),(2024,'ON',2,3,'1.c',3,'all_required','eval3b'),(2024,'ON',2,3,'5.a',4,'all_required','life4'),
(2024,'MJ',3,2,'5.c',3,'all_required','infix3'),(2025,'ON',3,2,'1.a.ii',2,'all_required','oopassign2');

create temp table tmp_atomic_0058_groups(family text,label text,n_required int,marks_per_point int,max_marks int,award_mode text,sort_order int) on commit drop;
insert into tmp_atomic_0058_groups values ('test6max4','valid_rows',4,1,4,'fixed',1),('test8max4','valid_rows',4,1,4,'fixed',1);

create temp table tmp_atomic_0058_points(family text,code text,point_text text,group_label text,point_marks int,sort_order int) on commit drop;
insert into tmp_atomic_0058_points values
('ascii2','ASCII','ASCII character set size: 128 (2^7).',null,1,1),('ascii2','EXT','Extended ASCII character set size: 256 (2^8).',null,1,2),
('gates3','AND','The output is 1 only when both inputs are 1: AND.',null,1,1),('gates3','XOR','The output is 1 only when both inputs are different: XOR.',null,1,2),('gates3','NOR','The output is 1 only when both inputs are 0: NOR.',null,1,3),
('sqlinsert2','INSERT','Correct statement start: INSERT INTO CAR.',null,1,1),('sqlinsert2','VALUES','Correct values clause: VALUES ("123AA","Tiger","Lioness",10500,"12BSTREET").',null,1,2),
('bitwise4','R1','For ACC 01010101 and XOR 101, new ACC is 1010 0101.',null,1,1),('bitwise4','R2','For ACC 11110000 and AND 104, new ACC is 1111 0000.',null,1,2),('bitwise4','R3','For ACC 00001111 and LSL #4, new ACC is 1111 0000.',null,1,3),('bitwise4','R4','For ACC 11111111 and OR 102, new ACC is 1111 1111.',null,1,4),
('values5','V1','Hexadecimal 11 in denary is 17.',null,1,1),('values5','V2','Smallest denary value of an unsigned 8-bit integer is 0.',null,1,2),('values5','V3','Denary 87 in BCD is 1000 0111.',null,1,3),('values5','V4','Denary 240 in hexadecimal is F0.',null,1,4),('values5','V5','Denary -20 in 8-bit two’s complement is 1110 1100.',null,1,5),
('fde3','MAR','Copy next-instruction address into MAR: MAR ← [PC].',null,1,1),('fde3','PC','Increment the Program Counter: PC ← [PC] + 1.',null,1,2),('fde3','CIR','Copy MDR contents into CIR: CIR ← [MDR].',null,1,3),
('db3','PK','Suitable COMPANY primary key: CompanyID.',null,1,1),('db3','CK','TELESCOPE candidate key: SerialNumber or TelescopeID.',null,1,2),('db3','REL','TELESCOPE to PHOTOGRAPH relationship degree: 1:M / one-to-many.',null,1,3),
('cloud3','ROUTER','Device A that connects the laptop to the Internet: router.',null,1,1),('cloud3','PUBLIC','Cloud X is a public cloud.',null,1,2),('cloud3','APP','A valid cloud application, e.g. email, graphics, word processor, spreadsheet, game or database.',null,1,3),
('fde4','PC','PC ← [PC] + 1: the address in PC is incremented.',null,1,1),('fde4','MDR','MDR ← [[MAR]]: data at the location pointed to by MAR is copied into MDR.',null,1,2),('fde4','MAR','MAR ← [PC]: contents of PC are copied into MAR.',null,1,3),('fde4','CIR','CIR ← [MDR]: contents of MDR are copied into CIR.',null,1,4),
('test6max4','T2','Abnormal value below 149: expected FAIL because it is too small.','valid_rows',1,1),('test6max4','T3','149: expected FAIL; maximum unacceptable boundary value.','valid_rows',1,2),('test6max4','T4','150: expected PASS; minimum acceptable boundary/extreme value.','valid_rows',1,3),('test6max4','T5','155: expected PASS; maximum acceptable boundary/extreme value.','valid_rows',1,4),('test6max4','T6','156: expected FAIL; minimum unacceptable boundary value.','valid_rows',1,5),('test6max4','T7','Value above 156: expected FAIL because it is too large.','valid_rows',1,6),
('error4','E1','IF EMPTY ← "" THEN is wrong because equality should use =, not assignment ←.',null,1,1),('error4','E2','Status ← IS_NUM(-23.4) is wrong because IS_NUM expects a string/character parameter, not a real.',null,1,2),('error4','E3','X ← STR_TO_NUM("37") + 5 has no error.',null,1,3),('error4','E4','Y ← STR_TO_NUM("37" + "5") is wrong: string concatenation should use & / the parameter is not formed as a string correctly.',null,1,4),
('eval3a','E1','MID(CharList, MONTH(FlagDay), 1) evaluates to D.',null,1,1),('eval3a','E2','INT(Count / LENGTH(CharList)) evaluates to 4.',null,1,2),('eval3a','E3','(Count >= 99) AND (DAY(FlagDay) > 23) evaluates to FALSE.',null,1,3),
('state4','S1','For Input-A, output is Output-X and next state is S2.',null,1,1),('state4','S2','For Input-A, there is no output and next state is S2.',null,1,2),('state4','S3','For Input-B, output is Output-W and next state is S3.',null,1,3),('state4','S4','For Input-A, output is Output-W and next state is S4.',null,1,4),
('invalid4','I1','"Aardvark": non-numeric and not "End".',null,1,1),('invalid4','I2','"27.3": numeric but not an integer.',null,1,2),('invalid4','I3','"-3" or "0": a non-positive integer.',null,1,3),('invalid4','I4','Empty string: invalid empty input.',null,1,4),
('dtype4a','D1','Number of days in current month: INTEGER.',null,1,1),('dtype4a','D2','First letter of customer first name: CHAR.',null,1,2),('dtype4a','D3','Whether a year is a leap year: BOOLEAN.',null,1,3),('dtype4a','D4','Average amount spent per customer visit: REAL.',null,1,4),
('answer4','A1','When ThisValue is 40, Level is "Medium".',null,1,1),('answer4','A2','When ThisValue is 36, Check is 12.',null,1,2),('answer4','A3','When ThisValue is 18, Level is "Low".',null,1,3),('answer4','A4','Number of Data array elements that may be incremented: 11.',null,1,4),
('vars4','V1','For customer name (e.g. "Mr Khan"), use a suitable name such as CustomerName and data type STRING.',null,1,1),('vars4','V2','For number of order items (e.g. 3), use a suitable name such as NumItems and data type INTEGER.',null,1,2),('vars4','V3','For new-customer flag (e.g. TRUE), use a suitable name such as NewCustomer and data type BOOLEAN.',null,1,3),('vars4','V4','For deposit (e.g. 15.75), use a suitable name such as Deposit and data type REAL.',null,1,4),
('eval4a','E1','(Total * DepRate) + 1.5 evaluates to 249.50.',null,1,1),('eval4a','E2','RIGHT(Description, 7) evaluates to "(small)".',null,1,2),('eval4a','E3','(LENGTH(Description) - 8) > 16 evaluates to TRUE.',null,1,3),('eval4a','E4','NUM_TO_STR(INT(DepRate * 10)) & "%" evaluates to "20%".',null,1,4),
('dtype4b','D1','A ← LEFT(MyName,1): CHAR or STRING.',null,1,1),('dtype4b','D2','B ← Total * 2: INTEGER or REAL.',null,1,2),('dtype4b','D3','C ← INT(ItemCost) / 3: REAL.',null,1,3),('dtype4b','D4','D ← "Odd OR Even": STRING.',null,1,4),
('eval4b','E1','Tries < 10 AND NOT Sorted evaluates to TRUE.',null,1,1),('eval4b','E2','Tries MOD 4 evaluates to 1.',null,1,2),('eval4b','E3','TO_LOWER(MID(ID,3,1)) evaluates to a.',null,1,3),('eval4b','E4','LENGTH(ID & "xx") >= Tries evaluates to TRUE.',null,1,4),
('construct4a','C1','FOR Index ← 1 TO 10 ... NEXT Index is iteration.',null,1,1),('construct4a','C2','WRITEFILE ThisFile, "****" is input/output.',null,1,2),('construct4a','C3','UNTIL Level > 25 is iteration.',null,1,3),('construct4a','C4','IF Mark > 74 THEN READFILE OldFile, Data ENDIF contains selection and input/output.',null,1,4),
('eval4c','E1','MID("Random",2,3) evaluates to "and".',null,1,1),('eval4c','E2','5 + DAY(10/11/2023) evaluates to 15.',null,1,2),('eval4c','E3','IS_NUM("45000") evaluates to TRUE.',null,1,3),('eval4c','E4','(20 MOD 3) + 1 evaluates to 3.',null,1,4),
('dtype2','D1','HighRate has data type BOOLEAN.',null,1,1),('dtype2','D2','TaxPayable has data type REAL.',null,1,2),
('life5','L1','Walkthrough method: Testing stage.',null,1,1),('life5','L2','Algorithm implemented in a programming language: Coding stage.',null,1,2),('life5','L3','Client interviewed about problems with current system: Analysis stage.',null,1,3),('life5','L4','Released program modified to run on new hardware: Maintenance stage.',null,1,4),('life5','L5','Records and file structures defined: Design stage.',null,1,5),
('test8max4','T1','Abnormal 12 (<23): expected FALSE.','valid_rows',1,1),('test8max4','T2','23: expected FALSE; abnormal/boundary/extreme.','valid_rows',1,2),('test8max4','T3','24: expected TRUE; boundary/extreme.','valid_rows',1,3),('test8max4','T4','25: expected TRUE; boundary.','valid_rows',1,4),('test8max4','T5','36: expected TRUE; boundary.','valid_rows',1,5),('test8max4','T6','37: expected TRUE; boundary/extreme.','valid_rows',1,6),('test8max4','T7','38: expected FALSE; abnormal/boundary/extreme.','valid_rows',1,7),('test8max4','T8','Abnormal 99 (>38): expected FALSE.','valid_rows',1,8),
('vars3','V1','Name stores a customer name and has data type STRING.',null,1,1),('vars3','V2','Index stores an array index and has data type INTEGER.',null,1,2),('vars3','V3','Result stores division of two non-zero numbers and has data type REAL.',null,1,3),
('construct4b','C1','FOR ... IF Safe[Index] ... NEXT Index contains selection and iteration.',null,1,1),('construct4b','C2','CASE OF Compound(3) contains selection and a subroutine call.',null,1,2),('construct4b','C3','REPEAT UNTIL AllDone() = TRUE contains iteration and a subroutine call.',null,1,3),('construct4b','C4','WHILE Result[3] <> FALSE is iteration.',null,1,4),
('dtype3','D1','Available / TRUE has data type BOOLEAN.',null,1,1),('dtype3','D2','Received / "18/04/2021" has data type STRING.',null,1,2),('dtype3','D3','Index / 100 has data type INTEGER.',null,1,3),
('eval3b','E1','Available AND NOT(Index > 100) evaluates to TRUE.',null,1,1),('eval3b','E2','Index MOD 30 evaluates to 10.',null,1,2),('eval3b','E3','NUM_TO_STR(Index + "33") gives ERROR.',null,1,3),
('life4','L1','A compiler is used: Coding stage.',null,1,1),('life4','L2','A released program is modified: Maintenance stage.',null,1,2),('life4','L3','Dry run method is used: Testing stage.',null,1,3),('life4','L4','Program structure is specified: Design stage.',null,1,4),
('infix3','T1','Correct term: (a - c + b).',null,1,1),('infix3','T2','Correct multiplication term: * (d + b).',null,1,2),('infix3','T3','Correct division term: / c.',null,1,3),
('oopassign2','A1','Correct assignment to Car1.Colour, e.g. Car1.Colour ← Blue.',null,1,1),('oopassign2','A2','Correct assignment to Car1.IntoStock, e.g. Car1.IntoStock ← 21/10/2025.',null,1,2);

create temp table tmp_atomic_0058_resolved on commit drop as
select t.*,q.id question_id,ms.id mark_scheme_id from tmp_atomic_0058_target t
join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
join components c on c.id=sp.component_id and c.number=t.component
join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks;
create temp table tmp_atomic_0058_eligible on commit drop as
select r.* from tmp_atomic_0058_resolved r where
 (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1 and
 (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=0 and
 exists(select 1 from mark_schemes ms where ms.id=r.mark_scheme_id and ms.scheme_type='manual_only'::scheme_type) and
 not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id) and
 not exists(select 1 from answers a where a.question_id=r.question_id) and
 not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id) and
 not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id) and
 not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id);
delete from mark_scheme_points p using tmp_atomic_0058_eligible e where p.mark_scheme_id=e.mark_scheme_id;
create temp table tmp_atomic_0058_inserted_groups on commit drop as with ins as (
 insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
 select e.mark_scheme_id,g.label,g.n_required,g.marks_per_point,g.max_marks,g.sort_order,g.award_mode from tmp_atomic_0058_eligible e join tmp_atomic_0058_groups g on g.family=e.family returning id,mark_scheme_id,label
) select * from ins;
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select e.mark_scheme_id,ig.id,p.code,p.point_text,p.point_marks,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,false,p.sort_order
from tmp_atomic_0058_eligible e join tmp_atomic_0058_points p on p.family=e.family left join tmp_atomic_0058_inserted_groups ig on ig.mark_scheme_id=e.mark_scheme_id and ig.label=p.group_label;
update mark_schemes ms set scheme_type=e.scheme_kind::scheme_type,prompt_version='atomic-source-row-batch-0058-v1',updated_at=now() from tmp_atomic_0058_eligible e where ms.id=e.mark_scheme_id;
