import argon2 from 'argon2';
import { config } from '../config.js';
import { pool } from './client.js';
import {
  COMPONENTS,
  SUBTOPIC_COUNT,
  SYLLABUS_CODE,
  SYLLABUS_SUBJECT,
  SYLLABUS_VALID_FROM,
  SYLLABUS_VALID_TO,
  SYLLABUS_VERSION_LABEL,
  TOPICS,
} from './syllabus-9618-2026.js';

if (!pool) throw new Error('DATABASE_URL is required');

const email = process.env.SEED_OWNER_EMAIL;
const username = process.env.SEED_OWNER_USERNAME;
const password = process.env.SEED_OWNER_PASSWORD;
const studentPassword = process.env.SEED_STUDENT_PASSWORD;

if (
  !email ||
  !username ||
  !password ||
  password.length < 12 ||
  !studentPassword ||
  studentPassword.length < 12
) {
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
  const schoolId = existingSchool.id;

  const owner = await client.query<{ id: string }>(
    `insert into users (school_id, role, full_name, email, username, password_hash, status)
     values ($1, 'owner', 'Sarvar', $2, $3, $4, 'active')
     on conflict (email) do update set
       username = excluded.username,
       password_hash = excluded.password_hash,
       is_active = true,
       status = 'active',
       updated_at = now()
     returning id`,
    [schoolId, email, username, passwordHash],
  );
  const ownerId = owner.rows[0]!.id;

  const syllabus = await client.query<{ id: string }>(
    `insert into syllabi (code, subject, version_label, valid_from, valid_to)
     values ($1, $2, $3, $4, $5)
     on conflict (code, version_label) do update set is_active = true
     returning id`,
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
    const inserted = await client.query<{ id: string }>(
      `insert into components (syllabus_id, number, name, level, duration_min, total_marks, weight_pct)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (syllabus_id, number) do update set
         name = excluded.name,
         level = excluded.level,
         duration_min = excluded.duration_min,
         total_marks = excluded.total_marks,
         weight_pct = excluded.weight_pct
       returning id`,
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
    componentIds.set(component.number, inserted.rows[0]!.id);
  }

  for (const topic of TOPICS) {
    const inserted = await client.query<{ id: string }>(
      `insert into topics (syllabus_id, number, title, level, component_id, sort_order)
       values ($1, $2, $3, $4, $5, $2)
       on conflict (syllabus_id, number) do update set
         title = excluded.title,
         level = excluded.level,
         component_id = excluded.component_id
       returning id`,
      [syllabusId, topic.number, topic.title, topic.level, componentIds.get(topic.component)],
    );
    const topicId = inserted.rows[0]!.id;
    for (const [index, subtopic] of topic.subtopics.entries()) {
      await client.query(
        `insert into subtopics (topic_id, code, title, sort_order)
         values ($1, $2, $3, $4)
         on conflict (topic_id, code) do update set title = excluded.title, sort_order = excluded.sort_order`,
        [topicId, subtopic.code, subtopic.title, index + 1],
      );
    }
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
      [schoolId, name, grade, level, syllabusId, ownerId],
    );
    classIds.push(classResult.rows[0]!.id);
  }

  // Two study groups per class so class/group assignment can be exercised immediately.
  const groupIds = new Map<string, string>();
  for (const classId of classIds) {
    for (const [index, name] of ['Guruh 1', 'Guruh 2'].entries()) {
      const group = await client.query<{ id: string }>(
        `insert into groups (class_id, name, sort_order) values ($1, $2, $3)
         on conflict (class_id, name) do update set sort_order = excluded.sort_order
         returning id`,
        [classId, name, index + 1],
      );
      groupIds.set(`${classId}:${name}`, group.rows[0]!.id);
    }
  }

  const studentNames = [
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
  for (const [index, fullName] of studentNames.entries()) {
    const studentUsername = `student${String(index + 1).padStart(2, '0')}`;
    const student = await client.query<{ id: string }>(
      `insert into users (school_id, role, full_name, username, password_hash, status, approved_by, approved_at)
       values ($1, 'student', $2, $3, $4, 'active', $5, now())
       on conflict (username) do update set
         full_name = excluded.full_name,
         password_hash = excluded.password_hash,
         is_active = true,
         status = 'active',
         updated_at = now()
       returning id`,
      [schoolId, fullName, studentUsername, studentPasswordHash, ownerId],
    );
    const classId = classIds[index < 6 ? 0 : 1]!;
    await client.query(
      `insert into enrollments (class_id, student_id, group_id) values ($1, $2, $3)
       on conflict (class_id, student_id) do update set left_at = null, group_id = excluded.group_id`,
      [
        classId,
        student.rows[0]!.id,
        groupIds.get(`${classId}:${index % 2 === 0 ? 'Guruh 1' : 'Guruh 2'}`),
      ],
    );
  }

  // Two self-registered students waiting for class assignment, so the approval
  // queue is never empty on a fresh install.
  for (const [index, fullName] of ['Dilshod Nazarov', 'Kamola Yusupova'].entries()) {
    await client.query(
      `insert into users (role, full_name, email, password_hash, status)
       values ('student', $1, $2, $3, 'pending')
       on conflict (email) do update set full_name = excluded.full_name`,
      [fullName, `pending${index + 1}@example.com`, studentPasswordHash],
    );
  }

  await client.query('commit');
  console.log(
    `Seeded school, owner, ${TOPICS.length} topics, ${SUBTOPIC_COUNT} subtopics, ` +
      `2 classes with 4 groups, 12 enrolled students and 2 pending registrations`,
  );
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}

void config;
