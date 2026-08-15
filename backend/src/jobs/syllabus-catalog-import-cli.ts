import { pool } from '../database/client.js';
import { importSyllabusCatalog } from './syllabus-catalog-import.js';
import { loadSyllabusCatalogDocument } from './syllabus-catalog-loader.js';

const file = process.argv.find((arg) => arg.startsWith('--file='))?.slice('--file='.length);
const write = process.argv.includes('--write');
if (!file) throw new Error('Usage: syllabus-catalog-import-cli --file=<catalog-or-descriptor.json> [--write]');

const validated = await loadSyllabusCatalogDocument(file);
const summary = {
  code: validated.code,
  subject: validated.subject,
  versionLabel: validated.versionLabel,
  validFrom: validated.validFrom,
  validTo: validated.validTo,
  components: validated.components.length,
  topics: validated.topics.length,
  subtopics: validated.topics.reduce((sum, topic) => sum + topic.subtopics.length, 0),
  learningObjectives: validated.topics.reduce(
    (sum, topic) => sum + topic.subtopics.reduce((inner, sub) => inner + sub.learningObjectives.length, 0),
    0,
  ),
};

if (!write) {
  console.log(JSON.stringify({ write: false, ...summary }, null, 2));
  process.exit(0);
}
if (!pool) throw new Error('DATABASE_URL is required for --write');
if (process.env.CONFIRM_SYLLABUS_CATALOG_IMPORT !== 'YES') {
  throw new Error('Set CONFIRM_SYLLABUS_CATALOG_IMPORT=YES to use --write');
}
const result = await importSyllabusCatalog(pool, validated);
console.log(JSON.stringify({ write: true, ...summary, result }, null, 2));
await pool.end();
