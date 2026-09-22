import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const statePath = join(root, 'LIVE-GAME-MASTER-SPEC.md');
const packagePath = join(root, 'package.json');
const migrationsDir = join(root, 'backend', 'src', 'database', 'migrations');
const START = '<!-- LIVE_GAME_STATE:JSON:START -->';
const END = '<!-- LIVE_GAME_STATE:JSON:END -->';
const mode = process.argv.includes('--write') ? 'write' : 'check';

function fail(message) {
  console.error(`LIVE-GAME-MASTER-SPEC check failed: ${message}`);
  process.exitCode = 1;
}

function readJsonState(markdown) {
  const start = markdown.indexOf(START);
  const end = markdown.indexOf(END);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('machine-readable LIVE_GAME_STATE JSON markers are missing or malformed');
  }
  const block = markdown.slice(start + START.length, end);
  const match = block.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) throw new Error('JSON code block is missing between LIVE_GAME_STATE markers');
  return JSON.parse(match[1]);
}

function markdownFiles(directory, found = []) {
  for (const name of readdirSync(directory)) {
    if (name === '.git' || name === 'node_modules') continue;
    const path = join(directory, name);
    const stats = statSync(path);
    if (stats.isDirectory()) markdownFiles(path, found);
    else if (name.toLowerCase().endsWith('.md')) found.push(relative(root, path));
  }
  return found.sort();
}

function repositoryEvidence() {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const migrations = readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  return {
    latestMigration: migrations.at(-1) ?? null,
    verifyCommand: packageJson.scripts?.verify ? 'npm run verify' : null,
    markdownFiles: markdownFiles(root),
  };
}

function validateShape(state) {
  if (state.schema_version !== 1) fail('schema_version must be 1');
  if (state.document !== 'LIVE-GAME-MASTER-SPEC.md') fail('document must name the canonical master spec');
  if (typeof state.audit?.base_sha !== 'string' || !/^[0-9a-f]{40}$/.test(state.audit.base_sha)) {
    fail('audit.base_sha must be a full 40-character Git SHA');
  }
  const maturity = state.release?.maturity;
  if (!['implemented_with_blockers', 'release_candidate', 'production_ready'].includes(maturity)) {
    fail('release.maturity must be implemented_with_blockers, release_candidate or production_ready');
  }
  for (const priority of ['p0', 'p1', 'p2']) {
    const items = state.gaps?.[priority];
    if (!Array.isArray(items)) {
      fail(`gaps.${priority} must be an array`);
      continue;
    }
    const ids = new Set();
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') {
        fail(`every gaps.${priority} item needs id and title`);
      } else if (ids.has(item.id)) {
        fail(`duplicate gaps.${priority} id: ${item.id}`);
      } else ids.add(item.id);
    }
  }
  if (state.gaps?.p0?.length && maturity !== 'implemented_with_blockers') {
    fail('release.maturity must remain implemented_with_blockers while any P0 item is open');
  }
  if (!state.gaps?.p0?.length && maturity === 'implemented_with_blockers') {
    fail('set release.maturity to release_candidate only after every P0 item has acceptance evidence');
  }
}

function replaceDerivedState(markdown, state, evidence) {
  const derived = structuredClone(state);
  derived.release.latest_migration = evidence.latestMigration;
  derived.acceptance.verify_command = evidence.verifyCommand;
  derived.repository.markdown_files = evidence.markdownFiles;
  const start = markdown.indexOf(START);
  const end = markdown.indexOf(END);
  return `${markdown.slice(0, start + START.length)}\n\`\`\`json\n${JSON.stringify(derived, null, 2)}\n\`\`\`\n${markdown.slice(end)}`;
}

function main() {
  const markdown = readFileSync(statePath, 'utf8');
  const state = readJsonState(markdown);
  const evidence = repositoryEvidence();
  validateShape(state);

  if (evidence.markdownFiles.length !== 1 || evidence.markdownFiles[0] !== 'LIVE-GAME-MASTER-SPEC.md') {
    fail(`repository must contain exactly LIVE-GAME-MASTER-SPEC.md; found: ${evidence.markdownFiles.join(', ')}`);
  }

  const next = replaceDerivedState(markdown, state, evidence);
  if (mode === 'write') {
    if (next !== markdown) {
      writeFileSync(statePath, next);
      console.log('Refreshed LIVE-GAME-MASTER-SPEC.md from repository evidence.');
    } else console.log('LIVE-GAME-MASTER-SPEC.md is already current.');
    return;
  }

  const derived = readJsonState(next);
  if (state.release?.latest_migration !== derived.release?.latest_migration) {
    fail('release.latest_migration is stale; run npm run project:state:refresh');
  }
  if (state.acceptance?.verify_command !== derived.acceptance?.verify_command) {
    fail('acceptance.verify_command is stale; run npm run project:state:refresh');
  }
  if (JSON.stringify(state.repository?.markdown_files) !== JSON.stringify(derived.repository?.markdown_files)) {
    fail('repository.markdown_files is stale; run npm run project:state:refresh');
  }

  if (!process.exitCode) {
    console.log(
      `LIVE GAME SPEC OK: migration ${evidence.latestMigration}; ` +
      `${state.gaps.p0.length} P0, ${state.gaps.p1.length} P1, ${state.gaps.p2.length} P2; ` +
      `${evidence.verifyCommand}.`,
    );
  }
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
