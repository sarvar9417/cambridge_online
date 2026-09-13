# 9618 Past Paper LaTeX Conversion Contract

Updated: 2026-09-13

## Goal

Reconstruct the Cambridge International AS & A Level Computer Science 9618 past-paper corpus as a **source-faithful, editable, syllabus-mapped LaTeX assessment corpus** without replacing the original Cambridge QP/MS evidence.

The conversion is deliberately **paper-by-paper and question-by-question**. It is not an OCR-to-LaTeX bulk replacement.

Target range for this conversion programme:

- years: **2021–2026**
- syllabus: **9618**
- components: **1–4**
- examination series: every verified source session actually present
- every source QP and corresponding MS retained as provenance
- exact-content variants represented through source equivalence instead of duplicated question trees

The long-term product unit is not a PDF page. It is a source-verifiable question part connected to:

```text
source paper
  -> question hierarchy
     -> source-faithful LaTeX / structured content
     -> visual assets
     -> marks + mark scheme
     -> topic / subtopic
     -> learning objective
     -> dependencies
     -> student attempts / analytics
```

## Existing database support

The live schema already contains the fields needed for this programme:

- `questions.stem_latex`
- `questions.context_latex`
- `questions.body_format` with `markdown | latex`
- `questions.content_json` / `content_version`
- `question_assets.latex_source`
- `question_assets.svg_markup`
- `question_subtopics`
- `question_learning_objectives`
- source-paper hashes, URLs and equivalence records
- structured mark-scheme tables

Therefore the conversion does **not** need a destructive question-schema rewrite. Existing Markdown/structured content remains available for search, interaction, accessibility and audit while reviewed LaTeX is populated and verified.

A leaf is not considered migrated merely because `stem_latex` is non-empty. `body_format = 'latex'` is a promotion flag, not proof by itself that the source has been reproduced faithfully.

## Source-of-truth rule

The original Cambridge PDFs remain authoritative.

```text
original QP/MS
    ↓
verified source identity (URL + SHA-256 + page count)
    ↓
verified question tree + source page/bbox
    ↓
source text + structured content + LaTeX authoring source
    ↓
question_assets.latex_source / source-backed image
    ↓
KaTeX or worker-compiled SVG
    ↓
visual + semantic + wording comparison with original
    ↓
body_format = latex only after acceptance
```

LaTeX is a presentation/authoring representation. It must never erase:

- source paper identity and SHA-256
- year / series / component / variant
- question hierarchy
- marks
- source page and source bounding box when available
- QP <-> MS relationship
- dependencies between question parts
- topic / subtopic / learning-objective mapping
- original extracted text/history needed for audit

## Wording fidelity: no invented bridge prose

The LaTeX representation must preserve Cambridge wording. It may perform only transformations needed for faithful LaTeX representation, for example:

- escaping LaTeX-sensitive characters
- representing `×`, subscripts, superscripts or Boolean/mathematical notation correctly
- preserving paragraph boundaries and line order where semantically relevant
- representing a source table/code/diagram as a structured/asset block

It must **not** silently rewrite a question or insert explanatory bridge text that Cambridge did not write.

For example, if the source has a sentence followed by a table, the corpus should store:

```text
source sentence
+ ordered table/asset block
```

not a rewritten sentence such as:

```text
"... shown in the accompanying source-backed visual"
```

unless those words are actually present in the source.

This matters because a visually correct question can still be textually non-faithful. `content_json` preserves ordered source blocks and source pages; `question_assets` carries reconstructed visual content. `stem_latex`/`context_latex` must not invent prose merely to point at those blocks.

The read-only coverage audit therefore reports `latex_source_wording_review_leaves`. These are review candidates, not automatic proof of an error.

## Representation policy

### Complete question package

The complete source-faithful representation of a leaf is the ordered combination of:

1. inherited source context,
2. source question text,
3. structured table/code/math blocks,
4. source-backed or LaTeX-authored assets,
5. answer area semantics where needed.

`stem_latex` contains the textual LaTeX authoring portion. Shared parent/scenario material belongs in `context_latex` at the node where it appears in the source. Visual content is not duplicated into invented prose; it is carried by the ordered structured/asset representation.

The existing `stem_md`, `context_md` and `content_json` are retained for audit, search, interaction, accessibility and backward compatibility.

