import { createHash } from 'node:crypto';
import { pool } from './client.js';

if (!pool) throw new Error('DATABASE_URL is required');

type Scheme = 'all_required' | 'any_n_from_m' | 'levels_of_response';
type Command = 'State' | 'Define' | 'Describe' | 'Explain' | 'Compare' | 'Calculate' | 'Complete' | 'Draw' | 'Evaluate' | 'Suggest';

interface SeedQuestion {
  marks: number;
  command: Command;
  stem: string;
  scheme: Scheme;
  points?: string[];
  diagram?: boolean;
}

const questions: SeedQuestion[] = [
  { marks: 2, command: 'Define', stem: 'Define the term binary number system.', scheme: 'all_required', points: ['Uses base 2', 'Uses only the digits 0 and 1'] },
  { marks: 3, command: 'Explain', stem: 'Explain why hexadecimal is used when representing binary values.', scheme: 'all_required', points: ['Shorter representation', 'Easier for humans to read', 'Converts directly to groups of four bits'] },
  { marks: 3, command: 'Describe', stem: 'Describe how a bitmap image is represented in a computer.', scheme: 'all_required', points: ['Image is divided into pixels', 'Each pixel stores a colour value', 'Resolution and colour depth affect file size'] },
  { marks: 4, command: 'Explain', stem: 'Explain how parity can detect an error during data transmission.', scheme: 'all_required', points: ['Parity bit is added', 'Agreed odd or even parity is used', 'Receiver recounts set bits', 'Mismatch indicates an error'] },
  { marks: 6, command: 'Evaluate', stem: 'Evaluate the use of cloud storage for a school.', scheme: 'levels_of_response' },
  { marks: 4, command: 'Describe', stem: 'Describe the purpose of four components of a computer system.', scheme: 'any_n_from_m', points: ['Processor executes instructions', 'RAM stores active data and instructions', 'Secondary storage stores data persistently', 'Input device supplies data', 'Output device presents information'] },
  { marks: 3, command: 'Explain', stem: 'Explain the role of the control unit in the fetch-execute cycle.', scheme: 'all_required', points: ['Fetches the instruction', 'Decodes the instruction', 'Sends control signals'] },
  { marks: 4, command: 'Describe', stem: 'Describe how an interrupt is handled by a processor.', scheme: 'all_required', points: ['Current instruction completes', 'Registers are saved', 'Interrupt service routine runs', 'Previous state is restored'] },
  { marks: 4, command: 'Explain', stem: 'Explain why an operating system uses memory management.', scheme: 'all_required', points: ['Allocates memory to processes', 'Prevents unauthorised access', 'Reclaims unused memory', 'Supports virtual memory'] },
  { marks: 4, command: 'Explain', stem: 'Explain how a firewall helps protect a network.', scheme: 'all_required', points: ['Monitors network traffic', 'Applies configured rules', 'Blocks disallowed traffic', 'Records suspicious activity'] },
  { marks: 3, command: 'Explain', stem: 'Explain why personal data should be kept accurate and secure.', scheme: 'all_required', points: ['Incorrect data can cause harmful decisions', 'Unauthorised access breaches privacy', 'Security controls reduce misuse'] },
  { marks: 4, command: 'Compare', stem: 'Compare copyright and open-source licensing.', scheme: 'all_required', points: ['Both define permitted use', 'Copyright owner controls copying', 'Open-source licence permits source access', 'Licence conditions still apply'] },
  { marks: 3, command: 'Define', stem: 'Define primary key and foreign key.', scheme: 'all_required', points: ['Primary key uniquely identifies a record', 'Foreign key references a key in another table', 'Foreign key creates a relationship'] },
  { marks: 4, command: 'Explain', stem: 'Explain why database normalisation is used.', scheme: 'all_required', points: ['Reduces duplicated data', 'Prevents update anomalies', 'Improves data integrity', 'Separates data into related tables'] },
  { marks: 4, command: 'Describe', stem: 'Describe four stages used to develop an algorithmic solution.', scheme: 'all_required', points: ['Decompose the problem', 'Identify inputs and outputs', 'Design the algorithm', 'Test using suitable data'] },
  { marks: 4, command: 'Complete', stem: 'Complete the trace table for the algorithm shown.', scheme: 'all_required', points: ['First iteration correct', 'Second iteration correct', 'Final value correct', 'Output correct'] },
  { marks: 4, command: 'Explain', stem: 'Explain when a stack data structure is appropriate.', scheme: 'all_required', points: ['Uses last-in first-out order', 'Items are pushed', 'Items are popped', 'Suitable contextual example'] },
  { marks: 4, command: 'Describe', stem: 'Describe validation checks suitable for an age input.', scheme: 'any_n_from_m', points: ['Type check', 'Range check', 'Presence check', 'Format check', 'Length check'] },
  { marks: 4, command: 'Draw', stem: 'Draw a logic circuit for the given Boolean expression.', scheme: 'all_required', points: ['Correct input labels', 'Correct first gate', 'Correct second gate', 'Correct output connection'], diagram: true },
  { marks: 4, command: 'Suggest', stem: 'Suggest improvements to make a program easier to maintain.', scheme: 'all_required', points: ['Meaningful identifiers', 'Modular procedures', 'Useful comments', 'Consistent formatting'] },
];

