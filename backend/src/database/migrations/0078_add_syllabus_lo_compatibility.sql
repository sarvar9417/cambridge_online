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

create or replace function enforce_syllabus_lo_compatibility_cross_version()
returns trigger
language plpgsql
as $$
declare
  source_syllabus uuid;
  target_syllabus uuid;
begin
  select t.syllabus_id into source_syllabus
  from learning_objectives lo
  join subtopics st on st.id = lo.subtopic_id
  join topics t on t.id = st.topic_id
  where lo.id = new.source_lo_id;

  select t.syllabus_id into target_syllabus
  from learning_objectives lo
  join subtopics st on st.id = lo.subtopic_id
  join topics t on t.id = st.topic_id
  where lo.id = new.target_lo_id;

  if source_syllabus is null or target_syllabus is null then
    raise exception 'syllabus_lo_compatibility references unresolved learning objectives';
  end if;

  if source_syllabus = target_syllabus then
    raise exception 'syllabus_lo_compatibility must only connect different syllabus versions';
  end if;

  return new;
end;
$$;

drop trigger if exists syllabus_lo_compatibility_cross_version on syllabus_lo_compatibility;
create trigger syllabus_lo_compatibility_cross_version
before insert or update of source_lo_id, target_lo_id on syllabus_lo_compatibility
for each row execute function enforce_syllabus_lo_compatibility_cross_version();
