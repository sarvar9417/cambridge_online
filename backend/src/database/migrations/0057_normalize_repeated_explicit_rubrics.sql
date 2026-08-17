-- Source-backed atomic normalization for repeated explicit C1-C3 rubrics.
-- Targets only unused manual wrappers: one point, zero groups, no assignment/answer/grading/error/flashcard usage.
-- Spatial, underlining-dependent and mutually-exclusive-alternative rubrics are intentionally excluded.

create temp table tmp_atomic_0057_target(
  year int, series text, component int, variant int, path text,
  expected_marks int, scheme_kind text, family text
) on commit drop;

insert into tmp_atomic_0057_target values
(2021,'ON',1,1,'1.b.i',2,'all_required','binary_add'),(2021,'ON',1,3,'1.b.i',2,'all_required','binary_add'),
(2021,'ON',1,1,'3.b',2,'all_required','truth_2021_on'),(2021,'ON',1,3,'3.b',2,'all_required','truth_2021_on'),
(2021,'ON',1,1,'5.a',2,'any_n_from_m','pk_fk_accuracy'),(2021,'ON',1,3,'5.a',2,'any_n_from_m','pk_fk_accuracy'),
(2021,'ON',1,1,'6.a',4,'all_required','fetch_errors'),(2021,'ON',1,3,'6.a',4,'all_required','fetch_errors'),
(2022,'MJ',1,1,'1.c',2,'all_required','hex_working'),(2022,'MJ',1,3,'2.a',3,'all_required','fetch_rows'),
(2022,'MJ',1,3,'3.a',3,'all_required','address_values'),(2022,'MJ',1,3,'5.a.ii',2,'any_n_from_m','security_any2'),
(2022,'MJ',1,3,'6.c',3,'all_required','normal_forms'),(2022,'MJ',1,3,'7.b',2,'all_required','truth_2022_mj'),
(2022,'MJ',1,3,'8.b',2,'any_n_from_m','cloud_public_private'),(2022,'ON',1,1,'1.b',2,'all_required','binary_subtract'),
(2022,'ON',1,1,'3.b',2,'all_required','truth_2022_on'),(2022,'ON',1,1,'8',4,'any_n_from_m','csmacd_any4'),
(2021,'MJ',2,1,'7.c',5,'all_required','getword5'),(2021,'MJ',2,3,'7.c',5,'all_required','getword5'),
(2021,'ON',2,1,'1.c.ii',2,'any_n_from_m','abstraction_benefit'),(2021,'ON',2,3,'1.c.ii',2,'any_n_from_m','abstraction_benefit'),
(2021,'ON',2,1,'3.b.i',3,'all_required','queue_state_3'),(2021,'ON',2,3,'3.b.i',3,'all_required','queue_state_3'),
(2021,'ON',2,1,'3.b.ii',2,'all_required','queue_state_2'),(2021,'ON',2,3,'3.b.ii',2,'all_required','queue_state_2'),
(2022,'MJ',3,1,'3',8,'any_n_from_m','switching8'),(2022,'MJ',3,3,'3',8,'any_n_from_m','switching8'),
(2022,'MJ',3,1,'9.a',3,'all_required','addressing3'),(2022,'MJ',3,3,'9.a',3,'all_required','addressing3'),
(2022,'MJ',3,1,'2.c.ii',2,'all_required','prolog2'),(2022,'MJ',3,3,'2.c.ii',2,'all_required','prolog2'),
(2024,'MJ',3,1,'3.b',4,'any_n_from_m','udt4'),(2024,'MJ',3,3,'3.b',4,'any_n_from_m','udt4'),
(2024,'MJ',3,1,'5.b',2,'all_required','rpn2'),(2024,'MJ',3,3,'5.b',2,'all_required','rpn2');

create temp table tmp_atomic_0057_groups(family text,label text,n_required int,marks_per_point int,max_marks int,award_mode text,sort_order int) on commit drop;
insert into tmp_atomic_0057_groups values
('pk_fk_accuracy','accuracy',1,1,2,'point_marks',1),('security_any2','measures',2,1,2,'fixed',1),
('cloud_public_private','public',1,1,1,'fixed',1),('cloud_public_private','private',1,1,1,'fixed',2),
('csmacd_any4','protocol_points',4,1,4,'fixed',1),('abstraction_benefit','benefit',1,1,1,'fixed',1),
('switching8','circuit_characteristics',2,1,2,'fixed',1),('switching8','circuit_evaluation',2,1,2,'fixed',2),
('switching8','packet_characteristics',2,1,2,'fixed',3),('switching8','packet_evaluation',2,1,2,'fixed',4),
('udt4','declaration_accuracy',1,1,3,'point_marks',1);

