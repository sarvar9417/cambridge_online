from __future__ import annotations

import runpy
import unittest

MODULE = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v3.py",
    run_name="test_9618_ms_column_marks",
)
printed_mark_columns = MODULE["printed_mark_columns"]


class PrintedMarkColumnTests(unittest.TestCase):
    def test_guidance_number_does_not_override_printed_mark(self):
        header = "  Question" + " " * 22 + "Answer" + " " * 29 + "Marks" + " " * 9 + "Guidance"
        marks_start = header.index("Marks")
        guidance_start = header.index("Guidance")
        row = "  4(c)(ii)" + " " * (marks_start - len("  4(c)(ii)")) + "  3" + " " * max(1, guidance_start - (marks_start + 3)) + "Award a maximum of 2 marks"
        result = printed_mark_columns(header + "\n" + row + "\f")
        self.assertEqual(result["4.c.ii"], 3)

    def test_multiple_pages_use_their_own_column_geometry(self):
        page1_header = " Question      Answer                    Marks    Guidance"
        page1_row = " 1(a)          one correct point          2"
        page2_header = " Question          Answer                         Marks       Guidance"
        m = page2_header.index("Marks")
        g = page2_header.index("Guidance")
        prefix = " 2(b)(iii)"
        page2_row = prefix + " " * max(1, m - len(prefix)) + "  5" + " " * max(1, g - (m + 3)) + "max 3 if order wrong"
        result = printed_mark_columns(page1_header + "\n" + page1_row + "\f" + page2_header + "\n" + page2_row)
        self.assertEqual(result["2.b.iii"], 5)

    def test_guidance_only_number_is_not_a_mark(self):
        header = " Question      Answer                    Marks    Guidance"
        guidance = header.index("Guidance")
        row = " 3(a)          answer text" + " " * max(1, guidance - len(" 3(a)          answer text")) + "Award 2 if complete"
        result = printed_mark_columns(header + "\n" + row)
        self.assertNotIn("3.a", result)


if __name__ == "__main__":
    unittest.main()