const client = await pool.connect();

try {
  await client.query('begin');
  const metadata = await client.query<{ syllabus_id: string; component_id: string; owner_id: string }>(
    `select s.id as syllabus_id, c.id as component_id, u.id as owner_id
     from syllabi s join components c on c.syllabus_id = s.id and c.number = 1
     join users u on u.role = 'owner'
     where s.code = '9618' order by u.created_at limit 1`,
  );
  const row = metadata.rows[0];
  if (!row) throw new Error('Run the base seed before the question seed');

  const qpHash = createHash('sha256').update('campath-manual-phase-0-qp').digest('hex');
  const msHash = createHash('sha256').update('campath-manual-phase-0-ms').digest('hex');
  const qp = await client.query<{ id: string }>(
    `insert into source_papers (syllabus_id, component_id, year, series, variant, kind, storage_path, sha256, uploaded_by)
     values ($1, $2, 2026, 'MJ', 1, 'QP', 'manual/phase-0-qp.pdf', $3, $4)
     on conflict (sha256) do update set storage_path = excluded.storage_path returning id`,
    [row.syllabus_id, row.component_id, qpHash, row.owner_id],
  );
  const ms = await client.query<{ id: string }>(
    `insert into source_papers (syllabus_id, component_id, year, series, variant, kind, storage_path, sha256, uploaded_by)
     values ($1, $2, 2026, 'MJ', 1, 'MS', 'manual/phase-0-ms.pdf', $3, $4)
     on conflict (sha256) do update set storage_path = excluded.storage_path returning id`,
    [row.syllabus_id, row.component_id, msHash, row.owner_id],
  );

  for (const [index, question] of questions.entries()) {
    const number = index + 1;
    const root = await client.query<{ id: string }>(
      `insert into questions (source_paper_id, component_id, label, path, display_ref, depth, sort_order,
         context_md, status, extract_confidence, reviewed_by, reviewed_at, notes)
       values ($1, $2, $3, $3, $4, 0, $5, $6, 'approved', 1, $7, now(), 'Phase 0 manual seed')
       on conflict (source_paper_id, path) do update set context_md = excluded.context_md returning id`,
      [qp.rows[0]!.id, row.component_id, String(number), `9618/11/M/J/26 Q${number}`, number,
        `Question ${number} shared context.`, row.owner_id],
    );
    const leaf = await client.query<{ id: string }>(
      `insert into questions (source_paper_id, component_id, parent_id, label, path, display_ref, depth,
         sort_order, stem_md, command_word, marks, ao, answer_kind, answer_lines, status,
         extract_confidence, reviewed_by, reviewed_at, notes)
       values ($1, $2, $3, 'a', $4, $5, 1, 1, $6, $7, $8, 'AO1', $9, $10,
         'approved', 1, $11, now(), 'Phase 0 manual seed')
       on conflict (source_paper_id, path) do update set stem_md = excluded.stem_md, marks = excluded.marks
       returning id`,
      [qp.rows[0]!.id, row.component_id, root.rows[0]!.id, `${number}.a`,
        `9618/11/M/J/26 Q${number}(a)`, question.stem, question.command, question.marks,
        question.diagram ? 'diagram' : 'text', question.diagram ? 0 : question.marks * 2, row.owner_id],
    );
    const scheme = await client.query<{ id: string }>(
      `insert into mark_schemes (question_id, source_paper_id, scheme_type, max_marks, status,
         extract_confidence, reviewed_by, reviewed_at, guidance_md)
       values ($1, $2, $3, $4, 'approved', 1, $5, now(), 'Phase 0 manual seed')
       on conflict (question_id) do update set scheme_type = excluded.scheme_type, max_marks = excluded.max_marks
       returning id`,
      [leaf.rows[0]!.id, ms.rows[0]!.id, question.scheme, question.marks, row.owner_id],
    );
    await client.query('delete from mark_scheme_levels where mark_scheme_id = $1', [scheme.rows[0]!.id]);
    await client.query('delete from mark_scheme_points where mark_scheme_id = $1', [scheme.rows[0]!.id]);
    await client.query('delete from mark_scheme_groups where mark_scheme_id = $1', [scheme.rows[0]!.id]);

    if (question.scheme === 'levels_of_response') {
      const levels = [[1, 1, 2, 'Limited response'], [2, 3, 4, 'Developed response'], [3, 5, 6, 'Well-reasoned evaluation']] as const;
      for (const level of levels) {
        await client.query(
          `insert into mark_scheme_levels (mark_scheme_id, level_number, min_marks, max_marks, descriptor_md)
           values ($1, $2, $3, $4, $5)`, [scheme.rows[0]!.id, ...level],
        );
      }
    } else {
      let groupId: string | null = null;
      if (question.scheme === 'any_n_from_m') {
        const group = await client.query<{ id: string }>(
          `insert into mark_scheme_groups (mark_scheme_id, label, n_required, marks_per_point, max_marks)
           values ($1, $2, $3, 1, $3) returning id`,
          [scheme.rows[0]!.id, `Any ${question.marks} from:`, question.marks],
        );
        groupId = group.rows[0]!.id;
      }
      for (const [pointIndex, text] of (question.points ?? []).entries()) {
        await client.query(
          `insert into mark_scheme_points (mark_scheme_id, group_id, code, text, sort_order)
           values ($1, $2, $3, $4, $5)`,
          [scheme.rows[0]!.id, groupId, `MP${pointIndex + 1}`, text, pointIndex + 1],
        );
      }
    }
    await client.query('delete from question_assets where question_id = $1', [leaf.rows[0]!.id]);
    if (question.diagram) {
      await client.query(
        `insert into question_assets (question_id, kind, content_md, alt_text, source_page)
         values ($1, 'diagram', 'A AND (B OR C)', 'Boolean expression for the logic circuit', 1)`,
        [leaf.rows[0]!.id],
      );
    }
  }

  const classRow = await client.query<{id:string}>(`select id from classes where name='10-A CS' and academic_year='2026/2027' limit 1`);
  let assignmentId=(await client.query<{id:string}>(`select id from assignments where class_id=$1 and title='Computer Systems Practice' order by created_at limit 1`,[classRow.rows[0]!.id])).rows[0]?.id;
  if(!assignmentId) assignmentId=(await client.query<{id:string}>(`insert into assignments(class_id,created_by,title,instructions_md,mode,total_marks,opens_at,due_at,time_limit_min,published_at)
    values($1,$2,'Computer Systems Practice','Barcha savollarga aniq javob yozing.','online',20,now(),now()+interval '7 days',45,now()) returning id`,[classRow.rows[0]!.id,row.owner_id])).rows[0]!.id;
  const leafQuestions=await client.query<{id:string}>(`select id from questions where source_paper_id=$1 and marks is not null order by sort_order limit 6`,[qp.rows[0]!.id]);
  await client.query(`delete from assignment_questions where assignment_id=$1`,[assignmentId]);
  for(const [i,q] of leafQuestions.rows.entries()) await client.query(`insert into assignment_questions(assignment_id,question_id,sort_order) values($1,$2,$3)`,[assignmentId,q.id,i+1]);
  await client.query(`update assignments set total_marks=(select sum(q.marks) from assignment_questions aq join questions q on q.id=aq.question_id where aq.assignment_id=$1) where id=$1`,[assignmentId]);

  await client.query('commit');
  console.log('Seeded 20 manual leaf questions and mark schemes');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}