create temp table tmp_atomic_0057_points(family text,code text,point_text text,group_label text,point_marks int,sort_order int) on commit drop;
insert into tmp_atomic_0057_points values
('binary_add','WORK','Valid binary working for 1010 1010 + 0011 0111.',null,1,1),('binary_add','ANSWER','Correct binary result: 1110 0001.',null,1,2),
('truth_2021_on','TOP4','First four truth-table outputs are all correct: 1, 1, 0, 1.',null,1,1),('truth_2021_on','BOTTOM4','Last four truth-table outputs are all correct: 1, 1, 1, 0.',null,1,2),
('pk_fk_accuracy','PARTIAL','Two or three of the four published PK/FK ticks are correct.','accuracy',1,1),('pk_fk_accuracy','FULL','All four published PK/FK ticks are correct.','accuracy',2,2),
('fetch_errors','E2','Identifies line 2 and explains that the Program Counter should be incremented, not decremented.',null,1,1),('fetch_errors','C2','Corrects line 2 to PC ← [PC] + 1.',null,1,2),
('fetch_errors','E3','Identifies line 3 and explains that the data must come from the memory address held in MAR.',null,1,3),('fetch_errors','C3','Corrects line 3 to MDR ← [[MAR]].',null,1,4),
('hex_working','WORK','Shows valid hexadecimal-conversion working, for example dividing by 16 or converting to binary 11111011.',null,1,1),('hex_working','ANSWER','Correct hexadecimal answer: FB.',null,1,2),
('fetch_rows','PC','PC ← [PC] + 1 is described as incrementing the address in the Program Counter.',null,1,1),('fetch_rows','MDR','MDR ← [[MAR]] is described as copying into MDR the data stored at the address held in MAR.',null,1,2),('fetch_rows','MAR','MAR ← [PC] is described as copying the contents of PC to MAR.',null,1,3),
('address_values','IMM','LDM #103 gives accumulator value 103.',null,1,1),('address_values','DIR','LDD 102 gives accumulator value 104.',null,1,2),('address_values','IND','LDI 103 gives accumulator value 101.',null,1,3),
('security_any2','FIREWALL','Install or run a firewall.','measures',1,1),('security_any2','ANTIMALWARE','Use up-to-date anti-virus or anti-malware software.','measures',1,2),('security_any2','PASSWORD','Use a username with a strong password.','measures',1,3),('security_any2','ENCRYPT','Use encryption.','measures',1,4),('security_any2','ACCESS','Use access rights / permissions.','measures',1,5),
('normal_forms','NF1','1NF: no repeating groups or repeating attributes.',null,1,1),('normal_forms','NF2','2NF: all attributes are fully dependent on the composite primary key; no partial dependencies.',null,1,2),('normal_forms','NF3','3NF: all attributes depend on the primary key and not on other non-key attributes; no transitive dependencies.',null,1,3),
('truth_2022_mj','TOP4','First four published truth-table outputs are all correct: 1, 1, 1, 1.',null,1,1),('truth_2022_mj','BOTTOM4','Last four published truth-table outputs are all correct: 1, 1, 1, 0.',null,1,2),
('cloud_public_private','PUB1','Public cloud computing services are offered by a third-party provider over the public Internet.','public',1,1),('cloud_public_private','PUB2','Public cloud services are open/available to anyone with the appropriate equipment, software or credentials.','public',1,2),('cloud_public_private','PRIV1','Private cloud services are offered over the Internet or a private internal network.','private',1,3),('cloud_public_private','PRIV2','Private cloud services are available only to selected users, not the general public.','private',1,4),('cloud_public_private','PRIV3','A private cloud is a dedicated/bespoke system accessible only for/from the organisation.','private',1,5),
('binary_subtract','WORK','Shows valid subtraction working, using borrowing or two’s complement.',null,1,1),('binary_subtract','ANSWER','Correct 8-bit binary answer: 0011 1110.',null,1,2),
('truth_2022_on','TOP4','First four published truth-table outputs are all correct: 0, 0, 1, 1.',null,1,1),('truth_2022_on','BOTTOM4','Last four published truth-table outputs are all correct: 0, 1, 1, 1.',null,1,2),
('csmacd_any4','CSMA1','CSMA/CD is used to detect/prevent collisions on a shared bus medium.','protocol_points',1,1),('csmacd_any4','CSMA2','Before transmitting, a device listens/checks whether the channel is busy.','protocol_points',1,2),('csmacd_any4','CSMA3','If busy the device waits; if free it transmits.','protocol_points',1,3),('csmacd_any4','CSMA4','Multiple devices share the same transmission medium.','protocol_points',1,4),('csmacd_any4','CSMA5','Two workstations may start transmitting at the same time, causing a collision.','protocol_points',1,5),('csmacd_any4','CSMA6','On collision, transmission is aborted / a jamming signal is sent.','protocol_points',1,6),('csmacd_any4','CSMA7','Devices wait different random backoff times and then retry.','protocol_points',1,7),
('getword5','MP1','Uses a conditional loop.',null,1,1),('getword5','MP2','Extracts a character from FNString and compares it with SPACECHAR inside the loop.',null,1,2),('getword5','MP3','Concatenates the character to NextWord when it is not SPACECHAR.',null,1,3),('getword5','MP4','Exits when SPACECHAR is encountered or the end of FNString is reached.',null,1,4),('getword5','MP5','Returns NextWord after a reasonable attempt to form it, with NextWord initialised.',null,1,5),
('abstraction_benefit','TECH','Identifies the technique as abstraction.',null,1,1),('abstraction_benefit','BEN1','Benefit: the solution is simplified, making it easier/quicker to design or implement.','benefit',1,2),('abstraction_benefit','BEN2','Benefit: the system is tailored to the needs of the user.','benefit',1,3),
('queue_state_3','DATA','All queue data values are correct as published: 0 Frog, 1 Cat, 2 Fish, 3 Elk, 4 Wasp, 5 Bee, 6 Mouse.',null,1,1),('queue_state_3','FRONT','Front-of-queue pointer is at location 2 (Fish).',null,1,2),('queue_state_3','END','End-of-queue pointer is at location 6 (Mouse).',null,1,3),
('queue_state_2','PTRS','Both pointers are correct: End-of-queue at 0 (Shark), Front-of-queue at 4 (Wasp).',null,1,1),('queue_state_2','DATA','All data values are correct as published: 0 Shark, 1 Cat, 2 Fish, 3 Elk, 4 Wasp, 5 Bee, 6 Mouse, 7 Dolphin.',null,1,2),
('switching8','C1','Circuit switching uses a dedicated circuit.','circuit_characteristics',1,1),('switching8','C2','Circuit is established before transmission and released after transmission ends.','circuit_characteristics',1,2),('switching8','C3','Circuit-switched data uses the whole bandwidth.','circuit_characteristics',1,3),('switching8','C4','All circuit-switched data follows the same route.','circuit_characteristics',1,4),
('switching8','CE1','Circuit-switching advantage: frames/data arrive in order and need no reassembly.','circuit_evaluation',1,5),('switching8','CE2','Circuit-switching disadvantage: the reserved circuit cannot be used by others while idle / a single route is less secure.','circuit_evaluation',1,6),
('switching8','P1','Packet switching splits data into packets.','packet_characteristics',1,7),('switching8','P2','Each packet may be given its own route.','packet_characteristics',1,8),('switching8','P3','Packet routing can depend on network congestion.','packet_characteristics',1,9),('switching8','P4','Packets may arrive out of order.','packet_characteristics',1,10),
('switching8','PE1','Packet-switching advantage: packets can be rerouted if needed / multiple routes make interception harder.','packet_evaluation',1,11),('switching8','PE2','Packet-switching disadvantage: packets may need reassembly at the destination.','packet_evaluation',1,12),
('addressing3','IMM','LDM #500 uses immediate addressing and loads 500.',null,1,1),('addressing3','DIR','LDD 500 uses direct addressing and loads 100.',null,1,2),('addressing3','IND','LDI 500 uses indirect addressing and loads 20.',null,1,3),
('prolog2','FACT1','Correct fact: spots(WildSpotty, yes).',null,1,1),('prolog2','FACT2','Correct fact: type(WildSpotty, wild).',null,1,2),
('udt4','TYPE','TYPE FootballClub and ENDTYPE are both correct.',null,1,1),('udt4','DECL2','At least two of the six published field declarations are correct.','declaration_accuracy',1,2),('udt4','DECL4','At least four of the six published field declarations are correct.','declaration_accuracy',2,3),('udt4','DECL6','All six published field declarations are correct.','declaration_accuracy',3,4),
('rpn2','PART1','Correct first RPN segment: 7 3 + 2.',null,1,1),('rpn2','PART2','Correct second RPN segment: 2 8 * - 6 /.',null,1,2);

