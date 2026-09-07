from __future__ import annotations

import ast
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SourcePipeline2026Tests(unittest.TestCase):
    def read(self, relative: str) -> str:
        return (ROOT / relative).read_text(encoding="utf-8")

    def test_new_python_entrypoints_parse(self) -> None:
        for relative in (
            "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
            "backend/scripts/full-9618-2026-corpus-backfill-v3.py",
            "backend/scripts/structured_content_backfill_v4.py",
            "backend/scripts/structured_content_backfill_2026.py",
            "backend/scripts/flag-9618-source-fidelity.py",
            "backend/scripts/reconcile-9618-2026-dependencies.py",
            "backend/scripts/sync-9618-repaired-assets.py",
            "backend/scripts/finalize-9618-2026-corpus.py",
            "backend/scripts/qp-source-structure-repair-v7.py",
        ):
            with self.subTest(relative=relative):
                ast.parse(self.read(relative), filename=relative)

    def test_ingest_fallback_is_source_pinned_and_fail_closed(self) -> None:
        source = self.read("backend/scripts/full-9618-2026-corpus-backfill-v2.py")
        self.assertIn("ms_sha_mismatch", source)
        self.assertIn("qp_sha_mismatch", source)
        self.assertIn("ms_source_disagreement", source)
        self.assertIn("ms_extract_gate_after_fallback", source)
        self.assertIn("if total != expected_marks", source)
        self.assertIn("if len(rest) < 8 or len(rest.split()) < 2", source)

    def test_local_ms_fallback_reads_the_published_marks_column(self) -> None:
        source = self.read("backend/scripts/full-9618-2026-corpus-backfill-v3.py")
        self.assertIn("published_marks_from_layout", source)
        self.assertIn('line[marks_x:guidance_x]', source)
        self.assertIn("published_marks_column_conflict", source)
        self.assertIn("local_ms_mark_column_corrected", source)
        self.assertIn("V2[\"main\"].__globals__[\"local_ms_rows\"]", source)

    def test_complete_edge_ms_is_cross_checked_but_not_augmented(self) -> None:
        source = self.read("backend/scripts/full-9618-2026-corpus-backfill-v3.py")
        self.assertIn("def reconcile_ms_rows_v3", source)
        self.assertIn("if edge_total != expected_marks", source)
        self.assertIn("return ORIGINAL_RECONCILE_MS_ROWS(edge_rows, local_rows, expected_marks)", source)
        self.assertIn("ms_source_disagreement", source)
        self.assertIn("return list(edge_rows), []", source)
        self.assertIn("V2[\"main\"].__globals__[\"reconcile_ms_rows\"]", source)

    def test_legacy_seed_keeps_ids_but_frees_official_refs(self) -> None:
        sql = self.read("backend/src/database/migrations/0127_legacy_2026_question_display_refs.sql")
        self.assertIn("LEGACY/", sql)
        self.assertIn("v_total<>40 OR v_archived<>40", sql)
        self.assertNotRegex(sql.upper(), r"DELETE\s+FROM\s+(PUBLIC\.)?QUESTIONS")

    def test_source_repair_cannot_bypass_existing_review_state(self) -> None:
        sql = self.read("backend/src/database/migrations/0129_source_fidelity_review_state_guard.sql")
        self.assertIn("demoted_from_approved", sql)
        self.assertIn("repair_question_source_fidelity_guarded_v3", sql)
        self.assertIn("p_restore_approval", sql)
        self.assertIn("v_remaining=0", sql)

    def test_dependency_reconciliation_is_same_paper_and_fail_closed(self) -> None:
        sql = self.read("backend/src/database/migrations/0131_future_source_dependency_reconciliation.sql")
        self.assertIn("d.source_paper_id=t.source_paper_id", sql)
        self.assertIn("source_dependency_required_but_unresolved_answer", sql)
        self.assertIn("source_dependency_required_but_unresolved_practical", sql)
        self.assertIn("question_dependencies", sql)
        self.assertNotIn("\\\\(?", sql)

    def test_v7_recovers_preceding_logo_visuals_without_relaxing_sha_gate(self) -> None:
        source = self.read("backend/scripts/qp-source-structure-repair-v7.py")
        self.assertIn("following\\s+(?:vector\\s+)?logo", source)
        self.assertIn("this\\s+logo", source)
        self.assertIn("BACKWARD_VISUAL_RE", source)
        self.assertIn("Preceding Cambridge source visual", source)
        self.assertIn("sourcePlacement", source)
        # v7 delegates writes to the proven v3 two-phase runner rather than
        # creating a new unguarded write path.
        self.assertIn('raise SystemExit(V3["main"]())', source)
        self.assertNotIn("execute_sql", source)

    def test_detector_v3_audits_canonical_block_adjacency(self) -> None:
        sql = self.read("backend/src/database/migrations/0152_source_fidelity_detector_v3.sql")
        self.assertIn("flag_source_fidelity_requirements_v3", sql)
        self.assertIn("source-fidelity-detector-v3-canonical-adjacency", sql)
        self.assertIn("jsonb_array_elements(e.content_json->'blocks')", sql)
        self.assertIn("cue_ordinal+1", sql)
        self.assertIn("logo", sql.lower())
        self.assertIn("source_visual_required_but_missing", sql)
        self.assertIn("status='needs_review'", sql)

    def test_repaired_preceding_visual_is_inserted_after_source_cue(self) -> None:
        sql = self.read("backend/src/database/migrations/0152_source_fidelity_detector_v3.sql")
        self.assertIn("sync_repaired_source_assets_v2", sql)
        self.assertIn("preceding cambridge source visual", sql.lower())
        self.assertIn("after_source_visual_cue", sql)
        self.assertIn("set_question_structured_content_v1", sql)
        self.assertIn("structured_source_provenance_mismatch", sql)

    def test_workflow_uses_correct_runner_for_source_repairs(self) -> None:
        workflow = self.read(".github/workflows/full-9618-2026-corpus-backfill.yml")
        self.assertIn("full-9618-2026-corpus-backfill-v3.py", workflow)
        self.assertIn("reconcile-9618-2026-dependencies.py", workflow)
        self.assertIn("flag-9618-source-fidelity.py", workflow)
        self.assertIn("qp-source-repair-runner", workflow)
        self.assertIn("qp-source-structure-repair-v7.py", workflow)
        self.assertIn("sync-9618-repaired-assets.py", workflow)
        self.assertIn("structured_content_backfill_2026.py", workflow)

        repair_workflow = self.read(".github/workflows/qp-source-structure-repair-v2.yml")
        self.assertIn("qp-source-structure-repair-v7.py", repair_workflow)
        self.assertIn("0152_source_fidelity_detector_v3.sql", repair_workflow)

    def test_corpus_runner_exposes_new_guarded_actions(self) -> None:
        source = self.read("supabase/functions/corpus-runner/index.ts")
        self.assertIn("reconcile_dependencies", source)
        self.assertIn("sync_structured_assets", source)
        self.assertIn("assert_year", source)
        self.assertIn("reconcile_source_question_dependencies_v1", source)
        self.assertIn("sync_repaired_source_assets_v1", source)
        self.assertIn("assert_source_verified_year_v1", source)


if __name__ == "__main__":
    unittest.main()
