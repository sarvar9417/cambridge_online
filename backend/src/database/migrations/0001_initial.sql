CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('owner', 'teacher', 'student');

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'student',
  full_name text NOT NULL,
  email text UNIQUE,
  username text UNIQUE,
  password_hash text NOT NULL,
  token_version int NOT NULL DEFAULT 1,
  locale text NOT NULL DEFAULT 'uz',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR username IS NOT NULL)
);
