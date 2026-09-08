from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SourceAssetOrderSyncV3Tests(unittest.TestCase):
    def test_sync_is_source_pinned_unique_and_fail_closed(self) -> None:
        sql = (ROOT / "backend/src/database/migrations/0159_source_asset_order_sync_v3.sql").read_text(
            encoding="utf-8"
        )

        self.assertIn("sync_repaired_source_assets_v3", sql)
        self.assertIn("source_asset_order_preflight_failed", sql)
        self.assertIn("source_asset_order_multiple_rules_unsupported", sql)
        self.assertIn("preceding cambridge source visual", sql.lower())
        self.assertIn("original cambridge source layout", sql.lower())
        self.assertIn("Resolved by verified source asset", sql)
        self.assertIn("set_question_structured_content_v1", sql)
        self.assertIn("structured_source_provenance_mismatch", sql)
        self.assertIn("canonical source asset ordering sync v3", sql)
        self.assertIn("b.ordinality=(vf.details->>'cueOrdinal')::bigint+1", sql)
        self.assertIn("sync_repaired_source_assets_v1", sql)
        self.assertNotIn("DELETE FROM public.question_assets", sql)
        self.assertNotIn("DELETE FROM public.questions", sql)


if __name__ == "__main__":
    unittest.main()
