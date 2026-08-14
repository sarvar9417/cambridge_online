-- Machine-readable mark schemes.
--
-- Cambridge schemes are not uniform, so the structure carries the marking rule
-- itself: `all_required` sums matched points, `any_n_from_m` caps a group at
-- n_required, `levels_of_response` is banded and never marked automatically.
-- `packages/shared/marking.ts` turns this plus a set of matched points into a
-- score; the model never produces the number.

CREATE TABLE mark_schemes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     uuid NOT NULL UNIQUE REFERENCES questions ON DELETE CASCADE,
  source_paper_id uuid REFERENCES source_papers,
  scheme_type     scheme_type NOT NULL,
  max_marks       int NOT NULL CHECK (max_marks > 0),
  guidance_md     text,
  status          review_status NOT NULL DEFAULT 'needs_review',
  extract_confidence numeric(3, 2),
  prompt_version  text,
  reviewed_by     uuid REFERENCES users,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 'Any three from:' — award up to n_required points from the group.
CREATE TABLE mark_scheme_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id  uuid NOT NULL REFERENCES mark_schemes ON DELETE CASCADE,
  label           text,
  n_required      int NOT NULL CHECK (n_required > 0),
  marks_per_point int NOT NULL DEFAULT 1,
  max_marks       int NOT NULL,
  sort_order      int NOT NULL DEFAULT 0
);

CREATE TABLE mark_scheme_points (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id uuid NOT NULL REFERENCES mark_schemes ON DELETE CASCADE,
  group_id       uuid REFERENCES mark_scheme_groups ON DELETE CASCADE,
  code           text NOT NULL,                      -- 'MP1'
  text           text NOT NULL,                      -- Cambridge wording, verbatim
  marks          int NOT NULL DEFAULT 1,
  accept         jsonb NOT NULL DEFAULT '[]',        -- allowed alternatives
  reject         jsonb NOT NULL DEFAULT '[]',        -- explicitly disallowed
  requires       jsonb NOT NULL DEFAULT '[]',        -- ['MP1'] — only with MP1
  is_bod         boolean NOT NULL DEFAULT false,     -- benefit of doubt
  sort_order     int NOT NULL DEFAULT 0,
  UNIQUE (mark_scheme_id, code)
);

CREATE INDEX mark_scheme_points_scheme_idx ON mark_scheme_points (mark_scheme_id);

CREATE TABLE mark_scheme_levels (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id        uuid NOT NULL REFERENCES mark_schemes ON DELETE CASCADE,
  level_number          int NOT NULL,
  min_marks             int NOT NULL,
  max_marks             int NOT NULL,
  descriptor_md         text NOT NULL,
  indicative_content_md text,
  UNIQUE (mark_scheme_id, level_number)
);
