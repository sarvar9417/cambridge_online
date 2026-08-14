# 9618 Source Inventory Baseline — Drive

Updated: 2026-08-14

## Purpose

This document is the first verified source-side baseline for Phase A. It records
what is actually present in the supplied Google Drive `PastPapers` corpus before
we compare that corpus with the live database.

This is **not** a claim that the database is complete. `Source complete` means
only that the canonical QP/MS pair exists in Drive for every variant observed in
that examination session.

## Verified target range

- Syllabus: Cambridge International AS & A Level Computer Science **9618**
- Years: **2021–2025**
- Series: **May/June (MJ)** and **October/November (ON)**
- Papers: components 1–4
- Canonical identity comes from the Cambridge filename, not the containing Drive
  folder name.

## QP/MS coverage matrix

| Year | Series | Canonical variants observed | QP | MS | QP/MS pairs | Source pair status |
|---|---|---:|---:|---:|---:|---|
| 2021 | MJ | 12 | 12 | 12 | 12/12 | COMPLETE |
| 2021 | ON | 10 | 10 | 10 | 10/10 | COMPLETE |
| 2022 | MJ | 12 | 12 | 12 | 12/12 | COMPLETE |
| 2022 | ON | 12 | 12 | 12 | 12/12 | COMPLETE |
| 2023 | MJ | 12 | 12 | 12 | 12/12 | COMPLETE |
| 2023 | ON | 12 | 12 | 12 | 12/12 | COMPLETE |
| 2024 | MJ | 12 | 12 | 12 | 12/12 | COMPLETE |
| 2024 | ON | 12 | 12 | 12 | 12/12 | COMPLETE |
| 2025 | MJ | 12 | 12 | 12 | 12/12 | COMPLETE |
| 2025 | ON | 12 | 12 | 12 | 12/12 | COMPLETE |
| **Total** |  | **118** | **118** | **118** | **118/118** | **COMPLETE** |

### 2021 ON is intentionally a 10-variant session

The observed 2021 October/November canonical variants are:

- Paper 1: `11`, `12`, `13`
- Paper 2: `21`, `22`, `23`
- Paper 3: `31`, `32`
- Paper 4: `41`, `42`

There is no basis for inventing `33` or `43` merely to force a 12-paper matrix.
The coverage dashboard must therefore derive the expected matrix from canonical
source discovery (or an independently verified official manifest), not from a
hard-coded assumption that every session has 12 variants.

## Supporting files observed

Supporting files are not part of the 118 QP/MS pair count.

| Year | Series | Inserts | Paper 4 source files observed | GT observed | Notes |
|---|---|---|---|---|---|
| 2021 | MJ | 21, 22, 23 | 41, 42, 43 | Yes | Also contains merged 11/12 convenience QP/MS files |
| 2021 | ON | 21, 22, 23 | 41, 42 | Yes | Matches the 10-variant session |
| 2022 | MJ | 21, 22, 23 | 41, 42, 43 | Yes | Folder also contains misplaced 2021 SF copies |
| 2022 | ON | 21, 22, 23 | 41 | Yes | Only SF 41 was visible in the inspected direct listing |
| 2023 | MJ | 21, 22, 23 | 41, 42, 43 | Yes | SF ZIPs plus extracted SF folders are present |
| 2023 | ON | 21, 22, 23 | 41, 42, 43 | Yes | Canonical SF ZIPs present |
| 2024 | MJ | 21, 22, 23 | 41, 42, 43 | Not seen in direct listing | SF files have copy suffixes `(1)` / `(2)` |
| 2024 | ON | 21, 22, 23 | 41, 42, 43 | Not seen in direct listing | Folder is nested under the 2025 MJ folder |
| 2025 | MJ | 21, 22, 23 | 41, 42, 43 | Yes | SF ZIPs plus an extracted SF folder are present |
| 2025 | ON | 21, 22, 23 | 41, 42, 43 | Yes | SF ZIPs plus extracted SF folders are present |

`Not seen in direct listing` is deliberately weaker than `missing`. We do not
promote an absence from one folder listing into a source-missing claim without a
full recursive/provider inventory.

## Source anomalies that must be preserved, not hidden

### 1. 2021 MJ merged convenience files

The 2021 MJ folder contains canonical files and additional merged convenience
files such as:

- `9618_s21_qp_11_12_merged.pdf`
- `9618_s21_ms_11_12_merged.pdf`

These merged files must never replace or be confused with the canonical variant
files.

### 2. 2022 MJ contains 2021 Paper 4 source files

The 2022 MJ folder contains `9618_s21_sf_*` files in addition to 2022 material.
Therefore folder placement is not authoritative metadata.

### 3. Duplicate/nested 2024 May/June folder

Drive contains more than one folder named `2024_May_June`; the canonical folder
for this inventory was selected by its parent relationship to `PastPapers`.
There is also a nested `2024_May_June` folder inside it.

### 4. 2024 MJ copy-suffix source files

The visible SF files are named like:

- `9618_s24_sf_41 (1).zip`
- `9618_s24_sf_42 (1).zip`
- `9618_s24_sf_43 (2).zip`

The source inventory parser treats these as copy-suffix candidates rather than
silently canonicalizing them.

### 5. 2024 ON is nested under 2025 MJ

The `2024_Oct_Nov` folder is not at the same hierarchy level as the other target
sessions; it is nested inside the `2025_May_june` folder. Filename metadata still
identifies its contents correctly as `w24`.

## Rules established by this baseline

1. **Filename metadata beats folder name.**
2. Canonical variant files and merged/convenience files are different source
   classes.
3. Copy-suffix files are review candidates, not silently canonical files.
4. Expected paper counts are discovered/verified per examination session; they
   are not hard-coded to 12.
5. QP/MS completeness and supporting-file completeness are separate gates.
6. A source-complete paper can still be DB `MISSING`, `PARTIAL`, `CONFLICT`, or
   `DUPLICATE` after reconciliation.
7. The production `COMPLETE` state requires all database extraction, tagging,
   mark-scheme, validation, dependency, asset, and human-review gates defined in
   `PHASE-A-EXECUTION.md`.

## Current source-side conclusion

For the first production target, the Drive corpus provides a strong ingestion
base: **118/118 observed canonical 9618 paper variants have both QP and MS** for
2021–2025 May/June and October/November.

The next hard gate is database reconciliation. No live database completeness
percentage should be published until `db:inventory` has been run against the
actual configured `DATABASE_URL` and reconciled with the source inventory.
