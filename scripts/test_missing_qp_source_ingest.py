from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MissingQpSourceIngestTests(unittest.TestCase):
    def test_sql_contract_is_source_pinned_and_fail_closed(self) -> None:
        sql = (ROOT / "backend/src/database/migrations/0162_missing_qp_source_ingest.sql").read_text(encoding="utf-8")
        lowered = sql.lower()
        self.assertIn("missing_qp_source_ingest_bootstrap_v1", sql)
        self.assertIn("apply_missing_qp_source_ingest_v1", sql)
        self.assertIn("missing_qp_ingest_qp_sha_mismatch", sql)
        self.assertIn("missing_qp_ingest_ms_sha_mismatch", sql)
        self.assertIn("missing_qp_ingest_mark_gate_failed", sql)
        self.assertIn("missing_qp_ingest_partial_existing_paper", sql)
        self.assertIn("missing_qp_ingest_replay_mismatch", sql)
        self.assertIn("original_cambridge_qp_ms_pair", sql)
        self.assertIn("'needs_review'::review_status", sql)
        self.assertIn("question_source_occurrences", sql)
        self.assertIn("mark_schemes", sql)
        self.assertNotIn("delete from public.questions", lowered)
        self.assertNotIn("delete from public.source_papers", lowered)
        self.assertNotIn("'approved'::review_status", sql)

    def test_runner_parses_all_sources_before_apply_loop(self) -> None:
        script = (ROOT / "backend/scripts/qp-source-missing-ingest-v1.py").read_text(encoding="utf-8")
        parse_gate = script.index("if failures:")
        apply_loop = script.index("for index, manifest in enumerate(manifests, start=1):", parse_gate)
        self.assertLess(parse_gate, apply_loop)
        self.assertIn('SOURCE_MISSING_APPLY', script)
        self.assertIn('qp_sha_mismatch', script)
        self.assertIn('ms_sha_mismatch', script)
        self.assertIn('ms_total_mark_gate_failed', script)
        self.assertIn('PARSER["build_repair"]', script)
        self.assertIn('databaseWritesAttempted', script)

    def test_v2_accepts_only_source_evidenced_mark_positions(self) -> None:
        script = (ROOT / "backend/scripts/qp-source-missing-ingest-v2.py").read_text(encoding="utf-8")
        self.assertIn('"Question" in line and "Answer" in line and "Marks" in line', script)
        self.assertIn('marks_column <= mark_position <= marks_column + 20', script)
        self.assertIn('HEADERLESS_MARK_ZONE_MIN = 80', script)
        self.assertIn('re.search(r"\\bmarks?\\b", answer_fragment, re.IGNORECASE)', script)
        self.assertIn('not _is_trusted_mark_position', script)
        self.assertIn('BASE["build_manifest"].__globals__["extract_ms_leaves"] = extract_ms_leaves', script)

    def test_edge_runner_exposes_only_guarded_manifest_actions(self) -> None:
        edge = (ROOT / "supabase/functions/qp-source-repair-runner/index.ts").read_text(encoding="utf-8")
        self.assertIn("missing_source_ingest_bootstrap", edge)
        self.assertIn("missing_qp_source_ingest_bootstrap_v1", edge)
        self.assertIn("missing_source_ingest_apply", edge)
        self.assertIn("apply_missing_qp_source_ingest_v1", edge)
        self.assertIn("validManifest(manifest,'missing-qp-source-ingest-v1')", edge)

    def test_workflow_defaults_to_plan_only(self) -> None:
        workflow = (ROOT / ".github/workflows/qp-missing-source-ingest.yml").read_text(encoding="utf-8")
        marker = (ROOT / ".source-missing-ingest").read_text(encoding="utf-8").strip()
        self.assertIn("default: 'NO'", workflow)
        self.assertIn("APPLY_MISSING_QP_SOURCE_INGEST_V1_ONCE", workflow)
        self.assertIn("qp-source-missing-ingest-v2.py", workflow)
        self.assertEqual(marker, "PLAN_MISSING_QP_SOURCE_INGEST_V1")


if __name__ == "__main__":
    unittest.main()
