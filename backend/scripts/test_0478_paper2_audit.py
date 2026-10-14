#!/usr/bin/env python3
"""Regression tests for the scoped Cambridge 0478 Paper 2 backfill guard."""
from __future__ import annotations

import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().with_name("full-0478-corpus-backfill.py")
SPEC = importlib.util.spec_from_file_location("full_0478_corpus_backfill", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class Paper2BackfillSafetyTests(unittest.TestCase):
    def test_discovery_excludes_paper1(self):
        entries = [
            SimpleNamespace(path="0478_s26_qp_11.pdf", id="paper1"),
            SimpleNamespace(path="0478_s26_ms_11.pdf", id="mark1"),
            SimpleNamespace(path="0478_s26_qp_21.pdf", id="paper2"),
            SimpleNamespace(path="0478_s26_ms_21.pdf", id="mark2"),
        ]
        with patch.object(module, "YEAR_FOLDERS", {2026: "test-folder"}), \
             patch.object(module.gdown, "download_folder", return_value=entries):
            manifest = module.discover_manifest()
        self.assertEqual([x["filename"] for x in manifest],
                         ["0478_s26_ms_21.pdf", "0478_s26_qp_21.pdf"])
        self.assertTrue(all(x["component"] == 2 for x in manifest))
        self.assertEqual(len(module.audit_pairs(manifest)), 1)

    def test_unpaired_source_fails_closed(self):
        with self.assertRaisesRegex(RuntimeError, "unpaired_canonical_sources"):
            module.audit_pairs([{
                "year": 2026, "series": "MJ", "component": 2,
                "variant": 1, "kind": "QP", "filename": "0478_s26_qp_21.pdf",
            }])

    def test_ocr_margin_and_control_chars_block_import(self):
        self.assertIn("qp_margin_text", module.source_fidelity_blockers(
            "Write an algorithm. DO NOT WRITE IN THIS MARGIN", "correct output"))
        self.assertIn("qp_control_or_replacement_chars",
                      module.source_fidelity_blockers("Bad \\u0001 text", "guidance"))

    def test_tables_and_diagrams_require_verified_visual(self):
        self.assertIn("requires_verified_structured_visual",
                      module.source_fidelity_blockers("Complete the trace table", "yes"))
        self.assertIn("requires_verified_structured_visual",
                      module.source_fidelity_blockers("Draw a flowchart", "yes"))
        self.assertEqual(module.source_fidelity_blockers(
            "State what a variable is.", "A named storage location."), [])

    def test_default_audit_makes_no_rpc_writes(self):
        qp = {"year": 2026, "series": "MJ", "component": 2,
              "variant": 1, "kind": "QP"}
        ms = {**qp, "kind": "MS"}
        with tempfile.TemporaryDirectory() as tmp:
            old = Path.cwd()
            try:
                os.chdir(tmp)
                with patch.dict(os.environ, {
                        "BACKFILL_MODE": "audit", "BACKFILL_COMPONENTS": "2",
                }), patch.object(module, "discover_manifest", return_value=[qp, ms]), \
                     patch.object(module, "runner", side_effect=AssertionError("unexpected RPC")):
                    self.assertEqual(module.main(), 0)
                result = json.loads(Path("0478-backfill-report.json").read_text())
                self.assertEqual(result["mode"], "audit")
                self.assertEqual(result["manifest"]["paired_papers"], 1)
            finally:
                os.chdir(old)

    def test_apply_requires_extra_production_confirmation(self):
        with patch.dict(os.environ, {
                "BACKFILL_MODE": "apply", "BACKFILL_COMPONENTS": "2",
                "BACKFILL_CONFIRM": "", "GITHUB_REF": "refs/heads/main",
        }), patch.object(module, "discover_manifest", return_value=[]), \
             patch.object(module, "runner", side_effect=AssertionError("unexpected RPC")):
            with self.assertRaisesRegex(RuntimeError, "explicit_paper2_database_write_approval_required"):
                module.main()

    def test_other_components_rejected(self):
        with patch.dict(os.environ, {
                "BACKFILL_MODE": "audit", "BACKFILL_COMPONENTS": "1",
        }), patch.object(module, "runner", side_effect=AssertionError("unexpected RPC")):
            with self.assertRaisesRegex(RuntimeError, "0478_paper2_only"):
                module.main()


if __name__ == "__main__":
    unittest.main()
