CREATE TYPE level_type AS ENUM ('AS', 'A2');

CREATE TABLE syllabi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  subject text NOT NULL,
  version_label text NOT NULL,
  valid_from int NOT NULL,
  valid_to int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version_label)
);

CREATE TABLE components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL REFERENCES syllabi ON DELETE CASCADE,
  number int NOT NULL CHECK (number BETWEEN 1 AND 4),
  name text NOT NULL,
  level level_type NOT NULL,
  duration_min int NOT NULL,
  total_marks int NOT NULL,
  weight_pct numeric(5,2),
  UNIQUE (syllabus_id, number)
);

CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL REFERENCES syllabi ON DELETE CASCADE,
  number int NOT NULL,
  title text NOT NULL,
  level level_type NOT NULL,
  component_id uuid REFERENCES components,
  sort_order int NOT NULL,
  UNIQUE (syllabus_id, number)
);

CREATE TABLE subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  sort_order int NOT NULL,
  UNIQUE (topic_id, code)
);

CREATE TABLE learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  code text NOT NULL,
  text text NOT NULL,
  sort_order int NOT NULL,
  UNIQUE (subtopic_id, code)
);

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools ON DELETE CASCADE,
  name text NOT NULL,
  grade int,
  level level_type NOT NULL,
  syllabus_id uuid NOT NULL REFERENCES syllabi,
  academic_year text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name, academic_year)
);

CREATE TABLE class_teachers (
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  PRIMARY KEY (class_id, teacher_id)
);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  UNIQUE (class_id, student_id)
);

CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  max_uses int NOT NULL DEFAULT 30,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX enrollments_active_student_idx ON enrollments (student_id, class_id)
  WHERE left_at IS NULL;
CREATE INDEX classes_owner_idx ON classes (owner_id) WHERE archived_at IS NULL;
