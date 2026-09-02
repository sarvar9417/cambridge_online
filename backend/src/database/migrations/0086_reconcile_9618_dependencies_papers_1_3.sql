-- Reconcile the audited source-backed Cambridge 9618 Paper 1-3 dependency graph (2021-2025).
-- Snapshot keys are stable display_ref values; generated UUIDs are resolved at migration time.

create temp table _9618_dep_snapshot_p13 (
  from_ref text not null,
  to_ref text not null,
  kind text not null check (kind in ('answer_ref','text_ref')),
  primary key (from_ref,to_ref)
) on commit drop;

insert into _9618_dep_snapshot_p13(from_ref,to_ref,kind) values
('9618/12/M/J/22 Q1(b)(ii)','9618/12/M/J/22 Q1(b)(i)','answer_ref'),('9618/21/M/J/22 Q1(b)(ii)','9618/21/M/J/22 Q1(b)(i)','text_ref'),('9618/21/M/J/23 Q1(c)(ii)','9618/21/M/J/23 Q1(c)(i)','text_ref'),('9618/21/O/N/22 Q4(a)(ii)','9618/21/O/N/22 Q4(a)(i)','text_ref'),('9618/21/O/N/22 Q4(a)(iii)','9618/21/O/N/22 Q4(a)(i)','text_ref'),('9618/21/O/N/22 Q6(b)(ii)','9618/21/O/N/22 Q6(b)(i)','text_ref'),('9618/21/O/N/23 Q6(b)','9618/21/O/N/23 Q6(a)','text_ref'),('9618/21/O/N/24 Q1(b)(ii)','9618/21/O/N/24 Q1(b)(i)','answer_ref'),('9618/21/O/N/24 Q3(b)','9618/21/O/N/24 Q3(a)','text_ref'),('9618/21/O/N/24 Q3(c)','9618/21/O/N/24 Q3(a)','text_ref'),('9618/21/O/N/24 Q7(b)','9618/21/O/N/24 Q7(a)','text_ref'),('9618/22/M/J/21 Q1(a)(ii)','9618/22/M/J/21 Q1(a)(i)','text_ref'),('9618/22/M/J/22 Q3(a)(ii)','9618/22/M/J/22 Q3(a)(i)','answer_ref'),('9618/22/M/J/22 Q4(b)','9618/22/M/J/22 Q4(a)','text_ref'),('9618/22/M/J/22 Q7(b)','9618/22/M/J/22 Q7(a)','text_ref'),('9618/22/M/J/23 Q1(a)(ii)','9618/22/M/J/23 Q1(a)(i)','answer_ref'),('9618/22/M/J/24 Q6(b)(iii)','9618/22/M/J/24 Q6(b)(ii)','answer_ref'),('9618/22/O/N/22 Q2(a)(iii)','9618/22/O/N/22 Q2(a)(i)','answer_ref'),('9618/22/O/N/23 Q7(b)','9618/22/O/N/23 Q7(a)','text_ref'),('9618/23/M/J/22 Q6(b)','9618/23/M/J/22 Q6(a)','text_ref'),('9618/23/M/J/24 Q4(b)(ii)','9618/23/M/J/24 Q4(b)(i)','answer_ref'),('9618/23/O/N/23 Q8(d)','9618/23/O/N/23 Q8(c)','text_ref'),('9618/23/O/N/24 Q1(c)','9618/23/O/N/24 Q1(b)','text_ref'),('9618/23/O/N/24 Q8(c)','9618/23/O/N/24 Q8(b)','text_ref'),('9618/31/M/J/21 Q2(c)','9618/31/M/J/21 Q2(b)(i)','text_ref'),('9618/31/M/J/21 Q2(c)','9618/31/M/J/21 Q2(b)(ii)','text_ref'),('9618/31/M/J/23 Q1(b)','9618/31/M/J/23 Q1(a)','text_ref'),('9618/31/M/J/23 Q7(c)','9618/31/M/J/23 Q7(b)','answer_ref'),('9618/31/M/J/23 Q7(d)','9618/31/M/J/23 Q7(c)','answer_ref'),('9618/31/M/J/24 Q6(c)(iii)','9618/31/M/J/24 Q6(c)(ii)','answer_ref'),('9618/31/O/N/21 Q1(a)(ii)','9618/31/O/N/21 Q1(a)(i)','text_ref'),('9618/31/O/N/21 Q7(b)(iii)','9618/31/O/N/21 Q7(b)(ii)','answer_ref'),('9618/31/O/N/21 Q7(b)(iv)','9618/31/O/N/21 Q7(b)(iii)','answer_ref'),('9618/31/O/N/22 Q3(d)(ii)','9618/31/O/N/22 Q3(d)(i)','answer_ref'),('9618/31/O/N/22 Q5(b)(ii)','9618/31/O/N/22 Q5(b)(i)','answer_ref'),('9618/31/O/N/22 Q7(c)','9618/31/O/N/22 Q7(b)','answer_ref'),('9618/31/O/N/23 Q9(a)(ii)','9618/31/O/N/23 Q9(a)(i)','text_ref'),('9618/31/O/N/24 Q11(b)','9618/31/O/N/24 Q11(a)','answer_ref'),('9618/31/O/N/24 Q7(d)(i)','9618/31/O/N/24 Q7(c)','answer_ref'),('9618/31/O/N/24 Q7(d)(ii)','9618/31/O/N/24 Q7(d)(i)','answer_ref'),('9618/32/M/J/21 Q2(c)','9618/32/M/J/21 Q2(b)(i)','text_ref'),('9618/32/M/J/21 Q2(c)','9618/32/M/J/21 Q2(b)(ii)','text_ref'),('9618/32/M/J/23 Q9(d)','9618/32/M/J/23 Q9(c)','answer_ref'),('9618/32/M/J/23 Q9(e)','9618/32/M/J/23 Q9(d)','answer_ref'),('9618/32/M/J/24 Q6(c)(iii)','9618/32/M/J/24 Q6(c)(ii)','answer_ref'),('9618/32/O/N/21 Q1(a)(ii)','9618/32/O/N/21 Q1(a)(i)','text_ref'),('9618/32/O/N/21 Q7(b)(iii)','9618/32/O/N/21 Q7(b)(ii)','answer_ref'),('9618/32/O/N/21 Q7(b)(iv)','9618/32/O/N/21 Q7(b)(iii)','answer_ref'),('9618/32/O/N/22 Q4(b)','9618/32/O/N/22 Q4(a)','text_ref'),('9618/32/O/N/22 Q4(c)(ii)','9618/32/O/N/22 Q4(b)','answer_ref'),('9618/32/O/N/22 Q4(c)(ii)','9618/32/O/N/22 Q4(c)(i)','answer_ref'),('9618/32/O/N/23 Q9(a)(i)','9618/32/O/N/23 Q9(a)(ii)','text_ref'),('9618/32/O/N/24 Q11(b)','9618/32/O/N/24 Q11(a)','answer_ref'),('9618/32/O/N/24 Q6(d)','9618/32/O/N/24 Q6(c)','answer_ref'),('9618/33/M/J/21 Q2(c)','9618/33/M/J/21 Q2(b)(i)','text_ref'),('9618/33/M/J/21 Q2(c)','9618/33/M/J/21 Q2(b)(ii)','text_ref'),('9618/33/M/J/23 Q1(b)','9618/33/M/J/23 Q1(a)','text_ref'),('9618/33/M/J/23 Q7(c)','9618/33/M/J/23 Q7(b)','answer_ref'),('9618/33/M/J/23 Q7(d)','9618/33/M/J/23 Q7(c)','answer_ref'),('9618/33/M/J/24 Q6(c)(iii)','9618/33/M/J/24 Q6(c)(ii)','answer_ref'),('9618/33/O/N/22 Q3(d)(ii)','9618/33/O/N/22 Q3(d)(i)','answer_ref'),('9618/33/O/N/22 Q5(b)(ii)','9618/33/O/N/22 Q5(b)(i)','answer_ref'),('9618/33/O/N/22 Q7(c)','9618/33/O/N/22 Q7(b)','answer_ref'),('9618/33/O/N/23 Q9(a)(ii)','9618/33/O/N/23 Q9(a)(i)','text_ref'),('9618/33/O/N/24 Q11(b)','9618/33/O/N/24 Q11(a)','answer_ref'),('9618/33/O/N/24 Q7(d)(i)','9618/33/O/N/24 Q7(c)','answer_ref'),('9618/33/O/N/24 Q7(d)(ii)','9618/33/O/N/24 Q7(d)(i)','answer_ref');

