# 9618 Past Paper LaTeX Conversion Contract

Updated: 2026-09-08

## Goal

Reconstruct the Cambridge International AS & A Level Computer Science 9618 past-paper corpus as a source-faithful, editable LaTeX representation without replacing the original Cambridge QP/MS evidence.

The conversion is deliberately **paper-by-paper and question-by-question**. It is not OCR-to-LaTeX bulk replacement.

Target range for this conversion programme:

- years: **2021–2026**
- syllabus: **9618**
- components: **1–4**
- examination series: every canonical source session actually present and verified
- question paper and corresponding mark scheme retained as provenance

The pre-2026 Drive baseline contains 118 canonical QP/MS pairs for 2021–2025 MJ/ON. The supplied 2026 May/June folder contains a further 12 canonical QP/MS pairs (11–13, 21–23, 31–33, 41–43). Counts are source-discovered, not forced to a fixed 12-paper assumption per session.

## Existing database support

The live schema already contains the question-level fields needed for this programme:

- `questions.stem_latex`
- `questions.context_latex`
- `questions.body_format` with `markdown | latex`
- `question_assets.latex_source`
- `question_assets.svg_markup`

Therefore the conversion does **not** need a destructive question-schema rewrite. Existing Markdown/structured content remains available while the reviewed LaTeX representation is populated and verified.

A leaf is not considered migrated just because `stem_latex` is non-empty. `body_format = 'latex'` is the explicit promotion flag and is set only after source comparison and rendering checks pass.

## Source-of-truth rule

The original Cambridge PDFs remain authoritative.

```text
original QP/MS
    ↓
verified question tree + source page/bbox
    ↓
questions.stem_latex / context_latex
question_assets.latex_source
    ↓
KaTeX or worker-compiled SVG
    ↓
visual + semantic comparison with the original
    ↓
body_format = latex only after acceptance
```

LaTeX is a presentation/authoring representation. It must never erase:

- source paper identity and SHA-256
- year / series / component / variant
- question hierarchy
- marks
- source page and source bounding box when available
- QP ↔ MS relationship
- dependencies between question parts
- original extracted text/history needed for audit

## Representation policy

### Complete question text

Each reviewed leaf gets a complete source-faithful `stem_latex`. Shared parent/scenario material gets `context_latex` at the node where it belongs.

This is the canonical LaTeX authoring form for the question. It can contain normal prose and inline/display mathematical notation in one representation, so expressions do not need to be awkwardly separated from the sentence merely to render them.

The existing `stem_md`, `context_md` and `content_json` are retained for search, interaction, accessibility and backward compatibility during migration.

### Mathematical and Boolean notation

The structured content model already has a `math` block with canonical `latex`. Browser rendering uses KaTeX. Raw LaTeX is preserved in `data-latex` for provenance/debugging and a render failure is shown visibly rather than silently dropping notation.

Question-level `stem_latex` remains the complete authoring source; structured math blocks are the browser-semantic representation where applicable.

### Tables and trace tables

The source-faithful question LaTeX may use `tabular`, `array`, `booktabs`, TikZ matrices or another reviewed LaTeX structure matching the paper.

When a table contains candidate-editable cells, the browser also keeps a semantic structured `table` block so the cells remain interactive and accessible. Interactive semantics are not sacrificed merely to make the browser display a static table image.

### Pseudocode and program code

The LaTeX authoring source uses a controlled monospaced/verbatim-style representation matching Cambridge line order and indentation. The browser also retains a structured `code` block so the content remains selectable and machine-readable.

### Diagrams, flowcharts and logic circuits

Where the source visual is reproducible as vector geometry, it is authored as reviewed LaTeX/TikZ/circuitikz:

- `question_assets.latex_source` — reviewed authoring source
- `question_assets.svg_markup` — compiled vector output

The worker compiler is `backend/scripts/latex-asset-compile.py`.

It uses a fixed project preamble with TikZ and circuitikz, compiles with `pdflatex` or `lualatex` using `-no-shell-escape`, and converts the resulting PDF to SVG with `pdftocairo`. It is an operator/worker tool, **not a public endpoint**.

Example operator command:

```bash
python backend/scripts/latex-asset-compile.py \
  --input reviewed-asset.tex \
  --output reviewed-asset.svg
```

The snippet must not provide its own document class/packages or file/shell primitives. The compiler fails closed on forbidden commands and compilation errors.

### Photographs or irreducible source imagery

A photograph or source image that cannot be truthfully reconstructed from vector primitives stays a source-backed image asset. It must not be approximated with invented TikZ geometry merely to claim 100% LaTeX coverage.

## Browser/runtime architecture

Full TikZ is **not** compiled in the browser or on every page request.

