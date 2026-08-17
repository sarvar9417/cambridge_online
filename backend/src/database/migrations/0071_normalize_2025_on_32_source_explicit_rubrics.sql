-- Cambridge 9618/32/O/N/25 source-backed atomic normalization.
-- Only one-point/no-group manual wrappers with zero downstream usage are eligible.
-- Spatial K-map / stack-trace items and any rubric not explicitly recoverable from the published MS are excluded.

create temp table t71(path text, expected_marks int, family text, scheme_kind text) on commit drop;
insert into t71 values
('1.b.i',2,'enum_body','all_required'),
('2.a',3,'float_denary','all_required'),
('2.b',3,'float_binary','all_required'),
('3.a',2,'protocols','all_required'),
('3.b',4,'torrent','any_n_from_m'),
('4.a',2,'switch_benefits','any_n_from_m'),
('4.b',2,'switch_differences','any_n_from_m'),
('5.a',2,'scheduler_interrupts','any_n_from_m'),
('5.b',3,'process_states','all_required'),
('6.a',3,'truth_regions','all_required'),
('6.b.i',2,'kmap_accuracy','any_n_from_m'),
('6.b.iii',2,'boolean_terms','all_required'),
('7.b',4,'asymmetric','all_required'),
('8.b',3,'infix_segments','all_required');

create temp table g71(family text,label text,n_required int,marks_per_point int,max_marks int,award_mode text,sort_order int) on commit drop;
insert into g71 values
('torrent','mp_pool',4,1,4,'fixed',1),
('switch_benefits','circuit',1,1,1,'fixed',1),
('switch_benefits','packet',1,1,1,'fixed',2),
('switch_differences','differences',2,1,2,'fixed',1),
('scheduler_interrupts','scheduler_points',2,1,2,'fixed',1),
('kmap_accuracy','accuracy',1,1,2,'point_marks',1);