### Topic, subtopic and learning-objective mapping

Classification is performed at the **smallest meaningful marked question part**, not only at the root question.

Rules:

- every marked leaf must have at least one syllabus subtopic mapping;
- one mapping is primary when several subtopics apply;
- secondary mappings are allowed for genuinely cross-topic questions;
- learning-objective mapping is preferred where the syllabus model supports it;
- automated classification is a proposal, not source truth;
- high-confidence values are still reviewable and must be corrected when the source contradicts them;
- classification corrections should leave an audit trail.

This enables later selection by topic/subtopic/learning objective without duplicating or rewriting the original question.

### Mathematical and Boolean notation

The structured content model already supports a `math` block with canonical LaTeX. Browser rendering uses KaTeX. Raw LaTeX is retained for provenance/debugging and render failure must be visible rather than silently dropping notation.

### Tables and trace tables

Source-faithful authoring may use `tabular`, `array`, TikZ matrices or another reviewed LaTeX structure matching the paper.

When a table contains candidate-editable cells, the browser also keeps a semantic structured `table` block so cells remain interactive and accessible. Interactive semantics are not sacrificed merely to display a static table image.

### Pseudocode and program code

The LaTeX authoring source uses a controlled monospaced/verbatim-style representation matching Cambridge line order and indentation. The browser retains a structured `code` block so the content remains selectable and machine-readable.

### Diagrams, flowcharts and logic circuits

Where the source visual is truthfully reproducible as vector geometry, it is authored as reviewed LaTeX/TikZ/circuitikz:

- `question_assets.latex_source` - reviewed authoring source
- `question_assets.svg_markup` - compiled vector output

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
question text / math LaTeX
       ├── prose + math -> browser renderer / KaTeX
       └── authoring source retained in DB

TikZ / circuitikz source
        ↓ reviewed worker compilation
      SVG markup
        ↓
   normal browser asset rendering
