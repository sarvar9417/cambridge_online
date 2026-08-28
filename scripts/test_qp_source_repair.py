#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "backend" / "scripts" / "qp-source-repair.py"

spec = importlib.util.spec_from_file_location("campath_qp_source_repair", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("Cannot load qp-source-repair.py")
repair = importlib.util.module_from_spec(spec)
sys.modules["campath_qp_source_repair"] = repair
spec.loader.exec_module(repair)


class SourceRepairTests(unittest.TestCase):
    def test_inline_dotted_blank_preserves_following_words(self):
        text = (
            "1 (a) Complete the description.\n"
            "A kibibyte has a ................................................ prefix. "
            "Three kibibytes is ................................................ bytes. [2]\n"
        )
        rows, _ = repair.parse_text(text, {"1.a": 2})
        stem = rows["1.a"]["stem"]
        self.assertIn("__________ prefix", stem)
        self.assertIn("__________ bytes", stem)
        self.assertNotIn("[2]", stem)

    def test_answer_only_dotted_line_is_removed(self):
        text = (
            "1 (a) State one purpose of an operating system. [1]\n"
            "..............................................................................\n"
        )
        rows, _ = repair.parse_text(text, {"1.a": 1})
        self.assertEqual(rows["1.a"]["stem"], "State one purpose of an operating system.")

    def test_margin_and_footer_noise_are_removed(self):
        text = (
            "1 (a) State the value. DO NOT WRITE IN THIS MARGIN [1]\n"
            "9618/13/M/J/24\n"
            "© UCLES 2024\n"
        )
        rows, _ = repair.parse_text(text, {"1.a": 1})
        self.assertEqual(rows["1.a"]["stem"], "State the value.")

    def test_numbered_code_row_is_not_new_question(self):
        text = (
            "1 (a) Complete the algorithm.\n"
            "    2  OUTPUT \"value\"\n"
            "[2]\n"
            "(b) State the output. [1]\n"
        )
        rows, _ = repair.parse_text(text, {"1.a": 2, "1.b": 1})
        self.assertIn('2 OUTPUT "value"', rows["1.a"]["stem"])
        self.assertEqual(rows["1.b"]["stem"], "State the output.")

    def test_terminal_mark_removal_does_not_destroy_array_syntax(self):
        text = "1 (a) Declare Data as ARRAY[1:100000] OF INTEGER. [1]\n"
        rows, _ = repair.parse_text(text, {"1.a": 1})
        self.assertIn("ARRAY[1:100000]", rows["1.a"]["stem"])
        self.assertNotIn("INTEGER. [1]", rows["1.a"]["stem"])

    def test_ancestor_text_becomes_context_not_repeated_leaf_stem(self):
        text = (
            "1 Computers use character sets when representing characters in binary.\n"
            "(a) State one character set. [1]\n"
            "(b) Explain how the word Clock is represented. [2]\n"
        )
        rows, _ = repair.parse_text(text, {"1.a": 1, "1.b": 2})
        self.assertEqual(
            rows["1.b"]["context"],
            "Computers use character sets when representing characters in binary.",
        )
        self.assertEqual(rows["1.b"]["stem"], "Explain how the word Clock is represented.")

    def test_canonical_reference_uses_parentheses_and_source_alias(self):
        self.assertEqual(
            repair.canonical_ref("9618", 1, 3, "MJ", 2024, "2.b.ii"),
            "9618/13/M/J/24 Q2(b)(ii)",
        )
        self.assertEqual(
            repair.canonical_ref("9618", 1, 1, "MJ", 2023, "6.a", {"6.a": "6"}),
            "9618/11/M/J/23 Q6",
        )

    def test_quality_gate_rejects_margin_artifact(self):
        with self.assertRaisesRegex(ValueError, "margin"):
            repair.quality_gate({
                "1.a": {
                    "path": "1.a",
                    "marks": 1,
                    "stem": "State this. DO NOT WRITE IN THIS MARGIN",
                    "context": None,
                }
            })


if __name__ == "__main__":
    unittest.main()
