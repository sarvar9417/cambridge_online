# Cambridge 9618 historical syllabus repair

This runbook repairs the temporary production state where the `2026-2028` syllabus row was widened back to 2021 so 2021-2025 past papers could be staged.

## Invariants

- `2021-2023` papers belong to the `2021-2023` syllabus version.
- `2024-2025` papers belong to the `2024-2025` syllabus version.
- `2026-2028` starts at 2026 again.
- Main auth migrations `0021-0023` are not renumbered or replaced.
- Taxonomy coverage migrations are `0024_component_topic_coverage.sql` and `0025_component_learning_objective_coverage.sql`.
- Question subtopic links are remapped only by stable Cambridge subtopic code (for example `6.1`).
- Existing 2026 learning-objective links are never guessed into historical LOs. If any exist, remap blocks by default. The explicit drop path marks affected questions `needs_review` so they can be reclassified.
- No step rewrites question text, mark schemes, answers, assignments or grading evidence.

## 0. Backup and maintenance window

Take a database backup/snapshot before any write. Do not run corpus staging or ingestion while the syllabus window is between prepare and remap.

## 1. Apply code migrations

Run the normal migration command after deploying this branch:

```bash
npm run db:migrate -w backend
```

Confirm `0024` and `0025` are recorded. They create the component↔topic and component↔learning-objective coverage tables used by classification.

## 2. Read-only plan

```bash
npm run syllabus:repair -w backend -- --action=plan
```

Review:

- current `2026-2028` validity window;
- source-paper counts by year/version;
- affected question/subtopic/LO-link counts;
- blockers.

Do not continue if the current row is missing/duplicated or has an unexpected `valid_to`.

## 3. Prepare the current window

Only after the plan is understood:

```bash
CONFIRM_HISTORICAL_SYLLABUS_PREPARE=YES \
  npm run syllabus:repair -w backend -- --action=prepare
```

This changes only the artificially widened `2026-2028.valid_from` from 2021 back to 2026. Existing source-paper foreign keys remain intact. New 2021-2025 staging will fail closed until the historical versions are imported.

If the plan reports old learning-objective links, stop and decide whether those links should be dropped and reclassified before proceeding with the repair.

## 4. Import source-backed historical catalogs

Dry-run first:

```bash
npm run syllabus:catalog -w backend -- --file=src/database/catalogs/9618-2021-2023.json
npm run syllabus:catalog -w backend -- --file=src/database/catalogs/9618-2024-2025.json
```

Then write each version explicitly:

```bash
CONFIRM_SYLLABUS_CATALOG_IMPORT=YES \
  npm run syllabus:catalog -w backend -- --file=src/database/catalogs/9618-2021-2023.json --write

CONFIRM_SYLLABUS_CATALOG_IMPORT=YES \
  npm run syllabus:catalog -w backend -- --file=src/database/catalogs/9618-2024-2025.json --write
```

## 5. Coverage gate

```bash
npm run syllabus:coverage -w backend -- --year-from=2021 --year-to=2028
```

2021-2025 must resolve to exactly one populated historical version. No year may be `missing`, `ambiguous` or `incomplete`.

## 6. Transactional remap

Default safe mode refuses old LO links:

```bash
CONFIRM_HISTORICAL_SYLLABUS_REMAP=YES \
  npm run syllabus:repair -w backend -- --action=remap
```

If, after review, old 2026 LO links are known to be non-portable and should be removed for reclassification, use both explicit confirmations:

```bash
CONFIRM_HISTORICAL_SYLLABUS_REMAP=YES \
CONFIRM_DROP_HISTORICAL_LO_LINKS=YES \
  npm run syllabus:repair -w backend -- --action=remap --allow-drop-lo-links
```

The remap transaction:

1. reassigns 2021-2023 and 2024-2025 `source_papers` to the matching historical syllabus/component;
2. aligns `questions.component_id` with the remapped source paper;
3. copies `question_subtopics` to the historical subtopic with the same stable code and removes the old cross-version link;
4. optionally removes non-portable old LO links and forces affected questions back to `needs_review`;
5. verifies no 2021-2025 source still points to the current syllabus, no question has a component mismatch, and no question subtopic crosses syllabus versions;
6. commits only if every invariant holds.

## 7. Post-repair verification

Run all three:

```bash
npm run syllabus:repair -w backend -- --action=plan
npm run syllabus:coverage -w backend -- --year-from=2021 --year-to=2028
npm run corpus:readiness -w backend
```

Then run the Drive↔DB/source coverage reports before resuming ingestion.

## TLS prerequisite

Remote PostgreSQL defaults to `DB_SSL_MODE=verify-full`. Configure the Supabase root certificate from Database Settings using either:

- `DB_SSL_CA` (PEM text), or
- `DB_SSL_CA_BASE64` (base64-encoded PEM).

`DB_SSL_MODE=require` is a deliberate compatibility escape hatch that encrypts traffic but does not verify the server certificate/hostname. It should not be the final production setting.
