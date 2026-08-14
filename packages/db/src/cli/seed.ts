import pg from 'pg';
import { seed } from '../seed/seed.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const pool = new pg.Pool({ connectionString });
try {
  const result = await seed(pool, {
    ownerEmail: process.env.SEED_OWNER_EMAIL ?? 'owner@campath.local',
    ownerPassword: process.env.SEED_OWNER_PASSWORD ?? '',
    teacherEmail: process.env.SEED_TEACHER_EMAIL ?? 'teacher@campath.local',
    teacherPassword: process.env.SEED_TEACHER_PASSWORD ?? '',
    studentPassword: process.env.SEED_STUDENT_PASSWORD ?? '',
  });
  console.log(
    `Seeded school ${result.schoolId}: owner, teacher, ` +
      `${result.classIds.length} classes, ${result.studentIds.length} students. ` +
      `Invite code: ${result.inviteCode}`,
  );
} finally {
  await pool.end();
}
