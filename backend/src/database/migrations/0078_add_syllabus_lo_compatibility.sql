-- Runtime compatibility between learning objectives from different syllabus versions.
--
-- This table does NOT remap historical questions. Questions and their persisted taxonomy
-- remain attached to the syllabus version of the source paper. Product features such as
-- current-syllabus practice may consult this relation to decide whether a historical LO
-- is safe to reuse for a target syllabus.

create table if not exists syllabus_lo_compatibility (
  source_lo_id uuid not null references learning_objectives(id) on delete cascade,
  target_lo_id uuid not null references learning_objectives(id) on delete cascade,
  compatibility_kind text not null check (
    compatibility_kind in ('equivalent', 'narrower_source', 'explicitly_excluded')
  ),
  evidence text not null check (length(trim(evidence)) > 0),
  reviewed_at timestamptz,
  reviewed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_lo_id, target_lo_id),
  check (source_lo_id <> target_lo_id)
);

create index if not exists syllabus_lo_compatibility_target_idx
  on syllabus_lo_compatibility(target_lo_id, compatibility_kind);

create index if not exists syllabus_lo_compatibility_source_idx
  on syllabus_lo_compatibility(source_lo_id, compatibility_kind);

comment on table syllabus_lo_compatibility is
  'Reviewed cross-version LO compatibility for runtime reuse. Never used to rewrite persisted historical question taxonomy.';
comment on column syllabus_lo_compatibility.compatibility_kind is
  'equivalent and narrower_source are eligible for target-syllabus reuse; explicitly_excluded records a reviewed incompatibility.';
comment on column syllabus_lo_compatibility.evidence is
  'Concise source-backed rationale for the cross-version compatibility decision.';

do $$
begin
  if exists (
    select 1
    from syllabus_lo_compatibility c
    join learning_objectives slo on slo.id = c.source_lo_id
    join subtopics sst on sst.id = slo.subtopic_id
    join topics st on st.id = sst.topic_id
    join learning_objectives tlo on tlo.id = c.target_lo_id
    join subtopics tst on tst.id = tlo.subtopic_id
    join topics tt on tt.id = tst.topic_id
    where st.syllabus_id = tt.syllabus_id
  ) then
    raise exception 'syllabus_lo_compatibility must only connect different syllabus versions';
  end if;
end $$;
