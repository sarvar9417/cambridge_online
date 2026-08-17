-- Keep source-backed low-confidence taxonomy/LO mappings explicitly in review state.
-- Human-reviewed questions are not downgraded and taxonomy links are not changed here.
update questions q
set status='needs_review',
    notes=case
      when coalesce(q.notes,'') like '%taxonomy-review: low-confidence%' then q.notes
      else concat_ws(E'\n',nullif(q.notes,''),'taxonomy-review: low-confidence automated taxonomy/LO mapping retained; source evidence is insufficient for automatic promotion.')
    end,
    updated_at=now()
where q.marks>0
  and q.reviewed_at is null
  and exists(select 1 from source_papers sp where sp.id=q.source_paper_id and sp.source_url is not null)
  and (
    exists(select 1 from question_subtopics qs where qs.question_id=q.id and qs.is_primary and coalesce(qs.confidence,0)<0.72)
    or exists(select 1 from question_learning_objectives qlo where qlo.question_id=q.id and coalesce(qlo.confidence,0)<0.72)
  )
  and (q.status::text<>'needs_review' or coalesce(q.notes,'') not like '%taxonomy-review: low-confidence%');