do $$
declare
  bad_refs int;
  actual_edges int;
begin
  with corpus as (
    select q.id,q.display_ref,c.number component
    from questions q
    join source_papers sp on sp.id=q.source_paper_id
    join syllabi sy on sy.id=sp.syllabus_id
    join components c on c.id=q.component_id
    where sy.code='9618' and sp.source_url is not null and sp.year between 2021 and 2025 and q.marks>0
  ), resolved as (
    select s.*, f.id from_id, t.id to_id
    from _9618_dep_snapshot_p13 s
    left join corpus f on f.display_ref=s.from_ref
    left join corpus t on t.display_ref=s.to_ref
  )
  select count(*) into bad_refs from resolved where from_id is null or to_id is null;

  if bad_refs<>0 then
    raise exception '9618 Paper 1-3 dependency snapshot has % unresolved refs',bad_refs;
  end if;

  delete from question_dependencies d
  using questions q,source_papers sp,syllabi sy,components c
  where d.question_id=q.id and q.source_paper_id=sp.id and sp.syllabus_id=sy.id and q.component_id=c.id
    and sy.code='9618' and sp.source_url is not null and sp.year between 2021 and 2025 and q.marks>0 and c.number<=3;

  insert into question_dependencies(question_id,depends_on_id,kind,strength,evidence,detected_by,confidence)
  select f.id,t.id,s.kind,'required','Audited source-backed Cambridge 9618 dependency snapshot.','dependency-reconcile-2026-09-02',0.99
  from _9618_dep_snapshot_p13 s
  join questions f on f.display_ref=s.from_ref
  join questions t on t.display_ref=s.to_ref;

  select count(*) into actual_edges
  from question_dependencies d
  join questions q on q.id=d.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id
  join components c on c.id=q.component_id
  where sy.code='9618' and sp.source_url is not null and sp.year between 2021 and 2025 and q.marks>0 and c.number<=3;

  if actual_edges<>67 then
    raise exception '9618 Paper 1-3 dependency reconciliation expected 67 edges, got %',actual_edges;
  end if;
end $$;