create temp table p71(family text,code text,txt text,gl text,marks int,requires jsonb,sort_order int) on commit drop;
insert into p71 values
('enum_body','TYPE','Correct declaration prefix: TYPE Body =',null,1,'[]',1),
('enum_body','VALUES','Correct complete enumeration: (Convertible, Hatchback, Saloon, SUV).',null,1,'[]',2),
('float_denary','EXP','Correct calculation/application of exponent, giving exponent 11. ',null,1,'[]',1),
('float_denary','METHOD','Correct method to obtain the denary value from the shifted binary value.',null,1,'[]',2),
('float_denary','ANSWER','Correct denary value: 1940.',null,1,'[]',3),
('float_binary','BINARY','Correct method to convert 26.6875 to binary.',null,1,'[]',1),
('float_binary','EXP','Correct use of exponent / movement of the binary point by five places.',null,1,'[]',2),
('float_binary','ANSWER','Correct published mantissa and exponent in the answer space.',null,1,'[]',3),
('protocols','HTTP','HTTP is used to send/receive or transfer web pages, hypertext, images or video.',null,1,'[]',1),
('protocols','IMAP','IMAP allows email access/synchronisation on devices without removing the message from the mail server.',null,1,'[]',2),
('torrent','MP1','Files are shared over a peer-to-peer network.','mp_pool',1,'[]',1),
('torrent','MP2','A small torrent/descriptor file is initially created by a peer.','mp_pool',1,'[]',2),
('torrent','MP3','The torrent/descriptor contains metadata about the file to be shared.','mp_pool',1,'[]',3),
('torrent','MP4','The whole file is initially located on at least one peer.','mp_pool',1,'[]',4),
('torrent','MP5','The file is broken into equal-sized pieces.','mp_pool',1,'[]',5),
('torrent','MP6','A peer obtains the torrent/descriptor and connects to a tracker.','mp_pool',1,'[]',6),
('torrent','MP7','The tracker stores information about the peers/swarm.','mp_pool',1,'[]',7),
('torrent','MP8','Peers download file pieces from other peers until the whole file is obtained.','mp_pool',1,'[]',8),
('torrent','MP9','After receiving a piece, a peer becomes a source for that piece.','mp_pool',1,'[]',9),
('torrent','MP10','A peer with the complete file available to the swarm is a seed.','mp_pool',1,'[]',10),
('switch_benefits','C1','Circuit: once established, the connection remains available until transmission ends.','circuit',1,'[]',1),
('switch_benefits','C2','Circuit: dedicated path provides a steady data rate / whole bandwidth.','circuit',1,'[]',2),
('switch_benefits','C3','Circuit: dedicated path makes data less likely to be lost.','circuit',1,'[]',3),
('switch_benefits','C4','Circuit: no intermediate delays after setup, supporting real-time transmission.','circuit',1,'[]',4),
('switch_benefits','C5','Circuit: data arrives in order so no reordering delay is required.','circuit',1,'[]',5),
('switch_benefits','P1','Packet: communication line/bandwidth can be shared by multiple users.','packet',1,'[]',6),
('switch_benefits','P2','Packet: packets can be rerouted around failed, faulty or busy lines.','packet',1,'[]',7),
('switch_benefits','P3','Packet: individual lost/damaged packets can be resent.','packet',1,'[]',8),
('switch_benefits','P4','Packet: users may be charged only for connectivity duration.','packet',1,'[]',9),
('switch_benefits','P5','Packet: a high rate of data transmission is possible.','packet',1,'[]',10),
('switch_benefits','P6','Packet: digital network can transmit directly toward destination.','packet',1,'[]',11),
('switch_benefits','P7','Packet: different routes can improve security.','packet',1,'[]',12),
('switch_differences','D1','Circuit requires a dedicated line before transfer; packet transfer can commence directly.','differences',1,'[]',1),
('switch_differences','D2','Circuit data unit knows the whole path; packet carries final address and routers choose intermediate paths.','differences',1,'[]',2),
('switch_differences','D3','Circuit uses whole/constant bandwidth; packet bandwidth is shared/variable.','differences',1,'[]',3),
('switch_differences','D4','Circuit data follows one route; packets may follow different routes.','differences',1,'[]',4),
('switch_differences','D5','Circuit data arrives in order; packet data may require reordering.','differences',1,'[]',5),
('switch_differences','D6','Circuit is a continuous stream; packet data is segmented.','differences',1,'[]',6),
('switch_differences','D7','Circuit loss may require whole retransmission; packet loss can resend individual packets.','differences',1,'[]',7),
('switch_differences','D8','Circuit does not suffer packet loss in the same way; packets can be lost.','differences',1,'[]',8),
('scheduler_interrupts','MP1','Low-level scheduler manages interrupt handling based on priority.','scheduler_points',1,'[]',1),
('scheduler_interrupts','MP2','Priority handling ensures critical events are handled without delay.','scheduler_points',1,'[]',2),
('scheduler_interrupts','MP3','Uses an IVT / IDT / interrupt service routine lookup.','scheduler_points',1,'[]',3),
('scheduler_interrupts','MP4','Maps the interrupt to the specific handling routine / ISR.','scheduler_points',1,'[]',4),
('process_states','RUN','Running: CPU time has been allocated and the process is executing.',null,1,'[]',1),
('process_states','READY','Ready: waiting for CPU time and capable of running.',null,1,'[]',2),
('process_states','BLOCKED','Blocked: waiting for an I/O operation or another event to complete.',null,1,'[]',3),
('truth_regions','WORK','All four working columns P, Q, R and S are correct.',null,1,'[]',1),
('truth_regions','TOP','First four Z outputs are correct: 1, 1, 1, 0.',null,1,'[]',2),
('truth_regions','BOTTOM','Second four Z outputs are correct: 1, 1, 1, 0.',null,1,'[]',3),
('kmap_accuracy','ONEERR','Published K-map contains exactly one error.','accuracy',1,'[]',1),
('kmap_accuracy','NOERR','Published K-map is completely correct with no errors.','accuracy',2,'[]',2),
('boolean_terms','TERM','One correct Boolean term is given with a + / OR sign.',null,1,'[]',1),
('boolean_terms','FULL','All Boolean terms and operators are correct and no extra terms are present.',null,1,'["TERM"]',2),
('asymmetric','MP1','Organisation holds a private key and a public key.',null,1,'[]',1),
('asymmetric','MP2','Organisation publishes/makes its public key available to the sender.',null,1,'[]',2),
('asymmetric','MP3','Sender encrypts the message/plaintext using the organisation public key.',null,1,'[]',3),
('asymmetric','MP4','Organisation decrypts the message using its private key.',null,1,'[]',4),
('infix_segments','P1','Correct first part: (a - b + c).',null,1,'[]',1),
('infix_segments','P2','Correct multiplication by (c - a).',null,1,'[]',2),
('infix_segments','P3','Correct division by d, completing (a - b + c) * (c - a) / d.',null,1,'[]',3);

create temp table r71 on commit drop as
select t.*,q.id qid,ms.id msid
from t71 t
join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=2 and sp.kind='QP'::paper_kind
join components c on c.id=sp.component_id and c.number=3
join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks;

create temp table e71 on commit drop as
select r.* from r71 r
where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.msid)=1
  and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.msid)=0
  and exists(select 1 from mark_schemes ms where ms.id=r.msid and ms.scheme_type='manual_only'::scheme_type)
  and not exists(select 1 from assignment_questions x where x.question_id=r.qid)
  and not exists(select 1 from assignment_context_items x where x.question_id=r.qid)
  and not exists(select 1 from answers x where x.question_id=r.qid)
  and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.msid)
  and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.msid)
  and not exists(select 1 from flashcards f where f.source_question_id=r.qid or exists(select 1 from mark_scheme_points p where p.id=f.source_mark_scheme_point_id and p.mark_scheme_id=r.msid));

-- Eligible wrappers are replaced atomically inside the migration transaction.
delete from mark_scheme_points p using e71 e where p.mark_scheme_id=e.msid;

create temp table ig71 on commit drop as
with x as (
 insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
 select e.msid,g.label,g.n_required,g.marks_per_point,g.max_marks,g.sort_order,g.award_mode
 from e71 e join g71 g on g.family=e.family
 returning id,mark_scheme_id,label
) select * from x;

insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select e.msid,ig.id,p.code,p.txt,p.marks,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order
from e71 e join p71 p on p.family=e.family
left join ig71 ig on ig.mark_scheme_id=e.msid and ig.label=p.gl;

update mark_schemes ms
set scheme_type=e.scheme_kind::scheme_type,
    prompt_version='atomic-source-9618-32-on25-0071-v1',
    updated_at=now()
from e71 e where ms.id=e.msid;
