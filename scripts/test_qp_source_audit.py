#!/usr/bin/env python3
from __future__ import annotations

import runpy
import unittest

AUDIT = runpy.run_path("backend/scripts/qp-source-audit-runner.py", run_name="qp_source_audit_test")


class SourceAuditTests(unittest.TestCase):
    def test_normalized_text_collapses_layout_only_differences(self):
        normalize = AUDIT["normalized_text"]
        self.assertEqual(normalize("A  value\n\nB"), normalize("A value\n B"))

    def test_comparison_distinguishes_exact_and_normalized(self):
        compare = AUDIT["comparison"]
        result = compare("A  value", "A value")
        self.assertFalse(result["exact"])
        self.assertTrue(result["normalized"])

    def test_normalized_text_normalizes_nonbreaking_hyphen(self):
        normalize = AUDIT["normalized_text"]
        self.assertEqual(normalize("user‑defined"), normalize("user-defined"))

    def test_comparison_detects_semantic_difference(self):
        compare = AUDIT["comparison"]
        result = compare("Identify two ADTs other than a stack.", "Identify three ADTs other than a stack.")
        self.assertFalse(result["exact"])
        self.assertFalse(result["normalized"])

    def test_semantic_text_accepts_context_partition_and_answer_scaffolding(self):
        semantic = AUDIT["semantic_text"]
        source = semantic(
            "A computer uses an Operating System.",
            "Identify two tasks.",
        )
        stored = semantic(
            None,
            "A computer uses an Operating System.\n\nIdentify two tasks.\n\n1 __________\n\n2 __________",
        )
        self.assertEqual(source, stored)

    def test_semantic_text_keeps_lone_page_number_auditable(self):
        semantic = AUDIT["semantic_text"]
        source = semantic(None, "State one benefit.")
        stored = semantic(None, "State one benefit.\n3")
        self.assertNotEqual(source, stored)

    def test_audit_main_candidate_accepts_legacy_left_indent(self):
        candidate = AUDIT["audit_main_candidate"]
        self.assertIsNotNone(candidate("    3   A logic expression is given:", 3))
        self.assertIsNotNone(candidate("   7    The following table shows part of the instruction set.", 7))

    def test_audit_main_candidate_rejects_deep_queue_data_row(self):
        candidate = AUDIT["audit_main_candidate"]
        self.assertIsNone(candidate("                                4      Wasp", 4))


if __name__ == "__main__":
    unittest.main()
