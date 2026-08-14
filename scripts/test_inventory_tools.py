#!/usr/bin/env python3
"""Unit tests for the read-only Phase A inventory/reconciliation utilities."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent


def load_script(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, SCRIPTS_DIR / file_name)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {file_name}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


inventory = load_script("campath_inventory_papers", "inventory-papers.py")
reconcile = load_script("campath_reconcile_inventory", "reconcile-inventory.py")


class InventoryParserTests(unittest.TestCase):
    def test_parses_canonical_qp(self):
        row = inventory.parse_filename(Path("9618_s25_qp_11.pdf"))
        self.assertIsNotNone(row)
        self.assertEqual(row.paper_key, "9618:2025:MJ:P1:V1")
        self.assertEqual(row.kind, "QP")

    def test_parses_canonical_source_file(self):
        row = inventory.parse_filename(Path("9618_w24_sf_43.zip"))
        self.assertIsNotNone(row)
        self.assertEqual(row.paper_key, "9618:2024:ON:P4:V3")
        self.assertEqual(row.kind, "SF")

    def test_copy_suffix_is_not_canonical(self):
        path = Path("9618_s24_sf_41 (1).zip")
        self.assertIsNone(inventory.parse_filename(path))
        candidate = inventory.parse_copy_suffix(path)
        self.assertIsNotNone(candidate)
        row, copy_number = candidate
        self.assertEqual(copy_number, 1)
        self.assertEqual(row.paper_key, "9618:2024:MJ:P4:V1")
        self.assertEqual(row.file_name, "9618_s24_sf_41.zip")

    def test_merged_file_is_not_canonical(self):
        self.assertIsNone(inventory.parse_filename(Path("9618_s21_qp_11_12_merged.pdf")))

    def test_coverage_detects_exact_canonical_duplicate(self):
        rows = [
            inventory.parse_filename(Path("a/9618_s25_qp_11.pdf")),
            inventory.parse_filename(Path("b/9618_s25_qp_11.pdf")),
            inventory.parse_filename(Path("a/9618_s25_ms_11.pdf")),
        ]
        report = inventory.coverage([row for row in rows if row is not None])
        self.assertEqual(len(report), 1)
        self.assertTrue(report[0]["canonical_pair_complete"])
        self.assertTrue(report[0]["has_canonical_duplicates"])
        self.assertEqual(report[0]["canonical_duplicate_kinds"], ["QP"])

    def test_expected_matrix_is_not_hard_coded_to_twelve(self):
        variants = [11, 12, 13, 21, 22, 23, 31, 32, 41, 42]
        rows = []
        for variant in variants:
            rows.append(inventory.parse_filename(Path(f"9618_w21_qp_{variant}.pdf")))
            rows.append(inventory.parse_filename(Path(f"9618_w21_ms_{variant}.pdf")))
        report = inventory.coverage([row for row in rows if row is not None])
        self.assertEqual(len(report), 10)
        self.assertTrue(all(row["canonical_pair_complete"] for row in report))


class ReconciliationTests(unittest.TestCase):
    def source(self, **overrides):
        row = {
            "canonical_pair_complete": True,
            "has_canonical_duplicates": False,
            "canonical_duplicate_kinds": [],
        }
        row.update(overrides)
        return row

    def database(self, **overrides):
        row = {
            "qp_present": True,
            "ms_present": True,
            "leaf_questions": 25,
            "expected_marks": 75,
            "actual_leaf_marks": 75,
            "tagged_leaf_questions": 25,
            "leaves_with_mark_scheme": 25,
            "approved_leaf_questions": 25,
            "leaves_with_approved_mark_scheme": 25,
            "review_complete": True,
        }
        row.update(overrides)
        return row

    def test_complete(self):
        status, detail, reasons = reconcile.classify(self.source(), self.database())
        self.assertEqual((status, detail, reasons), ("COMPLETE", "COMPLETE", []))

    def test_source_only_is_missing(self):
        status, detail, _ = reconcile.classify(self.source(), None)
        self.assertEqual((status, detail), ("MISSING", "SOURCE_ONLY"))

    def test_mark_total_mismatch_is_conflict(self):
        status, detail, reasons = reconcile.classify(
            self.source(), self.database(actual_leaf_marks=74)
        )
        self.assertEqual((status, detail), ("CONFLICT", "MARK_TOTAL_MISMATCH"))
        self.assertIn("74/75", reasons[0])

    def test_incomplete_tagging_is_partial(self):
        status, detail, _ = reconcile.classify(
            self.source(), self.database(tagged_leaf_questions=24, review_complete=False)
        )
        self.assertEqual((status, detail), ("PARTIAL", "EXTRACTION_INCOMPLETE"))

    def test_canonical_duplicate_wins_before_database_comparison(self):
        status, detail, _ = reconcile.classify(
            self.source(has_canonical_duplicates=True, canonical_duplicate_kinds=["QP"]),
            self.database(),
        )
        self.assertEqual((status, detail), ("DUPLICATE", "SOURCE_DUPLICATE"))


if __name__ == "__main__":
    unittest.main()
