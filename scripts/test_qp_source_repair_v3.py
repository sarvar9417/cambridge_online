#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "backend" / "scripts" / "qp-source-repair-v3.py"
spec = importlib.util.spec_from_file_location("campath_qp_source_repair_v3", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("Cannot load qp-source-repair-v3.py")
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)


class SourceRepairV3Tests(unittest.TestCase):
    def test_internal_alias_can_parse_printed_parent_question(self):
        text = (
            "6 An interrupt is generated when a key is pressed on a computer keyboard.\n"
            "Explain how the computer handles this interrupt.\n"
            "[5]\n"
        )
        with tempfile.NamedTemporaryFile(suffix=".pdf") as handle:
            original = repair.BASE["pdftotext_layout"]
            repair.BASE["pdftotext_layout"] = lambda *_args, **_kwargs: text
            try:
                result = repair.build_repair(Path(handle.name), {
                    "sourcePaperId": "paper-id",
                    "syllabusCode": "9618",
                    "component": 1,
                    "variant": 1,
                    "series": "MJ",
                    "year": 2023,
                    "expectedMarks": 75,
                    "aliases": {"6.a": "6"},
                    "leaves": [{"path": "6.a", "marks": 5}],
                    "_expected": {"6.a": 5},
                })
            finally:
                repair.BASE["pdftotext_layout"] = original
        row = result["rows"][0]
        self.assertEqual(row["path"], "6.a")
        self.assertEqual(row["displayRef"], "9618/11/M/J/23 Q6")
        self.assertIn("An interrupt is generated", row["stem"])
        self.assertIn("Explain how the computer handles this interrupt", row["stem"])

    def test_control_only_extraction_residue_is_removed(self):
        text = (
            "1 (a) State one programming construct.\n"
            "[1]\n"
            ",\x01\x01\x02\n"
            "\x07\x06\x06\x04\x04\x04\n"
            "5\n"
        )
        rows, _ = repair.parse_text(text, {"1.a": 1})
        self.assertEqual(rows["1.a"]["stem"], "State one programming construct.")
        self.assertNotRegex(rows["1.a"]["stem"], r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

    def test_terminal_mark_stops_standalone_page_number(self):
        text = (
            "1 (a) Give the binary number stored to display the error code 51.\n"
            "[1]\n"
            "12\n"
        )
        rows, _ = repair.parse_text(text, {"1.a": 1})
        self.assertEqual(rows["1.a"]["stem"], "Give the binary number stored to display the error code 51.")

    def test_legitimate_table_response_labels_are_preserved(self):
        text = (
            "5 (c) Identify two tables in the database that contain one or more foreign keys.\n"
            "Give one attribute that is a foreign key in each table.\n"
            "Table Foreign key\n"
            "1\n"
            "2\n"
            "[2]\n"
        )
        rows, _ = repair.parse_text(text, {"5.c": 2})
        repair.quality_gate(rows)
        stem = rows["5.c"]["stem"]
        self.assertIn("Table Foreign key", stem)
        self.assertRegex(stem, r"(?m)^1$")
        self.assertRegex(stem, r"(?m)^2$")

    def test_left_indented_legacy_question_is_detected(self):
        self.assertIsNotNone(repair.main_candidate("    3   A logic expression is given:", 3))

    def test_deep_queue_data_row_is_not_a_question_start(self):
        self.assertIsNone(repair.main_candidate("                                4      Wasp", 4))

    def test_pseudocode_row_is_not_a_question_start(self):
        self.assertIsNone(repair.main_candidate("    2 OUTPUT \"value\"", 2))

    def test_hybrid_parser_uses_legacy_layout_when_it_is_complete(self):
        text = (
            "1 A parent context.\n"
            "(a) State one value. [1]\n"
            "                         2 This is a sufficiently long legacy question start sentence.\n"
            "(a) State another value. [1]\n"
        )
        rows, _ = repair.parse_text(text, {"1.a": 1, "2.a": 1})
        self.assertEqual(rows["1.a"]["stem"], "State one value.")
        self.assertIn("State another value", rows["2.a"]["stem"])


if __name__ == "__main__":
    unittest.main()
