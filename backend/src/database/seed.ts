import argon2 from 'argon2';
import { config } from '../config.js';
import { pool } from './client.js';

if (!pool) throw new Error('DATABASE_URL is required');

const email = process.env.SEED_OWNER_EMAIL;
const username = process.env.SEED_OWNER_USERNAME;
const password = process.env.SEED_OWNER_PASSWORD;
const studentPassword = process.env.SEED_STUDENT_PASSWORD;

if (!email || !username || !password || password.length < 12 || !studentPassword || studentPassword.length < 12) {
  throw new Error('Owner and student seed credentials with 12+ character passwords are required');
}

const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
const studentPasswordHash = await argon2.hash(studentPassword, { type: argon2.argon2id });
const client = await pool.connect();

try {
  await client.query('begin');
  let existingSchool = (
    await client.query<{ id: string }>(
      `select id from schools where name = 'Navoiy Prezident maktabi' limit 1`,
    )
  ).rows[0];
  existingSchool ??= (
    await client.query<{ id: string }>(
      `insert into schools (name, city) values ('Navoiy Prezident maktabi', 'Navoiy') returning id`,
    )
  ).rows[0];
  if (!existingSchool) throw new Error('School seed failed');

  const owner = await client.query<{ id: string }>(
    `insert into users (school_id, role, full_name, email, username, password_hash)
     values ($1, 'owner', 'Sarvar', $2, $3, $4)
     on conflict (email) do update set
       username = excluded.username,
       password_hash = excluded.password_hash,
       is_active = true,
       updated_at = now()
     returning id`,
    [existingSchool.id, email, username, passwordHash],
  );

  const syllabus = await client.query<{ id: string }>(
    `insert into syllabi (code, subject, version_label, valid_from, valid_to)
     values ('9618', 'Computer Science', '2026-2028', 2026, 2028)
     on conflict (code, version_label) do update set is_active = true
     returning id`,
  );
  const syllabusId = syllabus.rows[0]!.id;

  const componentData = [
    [1, 'Theory Fundamentals', 'AS', 90, 75, 25],
    [2, 'Fundamental Problem-solving and Programming Skills', 'AS', 120, 75, 25],
    [3, 'Advanced Theory', 'A2', 90, 75, 25],
    [4, 'Practical', 'A2', 150, 75, 25],
  ] as const;
  const componentIds = new Map<number, string>();
  for (const [number, name, level, duration, marks, weight] of componentData) {
    const component = await client.query<{ id: string }>(
      `insert into components (syllabus_id, number, name, level, duration_min, total_marks, weight_pct)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (syllabus_id, number) do update set name = excluded.name
       returning id`,
      [syllabusId, number, name, level, duration, marks, weight],
    );
    componentIds.set(number, component.rows[0]!.id);
  }

  const topicTitles = [
    'Information representation', 'Communication', 'Hardware', 'Processor fundamentals',
    'System software', 'Security, privacy and data integrity', 'Ethics and ownership', 'Databases',
    'Algorithm design and problem-solving', 'Data types and structures', 'Programming', 'Software development',
    'Data representation', 'Communication and internet technologies', 'Hardware and virtual machines',
    'System software', 'Security', 'Artificial intelligence (AI)',
    'Computational thinking and problem solving', 'Further programming',
  ];
  for (const [index, title] of topicTitles.entries()) {
    const number = index + 1;
    const componentNumber = number <= 8 ? 1 : number <= 12 ? 2 : number <= 18 ? 3 : 4;
    const level = number <= 12 ? 'AS' : 'A2';
    await client.query(
      `insert into topics (syllabus_id, number, title, level, component_id, sort_order)
       values ($1, $2, $3, $4, $5, $2)
       on conflict (syllabus_id, number) do update set title = excluded.title, component_id = excluded.component_id`,
      [syllabusId, number, title, level, componentIds.get(componentNumber)],
    );
  }

  const classData = [
    ['10-A CS', 10, 'AS'],
    ['11-A CS', 11, 'A2'],
  ] as const;
  const classIds: string[] = [];
  for (const [name, grade, level] of classData) {
    const classResult = await client.query<{ id: string }>(
      `insert into classes (school_id, name, grade, level, syllabus_id, academic_year, owner_id)
       values ($1, $2, $3, $4, $5, '2026/2027', $6)
       on conflict (school_id, name, academic_year) do update set owner_id = excluded.owner_id
       returning id`,
      [existingSchool.id, name, grade, level, syllabusId, owner.rows[0]!.id],
    );
    classIds.push(classResult.rows[0]!.id);
  }

  const studentNames = [
    'Aziz Karimov', 'Malika Rahimova', 'Bobur Toirov', 'Zilola Ergasheva',
    'Javohir Aliyev', 'Madina Usmonova', 'Sardor Normurodov', 'Nilufar Hamidova',
    'Temur Qodirov', 'Shahnoza Ismoilova', 'Asadbek Rasulov', 'Mohira Sattorova',
  ];
  for (const [index, fullName] of studentNames.entries()) {
    const studentUsername = `student${String(index + 1).padStart(2, '0')}`;
    const student = await client.query<{ id: string }>(
      `insert into users (school_id, role, full_name, username, password_hash)
       values ($1, 'student', $2, $3, $4)
       on conflict (username) do update set full_name = excluded.full_name, password_hash = excluded.password_hash,
         is_active = true, updated_at = now()
       returning id`,
      [existingSchool.id, fullName, studentUsername, studentPasswordHash],
    );
    await client.query(
      `insert into enrollments (class_id, student_id) values ($1, $2)
       on conflict (class_id, student_id) do update set left_at = null`,
      [classIds[index < 6 ? 0 : 1], student.rows[0]!.id],
    );
  }
  await client.query('commit');
  console.log('Seeded syllabus, school, owner, 2 classes and 12 students');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}

void config;
