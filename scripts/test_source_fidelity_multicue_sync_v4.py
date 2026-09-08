from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "backend/src/database/migrations/0160_source_fidelity_multicue_asset_sync.sql"


class SourceFidelityMulticueSyncV4Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.sql = MIGRATION.read_text(encoding="utf-8")

    def test_exact_asset_binding_is_source_pinned_and_fail_closed(self) -> None:
        sql = self.sql
        self.assertIn("sync_repaired_source_assets_v4", sql)
        self.assertIn("Resolved by verified source asset", sql)
        self.assertIn("cueOrdinal", sql)
        self.assertIn("asset_id", sql)
        self.assertIn("set_question_structured_content_v1", sql)
        self.assertIn("structured_source_provenance_mismatch", sql)
        self.assertIn("canonical_multicue_asset_preflight_failed", sql)
        self.assertIn("canonical_multicue_asset_adjacency_failed", sql)
        self.assertIn("source_paper_id", sql)
        self.assertIn("sp.sha256", sql)

    def test_open_rule_cannot_reuse_historical_asset(self) -> None:
        sql = self.sql
        self.assertIn("open_vf.resolved_at IS NULL", sql)
        self.assertIn("open_vf.rule_code=vf.rule_code", sql)
        self.assertIn("open_vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'", sql)

    def test_sync_is_non_destructive_and_aliases_are_upgraded(self) -> None:
        sql = self.sql
        self.assertIn("sync_repaired_source_assets_v3", sql)
        self.assertIn("sync_repaired_source_assets_v1", sql)
        self.assertIn("remainingUnreferencedVisualAssets", sql)
        self.assertNotIn("DELETE FROM public.question_assets", sql)
        self.assertNotIn("DELETE FROM public.questions", sql)
        self.assertNotIn("DROP TABLE public.question_assets", sql)


if __name__ == "__main__":
    unittest.main()
