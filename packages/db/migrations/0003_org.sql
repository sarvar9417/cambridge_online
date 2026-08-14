-- Schools, users, sessions and class membership.
--
-- There is no open registration: an account is created by the owner or by
-- redeeming an invite code. `token_version` is carried in the access token so a
-- password change or a lockout invalidates every live token at once.

CREATE TABLE schools (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  city       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid REFERENCES schools ON DELETE SET NULL,
  role          user_role NOT NULL DEFAULT 'student',
  full_name     text NOT NULL,
  email         text UNIQUE,
  username      text UNIQUE,                         -- for students with no email
  password_hash text NOT NULL,                       -- argon2id
  token_version int NOT NULL DEFAULT 1,
  locale        text NOT NULL DEFAULT 'uz',
  avatar_url    text,
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR username IS NOT NULL)
);

-- Only the sha256 of a refresh token is stored; the raw value exists solely in
-- the client cookie, so a database leak cannot be replayed as a session.
CREATE TABLE refresh_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  device_label text,
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_active_idx ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE classes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools ON DELETE CASCADE,
  name          text NOT NULL,                       -- '10-A CS'
  grade         int,
  level         level_type NOT NULL,
  syllabus_id   uuid NOT NULL REFERENCES syllabi,
  academic_year text NOT NULL,                       -- '2026/2027'
  owner_id      uuid NOT NULL REFERENCES users,
  archived_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name, academic_year)
);

CREATE TABLE class_teachers (
  class_id   uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  PRIMARY KEY (class_id, teacher_id)
);

CREATE TABLE enrollments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  left_at    timestamptz,
  UNIQUE (class_id, student_id)
);

CREATE INDEX enrollments_student_idx ON enrollments (student_id) WHERE left_at IS NULL;

CREATE TABLE invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  code       text NOT NULL UNIQUE,
  role       user_role NOT NULL DEFAULT 'student',
  max_uses   int NOT NULL DEFAULT 30,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (used_count <= max_uses)
);
