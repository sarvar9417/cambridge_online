from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "backend/src/database/migrations/0161_source_fidelity_verified_coverage_reconciliation.sql"


class SourceFidelityVerifiedCoverageV6Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.sql = MIGRATION.read_text(encoding="utf-8")

    def test_reconciliation_requires_same_cue_rule_and_verified_asset(self) -> None:
        sql = self.sql
        self.assertIn("flag_source_fidelity_requirements_v6", sql)
        self.assertIn("hist.rule_code=open_vf.rule_code", sql)
        self.assertIn("hist.details->>'cue'", sql)
        self.assertIn("open_vf.details->>'cue'", sql)
        self.assertIn("Resolved by verified source asset", sql)
        self.assertIn("source SHA-256", sql)
        self.assertIn("prior.source_sha=lower(coalesce(sp.sha256,''))", sql)
        self.assertIn("qa.id=prior.asset_id", sql)

    def test_asset_must_still_be_renderable_and_referenced(self) -> None:
        sql = self.sql
        self.assertIn("qa.storage_path", sql)
        self.assertIn("qa.content_md", sql)
        self.assertIn("qa.svg_markup", sql)
        self.assertIn("jsonb_array_elements(q.content_json->'blocks')", sql)
        self.assertIn("b->>'assetId'=qa.id::text", sql)

    def test_scope_is_canonical_only_and_stable_alias_is_upgraded(self) -> None:
        sql = self.sql
        self.assertIn("source-fidelity-detector-v3-canonical-adjacency", sql)
        self.assertIn("flag_source_fidelity_requirements_v5", sql)
        self.assertIn("flag_source_fidelity_requirements_v1", sql)
        self.assertNotIn("DELETE FROM public.question_assets", sql)
        self.assertNotIn("DELETE FROM public.questions", sql)


if __name__ == "__main__":
    unittest.main()
