import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type pg from 'pg';
import {
  COMPONENTS,
  SYLLABUS_CODE,
  SYLLABUS_SUBJECT,
  SYLLABUS_VALID_FROM,
  SYLLABUS_VALID_TO,
  SYLLABUS_VERSION_LABEL,
  TOPICS,
} from './syllabus-9618-2026.js';

export interface SeedCredentials {
  ownerEmail: string;
  ownerPassword: string;
  teacherEmail: string;
  teacherPassword: string;
  studentPassword: string;
}

export interface SeedResult {
  schoolId: string;
  ownerId: string;
  teacherId: string;
  classIds: string[];
  studentIds: string[];
  inviteCode: string;
}

const STUDENT_NAMES = [
  'Aziz Karimov',
  'Malika Rahimova',
  'Bobur Toirov',
  'Zilola Ergasheva',
  'Javohir Aliyev',
  'Madina Usmonova',
  'Sardor Normurodov',
  'Nilufar Hamidova',
  'Temur Qodirov',
  'Shahnoza Ismoilova',
  'Asadbek Rasulov',
  'Mohira Sattorova',
];

/**
 * Seeds one school, the official 9618 syllabus tree, one owner, one teacher, two
 * classes and twelve enrolled students, plus one unused invite code.
 *
 * Idempotent: every write is an upsert keyed on a natural unique constraint, so
 * running it twice leaves the same database. Tests rely on that.
 */
export async function seed(pool: pg.Pool, credentials: SeedCredentials): Promise<SeedResult> {
  for (const [field, value] of Object.entries(credentials)) {
    if (!value || value.length < 10) {
      throw new Error(`Seed credential ${field} must be at least 10 characters`);
    }
  }

  const [ownerHash, teacherHash, studentHash] = await Promise.all([
    argon2.hash(credentials.ownerPassword, { type: argon2.argon2id }),
    argon2.hash(credentials.teacherPassword, { type: argon2.argon2id }),
    argon2.hash(credentials.studentPassword, { type: argon2.argon2id }),
  ]);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const school = await client.query<{ id: string }>(
      `INSERT INTO schools (name, city) VALUES ('Navoiy Prezident maktabi', 'Navoiy')
       ON CONFLICT DO NOTHING RETURNING id`,
    );
    const schoolId =
      school.rows[0]?.id ??
      (
        await client.query<{ id: string }>(
          `SELECT id FROM schools WHERE name = 'Navoiy Prezident maktabi' LIMIT 1`,
        )
      ).rows[0]!.id;

    const owner = await client.query<{ id: string }>(
      `INSERT INTO users (school_id, role, full_name, email, username, password_hash)
       VALUES ($1, 'owner', 'Sarvar', $2, 'owner', $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash, is_active = true
       RETURNING id`,
      [schoolId, credentials.ownerEmail, ownerHash],
    );
    const ownerId = owner.rows[0]!.id;

    const teacher = await client.query<{ id: string }>(
      `INSERT INTO users (school_id, role, full_name, email, username, password_hash)
       VALUES ($1, 'teacher', 'Dilnoza Yo''ldosheva', $2, 'teacher', $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash, is_active = true
       RETURNING id`,
      [schoolId, credentials.teacherEmail, teacherHash],
    );
    const teacherId = teacher.rows[0]!.id;

    const syllabus = await client.query<{ id: string }>(
      `INSERT INTO syllabi (code, subject, version_label, valid_from, valid_to)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code, version_label) DO UPDATE SET is_active = true
       RETURNING id`,
      [
        SYLLABUS_CODE,
        SYLLABUS_SUBJECT,
        SYLLABUS_VERSION_LABEL,
        SYLLABUS_VALID_FROM,
        SYLLABUS_VALID_TO,
      ],
    );
    const syllabusId = syllabus.rows[0]!.id;

    const componentIds = new Map<number, string>();
    for (const component of COMPONENTS) {
      const row = await client.query<{ id: string }>(
        `INSERT INTO components (syllabus_id, number, name, level, duration_min, total_marks, weight_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (syllabus_id, number) DO UPDATE SET name = excluded.name
         RETURNING id`,
        [
          syllabusId,
          component.number,
          component.name,
          component.level,
          component.durationMin,
          component.totalMarks,
          component.weightPct,
        ],
      );
      componentIds.set(component.number, row.rows[0]!.id);
    }

    for (const topic of TOPICS) {
      const row = await client.query<{ id: string }>(
        `INSERT INTO topics (syllabus_id, number, title, level, component_id, sort_order)
         VALUES ($1, $2, $3, $4, $5, $2)
         ON CONFLICT (syllabus_id, number)
         DO UPDATE SET title = excluded.title, component_id = excluded.component_id
         RETURNING id`,
        [syllabusId, topic.number, topic.title, topic.level, componentIds.get(topic.component)],
      );
      const topicId = row.rows[0]!.id;
      for (const [index, subtopic] of topic.subtopics.entries()) {
        await client.query(
          `INSERT INTO subtopics (topic_id, code, title, sort_order) VALUES ($1, $2, $3, $4)
           ON CONFLICT (topic_id, code) DO UPDATE SET title = excluded.title`,
          [topicId, subtopic.code, subtopic.title, index + 1],
        );
      }
    }

    const classIds: string[] = [];
    for (const [name, grade, level] of [
      ['10-A CS', 10, 'AS'],
      ['11-A CS', 11, 'A2'],
    ] as const) {
      const row = await client.query<{ id: string }>(
        `INSERT INTO classes (school_id, name, grade, level, syllabus_id, academic_year, owner_id)
         VALUES ($1, $2, $3, $4, $5, '2026/2027', $6)
         ON CONFLICT (school_id, name, academic_year) DO UPDATE SET owner_id = excluded.owner_id
         RETURNING id`,
        [schoolId, name, grade, level, syllabusId, ownerId],
      );
      classIds.push(row.rows[0]!.id);
    }

    // The teacher co-teaches the first class only, so tests have a class that is
    // visible to the owner but not to the teacher.
    await client.query(
      `INSERT INTO class_teachers (class_id, teacher_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [classIds[0], teacherId],
    );

    const studentIds: string[] = [];
    for (const [index, fullName] of STUDENT_NAMES.entries()) {
      const username = `student${String(index + 1).padStart(2, '0')}`;
      const row = await client.query<{ id: string }>(
        `INSERT INTO users (school_id, role, full_name, username, password_hash)
         VALUES ($1, 'student', $2, $3, $4)
         ON CONFLICT (username)
         DO UPDATE SET password_hash = excluded.password_hash, is_active = true
         RETURNING id`,
        [schoolId, fullName, username, studentHash],
      );
      const studentId = row.rows[0]!.id;
      studentIds.push(studentId);
      await client.query(
        `INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2)
         ON CONFLICT (class_id, student_id) DO UPDATE SET left_at = NULL`,
        [classIds[index < 6 ? 0 : 1], studentId],
      );
    }

    const inviteCode = randomBytes(4).toString('hex').toUpperCase();
    await client.query(
      `INSERT INTO invites (class_id, code, role, max_uses, expires_at, created_by)
       VALUES ($1, $2, 'student', 30, now() + interval '30 days', $3)
       ON CONFLICT (code) DO NOTHING`,
      [classIds[0], inviteCode, ownerId],
    );

    await client.query('COMMIT');
    return { schoolId, ownerId, teacherId, classIds, studentIds, inviteCode };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
