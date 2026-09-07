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
            "backend/scripts/ms_column_marks.py",
            "backend/scripts/structured_content_backfill_v4.py",
            "backend/scripts/structured_content_backfill_2026.py",
            "backend/scripts/flag-9618-source-fidelity.py",
            "backend/scripts/reconcile-9618-2026-dependencies.py",
            "backend/scripts/sync-9618-repaired-assets.py",
            "backend/scripts/finalize-9618-2026-corpus.py",
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

        column = self.read("backend/scripts/ms_column_marks.py")
        self.assertIn('header.index("Marks")', column)
        self.assertIn('header.index("Guidance")', column)
        self.assertIn("guidance_start", column)

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

    def test_workflow_uses_correct_runner_for_source_repairs(self) -> None:
        workflow = self.read(".github/workflows/full-9618-2026-corpus-backfill.yml")
        self.assertIn("full-9618-2026-corpus-backfill-v3.py", workflow)
        self.assertIn("test_9618_ms_column_marks", workflow)
        self.assertIn("reconcile-9618-2026-dependencies.py", workflow)
        self.assertIn("flag-9618-source-fidelity.py", workflow)
        self.assertIn("qp-source-repair-runner", workflow)
        self.assertIn("sync-9618-repaired-assets.py", workflow)
        self.assertIn("structured_content_backfill_2026.py", workflow)

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
