import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const statePath = join(root, 'PROJECT-STATE.md');
const acceptancePath = join(root, 'docs', 'lesson-studio-v3-acceptance.md');
const packagePath = join(root, 'package.json');
const migrationsDir = join(root, 'backend', 'src', 'database', 'migrations');

const START = '<!-- PROJECT_STATE:JSON:START -->';
const END = '<!-- PROJECT_STATE:JSON:END -->';
const mode = process.argv.includes('--write') ? 'write' : 'check';

function fail(message) {
  console.error(`PROJECT-STATE check failed: ${message}`);
  process.exitCode = 1;
}

function readJsonState(markdown) {
  const start = markdown.indexOf(START);
  const end = markdown.indexOf(END);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('machine-readable PROJECT_STATE JSON markers are missing or malformed');
  }
  const block = markdown.slice(start + START.length, end);
  const match = block.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) throw new Error('JSON code block is missing between PROJECT_STATE markers');
  return { state: JSON.parse(match[1]), start, end };
}

function repositoryEvidence() {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const verifyCommand = packageJson.scripts?.verify ? 'npm run verify' : null;

  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  const latestMigration = migrationFiles.at(-1) ?? null;

  const acceptance = readFileSync(acceptancePath, 'utf8');
  const items = [...acceptance.matchAll(/^- \[([ xX])\] (.+)$/gm)].map((match) => ({
    checked: match[1].toLowerCase() === 'x',
    text: match[2].trim(),
  }));
  const checked = items.filter((item) => item.checked).length;
  const pendingItems = items.filter((item) => !item.checked).map((item) =>
    item.text.replace(/`/g, ''),
  );

  return {
    latestMigration,
    verifyCommand,
    lessonStudio: {
      checked,
      total: items.length,
      pending: pendingItems.length,
      pendingItems,
    },
    packageJson,
  };
}

function applyDerivedFields(state, evidence) {
  state.release.latest_migration = evidence.latestMigration;
  state.acceptance.verify.command = evidence.verifyCommand;
  state.acceptance.lesson_studio.checked = evidence.lessonStudio.checked;
  state.acceptance.lesson_studio.total = evidence.lessonStudio.total;
  state.acceptance.lesson_studio.pending = evidence.lessonStudio.pending;
  state.acceptance.lesson_studio.pending_items = evidence.lessonStudio.pendingItems;
  return state;
}

function replaceJsonBlock(markdown, state) {
  const start = markdown.indexOf(START);
  const end = markdown.indexOf(END);
  const before = markdown.slice(0, start + START.length);
  const after = markdown.slice(end);
  return `${before}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${after}`;
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function checkRequiredShape(state) {
  const required = [
    ['release.branch', state.release?.branch],
    ['release.maturity', state.release?.maturity],
    ['release.corpus_window', state.release?.corpus_window],
    ['release.corpus_version', state.release?.corpus_version],
    ['product.lesson_studio', state.product?.lesson_studio],
    ['product.assignments', state.product?.assignments],
    ['product.marking', state.product?.marking],
    ['product.reports', state.product?.reports],
    ['product.student_flow', state.product?.student_flow],
    ['acceptance.verify', state.acceptance?.verify],
    ['acceptance.lesson_studio', state.acceptance?.lesson_studio],
    ['infrastructure.database', state.infrastructure?.database],
    ['infrastructure.storage', state.infrastructure?.storage],
    ['infrastructure.worker', state.infrastructure?.worker],
  ];

  for (const [name, value] of required) {
    if (value === undefined || value === null || value === '') fail(`${name} is required`);
  }

  const runtimeStatus = state.release?.runtime_audit?.status;
  const liveFields = [
    'expected_papers',
    'complete_papers',
    'policy_blocked',
    'source_complete_questions',
  ];
  if (runtimeStatus !== 'verified') {
    for (const field of liveFields) {
      if (state.release?.[field] !== null) {
        fail(`release.${field} must stay null until release.runtime_audit.status is verified`);
      }
    }
  }

  if (!Array.isArray(state.evidence_files) || state.evidence_files.length === 0) {
    fail('evidence_files must be a non-empty array');
  } else {
    for (const file of state.evidence_files) {
      if (!existsSync(join(root, file))) fail(`evidence file does not exist: ${file}`);
    }
  }
}

function main() {
  if (!existsSync(statePath)) throw new Error('PROJECT-STATE.md does not exist');
  const markdown = readFileSync(statePath, 'utf8');
  const { state } = readJsonState(markdown);
  const evidence = repositoryEvidence();

  checkRequiredShape(state);

  if (!evidence.packageJson.scripts?.['project:state:check']) {
    fail('package.json is missing project:state:check');
  }
  if (!evidence.packageJson.scripts?.['project:state:refresh']) {
    fail('package.json is missing project:state:refresh');
  }

  const derived = structuredClone(state);
  applyDerivedFields(derived, evidence);

  if (mode === 'write') {
    const next = replaceJsonBlock(markdown, derived);
    if (next !== markdown) {
      writeFileSync(statePath, next);
      console.log(`Refreshed ${relative(root, statePath)} from repository evidence.`);
    } else {
      console.log('PROJECT-STATE repository-derived fields are already current.');
    }
    return;
  }

  const checks = [
    ['release.latest_migration', state.release?.latest_migration, derived.release?.latest_migration],
    ['acceptance.verify.command', state.acceptance?.verify?.command, derived.acceptance?.verify?.command],
    ['acceptance.lesson_studio', state.acceptance?.lesson_studio, derived.acceptance?.lesson_studio],
  ];
  for (const [name, actual, expected] of checks) {
    if (!same(actual, expected)) {
      fail(`${name} is stale; run npm run project:state:refresh`);
    }
  }

  if (!process.exitCode) {
    console.log(
      `PROJECT-STATE OK: migration ${evidence.latestMigration}; ` +
        `Lesson Studio ${evidence.lessonStudio.checked}/${evidence.lessonStudio.total}; ` +
        `${evidence.verifyCommand}.`,
    );
  }
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