create temp table tmp_atomic_0057_resolved on commit drop as
select t.*,q.id question_id,ms.id mark_scheme_id
from tmp_atomic_0057_target t
join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
join components c on c.id=sp.component_id and c.number=t.component
join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks;

create temp table tmp_atomic_0057_eligible on commit drop as
select r.* from tmp_atomic_0057_resolved r
where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
  and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=0
  and exists(select 1 from mark_schemes ms where ms.id=r.mark_scheme_id and ms.scheme_type='manual_only'::scheme_type)
  and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
  and not exists(select 1 from answers a where a.question_id=r.question_id)
  and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
  and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
  and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id);

delete from mark_scheme_points p using tmp_atomic_0057_eligible e where p.mark_scheme_id=e.mark_scheme_id;

create temp table tmp_atomic_0057_inserted_groups on commit drop as
with ins as (
 insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
 select e.mark_scheme_id,g.label,g.n_required,g.marks_per_point,g.max_marks,g.sort_order,g.award_mode
 from tmp_atomic_0057_eligible e join tmp_atomic_0057_groups g on g.family=e.family
 returning id,mark_scheme_id,label
) select * from ins;

insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select e.mark_scheme_id,ig.id,p.code,p.point_text,p.point_marks,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,false,p.sort_order
from tmp_atomic_0057_eligible e
join tmp_atomic_0057_points p on p.family=e.family
left join tmp_atomic_0057_inserted_groups ig on ig.mark_scheme_id=e.mark_scheme_id and ig.label=p.group_label;

update mark_schemes ms
set scheme_type=e.scheme_kind::scheme_type,prompt_version='atomic-source-explicit-batch-0057-v1',updated_at=now()
from tmp_atomic_0057_eligible e where ms.id=e.mark_scheme_id;
