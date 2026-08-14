-- Domain enums. Mirrored in packages/shared/src/enums.ts; the two must not drift.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('owner', 'teacher', 'student');
CREATE TYPE level_type AS ENUM ('AS', 'A2');

-- May/June, Oct/Nov, Feb/March
CREATE TYPE exam_series AS ENUM ('MJ', 'ON', 'FM');

-- Question paper, mark scheme, insert, examiner report, grade thresholds
CREATE TYPE paper_kind AS ENUM ('QP', 'MS', 'IN', 'ER', 'GT');

CREATE TYPE ao_type AS ENUM ('AO1', 'AO2', 'AO3');
CREATE TYPE review_status AS ENUM ('draft', 'needs_review', 'approved', 'rejected', 'archived');

CREATE TYPE scheme_type AS ENUM (
  'all_required', 'any_n_from_m', 'levels_of_response',
  'exact_match', 'code_output', 'manual_only'
);

CREATE TYPE command_word AS ENUM (
  'State', 'Give', 'Name', 'Identify', 'Define', 'Describe', 'Explain', 'Compare',
  'Calculate', 'Complete', 'Draw', 'Write', 'Evaluate', 'Justify', 'Suggest', 'Show', 'Other'
);

CREATE TYPE answer_kind AS ENUM ('text', 'pseudocode', 'code', 'image', 'table', 'diagram');
CREATE TYPE job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
CREATE TYPE finding_severity AS ENUM ('info', 'warning', 'error');
