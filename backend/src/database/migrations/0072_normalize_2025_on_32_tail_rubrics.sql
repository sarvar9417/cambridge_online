-- Cambridge 9618/32/O/N/25 tail-page source-backed atomic normalization.
-- Published MS pages 14-17. Usage-gated one-point/no-group wrappers only.

create temp table t72(path text, expected_marks int, family text, scheme_kind text) on commit drop;
insert into t72 values
('9.b',4,'nn_train','any_n_from_m'),('10.a',2,'exception_handling','all_required'),('10.b',2,'exception_causes','any_n_from_m'),('11',7,'assembly7','any_n_from_m'),('12.a.i',4,'push4','all_required'),('12.a.ii',2,'push_call','all_required'),('12.b',3,'recursion_stack','any_n_from_m');

create temp table g72(family text,label text,n_required int,marks_per_point int,max_marks int,award_mode text,sort_order int) on commit drop;
insert into g72 values
('nn_train','training_points',4,1,4,'fixed',1),('exception_causes','causes',2,1,2,'fixed',1),('assembly7','assembly_points',7,1,7,'fixed',1),('recursion_stack','stack_points',3,1,3,'fixed',1);

create temp table p72(family text,code text,txt text,gl text,marks int,requires jsonb,sort_order int) on commit drop;
insert into p72 values
('nn_train','MP1','Initial outputs are compared with expected outputs.','training_points',1,'[]',1),
('nn_train','MP2','Weightings are adjusted to minimise the difference between actual and expected outputs.','training_points',1,'[]',2),
('nn_train','MP3','Calculus is used to find the error gradient in obtained outputs.','training_points',1,'[]',3),
('nn_train','MP4','Results are fed back into the neural network.','training_points',1,'[]',4),
('nn_train','MP5','Weightings of each neuron/node are adjusted as a result of feedback.','training_points',1,'[]',5),
('nn_train','MP6','The process repeats until results are more accurate.','training_points',1,'[]',6),
('exception_handling','MP1','Uses an exception-handling routine to respond to unwanted/unexpected runtime events.',null,1,'[]',1),
('exception_handling','MP2','Uses try/except or try/catch, or generates an appropriate error message.',null,1,'[]',2),
('exception_causes','CODE','Coding errors.','causes',1,'[]',1),
('exception_causes','USER','User errors.','causes',1,'[]',2),
('exception_causes','HARDWARE','Hardware failure / loss of connection to a device.','causes',1,'[]',3),
('assembly7','MP1','LDD 300 is present.','assembly_points',1,'[]',1),
('assembly7','MP2','Correct use of STO is present at least once.','assembly_points',1,'[]',2),
('assembly7','MP3','Correct use of LDD 420 is present.','assembly_points',1,'[]',3),
('assembly7','MP4','Correct use of LDI B is present.','assembly_points',1,'[]',4),
('assembly7','MP5','Correct use of ADD A is present.','assembly_points',1,'[]',5),
('assembly7','MP6','All three addresses A:, B: and Answer: are labelled correctly.','assembly_points',1,'[]',6),
('assembly7','MP7','Contents of A and B are correct: A=86 and B=150.','assembly_points',1,'[]',7),
('assembly7','MP8','Answer contains the correct value 112.','assembly_points',1,'[]',8),
('push4','PARAM','Procedure header correctly uses parameter NewData : STRING.',null,1,'[]',1),
('push4','TOP','Correct stack update: Top <- Top + 1.',null,1,'[]',2),
('push4','STORE','Correct assignment: StackArray[Top] <- NewData.',null,1,'[]',3),
('push4','FULL','Correct full-stack branch outputs an appropriate message when Top is not below Max - 1.',null,1,'[]',4),
('push_call','INPUT','Inputs data into a variable, with or without a prompt.',null,1,'[]',1),
('push_call','CALL','Calls Push using a parameter matching the input variable.',null,1,'[]',2),
('recursion_stack','MP1','Stack stores data in LIFO / FILO order.','stack_points',1,'[]',1),
('recursion_stack','MP2','Each recursive self-call pushes data/state onto the stack.','stack_points',1,'[]',2),
('recursion_stack','MP3','The base case is reached / recursion starts to unwind.','stack_points',1,'[]',3),
('recursion_stack','MP4','Data/state is popped in reverse order during unwinding.','stack_points',1,'[]',4);

create temp table r72 on commit drop as
select t.*,q.id qid,ms.id msid from t72 t
join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=2 and sp.kind='QP'::paper_kind
join components c on c.id=sp.component_id and c.number=3
join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks;

create temp table e72 on commit drop as
select r.* from r72 r
where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.msid)=1
and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.msid)=0
and exists(select 1 from mark_schemes ms where ms.id=r.msid and ms.scheme_type='manual_only'::scheme_type)
and not exists(select 1 from assignment_questions x where x.question_id=r.qid)
and not exists(select 1 from assignment_context_items x where x.question_id=r.qid)
and not exists(select 1 from answers x where x.question_id=r.qid)
and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.msid)
and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.msid)
and not exists(select 1 from flashcards f where f.source_question_id=r.qid or exists(select 1 from mark_scheme_points p where p.id=f.source_mark_scheme_point_id and p.mark_scheme_id=r.msid));

delete from mark_scheme_points p using e72 e where p.mark_scheme_id=e.msid;
create temp table ig72 on commit drop as with x as (
 insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
 select e.msid,g.label,g.n_required,g.marks_per_point,g.max_marks,g.sort_order,g.award_mode from e72 e join g72 g on g.family=e.family returning id,mark_scheme_id,label
) select * from x;
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select e.msid,ig.id,p.code,p.txt,p.marks,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order from e72 e join p72 p on p.family=e.family left join ig72 ig on ig.mark_scheme_id=e.msid and ig.label=p.gl;
update mark_schemes ms set scheme_type=e.scheme_kind::scheme_type,prompt_version='atomic-source-9618-32-on25-0072-v1',updated_at=now() from e72 e where ms.id=e.msid;