```text
question stem/context LaTeX
       ├── math / Boolean fragments → KaTeX in browser
       └── complete authoring source retained in DB

TikZ / circuitikz source
        ↓ reviewed worker compilation
      SVG markup
        ↓
   normal browser asset rendering
```

This keeps student/teacher pages fast while preserving editable LaTeX source for diagrams.

## Per-paper conversion procedure

Every canonical paper follows the same gate:

1. Identify the canonical QP and exact MS pair from filename/source metadata.
2. Confirm source SHA-256 and page count.
3. Inventory every question node and leaf in the database.
4. Compare the question tree with the original PDF page by page.
5. Write complete `stem_latex` and required `context_latex` from the source.
6. Reconstruct tables, code, mathematical/Boolean notation and answer structures.
7. Rebuild reproducible diagrams/flowcharts/logic circuits in LaTeX/TikZ/circuitikz.
8. Compile every LaTeX visual asset to SVG.
9. Render the complete question in the application.
10. Compare rendered output with the original source for meaning, order, labels, values, marks and visual relationships.
11. Compare question/part mapping with the mark scheme.
12. Resolve all source-fidelity findings.
13. Promote accepted leaves to `body_format = 'latex'` only after mandatory checks pass.

A corrected retry is not accepted merely because it compiles; source fidelity must be rechecked.

## Acceptance gate for one paper

A paper is `LATEX_READY` only when all applicable conditions are true:

- canonical QP/MS pair verified
- every leaf question accounted for
- every leaf has reviewed `stem_latex`
- every shared scenario that needs it has reviewed `context_latex`
- all accepted leaves use `body_format = 'latex'`
- every structured content object remains valid at the supported version
- every mathematical/Boolean block has valid LaTeX and renders
- every required table/trace grid is complete
- every required code/pseudocode block is complete
- every reproducible visual has reviewed `latex_source` and compiled SVG
- every non-LaTeX source image has a valid source-backed asset
- no required visual is unresolved
- question hierarchy and marks match the source
- dependencies are preserved
- paper-level mark total remains correct
- human/source review complete

## First pilot: 9618/11/M/J/21

The first pilot is `9618_s21_qp_11.pdf` because it exercises a broad set of structures in one paper:

- descriptive table
- matching-line task
- instruction-set table
- memory/ASCII tables
- trace table
- binary notation
- tick grids
- pseudocode
- relationship table
- logic-gate selection table

The live database currently contains 42 question nodes for this source: 12 context nodes and 30 marked leaves. All 30 marked leaves have structured v1 content.

Current LaTeX baseline for this pilot:

- 30 marked leaves
- 0 leaves with `stem_latex`
- 0 leaves promoted to `body_format = 'latex'`
- 0 nodes with `context_latex`
- 12 table assets
- 3 pseudocode assets
- 1 diagram asset
- 0 assets with `latex_source`
- 0 assets with compiled `svg_markup`

No production content is overwritten by the foundation work. The pilot is converted only after the renderer/compiler gates are in place and the exact source-to-database comparison is complete.

## Corpus reconciliation note

The live database contains a legacy 2026 MJ Paper 1 `variant = 0` QP/MS pair in addition to canonical variants 1–3. That legacy pair is **not** a fourth Cambridge variant and must not inflate canonical LaTeX coverage. Coverage tools classify variants 1–3 as canonical and report other rows separately.

The database also contains canonical source rows that may intentionally have no duplicated question tree when their content is represented through verified source-equivalence/canonicalisation. A zero-question source row must therefore be reconciled against the equivalence model before it is treated as missing conversion work.

## Read-only coverage audit

Run:

```bash
psql "$DATABASE_URL" -f backend/src/database/audits/9618-latex-coverage.sql
```

The report shows per paper:

- source classification and MS pairing
- question/leaf counts
- `stem_latex`, `context_latex` and `body_format` coverage
- structured-content coverage
- math/LaTeX block coverage
- table/asset counts
- asset `latex_source` coverage
- compiled SVG coverage
- unresolved visuals
- review status

## Rollout order

After the pilot gate is accepted, convert one canonical paper at a time in chronological order:

```text
2021 MJ → 2021 ON
2022 MJ → 2022 ON
2023 MJ → 2023 ON
2024 MJ → 2024 ON
2025 MJ → 2025 ON
2026 verified sessions
```

The exact 2026 sessions are taken from verified source/database reconciliation, not from assumptions.

## Repository policy

Do not commit full verbatim Cambridge papers or complete reconstructed paper text to the public repository as fixtures. The repository contains conversion/rendering tooling, schemas, audits and synthetic tests. Source-derived question content and LaTeX authoring data belong in the controlled corpus/database with provenance to the original source paper.
