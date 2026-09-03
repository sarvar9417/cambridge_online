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


if __name__ == "__main__":
    unittest.main()