```

## Exact-content source equivalence

“All past papers are present” does not mean “duplicate every question tree for every filename”.

When two official source papers have been independently verified as exact-content equivalents:

- both source-paper identities remain in `source_papers`;
- each keeps its own filename/source URL/hash/evidence;
- `source_paper_equivalences` points the equivalent source to the canonical content owner;
- questions/assets/LaTeX are maintained once on the content owner;
- coverage/readiness follows the effective content owner.

Therefore a verified equivalent source with zero local question nodes is **not** automatically missing ingestion.

## Per-paper conversion procedure

Every content-owning paper follows the same gate:

1. Identify the QP and exact MS pair from source metadata.
2. Confirm source URL, SHA-256 and page count.
3. Resolve exact-content equivalence before creating a duplicate question tree.
4. Inventory every question node and marked leaf in the database.
5. Compare the question tree with the original PDF page by page.
6. Confirm paper mark total and per-part marks.
7. Confirm primary subtopic mapping for every marked leaf; add secondary mappings only where justified.
8. Confirm learning-objective mapping where applicable.
9. Write source-faithful `stem_latex` and required `context_latex` without invented bridge prose.
10. Reconstruct tables, code, mathematical/Boolean notation and answer structures.
11. Rebuild reproducible diagrams/flowcharts/logic circuits in LaTeX/TikZ/circuitikz.
12. Compile every LaTeX-authored visual asset to SVG.
13. Render the complete ordered question package in the application.
14. Compare rendered output with the original source for wording, meaning, order, labels, values, marks and visual relationships.
15. Compare question/part mapping with the mark scheme.
16. Resolve all source-fidelity and review findings.
17. Promote accepted leaves to `body_format = 'latex'` only after mandatory checks pass.

A corrected retry is not accepted merely because it compiles; source fidelity must be rechecked.

## Acceptance gate for one paper

A paper is `LATEX_READY` only when all applicable conditions are true:

- QP/MS pair verified
- source URL/hash identity is pinned
- exact-content equivalence resolved
- every marked leaf accounted for
- paper-level mark total matches the source
- every marked leaf has correct primary subtopic mapping
- learning-objective mappings reviewed where applicable
- every leaf has source-faithful `stem_latex`
- shared source context has correct `context_latex`
- no invented wording is accepted as source text
- all accepted leaves use `body_format = 'latex'`
- structured content remains valid at the supported version
- every mathematical/Boolean block has valid LaTeX and renders
- every required table/trace grid is complete
- every required code/pseudocode block is complete
- every reproducible visual has reviewed `latex_source` and usable compiled SVG
- every non-LaTeX image has a valid source-backed asset
- no required visual is unresolved
- dependencies are preserved
- QP/MS mapping is complete
- human/source review complete

The coverage report uses `*_READY_CANDIDATE`, not `LATEX_READY`, because the final source review remains an explicit gate.

## Pilot audit: 9618/11/M/J/21

`9618_s21_qp_11.pdf` remains the reference pilot because it exercises a broad set of structures:

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

The exact Drive QP was re-fetched and SHA-256 matched the live source record.

Current live pilot state on 2026-09-13:

- 42 question nodes
- 30 marked leaves
- 75 total marks, matching the paper
- 30/30 marked leaves have structured v1 content
- 30/30 marked leaves have `stem_latex`
- 30/30 marked leaves are promoted to `body_format = 'latex'`
- all 30 structured leaves pin the source-paper SHA
- all structured blocks are source-page pinned
- 16 question assets
- 16/16 assets have `latex_source`
- 16/16 assets have compiled `svg_markup`
- no unresolved visual asset in the current audit

The strengthened wording audit currently flags **7 pilot leaves for source-wording review** because their LaTeX contains bridge wording not present in the source-backed text/structured blocks. Therefore this pilot is not considered fully `LATEX_READY` under the strengthened contract until those leaves are reconciled.

The same pilot audit also found two overconfident learning-objective mappings that contradicted the source question intent. They were corrected in the live database with `audit_log` evidence on 2026-09-13:

- Q4(b): peer-to-peer **benefits/drawbacks** objective
- Q4(c)(i): **router role and function** objective

The primary subtopic (`2.1 Networks including the internet`) did not need changing in either case.

## Current corpus baseline

Live marked-question rows on 2026-09-13:

- 2793 marked 9618 leaf rows in the current question trees
- 1298 leaves currently promoted to LaTeX with non-empty `stem_latex`
- 1495 leaves not yet promoted to LaTeX

These are question-tree counts, **not a count of unique official source filenames**. Exact-content source variants can intentionally share one canonical question tree through `source_paper_equivalences`.

The equivalence-aware coverage audit shows the next chronological content-owner paper with `LATEX_NOT_STARTED` after the already-converted run is currently `9618/21/O/N/22` (`9618_w22_qp_21.pdf`): 22 marked leaves, structured v1 content present, and no promoted LaTeX yet. It must still pass exact QP/MS source verification before writes are promoted.

## Read-only coverage audit

Run:

```bash
psql "$DATABASE_URL" -f backend/src/database/audits/9618-latex-coverage.sql
```

The report now distinguishes:

- `content_owner`
- `exact_equivalent`
- `legacy_or_noncanonical`

and reports an effective content owner so exact-equivalent source rows are not misclassified as missing conversion work.

It also emits a `rollout_state`, including:

- `SOURCE_INCOMPLETE`
- `QUESTION_TREE_MISSING`
- `LATEX_NOT_STARTED`
- `LATEX_IN_PROGRESS`
- `STRUCTURED_CONTENT_INCOMPLETE`
- `VISUALS_UNRESOLVED`
- `SOURCE_WORDING_REVIEW`
- `REVIEW_PENDING`
- `LATEX_READY_CANDIDATE`
- `EXACT_EQUIVALENT_READY_CANDIDATE`
- `LEGACY_NONCANONICAL`

## Rollout order

Continue one **content owner** at a time in chronological order, while exact-equivalent source rows inherit verified content coverage:

```text
finish/re-audit already-converted papers
        ↓
2022 ON unresolved/non-LaTeX content owners
        ↓
2023 MJ/ON unresolved/non-LaTeX content owners
        ↓
2024 MJ/ON
        ↓
2025 MJ/ON
        ↓
2026 verified sessions
```

A later paper must not be bulk-promoted merely because a converter can generate syntactically valid LaTeX. Source fidelity and syllabus mapping remain blocking gates.

## Repository policy

Do not commit full verbatim Cambridge papers or complete reconstructed paper text to the public repository as fixtures. The repository contains conversion/rendering tooling, schemas, audits and synthetic tests. Source-derived question content and LaTeX authoring data belong in the controlled corpus/database with provenance to the original source paper.
